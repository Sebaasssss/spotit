from rest_framework.permissions import BasePermission

from .models import Estado


class PuedeEditarReporte(BasePermission):
    """El autor edita su reporte solo mientras sigue en `recibido`.

    El administrador no edita el contenido: solo cambia el estado (otro endpoint).
    """

    def has_object_permission(self, request, view, obj):
        if not obj.es_de(request.user):
            self.message = "Solo quien creó el reporte puede editarlo."
            return False
        if obj.estado != Estado.RECIBIDO:
            self.message = "Este reporte ya se está atendiendo y no se puede editar."
            return False
        return True
