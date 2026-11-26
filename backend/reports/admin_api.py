"""API del panel de administración: /api/admin/…

Solo administradores (sin sesión: 401; ciudadano: 403). Ve todos los reportes, incluidos
los ocultos. Cada cambio de estado y cada ocultar o mostrar deja un evento en el historial.
"""

from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador

from .admin_serializers import (
    AdminReporteDetalleSerializer,
    AdminReporteListaSerializer,
    CambioEstadoAdminSerializer,
    MostrarSerializer,
    OcultarSerializer,
)
from .models import TRANSICIONES, Categoria, Estado, EventoReporte, Reporte, TipoEvento

ORDENES = {
    "recientes": ("-creado", "-id"),
    "antiguos": ("creado", "id"),
    "votos": ("-num_votos", "-creado", "-id"),
}
Q_MAX = 100
MAS_VOTADOS = 5


class AdminPagination(PageNumberPagination):
    page_size = 25
    page_query_param = "page"


def _valores(texto: str | None) -> list[str]:
    return [v for v in (p.strip() for p in (texto or "").split(",")) if v]


def _fecha(params, nombre) -> date | None:
    valor = params.get(nombre)
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({nombre: ["Usa una fecha AAAA-MM-DD."]}) from None


class AdminReporteViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [IsAdministrador]
    pagination_class = AdminPagination

    def get_serializer_class(self):
        return (
            AdminReporteListaSerializer if self.action == "list" else AdminReporteDetalleSerializer
        )

    def _filtrar(self, queryset):
        params = self.request.query_params
        estados = _valores(params.get("estado"))
        if estados:
            if any(e not in Estado.values for e in estados):
                raise ValidationError({"estado": ["Estado no válido."]})
            queryset = queryset.filter(estado__in=estados)
        categorias = _valores(params.get("categoria"))
        if categorias:
            queryset = queryset.filter(categoria__slug__in=categorias)

        desde, hasta = _fecha(params, "desde"), _fecha(params, "hasta")
        if desde and hasta and desde > hasta:
            raise ValidationError({"hasta": ["La fecha final es anterior a la inicial."]})
        if desde:
            queryset = queryset.filter(creado__date__gte=desde)
        if hasta:
            queryset = queryset.filter(creado__date__lte=hasta)

        votos_min = params.get("votos_min")
        if votos_min:
            if not votos_min.isdigit():
                raise ValidationError({"votos_min": ["Escribe un número entero."]})
            queryset = queryset.filter(num_votos__gte=int(votos_min))

        q = (params.get("q") or "").strip()
        if len(q) > Q_MAX:
            raise ValidationError({"q": [f"La búsqueda no puede pasar de {Q_MAX} caracteres."]})
        if q:
            queryset = queryset.filter(descripcion__icontains=q)

        oculto = params.get("oculto") or "todos"
        if oculto not in ("todos", "si", "no"):
            raise ValidationError({"oculto": ["Usa «todos», «si» o «no»."]})
        if oculto != "todos":
            queryset = queryset.filter(oculto=oculto == "si")

        orden = params.get("orden") or "recientes"
        if orden not in ORDENES:
            raise ValidationError({"orden": ["Usa «recientes», «antiguos» o «votos»."]})
        return queryset.order_by(*ORDENES[orden])

    def get_queryset(self):
        queryset = Reporte.objects.select_related("categoria").annotate(num_votos=Count("votos"))
        if self.action == "list":
            return self._filtrar(queryset)
        return queryset.select_related("autor", "oculto_por").prefetch_related(
            Prefetch(
                "eventos",
                queryset=EventoReporte.objects.select_related("admin").order_by("creado", "id"),
            )
        )

    def _detalle(self, pk):
        reporte = self.get_queryset().get(pk=pk)
        return Response(self.get_serializer(reporte).data)

    def _bloquear(self, pk) -> Reporte:
        """El reporte con su fila bloqueada: dos administradores a la vez se ordenan."""
        self.get_object()  # 404 si no existe (y permisos)
        return Reporte.objects.select_for_update().get(pk=pk)

    @action(detail=True, methods=["post"])
    def estado(self, request, pk=None):
        datos = CambioEstadoAdminSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        nuevo, desde = datos.validated_data["estado"], datos.validated_data["desde"]
        with transaction.atomic():
            reporte = self._bloquear(pk)
            if reporte.estado != desde:
                return Response(
                    {
                        "detail": (
                            "Otra persona cambió el estado a «"
                            f"{Estado(reporte.estado).label}» mientras lo veías. "
                            "Revisa el reporte y vuelve a intentarlo."
                        ),
                        "estado_actual": reporte.estado,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            if nuevo not in TRANSICIONES.get(reporte.estado, set()):
                raise ValidationError(
                    {
                        "estado": [
                            f"No se puede pasar de «{Estado(reporte.estado).label}» "
                            f"a «{Estado(nuevo).label}»."
                        ]
                    }
                )
            EventoReporte.objects.create(
                reporte=reporte,
                tipo=TipoEvento.ESTADO,
                estado_anterior=reporte.estado,
                estado_nuevo=nuevo,
                nota_publica=datos.validated_data.get("nota_publica", ""),
                admin=request.user,
            )
            reporte.estado = nuevo
            reporte.save(update_fields=["estado", "actualizado"])
        return self._detalle(pk)

    @action(detail=True, methods=["post"])
    def ocultar(self, request, pk=None):
        datos = OcultarSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        with transaction.atomic():
            reporte = self._bloquear(pk)
            if reporte.oculto:
                return Response(
                    {"detail": "Este reporte ya está oculto."}, status=status.HTTP_409_CONFLICT
                )
            motivo = datos.validated_data["motivo"]
            EventoReporte.objects.create(
                reporte=reporte,
                tipo=TipoEvento.OCULTAR,
                nota_publica=datos.validated_data.get("nota_publica", ""),
                motivo=motivo,
                admin=request.user,
            )
            reporte.oculto = True
            reporte.oculto_motivo = motivo
            reporte.oculto_por = request.user
            reporte.oculto_en = timezone.now()
            reporte.save(
                update_fields=["oculto", "oculto_motivo", "oculto_por", "oculto_en", "actualizado"]
            )
        return self._detalle(pk)

    @action(detail=True, methods=["post"])
    def mostrar(self, request, pk=None):
        datos = MostrarSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        with transaction.atomic():
            reporte = self._bloquear(pk)
            if not reporte.oculto:
                return Response(
                    {"detail": "Este reporte ya está visible."}, status=status.HTTP_409_CONFLICT
                )
            EventoReporte.objects.create(
                reporte=reporte,
                tipo=TipoEvento.MOSTRAR,
                nota_publica=datos.validated_data.get("nota_publica", ""),
                admin=request.user,
            )
            # El motivo queda en el historial; el reporte vuelve a estar limpio.
            reporte.oculto = False
            reporte.oculto_motivo = ""
            reporte.oculto_por = None
            reporte.oculto_en = None
            reporte.save(
                update_fields=["oculto", "oculto_motivo", "oculto_por", "oculto_en", "actualizado"]
            )
        return self._detalle(pk)


class ResumenView(APIView):
    """Conteos para la portada del panel. Los ocultos se cuentan aparte."""

    permission_classes = [IsAdministrador]

    def get(self, request):
        visibles = Reporte.objects.filter(oculto=False)
        por_estado = {e.value: 0 for e in Estado}
        for fila in visibles.values("estado").annotate(n=Count("id")):
            por_estado[fila["estado"]] = fila["n"]

        por_categoria = [
            {"slug": c.slug, "nombre": c.nombre, "icono": c.icono, "total": c.total}
            for c in Categoria.objects.annotate(
                total=Count("reportes", filter=Q(reportes__oculto=False))
            ).order_by("-total", "orden", "nombre")
            if c.activa or c.total
        ]

        mas_votados = (
            visibles.select_related("categoria")
            .annotate(num_votos=Count("votos"))
            .filter(num_votos__gt=0)
            .order_by("-num_votos", "-creado")[:MAS_VOTADOS]
        )
        return Response(
            {
                "total": sum(por_estado.values()),
                "por_estado": por_estado,
                "por_categoria": por_categoria,
                "ocultos": Reporte.objects.filter(oculto=True).count(),
                "nuevos_7_dias": visibles.filter(
                    creado__gte=timezone.now() - timedelta(days=7)
                ).count(),
                "mas_votados": AdminReporteListaSerializer(
                    mas_votados, many=True, context={"request": request}
                ).data,
            }
        )
