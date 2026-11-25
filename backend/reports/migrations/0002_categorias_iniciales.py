from django.db import migrations

CATEGORIAS = [
    ("Baches y pavimento", "baches-y-pavimento", "bache"),
    ("Alumbrado", "alumbrado", "alumbrado"),
    ("Agua y drenaje", "agua-y-drenaje", "agua"),
    ("Basura y limpieza", "basura-y-limpieza", "basura"),
    ("Áreas verdes", "areas-verdes", "areas-verdes"),
    ("Banquetas y accesibilidad", "banquetas-y-accesibilidad", "banqueta"),
    ("Señalización y mobiliario", "senalizacion-y-mobiliario", "senal"),
    ("Edificios e instalaciones", "edificios-e-instalaciones", "edificio"),
    ("Otro", "otro", "otro"),
]


def crear(apps, schema_editor):
    Categoria = apps.get_model("reports", "Categoria")
    for orden, (nombre, slug, icono) in enumerate(CATEGORIAS, start=1):
        Categoria.objects.update_or_create(
            slug=slug, defaults={"nombre": nombre, "icono": icono, "orden": orden * 10}
        )


def borrar(apps, schema_editor):
    Categoria = apps.get_model("reports", "Categoria")
    Categoria.objects.filter(slug__in=[slug for _, slug, _ in CATEGORIAS], reportes=None).delete()


class Migration(migrations.Migration):
    dependencies = [("reports", "0001_initial")]

    operations = [migrations.RunPython(crear, borrar)]
