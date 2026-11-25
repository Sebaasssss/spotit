from django.contrib import admin
from django.utils.html import format_html

from .models import Categoria, Reporte
from .storage import foto_url


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "slug", "icono", "orden", "activa")
    list_editable = ("orden", "activa")
    search_fields = ("nombre", "slug")
    prepopulated_fields = {"slug": ("nombre",)}


@admin.register(Reporte)
class ReporteAdmin(admin.ModelAdmin):
    """El contenido es del ciudadano: aquí solo se cambia el estado."""

    list_display = ("id", "categoria", "estado", "autor", "creado")
    list_filter = ("estado", "categoria")
    search_fields = ("descripcion", "autor__email")
    date_hierarchy = "creado"
    readonly_fields = (
        "vista_foto",
        "autor",
        "categoria",
        "descripcion",
        "latitud",
        "longitud",
        "precision_m",
        "origen_ubicacion",
        "creado",
        "actualizado",
    )
    fields = (
        "vista_foto",
        "estado",
        "categoria",
        "descripcion",
        ("latitud", "longitud"),
        ("precision_m", "origen_ubicacion"),
        "autor",
        ("creado", "actualizado"),
    )

    def has_add_permission(self, request):
        return False  # los reportes se crean desde la app

    @admin.display(description="Foto")
    def vista_foto(self, obj):
        if not obj.pk or not obj.miniatura:
            return "—"
        return format_html(
            '<a href="{}" target="_blank" rel="noopener"><img src="{}" alt="" '
            'style="max-width:320px;border-radius:8px"></a>',
            foto_url(None, obj, "completa"),
            foto_url(None, obj, "miniatura"),
        )
