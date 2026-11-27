from django.contrib import admin

from .models import AvisoPush, SuscripcionPush


@admin.register(SuscripcionPush)
class SuscripcionPushAdmin(admin.ModelAdmin):
    """Solo consulta: las suscripciones las gestiona cada dispositivo."""

    list_display = ("id", "usuario", "creado", "ultimo_envio")
    fields = ("usuario", "creado", "actualizado", "ultimo_envio")
    readonly_fields = fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AvisoPush)
class AvisoPushAdmin(admin.ModelAdmin):
    list_display = ("id", "estado", "intentos", "error", "creado", "enviado_en")
    list_filter = ("estado",)
    fields = ("estado", "cuerpo", "url", "intentos", "error", "creado", "enviado_en", "caduca")
    readonly_fields = fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
