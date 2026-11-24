"""Permisos por rol reutilizables en las vistas de la API.

Uso:
    class ReporteViewSet(ModelViewSet):
        permission_classes = [IsOwnerOrAdministrador]
        owner_field = "autor"   # atributo del objeto que apunta al usuario dueño
"""

from rest_framework.permissions import BasePermission

from .models import Rol


def _rol(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated or not user.is_active:
        return None
    return user.rol


class IsAdministrador(BasePermission):
    message = "Solo un administrador puede hacer esto."

    def has_permission(self, request, view):
        return _rol(request) == Rol.ADMINISTRADOR


class IsCiudadano(BasePermission):
    message = "Solo un ciudadano puede hacer esto."

    def has_permission(self, request, view):
        return _rol(request) == Rol.CIUDADANO


class IsOwnerOrAdministrador(BasePermission):
    """Cualquier usuario autenticado pasa a nivel de vista; a nivel de objeto solo el dueño
    o un administrador. El campo del dueño se toma de `view.owner_field` (por defecto "autor").
    """

    message = "No tienes permiso sobre este recurso."
    default_owner_field = "autor"

    def has_permission(self, request, view):
        return _rol(request) is not None

    def has_object_permission(self, request, view, obj):
        if _rol(request) == Rol.ADMINISTRADOR:
            return True
        field = getattr(view, "owner_field", self.default_owner_field)
        owner_id = getattr(obj, f"{field}_id", None)
        if owner_id is None:
            owner = getattr(obj, field, None)
            owner_id = getattr(owner, "pk", None)
        return owner_id is not None and owner_id == request.user.pk
