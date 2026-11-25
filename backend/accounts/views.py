from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from . import auditoria
from .cookies import (
    clear_refresh_cookie,
    enforce_same_origin,
    get_refresh_cookie,
    set_refresh_cookie,
)
from .rotation import cerrar_gracia, registrar_rotacion, reuse_within_grace
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

NO_STORE = {"Cache-Control": "no-store"}
SESION_INVALIDA = "La sesión expiró o no es válida. Inicia sesión de nuevo."


def _session_response(user, refresh: RefreshToken, status_code=status.HTTP_200_OK):
    """Devuelve el access token en el cuerpo y el refresh en la cookie httpOnly."""
    response = Response(
        {"access": str(refresh.access_token), "user": UserSerializer(user).data},
        status=status_code,
        headers=NO_STORE,
    )
    set_refresh_cookie(response, str(refresh))
    return response


class _PublicAuthView(APIView):
    """Base de los endpoints de sesión: sin autenticación previa y con verificación de origen."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get_authenticate_header(self, request):
        # Sin esto DRF convierte los 401 en 403 al no haber clases de autenticación.
        return 'Bearer realm="api"'

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        enforce_same_origin(request)


class RegisterView(_PublicAuthView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _session_response(user, RefreshToken.for_user(user), status.HTTP_201_CREATED)


class LoginView(_PublicAuthView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        update_last_login(None, user)
        return _session_response(user, RefreshToken.for_user(user))


class RefreshView(_PublicAuthView):
    """Rota el refresh de la cookie (el anterior va a la blacklist) y entrega un access nuevo."""

    def post(self, request):
        raw = get_refresh_cookie(request)
        if not raw:
            return self._unauthorized("No hay una sesión iniciada.", auditoria.SIN_COOKIE)

        serializer = TokenRefreshSerializer(data={"refresh": raw})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken, AuthenticationFailed):
            # ¿Es el token anterior de una rotación cuya respuesta se perdió?
            reused, motivo = reuse_within_grace(raw)
            if reused is None:
                return self._unauthorized(SESION_INVALIDA, motivo, raw)
            user, refresh = reused
            return _session_response(user, refresh)

        data = serializer.validated_data
        user_id = AccessToken(data["access"])["user_id"]
        user = get_user_model().objects.filter(pk=user_id, is_active=True).first()
        if user is None:
            return self._unauthorized(SESION_INVALIDA, auditoria.USUARIO_INACTIVO, raw)

        # Otra renovación simultánea del mismo token cuenta como reintento: nunca dos válidos.
        motivo = registrar_rotacion(raw, data["refresh"])
        if motivo:
            return self._unauthorized(SESION_INVALIDA, motivo, raw)
        response = Response(
            {"access": data["access"], "user": UserSerializer(user).data}, headers=NO_STORE
        )
        set_refresh_cookie(response, data["refresh"])
        return response

    def _unauthorized(self, detail, motivo, raw=None):
        response = Response(
            {"detail": detail}, status=status.HTTP_401_UNAUTHORIZED, headers=NO_STORE
        )
        clear_refresh_cookie(response)
        return auditoria.marcar_401(response, motivo, raw)


class LogoutView(_PublicAuthView):
    """Invalida el refresh (blacklist) y borra la cookie, aunque el access haya caducado."""

    def post(self, request):
        raw = get_refresh_cookie(request)
        if raw:
            cerrar_gracia(raw)
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass  # ya caducado o ya en la blacklist: el resultado es el mismo
        response = Response(status=status.HTTP_204_NO_CONTENT, headers=NO_STORE)
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, headers=NO_STORE)
