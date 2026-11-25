from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.permissions import IsAdministrador, IsCiudadano

from .models import Categoria, Estado, Reporte
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
    """

    queryset = Reporte.objects.select_related("categoria")
    pagination_class = ReportePagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsCiudadano()]
        if self.action == "partial_update":
            return [IsAuthenticated(), PuedeEditarReporte()]
        if self.action == "cambiar_estado":
            return [IsAdministrador()]
        if self.action == "foto":
            return [AllowAny()]
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
            return [ScopedRateThrottle()]
        return []

    def get_serializer_class(self):
        if self.action == "create":
            return ReporteCrearSerializer
        if self.action == "partial_update":
            return ReporteEditarSerializer
        return ReporteSerializer

    def _filtrar(self, queryset):
        params = self.request.query_params
        estado = params.get("estado")
        if estado:
            if estado not in Estado.values:
                raise ValidationError({"estado": ["Estado no válido."]})
            queryset = queryset.filter(estado=estado)
        categoria = params.get("categoria")
        if categoria:
            queryset = queryset.filter(categoria__slug=categoria)
        return queryset

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ("list", "mios"):
            queryset = self._filtrar(queryset)
        if self.action == "mios":
            queryset = queryset.filter(autor=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reporte = serializer.save()
        data = ReporteSerializer(reporte, context=self.get_serializer_context()).data
        return Response(data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        reporte = self.get_object()
        serializer = self.get_serializer(reporte, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        reporte = serializer.save()
        return Response(ReporteSerializer(reporte, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"])
    def mios(self, request):
        return self.list(request)

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
