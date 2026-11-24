from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from .models import User, normalizar_email

CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos."


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "nombre", "rol", "date_joined")
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    """Registro público: siempre crea un ciudadano. Un campo `rol` enviado se ignora."""

    email = serializers.EmailField(max_length=254)
    nombre = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_email(self, value):
        email = normalizar_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return email

    def validate_nombre(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("Escribe tu nombre (al menos 2 caracteres).")
        return value

    def validate(self, attrs):
        candidate = User(email=attrs["email"], nombre=attrs["nombre"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            nombre=validated_data["nombre"],
            password=validated_data["password"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=normalizar_email(attrs["email"]),
            password=attrs["password"],
        )
        # Mismo mensaje si el email no existe, la contraseña falla o la cuenta está inactiva.
        if user is None:
            raise AuthenticationFailed(CREDENCIALES_INVALIDAS)
        attrs["user"] = user
        return attrs
