from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from rest_framework import serializers

from .images import FotoInvalida, procesar_foto
from .models import (
    DESCRIPCION_MAX,
    DESCRIPCION_MIN,
    TRANSICIONES,
    Categoria,
    Estado,
    EventoReporte,
    OrigenUbicacion,
    Reporte,
    TipoEvento,
)
from .storage import foto_url


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nombre", "slug", "icono")


class ReporteSerializer(serializers.ModelSerializer):
    """Lectura. Nunca expone al autor (ni nombre ni email) ni rutas de archivo."""

    categoria = CategoriaSerializer(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    foto_url = serializers.SerializerMethodField()
    miniatura_url = serializers.SerializerMethodField()
    es_mio = serializers.SerializerMethodField()
    puede_editar = serializers.SerializerMethodField()
    votos = serializers.SerializerMethodField()
    votado = serializers.SerializerMethodField()
    puede_votar = serializers.SerializerMethodField()

    class Meta:
        model = Reporte
        fields = (
            "id",
            "categoria",
            "descripcion",
            "latitud",
            "longitud",
            "precision_m",
            "origen_ubicacion",
            "estado",
            "estado_display",
            "creado",
            "actualizado",
            "foto_url",
            "miniatura_url",
            "es_mio",
            "puede_editar",
            "votos",
            "votado",
            "puede_votar",
            "oculto",
        )
        read_only_fields = fields

    def _user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    # La foto de un reporte oculto no se entrega fuera del panel (ni a su autor).
    def get_foto_url(self, obj):
        return "" if obj.oculto else foto_url(self.context.get("request"), obj, "completa")

    def get_miniatura_url(self, obj):
        return "" if obj.oculto else foto_url(self.context.get("request"), obj, "miniatura")

    def get_es_mio(self, obj):
        return obj.es_de(self._user())

    def get_puede_editar(self, obj):
        return obj.puede_editar(self._user())

    # Las listas y el detalle traen `num_votos` y `votado_por_mi` anotados en la consulta
    # (sin una consulta por fila); si faltan (recién creado o editado), se calculan aquí.

    def get_votos(self, obj):
        anotado = getattr(obj, "num_votos", None)
        return anotado if anotado is not None else obj.votos.count()

    def get_votado(self, obj):
        anotado = getattr(obj, "votado_por_mi", None)
        if anotado is not None:
            return anotado
        user = self._user()
        return bool(user and user.is_authenticated and obj.votos.filter(usuario=user).exists())

    def get_puede_votar(self, obj):
        return obj.motivo_sin_voto(self._user()) is None


class EventoPublicoSerializer(serializers.ModelSerializer):
    """Entrada de la línea de tiempo que ve el ciudadano: sin quién lo hizo ni el motivo."""

    fecha = serializers.DateTimeField(source="creado")
    estado_nuevo_display = serializers.CharField(source="get_estado_nuevo_display")

    class Meta:
        model = EventoReporte
        fields = (
            "tipo",
            "estado_anterior",
            "estado_nuevo",
            "estado_nuevo_display",
            "nota_publica",
            "fecha",
        )
        read_only_fields = fields


class ReporteDetalleSerializer(ReporteSerializer):
    """Detalle con la línea de tiempo. Ocultar y mostrar solo los ve el autor."""

    historial = serializers.SerializerMethodField()

    class Meta(ReporteSerializer.Meta):
        fields = (*ReporteSerializer.Meta.fields, "historial")
        read_only_fields = fields

    def get_historial(self, obj):
        eventos = obj.eventos.all()
        if not obj.es_de(self._user()):
            eventos = [e for e in eventos if e.tipo in (TipoEvento.ESTADO, TipoEvento.NOTA)]
        return EventoPublicoSerializer(eventos, many=True).data


class _ReporteEscrituraBase(serializers.ModelSerializer):
    categoria = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Categoria.objects.filter(activa=True),
        error_messages={"does_not_exist": "Elige una categoría de la lista."},
    )
    descripcion = serializers.CharField(
        min_length=DESCRIPCION_MIN,
        max_length=DESCRIPCION_MAX,
        trim_whitespace=True,
        error_messages={
            "min_length": f"Cuéntanos un poco más (al menos {DESCRIPCION_MIN} caracteres).",
            "max_length": f"La descripción no puede pasar de {DESCRIPCION_MAX} caracteres.",
            "blank": "Describe qué está pasando.",
        },
    )
    foto = serializers.FileField(write_only=True)
    latitud = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-90, max_value=90)
    longitud = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-180, max_value=180
    )
    precision_m = serializers.IntegerField(
        min_value=0, max_value=100_000, required=False, allow_null=True
    )
    origen_ubicacion = serializers.ChoiceField(
        choices=OrigenUbicacion.choices, default=OrigenUbicacion.GPS
    )

    class Meta:
        model = Reporte
        fields = (
            "categoria",
            "descripcion",
            "foto",
            "latitud",
            "longitud",
            "precision_m",
            "origen_ubicacion",
        )

    def to_internal_value(self, data):
        # Las coordenadas del navegador traen muchos decimales: se redondean a 6 (~11 cm).
        if hasattr(data, "copy"):
            data = data.copy()
        for campo in ("latitud", "longitud"):
            valor = data.get(campo)
            if valor not in (None, ""):
                try:
                    redondeado = Decimal(str(valor).strip()).quantize(
                        Decimal("0.000001"), rounding=ROUND_HALF_UP
                    )
                    data[campo] = str(redondeado)
                except (InvalidOperation, TypeError, ValueError):
                    pass  # el DecimalField devolverá el error de formato
        return super().to_internal_value(data)

    def validate_foto(self, archivo):
        try:
            return procesar_foto(archivo)
        except FotoInvalida as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate(self, attrs):
        if attrs.get("origen_ubicacion") == OrigenUbicacion.MANUAL:
            attrs["precision_m"] = None  # la precisión del GPS no describe un punto movido a mano
        return attrs

    @staticmethod
    def _guardar_fotos(reporte, procesada):
        reporte.foto.save("foto.jpg", procesada.foto, save=False)
        reporte.miniatura.save("miniatura.jpg", procesada.miniatura, save=False)


