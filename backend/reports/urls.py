from django.urls import path
from rest_framework.routers import SimpleRouter

from .admin_api import AdminReporteViewSet, ResumenView
from .views import CategoriaListView, ReporteViewSet

router = SimpleRouter()
router.register("reportes", ReporteViewSet, basename="reporte")
# Panel de administración (solo administradores). El admin de Django sigue en /admin/.
router.register("admin/reportes", AdminReporteViewSet, basename="admin-reporte")

urlpatterns = [
    path("categorias/", CategoriaListView.as_view(), name="categoria-list"),
    path("admin/resumen/", ResumenView.as_view(), name="admin-resumen"),
    *router.urls,
]
