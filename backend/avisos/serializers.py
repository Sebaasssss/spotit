from rest_framework import serializers


class ClavesSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=200)
    auth = serializers.CharField(max_length=100)


class SuscripcionSerializer(serializers.Serializer):
    """Lo que entrega `PushSubscription.toJSON()` en el navegador."""

    endpoint = serializers.URLField(max_length=1000)
    keys = ClavesSerializer()

    def validate_endpoint(self, valor):
        # Solo servicios de push por HTTPS (FCM, Mozilla, Apple…), nunca otra cosa.
        if not valor.startswith("https://"):
            raise serializers.ValidationError("El endpoint debe ser HTTPS.")
        return valor


class QuitarSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=1000)
