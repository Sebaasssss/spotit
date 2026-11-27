from django.urls import path

from .views import ClaveView, SuscripcionView

urlpatterns = [
    path("push/clave/", ClaveView.as_view(), name="push-clave"),
    path("push/suscripciones/", SuscripcionView.as_view(), name="push-suscripciones"),
]
