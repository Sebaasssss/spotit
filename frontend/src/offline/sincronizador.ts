/**
 * Envía la cola de reportes pendientes.
 *
 * No depende de Background Sync (no existe en iOS): la app llama a `sincronizar()` al
 * abrirse, al volver la conexión (`online`), al volver a primer plano y con el botón
 * "Enviar ahora". Mientras la app está abierta, un temporizador reintenta cuando toca.
 *
 * - Un solo envío a la vez, también entre pestañas (Web Locks). Aun así, si dos envíos
 *   se cruzaran, la clave de idempotencia evita el duplicado en el servidor.
 * - Sin red, límite por hora o servidor caído: se detiene la vuelta y se espera.
 * - Sesión inválida: los pendientes se quedan hasta que esa persona vuelva a entrar.
 * - Rechazo por los datos: queda en "error" para que la persona decida.
 */

import { crearReporte, type Reporte } from '../api/reportes'
import { clasificar, type Decision } from './clasificar'
import { cola, pedirPersistencia, type DatosPendiente, type Pendiente } from './cola'

export type Instantanea = {
  usuario: number | null
  /** Pendientes de la persona actual, del más antiguo al más nuevo. */
  pendientes: Pendiente[]
  cargado: boolean
  /** El que se está subiendo ahora y su progreso (0–1). */
  enviando: { clave: string; progreso: number } | null
  /** Hay una vuelta de envío en curso. */
  sincronizando: boolean
  /** Último mensaje para lectores de pantalla (el id cambia aunque el texto se repita). */
  anuncio: { id: number; texto: string } | null
}

export type ResultadoFormulario =
  | { tipo: 'enviado'; reporte: Reporte }
  /** Se queda en la cola y se enviará solo. */
  | { tipo: 'guardado'; mensaje: string }
  /** El servidor rechazó los datos: se quitó de la cola para corregirlo en el formulario. */
  | { tipo: 'rechazado'; error: unknown }

type Intento = { tipo: 'enviado'; reporte: Reporte } | (Decision & { causa: unknown })

export type Dependencias = {
  enviar: (pendiente: Pendiente, onProgress: (fraccion: number) => void) => Promise<Reporte>
  ahora: () => number
  online: () => boolean
  nuevaClave: () => string
}

const CANDADO = 'spotit-cola'

