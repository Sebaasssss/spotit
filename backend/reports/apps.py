from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reports"
    verbose_name = "Reportes"

    def ready(self):
        from . import signals  # noqa: F401
