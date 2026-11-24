import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertIcon, CheckIcon, DotIcon, EyeIcon, EyeOffIcon, Spinner } from '../Icons'
import type { ReactElement } from 'react'

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  error?: string | null
  hint?: ReactNode
}

/** Campo con etiqueta visible, ayuda y error accesibles (aria-describedby / aria-invalid). */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, error, hint, className = '', ...input },
  ref,
) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`field ${error ? 'field--invalid' : ''} ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        {...input}
      />
      {error && <FieldError id={errorId!}>{error}</FieldError>}
      {hint && (
        <div className="field__hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  )
})

export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(function PasswordField(
  { label, error, hint, ...input },
  ref,
) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          ref={ref}
          id={id}
          className="field__input field__input--with-action"
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          {...input}
        />
        <button
          type="button"
          className="field__action"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
        </button>
      </div>
      {error && <FieldError id={errorId!}>{error}</FieldError>}
      {hint && (
        <div className="field__hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  )
})

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="field__error" id={id}>
      <AlertIcon size={18} />
      <span>{children}</span>
    </p>
  )
}

export function Requirements({ items }: { items: { label: string; ok: boolean }[] }) {
  return (
    <ul className="requirements">
      {items.map((item) => (
        <li key={item.label} className={item.ok ? 'is-ok' : undefined}>
          {item.ok ? <CheckIcon size={16} /> : <DotIcon size={16} />}
          <span>
            {item.label}
            <span className="visually-hidden">{item.ok ? ': cumplido' : ': pendiente'}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Error general del formulario (credenciales, red, servidor). */
export function FormAlert({
  children,
  tone = 'error',
  icon,
}: {
  children: ReactNode
  tone?: 'error' | 'info'
  icon?: ReactElement
}) {
  return (
    <div className={`form-alert form-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {icon ?? <AlertIcon size={20} />}
      <div>{children}</div>
    </div>
  )
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean
  pendingLabel: string
  children: ReactNode
}) {
  return (
    <button type="submit" className="btn btn--primary btn--block" aria-disabled={pending} disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
