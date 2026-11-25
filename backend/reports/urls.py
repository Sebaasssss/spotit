from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CategoriaListView, ReporteViewSet

router = SimpleRouter()
router.register("reportes", ReporteViewSet, basename="reporte")

urlpatterns = [
    path("categorias/", CategoriaListView.as_view(), name="categoria-list"),
    *router.urls,
]
