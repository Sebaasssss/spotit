from io import StringIO

from django.core.management import call_command
from django.db import IntegrityError
from django.test import TestCase

from accounts.models import Rol, User


class UserManagerTests(TestCase):
    def test_create_user_crea_ciudadano_sin_acceso_al_admin(self):
        user = User.objects.create_user("Ana@Ejemplo.MX", "una-clave-segura-1", nombre="Ana")

        self.assertEqual(user.email, "ana@ejemplo.mx")
        self.assertEqual(user.rol, Rol.CIUDADANO)
        self.assertTrue(user.es_ciudadano)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password("una-clave-segura-1"))

    def test_create_superuser_crea_administrador(self):
        admin = User.objects.create_superuser(
            "admin@ejemplo.mx", "otra-clave-segura", nombre="Admin"
        )

        self.assertEqual(admin.rol, Rol.ADMINISTRADOR)
        self.assertTrue(admin.es_administrador)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_comando_createsuperuser_crea_administrador(self):
        call_command(
            "createsuperuser",
            "--noinput",
            email="cli@ejemplo.mx",
            nombre="Desde CLI",
            stdout=StringIO(),
        )

        user = User.objects.get(email="cli@ejemplo.mx")
        self.assertEqual(user.rol, Rol.ADMINISTRADOR)
        self.assertTrue(user.is_staff)

    def test_email_obligatorio(self):
        with self.assertRaises(ValueError):
            User.objects.create_user("", "una-clave-segura-1", nombre="Sin email")

    def test_email_unico_sin_importar_mayusculas(self):
        User.objects.create_user("luis@ejemplo.mx", "una-clave-segura-1", nombre="Luis")

        with self.assertRaises(IntegrityError):
            User.objects.create_user("LUIS@ejemplo.mx", "una-clave-segura-1", nombre="Otro")

    def test_buscar_por_email_ignora_mayusculas(self):
        user = User.objects.create_user("eva@ejemplo.mx", "una-clave-segura-1", nombre="Eva")

        self.assertEqual(User.objects.get_by_natural_key("  EVA@Ejemplo.mx "), user)
