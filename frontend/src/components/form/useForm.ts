import { useCallback, useRef, useState, type FormEvent } from 'react'

type Validators<K extends string> = Record<K, (value: string) => string | null>

/**
 * Formulario mínimo: valida cada campo al salir de él, todo al enviar, enfoca el primer
 * error y deja que el servidor añada errores por campo.
 */
export function useForm<K extends string>(initial: Record<K, string>, validators: Validators<K>) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})
  const refs = useRef<Partial<Record<K, HTMLInputElement | null>>>({})
  const keys = Object.keys(initial) as K[]

  const setError = useCallback((key: K, message: string | null) => {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[key] = message
      else delete next[key]
      return next
    })
  }, [])

  const field = (key: K) => ({
    name: key,
    value: values[key],
    ref: (el: HTMLInputElement | null) => {
      refs.current[key] = el
    },
    error: errors[key] ?? null,
    onChange: (event: { target: { value: string } }) => {
      const value = event.target.value
      setValues((prev) => ({ ...prev, [key]: value }))
      // Tras el primer intento, el error se actualiza mientras escribes (y desaparece al corregir).
      if (touched[key]) setError(key, validators[key](value))
    },
    onBlur: () => {
      setTouched((prev) => ({ ...prev, [key]: true }))
      // No regañar por un campo vacío que solo se recorrió con el teclado.
      if (values[key]) setError(key, validators[key](values[key]))
    },
  })

  /** Valida todo; si hay errores, enfoca el primero y devuelve false. */
  const validateAll = () => {
    const next: Partial<Record<K, string>> = {}
    for (const key of keys) {
      const message = validators[key](values[key])
      if (message) next[key] = message
    }
    setErrors(next)
    setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>)
    const first = keys.find((k) => next[k])
    if (first) refs.current[first]?.focus()
    return !first
  }

  /** Aplica errores por campo devueltos por la API. Devuelve true si alguno era de este formulario. */
  const applyServerErrors = (fieldErrors: Record<string, string[]>) => {
    const known = keys.filter((k) => fieldErrors[k]?.length)
    if (!known.length) return false
    setErrors((prev) => {
      const next = { ...prev }
      for (const key of known) next[key] = fieldErrors[key].join(' ')
      return next
    })
    refs.current[known[0]]?.focus()
    return true
  }

  const handleSubmit = (onValid: () => void | Promise<void>) => (event: FormEvent) => {
    event.preventDefault()
    if (validateAll()) void onValid()
  }

  return { values, errors, field, handleSubmit, applyServerErrors, setError }
}