export function crearSincronizador(deps: Dependencias) {
  let estado: Instantanea = {
    usuario: null,
    pendientes: [],
    cargado: false,
    enviando: null,
    sincronizando: false,
    anuncio: null,
  }
  const oyentes = new Set<() => void>()
  let idAnuncio = 0
  let temporizador: ReturnType<typeof setTimeout> | null = null
  /** Reportes enviados en esta sesión de la app, por clave (para el formulario). */
  const enviados = new Map<string, Reporte>()

  function cambiar(cambios: Partial<Instantanea>) {
    estado = { ...estado, ...cambios }
    for (const oyente of oyentes) oyente()
  }

  function anunciar(texto: string) {
    cambiar({ anuncio: { id: ++idAnuncio, texto } })
  }

  async function recargar() {
    const usuario = estado.usuario
    const pendientes = usuario == null ? [] : await cola.listar(usuario)
    if (usuario === estado.usuario) cambiar({ pendientes, cargado: true })
  }

  // --- Exclusión mutua: en esta pestaña con una cadena de promesas, entre pestañas con Web Locks.

  let cadena: Promise<unknown> = Promise.resolve()

  function conCandado<T>(tarea: () => Promise<T>): Promise<T> {
    const correr = () =>
      typeof navigator !== 'undefined' && navigator.locks?.request
        ? (navigator.locks.request(CANDADO, tarea) as Promise<T>)
        : tarea()
    const resultado = cadena.then(correr, correr)
    cadena = resultado.catch(() => undefined)
    return resultado
  }

  // --- Un intento ---

  async function intentar(pendiente: Pendiente, onProgress?: (f: number) => void): Promise<Intento> {
    await cola.actualizar(pendiente.clave, { estado: 'enviando' })
    cambiar({ enviando: { clave: pendiente.clave, progreso: 0 } })
    await recargar()
    try {
      const reporte = await deps.enviar(pendiente, (fraccion) => {
        cambiar({ enviando: { clave: pendiente.clave, progreso: fraccion } })
        onProgress?.(fraccion)
      })
      await cola.borrar(pendiente.clave)
      enviados.set(pendiente.clave, reporte)
      return { tipo: 'enviado', reporte }
    } catch (causa) {
      const intentos = pendiente.intentos + 1
      const decision = clasificar(causa, intentos, deps.ahora())
      if (decision.tipo === 'esperar') {
        await cola.actualizar(pendiente.clave, {
          estado: 'pendiente',
          intentos,
          proximoIntento: decision.hasta,
          motivo: decision.motivo,
          error: decision.mensaje,
        })
      } else if (decision.tipo === 'sesion') {
        // No cuenta como intento: no es culpa del reporte.
        await cola.actualizar(pendiente.clave, {
          estado: 'pendiente',
          proximoIntento: 0,
          motivo: 'sesion',
          error: decision.mensaje,
        })
      } else {
        await cola.actualizar(pendiente.clave, {
          estado: 'error',
          intentos,
          motivo: null,
          error: decision.mensaje,
        })
      }
      return { ...decision, causa }
    } finally {
      cambiar({ enviando: null })
    }
  }

  // --- Vuelta completa ---

  async function vuelta(forzar: boolean) {
    const usuario = estado.usuario
    if (usuario == null) return
    // Con el candado tomado nadie más envía: un "enviando" es de una app que se cerró a mitad.
    await cola.recuperarEnviando()
    if (!deps.online()) {
      await recargar()
      return
    }
    let enviadosAhora = 0
    let rechazados = 0
    for (const pendiente of await cola.listar(usuario)) {
      if (estado.usuario !== usuario) break
      if (pendiente.estado !== 'pendiente') continue
      const espera = pendiente.proximoIntento > deps.ahora()
      // Forzar adelanta los reintentos por red o servidor, nunca el límite por hora (otro 429).
      if (espera && (!forzar || pendiente.motivo === 'limite')) continue
      const resultado = await intentar(pendiente)
      if (resultado.tipo === 'enviado') enviadosAhora++
      else if (resultado.tipo === 'error') rechazados++
      // Sin red, límite, servidor caído o sesión: los demás fallarían igual.
      else break
    }
    await recargar()
    if (enviadosAhora === 1) anunciar('Se envió 1 reporte pendiente.')
    else if (enviadosAhora > 1) anunciar(`Se enviaron ${enviadosAhora} reportes pendientes.`)
    if (rechazados) {
      anunciar(
        rechazados === 1
          ? 'Un reporte pendiente no se pudo enviar. Revísalo en Mis reportes.'
          : `${rechazados} reportes pendientes no se pudieron enviar. Revísalos en Mis reportes.`,
      )
    }
  }

  let enCurso: Promise<void> | null = null
  let otraVuelta: { forzar: boolean } | null = null

  /** Envía lo que toque. Si ya hay una vuelta en curso, se encadena otra al terminar. */
  function sincronizar({ forzar = false }: { forzar?: boolean } = {}): Promise<void> {
    if (estado.usuario == null) return Promise.resolve()
    if (enCurso) {
      otraVuelta = { forzar: forzar || Boolean(otraVuelta?.forzar) }
      return enCurso
    }
    cambiar({ sincronizando: true })
    enCurso = conCandado(() => vuelta(forzar))
      .catch(() => undefined) // un fallo de IndexedDB no debe romper la app; se reintenta luego
      .finally(() => {
        enCurso = null
        cambiar({ sincronizando: false })
        const siguiente = otraVuelta
        otraVuelta = null
        if (siguiente) void sincronizar(siguiente)
        else programar()
      })
    return enCurso
  }

  /** Mientras la app está abierta, reintenta cuando le toca al próximo pendiente. */
  function programar() {
    if (temporizador) clearTimeout(temporizador)
    temporizador = null
    if (estado.usuario == null) return
    const proximos = estado.pendientes
      .filter((p) => p.estado === 'pendiente' && p.motivo !== 'sesion')
      .map((p) => p.proximoIntento)
    if (!proximos.length) return
    const espera = Math.min(Math.max(Math.min(...proximos) - deps.ahora(), 1_000), 2 ** 31 - 1)
    temporizador = setTimeout(() => void sincronizar(), espera)
  }

  // --- Formulario: guardar primero, luego intentar enviar ese mismo reporte ---

  async function guardarYEnviar(
    usuario: number,
    datos: DatosPendiente,
    foto: Blob,
    onProgress?: (f: number) => void,
  ): Promise<ResultadoFormulario> {
    const pendiente: Pendiente = {
      clave: deps.nuevaClave(),
      usuario,
      creado: deps.ahora(),
      datos,
      foto: { buffer: await foto.arrayBuffer(), tipo: foto.type || 'image/jpeg' },
      estado: 'pendiente',
      intentos: 0,
      proximoIntento: 0,
      motivo: null,
      error: null,
    }
    await cola.agregar(pendiente) // ColaLlena o SinEspacio llegan al formulario
    void pedirPersistencia()

    if (!deps.online()) {
      await recargar()
      anunciar('Reporte guardado en este teléfono. Se enviará cuando vuelva la conexión.')
      return {
        tipo: 'guardado',
        mensaje: 'Estás sin conexión. Se enviará solo cuando vuelva la señal.',
      }
    }

    const resultado = await conCandado(async (): Promise<ResultadoFormulario> => {
      const actual = await cola.obtener(pendiente.clave)
      if (!actual) {
        // Otra vuelta lo envió mientras esperábamos el candado.
        const reporte = enviados.get(pendiente.clave)
        return reporte
          ? { tipo: 'enviado', reporte }
          : { tipo: 'guardado', mensaje: 'Se está enviando.' }
      }
      const intento = await intentar(actual, onProgress)
      if (intento.tipo === 'enviado') return intento
      if (intento.tipo === 'error') {
        // Se corrige en el propio formulario: no tiene sentido dejarlo en la cola.
        await cola.borrar(pendiente.clave)
        return { tipo: 'rechazado', error: intento.causa }
      }
      return { tipo: 'guardado', mensaje: intento.mensaje }
    })
    await recargar()
    programar()
    if (resultado.tipo === 'guardado') {
      anunciar('Reporte guardado en este teléfono. Se enviará cuando sea posible.')
    }
    return resultado
  }

  return {
    suscribir(oyente: () => void) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
    instantanea: () => estado,
    sincronizar,
    /** Mensaje para lectores de pantalla (p. ej. cambios de conexión). */
    anunciar,
    guardarYEnviar,

    /** Persona con sesión (solo ciudadanos tienen cola). Cambiarla recarga y envía. */
    async setUsuario(usuario: number | null) {
      if (usuario === estado.usuario) return
      if (temporizador) clearTimeout(temporizador)
      temporizador = null
      enviados.clear()
      cambiar({ usuario, pendientes: [], cargado: usuario == null, enviando: null })
      if (usuario == null) return
      await recargar()
      // Abrir la app o entrar es la señal para intentarlo ya (salvo el límite por hora).
      await sincronizar({ forzar: true })
    },

    /** "Reintentar": vuelve a la cola y se intenta ya. */
    async reintentar(clave: string) {
      await cola.actualizar(clave, { estado: 'pendiente', proximoIntento: 0, motivo: null })
      await recargar()
      await sincronizar({ forzar: true })
    },

    /** "Descartar": se borra del teléfono (no se puede deshacer). */
    async descartar(clave: string): Promise<boolean> {
      if (estado.enviando?.clave === clave) return false
      return conCandado(async () => {
        await cola.borrar(clave)
        await recargar()
        anunciar('Reporte descartado.')
        return true
      })
    },

    /** Cierre de sesión con "Borrarlos y salir". */
    async borrarTodos(usuario: number) {
      await conCandado(() => cola.borrarDeUsuario(usuario))
      await recargar()
    },

    /** Solo para pruebas. */
    detener() {
      if (temporizador) clearTimeout(temporizador)
      temporizador = null
    },
  }
}

export type Sincronizador = ReturnType<typeof crearSincronizador>

function aBlob(pendiente: Pendiente) {
  return new Blob([pendiente.foto.buffer], { type: pendiente.foto.tipo })
}

export const sincronizador = crearSincronizador({
  enviar: (pendiente, onProgress) => {
    const { categoriaNombre: _nombre, ...datos } = pendiente.datos
    return crearReporte({ ...datos, foto: aBlob(pendiente) }, onProgress, pendiente.clave)
  },
  ahora: () => Date.now(),
  online: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  nuevaClave: () => crypto.randomUUID(),
})
