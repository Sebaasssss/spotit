from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from accounts.models import User
from accounts.permissions import IsAdministrador, IsCiudadano, IsOwnerOrAdministrador


class RolePermissionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ciudadano = User.objects.create_user("c@ejemplo.mx", "clave-ciudadano-1", nombre="C")
        cls.otro = User.objects.create_user("o@ejemplo.mx", "clave-ciudadano-2", nombre="O")
        cls.admin = User.objects.create_superuser("a@ejemplo.mx", "clave-admin-123", nombre="A")
        cls.inactivo = User.objects.create_user(
            "i@ejemplo.mx", "clave-inactivo-1", nombre="I", is_active=False
        )

    def request(self, user):
        request = APIRequestFactory().get("/")
        request.user = user
        return request

    def test_is_administrador(self):
        perm, view = IsAdministrador(), SimpleNamespace()

        self.assertTrue(perm.has_permission(self.request(self.admin), view))
        self.assertFalse(perm.has_permission(self.request(self.ciudadano), view))
        self.assertFalse(perm.has_permission(self.request(AnonymousUser()), view))

    def test_is_ciudadano(self):
        perm, view = IsCiudadano(), SimpleNamespace()

        self.assertTrue(perm.has_permission(self.request(self.ciudadano), view))
        self.assertFalse(perm.has_permission(self.request(self.admin), view))
        self.assertFalse(perm.has_permission(self.request(AnonymousUser()), view))

    def test_usuario_inactivo_no_tiene_rol(self):
        self.assertFalse(IsCiudadano().has_permission(self.request(self.inactivo), None))

    def test_owner_or_admin_con_campo_por_defecto(self):
        perm, view = IsOwnerOrAdministrador(), SimpleNamespace()
        obj = SimpleNamespace(autor_id=self.ciudadano.pk)

        self.assertTrue(perm.has_object_permission(self.request(self.ciudadano), view, obj))
        self.assertTrue(perm.has_object_permission(self.request(self.admin), view, obj))
        self.assertFalse(perm.has_object_permission(self.request(self.otro), view, obj))

    def test_owner_or_admin_con_campo_configurable_en_la_vista(self):
        perm, view = IsOwnerOrAdministrador(), SimpleNamespace(owner_field="creado_por")
        obj = SimpleNamespace(creado_por=self.otro)

        self.assertTrue(perm.has_object_permission(self.request(self.otro), view, obj))
        self.assertFalse(perm.has_object_permission(self.request(self.ciudadano), view, obj))

    def test_owner_or_admin_rechaza_anonimos(self):
        perm = IsOwnerOrAdministrador()

        self.assertFalse(perm.has_permission(self.request(AnonymousUser()), SimpleNamespace()))
        self.assertTrue(perm.has_permission(self.request(self.ciudadano), SimpleNamespace()))

    def test_owner_or_admin_objeto_sin_dueno(self):
        perm = IsOwnerOrAdministrador()

        self.assertFalse(
            perm.has_object_permission(self.request(self.ciudadano), SimpleNamespace(), object())
        )
