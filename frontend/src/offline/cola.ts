/**
 * Cola de reportes pendientes de enviar, en IndexedDB.
 *
 * Cada reporte se guarda con su clave (UUID que el servidor usa para no duplicarlo), la
 * foto ya reducida (ArrayBuffer + tipo: más robusto que un Blob en Safari) y su estado.
 * Pertenece a una persona (`usuario`): quien entre con otra cuenta en el mismo teléfono
 * no la ve ni la envía.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { OrigenUbicacion } from '../api/reportes'

/** Máximo de pendientes por persona: igual al límite de envíos por hora del servidor. */
export const TOPE_PENDIENTES = 20

export type EstadoPendiente = 'pendiente' | 'enviando' | 'error'

/** Por qué espera un pendiente (solo informativo para la pantalla). */
export type MotivoEspera = 'red' | 'limite' | 'servidor' | 'sesion'

export type DatosPendiente = {
  categoria: string
  /** Nombre visible de la categoría, para mostrarla sin conexión. */
  categoriaNombre: string
  descripcion: string
  latitud: number
  longitud: number
  precision_m: number | null
  origen_ubicacion: OrigenUbicacion
}

export type Pendiente = {
  clave: string
  usuario: number
  /** Epoch ms en que se guardó. */
  creado: number
  datos: DatosPendiente
  foto: { buffer: ArrayBuffer; tipo: string }
  estado: EstadoPendiente
  intentos: number
  /** Epoch ms a partir del cual se puede volver a intentar solo (0 = ya). */
  proximoIntento: number
  motivo: MotivoEspera | null
  /** Mensaje del último fallo (para `error`, el del servidor). */
  error: string | null
}

interface SpotItDB extends DBSchema {
  pendientes: {
    key: string
    value: Pendiente
    indexes: { usuario: number }
  }
}

export class ColaLlena extends Error {
  constructor() {
    super(
      `Ya tienes ${TOPE_PENDIENTES} reportes esperando conexión. Envíalos o descarta alguno antes de guardar otro.`,
    )
    this.name = 'ColaLlena'
  }
}

export class SinEspacio extends Error {
  constructor() {
    super(
      'El teléfono no tiene espacio para guardar el reporte. Libera espacio o envíalo con conexión.',
    )
    this.name = 'SinEspacio'
  }
}

const NOMBRE_DB = 'spotit'

let dbPromise: Promise<IDBPDatabase<SpotItDB>> | null = null

function db() {
  dbPromise ??= openDB<SpotItDB>(NOMBRE_DB, 1, {
    upgrade(base) {
      const store = base.createObjectStore('pendientes', { keyPath: 'clave' })
      store.createIndex('usuario', 'usuario')
    },
    // Otra pestaña con una versión nueva de la base: cerrar para no bloquearla.
    blocking() {
      void dbPromise?.then((d) => d.close())
      dbPromise = null
    },
  })
  return dbPromise
}

/** Solo para pruebas: olvida la conexión abierta (p. ej. tras borrar la base). */
export async function cerrarParaPruebas() {
  if (dbPromise) (await dbPromise).close()
  dbPromise = null
}

function esCuotaExcedida(error: unknown) {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

/** Comprueba antes de guardar que queda sitio (si el navegador lo informa). */
async function hayEspacio(bytes: number): Promise<boolean> {
  try {
    const estimacion = await navigator.storage?.estimate?.()
    if (!estimacion?.quota || estimacion.usage == null) return true
    // Margen: el doble de la foto y 1 MB para la propia base.
    return estimacion.quota - estimacion.usage > bytes * 2 + 1024 * 1024
  } catch {
    return true
  }
}

let persistenciaPedida = false

/**
 * Pide almacenamiento persistente para que el navegador no borre la cola si falta espacio.
 * Se llama al guardar el primer pendiente (en contexto, no al abrir la app). Chrome lo
 * concede sin preguntar a una PWA instalada; si se niega, la cola funciona igual.
 */
export async function pedirPersistencia(): Promise<boolean | null> {
  if (persistenciaPedida || !navigator.storage?.persist) return null
  persistenciaPedida = true
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export const cola = {
  async listar(usuario: number): Promise<Pendiente[]> {
    const lista = await (await db()).getAllFromIndex('pendientes', 'usuario', usuario)
    return lista.sort((a, b) => a.creado - b.creado)
  },

  async contar(usuario?: number): Promise<number> {
    const base = await db()
    return usuario == null
      ? base.count('pendientes')
      : base.countFromIndex('pendientes', 'usuario', usuario)
  },

  async obtener(clave: string): Promise<Pendiente | undefined> {
    return (await db()).get('pendientes', clave)
  },

  /** Guarda un pendiente nuevo. Lanza ColaLlena o SinEspacio con un mensaje claro. */
  async agregar(pendiente: Pendiente): Promise<void> {
    if ((await this.contar(pendiente.usuario)) >= TOPE_PENDIENTES) throw new ColaLlena()
    if (!(await hayEspacio(pendiente.foto.buffer.byteLength))) throw new SinEspacio()
    try {
      await (await db()).add('pendientes', pendiente)
    } catch (error) {
      if (esCuotaExcedida(error)) throw new SinEspacio()
      throw error
    }
  },

  /** Cambia campos de un pendiente que aún existe. Devuelve false si ya no está. */
  async actualizar(clave: string, cambios: Partial<Omit<Pendiente, 'clave'>>): Promise<boolean> {
    const base = await db()
    const tx = base.transaction('pendientes', 'readwrite')
    const actual = await tx.store.get(clave)
    if (actual) await tx.store.put({ ...actual, ...cambios })
    await tx.done
    return Boolean(actual)
  },

  async borrar(clave: string): Promise<void> {
    await (await db()).delete('pendientes', clave)
  },

  async borrarDeUsuario(usuario: number): Promise<void> {
    const base = await db()
    const tx = base.transaction('pendientes', 'readwrite')
    let cursor = await tx.store.index('usuario').openCursor(usuario)
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    await tx.done
  },

  /**
   * Un envío que quedó "enviando" (la app se cerró a mitad) vuelve a "pendiente".
   * Solo se llama con el candado de la cola tomado: nadie más está enviando.
   */
  async recuperarEnviando(): Promise<void> {
    const base = await db()
    const tx = base.transaction('pendientes', 'readwrite')
    let cursor = await tx.store.openCursor()
    while (cursor) {
      if (cursor.value.estado === 'enviando') {
        await cursor.update({ ...cursor.value, estado: 'pendiente' })
      }
      cursor = await cursor.continue()
    }
    await tx.done
  },
}
