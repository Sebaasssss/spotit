import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiError, NetworkError } from '../api/client'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import {
  FormAlert,
  PasswordField,
  Requirements,
  SubmitButton,
  TextField,
} from '../components/form/fields'
import { useForm } from '../components/form/useForm'
import { CloudOffIcon } from '../components/Icons'
import { useOnline } from '../lib/useOnline'
import {
  passwordChecks,
  validateEmail,
  validateNewPassword,
  validateNombre,
} from '../lib/validation'

export function Register() {
  const { register } = useAuth()
  const online = useOnline()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm(
    { nombre: '', email: '', password: '' },
    { nombre: validateNombre, email: validateEmail, password: validateNewPassword },
  )

  const submit = form.handleSubmit(async () => {
    setPending(true)
    setFormError(null)
    try {
      await register({
        nombre: form.values.nombre.trim(),
        email: form.values.email.trim(),
        password: form.values.password,
      })
    } catch (error) {
      if (error instanceof ApiError && form.applyServerErrors(error.fieldErrors)) return
      setFormError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Algo salió mal. Inténtalo de nuevo.',
      )
    } finally {
      setPending(false)
    }
  })

  const emailTaken = form.errors.email?.startsWith('Ya existe')

  return (
    <AuthLayout
      title="Crea tu cuenta"
      lead="Tres datos y listo."
      footer={
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" state={location.state}>
            Entra
          </Link>
        </p>
      }
    >
      <form className="form" onSubmit={submit} noValidate>
        {!online && (
          <FormAlert tone="info" icon={<CloudOffIcon size={20} />}>
            Estás sin conexión. Necesitas internet para crear tu cuenta.
          </FormAlert>
        )}
        {/* Sin red manda el aviso de conexión; un error anterior solo confundiría. */}
        {formError && online && <FormAlert>{formError}</FormAlert>}

        <TextField
          label="Nombre"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          {...form.field('nombre')}
        />
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
          hint={
            emailTaken ? (
              <Link to="/entrar" state={location.state}>
                Entrar con ese email
              </Link>
            ) : undefined
          }
          {...form.field('email')}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="new-password"
          enterKeyHint="go"
          required
          hint={<Requirements items={passwordChecks(form.values.password)} />}
          {...form.field('password')}
        />

        <SubmitButton pending={pending} pendingLabel="Creando tu cuenta…">
          Crear cuenta
        </SubmitButton>
      </form>
    </AuthLayout>
  )
}
