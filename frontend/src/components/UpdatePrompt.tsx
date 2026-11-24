import { useRegisterSW } from 'virtual:pwa-register/react'

/** Registra el service worker y avisa cuando hay una versión nueva o la app ya funciona offline. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null

  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <div className="toast" role="status">
      <p>{needRefresh ? 'Hay una versión nueva de SpotIt.' : 'SpotIt ya puede abrirse sin conexión.'}</p>
      <div className="toast__actions">
        {needRefresh && (
          <button type="button" className="button" onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </button>
        )}
        <button type="button" className="button button--ghost" onClick={close}>
          {needRefresh ? 'Después' : 'Entendido'}
        </button>
      </div>
    </div>
  )
}