class ReporteCrearSerializer(_ReporteEscrituraBase):
    def create(self, validated_data):
        """Crea el reporte. Si choca la clave de idempotencia, borra las fotos ya escritas
        y deja pasar el `IntegrityError` para que la vista devuelva el reporte que ganó."""
        procesada = validated_data.pop("foto")
        reporte = Reporte(autor=self.context["request"].user, **validated_data)
        self._guardar_fotos(reporte, procesada)
        try:
            # Punto de guardado: tras el choque, la transacción de la petición sigue sana.
            with transaction.atomic():
                reporte.save()
        except IntegrityError:
            storage = reporte.foto.storage
            for nombre in (reporte.foto.name, reporte.miniatura.name):
                if nombre:
                    storage.delete(nombre)
            raise
        return reporte


class ReporteEditarSerializer(_ReporteEscrituraBase):
    foto = serializers.FileField(write_only=True, required=False)

    def update(self, instance, validated_data):
        procesada = validated_data.pop("foto", None)
        anteriores = (instance.foto.name, instance.miniatura.name) if procesada else ()
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if procesada:
            self._guardar_fotos(instance, procesada)
        instance.save()
        # Las fotos reemplazadas se borran solo después de guardar con éxito.
        storage = instance.foto.storage
        for nombre in anteriores:
            if nombre:
                storage.delete(nombre)
        return instance


class CambioEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(
        choices=Estado.choices, error_messages={"invalid_choice": "Estado no válido."}
    )

    def validate_estado(self, nuevo):
        actual = self.context["reporte"].estado
        if nuevo not in TRANSICIONES.get(actual, set()):
            raise serializers.ValidationError(
                f"No se puede pasar de «{Estado(actual).label}» a «{Estado(nuevo).label}»."
            )
        return nuevo
