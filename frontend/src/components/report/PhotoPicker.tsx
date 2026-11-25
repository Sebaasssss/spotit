import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { FotoNoValida, prepararFoto, type FotoPreparada } from '../../lib/foto'
import { AlertIcon, CameraIcon, ImageIcon, Spinner } from '../Icons'

type Props = {
  value: FotoPreparada | null
  onChange: (foto: FotoPreparada | null) => void
  error?: string | null
}

/**
 * Foto obligatoria. "Tomar foto" abre la cámara del sistema (`capture`) y "Elegir de la
 * galería" el selector de archivos: ninguno pide permiso de cámara a la web, y la galería
 * funciona aunque la persona haya bloqueado la cámara.
 */
export const PhotoPicker = forwardRef<HTMLButtonElement, Props>(function PhotoPicker(
  { value, onChange, error },
  ref,
) {
  const id = useId()
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!value) return
    const url = URL.createObjectURL(value.blob)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const elegir = async (input: HTMLInputElement | null) => {
    const file = input?.files?.[0]
    if (input) input.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setProcesando(true)
    setErrorLocal(null)
    try {
      onChange(await prepararFoto(file))
    } catch (err) {
      setErrorLocal(err instanceof FotoNoValida ? err.message : 'No se pudo usar esa foto.')
    } finally {
      setProcesando(false)
    }
  }

  const mensaje = errorLocal ?? error ?? null
  const errorId = mensaje ? `${id}-error` : undefined

  return (
    <fieldset className={`field picker ${mensaje ? 'field--invalid' : ''}`} aria-describedby={errorId}>
      <legend className="field__label">Foto</legend>

      {value && preview ? (
        <figure className="photo-preview">
          <img src={preview} alt="Vista previa de la foto del reporte" />
        </figure>
      ) : (
        <p className="picker__hint">Una foto clara ayuda a encontrar y arreglar el problema.</p>
      )}

      <div className="picker__actions">
        <button
          ref={ref}
          type="button"
          className="btn btn--secondary"
          onClick={() => camara.current?.click()}
          disabled={procesando}
        >
          <CameraIcon size={20} />
          <span>{value ? 'Tomar otra' : 'Tomar foto'}</span>
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => galeria.current?.click()}
          disabled={procesando}
        >
          <ImageIcon size={20} />
          <span>{value ? 'Elegir otra' : 'Elegir de la galería'}</span>
        </button>
      </div>

      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void elegir(e.currentTarget)}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/*,.heic,.heif"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="foto-galeria"
        onChange={(e) => void elegir(e.currentTarget)}
      />

      {procesando && (
        <p className="picker__status" role="status">
          <Spinner size={18} /> Preparando la foto…
        </p>
      )}
      {mensaje && (
        <p className="field__error" id={errorId} role="alert">
          <AlertIcon size={18} />
          <span>{mensaje}</span>
        </p>
      )}
    </fieldset>
  )
})
