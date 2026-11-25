import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { FormAlert, PasswordField, SubmitButton, TextField } from '../components/form/fields'
import { useForm } from '../components/form/useForm'
import { CheckIcon, CloudOffIcon, CloudUpIcon } from '../components/Icons'
import { cola } from '../offline/cola'
import { useOnline } from '../lib/useOnline'
import { validateEmail, validateLoginPassword } from '../lib/validation'

export function Login() {
  const auth = useAuth()
  const { login } = auth
  const online = useOnline()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [badCredentials, setBadCredentials] = useState(false)
  const [guardados, setGuardados] = useState(0)

  // Reportes de alguien que salió (o cuya sesión expiró) con la opción "Guardarlos".
  useEffect(() => {
    let vigente = true
    cola.contar().then(
      (n) => vigente && setGuardados(n),
      () => undefined, // sin IndexedDB no hay nada guardado
    )
    return () => {
      vigente = false
    }
  }, [])

  const form = useForm(
    { email: '', password: '' },
    { email: validateEmail, password: validateLoginPassword },
  )

  const submit = form.handleSubmit(async () => {
    setPending(true)
    setFormError(null)
    setBadCredentials(false)
    try {
      await login(form.values.email.trim(), form.values.password)
      // La redirección la hace <PublicOnly> al cambiar la sesión.
    } catch (error) {
      if (error instanceof ApiError && form.applyServerErrors(error.fieldErrors)) return
      setBadCredentials(error instanceof ApiError && error.status === 401)
      setFormError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Algo salió mal. Inténtalo de nuevo.',
      )
    } finally {
      setPending(false)
    }
  })

  const reason = auth.status === 'anonymous' ? auth.reason : undefined

  return (
    <AuthLayout
      title="Entra"
      lead="Con tu cuenta puedes reportar y seguir cada reporte."
      footer={
        <p>
          ¿Primera vez aquí?{' '}
          <Link to="/registro" state={location.state}>
            Crea tu cuenta
          </Link>
        </p>
      }
    >
      <form className="form" onSubmit={submit} noValidate>
        {!online && (
          <FormAlert tone="info" icon={<CloudOffIcon size={20} />}>
            Estás sin conexión. Necesitas internet para entrar.
          </FormAlert>
        )}
        {reason && online && !formError && (
          <FormAlert
            tone="info"
            icon={reason === 'logout' ? <CheckIcon size={20} /> : undefined}
          >
            {reason === 'logout'
              ? 'Cerraste sesión. Vuelve cuando quieras.'
              : 'Tu sesión expiró. Vuelve a entrar para seguir.'}
          </FormAlert>
        )}
        {guardados > 0 && (
          <FormAlert tone="info" icon={<CloudUpIcon size={20} />}>
            {guardados === 1
              ? 'Hay 1 reporte guardado en este teléfono sin enviar. Entra con la cuenta que lo creó y se enviará solo.'
              : `Hay ${guardados} reportes guardados en este teléfono sin enviar. Entra con la cuenta que los creó y se enviarán solos.`}
          </FormAlert>
        )}
        {/* Sin red manda el aviso de conexión; un error anterior solo confundiría. */}
        {formError && online && (
          <FormAlert>
            <p>{formError}</p>
            {badCredentials && (
              <p className="form-alert__help">
                Revisa que estén bien escritos; la contraseña distingue mayúsculas.{' '}
                <Link to="/registro" state={location.state}>
                  ¿Aún no tienes cuenta? Créala
                </Link>
              </p>
            )}
          </FormAlert>
        )}

        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          {...form.field('email')}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          {...form.field('password')}
        />

        <SubmitButton pending={pending} pendingLabel="Entrando…">
          Entrar
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
