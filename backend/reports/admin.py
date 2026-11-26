from django.contrib import admin
from django.utils.html import format_html

from .models import Categoria, EventoReporte, Reporte
from .storage import foto_url


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "slug", "icono", "orden", "activa")
    list_editable = ("orden", "activa")
    search_fields = ("nombre", "slug")
    prepopulated_fields = {"slug": ("nombre",)}


class EventoInline(admin.TabularInline):
    model = EventoReporte
    extra = 0
    can_delete = False
    fields = (
        "creado",
        "tipo",
        "estado_anterior",
        "estado_nuevo",
        "nota_publica",
        "motivo",
        "admin",
    )
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Reporte)
class ReporteAdmin(admin.ModelAdmin):
    """Solo consulta. Los reportes se gestionan en el panel de la PWA (/admin-panel), que
    deja historial de cada cambio; aquí no se cambia nada para no saltárselo."""

    list_display = ("id", "categoria", "estado", "oculto", "autor", "creado")
    list_filter = ("estado", "oculto", "categoria")
    search_fields = ("descripcion", "autor__email")
    date_hierarchy = "creado"
    inlines = [EventoInline]
    fields = (
        "vista_foto",
        "estado",
        "categoria",
        "descripcion",
        ("latitud", "longitud"),
        ("precision_m", "origen_ubicacion"),
        "autor",
        ("creado", "actualizado"),
        ("oculto", "oculto_en", "oculto_por"),
        "oculto_motivo",
    )
    readonly_fields = tuple(
        campo for grupo in fields for campo in (grupo if isinstance(grupo, tuple) else (grupo,))
    )

    def has_add_permission(self, request):
        return False  # los reportes se crean desde la app

    def has_change_permission(self, request, obj=None):
        return False  # se gestionan en el panel, con historial

    @admin.display(description="Foto")
    def vista_foto(self, obj):
        if not obj.pk or not obj.miniatura:
            return "—"
        return format_html(
            '<a href="{}" target="_blank" rel="noopener"><img src="{}" alt="" '
            'style="max-width:320px;border-radius:8px"></a>',
            foto_url(None, obj, "completa", admin=True),
            foto_url(None, obj, "miniatura", admin=True),
        )
