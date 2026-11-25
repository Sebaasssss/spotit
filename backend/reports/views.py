from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, F, OuterRef, Value
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdministrador, IsCiudadano

from .idempotencia import LimiteDeReportes, leer_clave, reporte_existente
from .models import Categoria, Estado, Reporte, Voto
from .permissions import PuedeEditarReporte
from .serializers import (
    CambioEstadoSerializer,
    CategoriaSerializer,
    ReporteCrearSerializer,
    ReporteEditarSerializer,
    ReporteSerializer,
)
from .storage import respuesta_foto, validar_token


class CategoriaListView(ListAPIView):
    queryset = Categoria.objects.filter(activa=True)
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


# Tope de puntos que devuelve el mapa en una sola respuesta (los más recientes).
MAPA_LIMITE = 2000

ORDENES = {
    "recientes": ("-creado", "-id"),
    "votos": ("-num_votos", "-creado", "-id"),
}


class ReportePagination(PageNumberPagination):
    page_size = 20
    page_query_param = "page"


class ReporteViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Todos los usuarios con sesión ven todos los reportes (sin datos del autor).

    - Crear: ciudadanos (con límite de envíos).
    - Editar (PATCH): solo el autor y solo en `recibido`.
    - Cambiar estado: solo administradores.
    - Votar / quitar el voto: ciudadanos, en reportes ajenos que no estén resueltos.
    - Mapa: solo lo necesario para dibujar los puntos (sin fotos ni descripción).
    """

    queryset = Reporte.objects.select_related("categoria")
    pagination_class = ReportePagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsCiudadano()]
        if self.action == "partial_update":
            return [IsAuthenticated(), PuedeEditarReporte()]
        if self.action == "cambiar_estado":
            return [IsAdministrador()]
        if self.action == "foto":
            return [AllowAny()]
        if self.action == "voto":
            return [IsCiudadano()]
        return [IsAuthenticated()]

    def get_authenticators(self):
        # La foto se pide desde <img>, que no envía el token: la autoriza la URL firmada.
        # (Se decide por la ruta: `self.action` aún no existe cuando DRF pide los autenticadores.)
        if self.request.path.endswith("/foto/"):
            return []
        return super().get_authenticators()

    def get_throttles(self):
        if self.action == "create":
            self.throttle_scope = "reportes"
            return [LimiteDeReportes()]
        return []

    def get_serializer_class(self):
        if self.action == "create":
            return ReporteCrearSerializer
        if self.action == "partial_update":
            return ReporteEditarSerializer
        return ReporteSerializer

    @staticmethod
    def _valores(texto: str | None) -> list[str]:
        """`?estado=recibido,en_proceso` → ["recibido", "en_proceso"]."""
        return [v for v in (p.strip() for p in (texto or "").split(",")) if v]

    def _filtrar(self, queryset):
        params = self.request.query_params
        estados = self._valores(params.get("estado"))
        if estados:
            if any(e not in Estado.values for e in estados):
                raise ValidationError({"estado": ["Estado no válido."]})
            queryset = queryset.filter(estado__in=estados)
        categorias = self._valores(params.get("categoria"))
        if categorias:
            queryset = queryset.filter(categoria__slug__in=categorias)
        return queryset

    def _ordenar(self, queryset):
        orden = self.request.query_params.get("orden") or "recientes"
        if orden not in ORDENES:
            raise ValidationError({"orden": ["Usa «recientes» o «votos»."]})
        return queryset.order_by(*ORDENES[orden])

    def _con_votos(self, queryset):
        """Conteo de votos y si el usuario actual ya votó, en la misma consulta."""
        user = self.request.user
        votado = (
            Exists(Voto.objects.filter(reporte=OuterRef("pk"), usuario=user))
            if user.is_authenticated
            else Value(False)
        )
        return queryset.annotate(num_votos=Count("votos"), votado_por_mi=votado)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ("list", "mios"):
            queryset = self._filtrar(queryset)
        if self.action == "mios":
            queryset = queryset.filter(autor=self.request.user)
        if self.action in ("list", "mios", "retrieve"):
            queryset = self._con_votos(queryset)
        if self.action in ("list", "mios"):
            queryset = self._ordenar(queryset)
        return queryset

    def create(self, request, *args, **kwargs):
        clave = leer_clave(request, estricta=True)
        # Reintento de un envío que ya llegó: el mismo reporte, sin procesar otra foto.
        existente = reporte_existente(request.user, clave)
        if existente:
            return self._respuesta_creado(existente, repetido=True)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reporte = serializer.save(clave_idempotencia=clave)
        except IntegrityError:
            # Dos envíos con la misma clave a la vez: ganó el otro; se devuelve ese.
            existente = reporte_existente(request.user, clave)
            if existente is None:
                raise
            return self._respuesta_creado(existente, repetido=True)
        return self._respuesta_creado(reporte, repetido=False)

    def _respuesta_creado(self, reporte, *, repetido: bool):
        data = ReporteSerializer(reporte, context=self.get_serializer_context()).data
        codigo = status.HTTP_200_OK if repetido else status.HTTP_201_CREATED
        response = Response(data, status=codigo)
        if repetido:
            response["Idempotent-Replayed"] = "true"
        return response

    def partial_update(self, request, *args, **kwargs):
        reporte = self.get_object()
        serializer = self.get_serializer(reporte, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        reporte = serializer.save()
        return Response(ReporteSerializer(reporte, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"])
    def mios(self, request):
        return self.list(request)

    @action(detail=False, methods=["get"])
    def mapa(self, request):
        """Puntos del mapa: id, ubicación, categoría, estado y votos. Sin fotos ni textos."""
        queryset = self._filtrar(Reporte.objects.all()).order_by("-creado", "-id")
        filas = list(
            queryset.annotate(num_votos=Count("votos"), cat=F("categoria__slug")).values(
                "id", "latitud", "longitud", "cat", "estado", "num_votos"
            )[: MAPA_LIMITE + 1]
        )
        puntos = [
            {
                "id": f["id"],
                "lat": float(f["latitud"]),
                "lng": float(f["longitud"]),
                "categoria": f["cat"],
                "estado": f["estado"],
                "votos": f["num_votos"],
            }
            for f in filas[:MAPA_LIMITE]
        ]
        return Response({"results": puntos, "truncado": len(filas) > MAPA_LIMITE})

    @action(detail=True, methods=["post", "delete"])
    def voto(self, request, pk=None):
        """POST vota y DELETE quita el voto. Ambos son idempotentes: repetirlos no falla."""
        reporte = get_object_or_404(Reporte, pk=pk)
        motivo = reporte.motivo_sin_voto(request.user)
        if motivo:
            raise PermissionDenied(motivo)

        creado = False
        if request.method == "POST":
            try:
                # Punto de guardado: si otra petición del mismo usuario ganó la carrera,
                # la restricción única falla y la transacción exterior sigue sana.
                with transaction.atomic():
                    Voto.objects.create(usuario=request.user, reporte=reporte)
                creado = True
            except IntegrityError:
                pass  # ya había votado: mismo resultado
        else:
            Voto.objects.filter(usuario=request.user, reporte=reporte).delete()

        return Response(
            {"votos": reporte.votos.count(), "votado": request.method == "POST"},
            status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="estado")
    def cambiar_estado(self, request, pk=None):
        reporte = self.get_object()
        serializer = CambioEstadoSerializer(data=request.data, context={"reporte": reporte})
        serializer.is_valid(raise_exception=True)
        reporte.estado = serializer.validated_data["estado"]
        reporte.save(update_fields=["estado", "actualizado"])
        return Response(ReporteSerializer(reporte, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["get"])
    def foto(self, request, pk=None):
        reporte = get_object_or_404(Reporte, pk=pk)
        tamano = validar_token(request.query_params.get("t", ""), reporte.pk)
        if tamano is None:
            raise NotFound("La foto no existe o el enlace caducó.")
        campo = reporte.miniatura if tamano == "miniatura" else reporte.foto
        if not campo:
            raise NotFound("La foto no existe o el enlace caducó.")
        return respuesta_foto(campo)
