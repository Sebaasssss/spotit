from django.apps import AppConfig


class AvisosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "avisos"
    verbose_name = "Notificaciones push"

    def ready(self):
        from . import signals  # noqa: F401
