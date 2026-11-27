from django.db.models.signals import post_save
from django.dispatch import receiver

from reports.models import EventoReporte

from .servicio import encolar_por_evento


@receiver(post_save, sender=EventoReporte)
def avisar_al_autor(sender, instance, created, **kwargs):
    """Cada evento nuevo del historial encola sus avisos en la misma transacción."""
    if created:
        encolar_por_evento(instance)
