from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone


class Rol(models.TextChoices):
    CIUDADANO = "ciudadano", "Ciudadano"
    ADMINISTRADOR = "administrador", "Administrador"


def normalizar_email(email: str) -> str:
    return (email or "").strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        email = normalizar_email(email)
        if not email:
            raise ValueError("El email es obligatorio.")
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """Crea un ciudadano. Es lo único que puede crear el registro público."""
        extra_fields.setdefault("rol", Rol.CIUDADANO)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        """Crea un administrador con acceso al admin de Django (lo usa `createsuperuser`)."""
        extra_fields.setdefault("rol", Rol.ADMINISTRADOR)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields["is_staff"] is not True or extra_fields["is_superuser"] is not True:
            raise ValueError("Un superusuario debe tener is_staff=True e is_superuser=True.")
        return self._create_user(email, password, **extra_fields)

    def get_by_natural_key(self, email):
        return self.get(email__iexact=normalizar_email(email))


class User(AbstractBaseUser, PermissionsMixin):
    """Usuario de SpotIt: inicia sesión con email y tiene un rol.

    `rol` decide los permisos de la API; `is_staff` solo da acceso al admin de Django.
    """

    email = models.EmailField("email", unique=True)
    nombre = models.CharField("nombre", max_length=150)
    rol = models.CharField("rol", max_length=20, choices=Rol.choices, default=Rol.CIUDADANO)
    is_active = models.BooleanField("activo", default=True)
    is_staff = models.BooleanField("acceso al admin", default=False)
    date_joined = models.DateTimeField("fecha de registro", default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["nombre"]

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        ordering = ["-date_joined"]
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
        ]

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        self.email = normalizar_email(self.email)
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        self.email = normalizar_email(self.email)

    @property
    def es_administrador(self) -> bool:
        return self.rol == Rol.ADMINISTRADOR

    @property
    def es_ciudadano(self) -> bool:
        return self.rol == Rol.CIUDADANO

    def get_full_name(self):
        return self.nombre

    def get_short_name(self):
        return self.nombre.split(" ")[0] if self.nombre else self.email
