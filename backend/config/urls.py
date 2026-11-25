from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "SpotIt · Administración"
admin.site.site_title = "SpotIt"
admin.site.index_title = "Panel"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("reports.urls")),
]
