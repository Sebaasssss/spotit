import { forwardRef, useId } from 'react'
import type { Categoria } from '../../api/reportes'
import { AlertIcon, CategoriaIcon, CheckIcon } from '../Icons'

type Props = {
  categorias: Categoria[]
  value: string
  onChange: (slug: string) => void
  error?: string | null
}

/** Radios nativos (teclado y lectores de pantalla gratis) con forma de opciones grandes. */
export const CategoryPicker = forwardRef<HTMLInputElement, Props>(function CategoryPicker(
  { categorias, value, onChange, error },
  ref,
) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined

  return (
    <fieldset className={`field ${error ? 'field--invalid' : ''}`} aria-describedby={errorId}>
      <legend className="field__label">¿Qué tipo de problema es?</legend>
      <div className="choices">
        {categorias.map((categoria, index) => {
          const checked = value === categoria.slug
          return (
            <label key={categoria.slug} className={`choice ${checked ? 'is-checked' : ''}`}>
              <input
                ref={index === 0 ? ref : undefined}
                type="radio"
                name={`${id}-categoria`}
                value={categoria.slug}
                checked={checked}
                onChange={() => onChange(categoria.slug)}
                aria-invalid={error ? true : undefined}
              />
              <span className="choice__icon">
                <CategoriaIcon icono={categoria.icono} size={22} />
              </span>
              <span className="choice__label">{categoria.nombre}</span>
              <span className="choice__check" aria-hidden="true">
                {checked && <CheckIcon size={18} />}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p className="field__error" id={errorId}>
          <AlertIcon size={18} />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  )
})
