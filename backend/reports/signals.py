from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Reporte


@receiver(post_delete, sender=Reporte)
def borrar_archivos(sender, instance, **kwargs):
    """Al borrar un reporte (p. ej. desde el admin) se borran también sus fotos."""
    for campo in (instance.foto, instance.miniatura):
        if campo:
            campo.delete(save=False)
