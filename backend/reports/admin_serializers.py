"""Serializers del panel de administración (/api/admin/).

- Fotos con URL firmada de alcance de administrador: sirven aunque el reporte esté oculto.
- Datos del autor: solo nombre y email, y solo en el detalle (decisión de privacidad en
  docs/decisiones.md). La lista no lleva datos personales.
- Nunca se devuelven rutas de archivo del servidor.
"""

from rest_framework import serializers

from .models import (
    MOTIVO_MAX,
    MOTIVO_MIN,
    NOTA_PUBLICA_MAX,
    TRANSICIONES,
    Estado,
    EventoReporte,
    Reporte,
)
from .serializers import CategoriaSerializer
from .storage import foto_url


def _votos(obj):
    anotado = getattr(obj, "num_votos", None)
    return anotado if anotado is not None else obj.votos.count()


class AdminReporteListaSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    miniatura_url = serializers.SerializerMethodField()
    votos = serializers.SerializerMethodField()

    class Meta:
        model = Reporte
        fields = (
            "id",
            "categoria",
            "descripcion",
            "estado",
            "estado_display",
            "creado",
            "actualizado",
            "votos",
            "oculto",
            "miniatura_url",
        )
        read_only_fields = fields

    def get_miniatura_url(self, obj):
        return foto_url(self.context.get("request"), obj, "miniatura", admin=True)

    def get_votos(self, obj):
        return _votos(obj)


class EventoAdminSerializer(serializers.ModelSerializer):
    fecha = serializers.DateTimeField(source="creado")
    tipo_display = serializers.CharField(source="get_tipo_display")
    estado_nuevo_display = serializers.CharField(source="get_estado_nuevo_display")
    admin = serializers.SerializerMethodField()

    class Meta:
        model = EventoReporte
        fields = (
            "tipo",
            "tipo_display",
            "estado_anterior",
            "estado_nuevo",
            "estado_nuevo_display",
            "nota_publica",
            "motivo",
            "admin",
            "fecha",
        )
        read_only_fields = fields

    def get_admin(self, obj):
        # Solo el nombre: los administradores se identifican entre sí, sin más datos.
        return obj.admin.nombre if obj.admin else None


class AdminReporteDetalleSerializer(AdminReporteListaSerializer):
    foto_url = serializers.SerializerMethodField()
    autor = serializers.SerializerMethodField()
    oculto_por = serializers.SerializerMethodField()
    transiciones = serializers.SerializerMethodField()
    historial = EventoAdminSerializer(source="eventos", many=True, read_only=True)

    class Meta(AdminReporteListaSerializer.Meta):
        fields = (
            *AdminReporteListaSerializer.Meta.fields,
            "latitud",
            "longitud",
            "precision_m",
            "origen_ubicacion",
            "foto_url",
            "autor",
            "oculto_motivo",
            "oculto_por",
            "oculto_en",
            "transiciones",
            "historial",
        )
        read_only_fields = fields

    def get_foto_url(self, obj):
        return foto_url(self.context.get("request"), obj, "completa", admin=True)

    def get_autor(self, obj):
        """Nombre y email para poder contactarlo. Nada más (ni id, ni rol, ni fechas)."""
        if obj.autor is None:
            return None
        return {"nombre": obj.autor.nombre, "email": obj.autor.email}

    def get_oculto_por(self, obj):
        return obj.oculto_por.nombre if obj.oculto_por else None

    def get_transiciones(self, obj):
        """Estados a los que se puede pasar desde el actual, en orden de flujo."""
        orden = list(Estado)
        destinos = sorted(TRANSICIONES.get(obj.estado, set()), key=orden.index)
        return [{"estado": e.value, "label": e.label} for e in destinos]


def _texto(maximo, *, minimo=None, requerido=False, mensajes=None):
    return serializers.CharField(
        required=requerido,
        allow_blank=not requerido,
        trim_whitespace=True,
        max_length=maximo,
        min_length=minimo,
        error_messages=mensajes or {},
    )


_NOTA = {"max_length": f"La nota pública no puede pasar de {NOTA_PUBLICA_MAX} caracteres."}


class CambioEstadoAdminSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(
        choices=Estado.choices, error_messages={"invalid_choice": "Estado no válido."}
    )
    # El estado que el administrador estaba viendo: si cambió, se responde 409.
    desde = serializers.ChoiceField(
        choices=Estado.choices, error_messages={"invalid_choice": "Estado no válido."}
    )
    nota_publica = _texto(NOTA_PUBLICA_MAX, mensajes=_NOTA)


class OcultarSerializer(serializers.Serializer):
    motivo = _texto(
        MOTIVO_MAX,
        minimo=MOTIVO_MIN,
        requerido=True,
        mensajes={
            "required": "Escribe el motivo para ocultarlo.",
            "blank": "Escribe el motivo para ocultarlo.",
            "min_length": f"Explica un poco más el motivo (al menos {MOTIVO_MIN} caracteres).",
            "max_length": f"El motivo no puede pasar de {MOTIVO_MAX} caracteres.",
        },
    )
    nota_publica = _texto(NOTA_PUBLICA_MAX, mensajes=_NOTA)


class MostrarSerializer(serializers.Serializer):
    nota_publica = _texto(NOTA_PUBLICA_MAX, mensajes=_NOTA)
