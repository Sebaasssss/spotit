import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { accessTokenStore } from '../../api/client'
import { clearLocalSession } from '../../auth/session'
import { alternarVoto, textoVotos } from '../../lib/votos'
import { calls, json, mockFetch } from '../../test/helpers'
import { VoteButton } from './VoteButton'

const URL_VOTO = '/api/reportes/7/voto/'

function reporte(extra = {}) {
  return {
    id: 7,
    votos: 4,
    votado: false,
    puede_votar: true,
    oculto: false,
    es_mio: false,
    estado: 'recibido' as const,
    ...extra,
  }
}

/** Respuesta que no llega hasta que la prueba la suelta: deja ver el estado optimista. */
function diferida() {
  let soltar: (r: Response) => void = () => {}
  const promesa = new Promise<Response>((resolve) => (soltar = resolve))
  return { promesa, soltar: (r: Response) => soltar(r) }
}

afterEach(() => {
  clearLocalSession()
  localStorage.clear()
})

describe('lógica del voto', () => {
  it('alterna al instante y nunca baja de cero', () => {
    expect(alternarVoto({ votos: 4, votado: false })).toEqual({ votos: 5, votado: true })
    expect(alternarVoto({ votos: 5, votado: true })).toEqual({ votos: 4, votado: false })
    expect(alternarVoto({ votos: 0, votado: true })).toEqual({ votos: 0, votado: false })
  })

  it('dice el conteo en palabras', () => {
    expect(textoVotos({ votos: 0, votado: false })).toBe('Aún sin votos')
    expect(textoVotos({ votos: 1, votado: false })).toBe('1 voto')
    expect(textoVotos({ votos: 1, votado: true })).toBe('1 voto: el tuyo')
    expect(textoVotos({ votos: 9, votado: true })).toBe('9 votos, incluido el tuyo')
  })
})

describe('<VoteButton>', () => {
  it('sube el conteo al instante y lo confirma con el servidor', async () => {
    accessTokenStore.set('a')
    const respuesta = diferida()
    const fetchMock = mockFetch({ [URL_VOTO]: () => respuesta.promesa })
    const onCambio = vi.fn()
    render(<VoteButton reporte={reporte()} onCambio={onCambio} />)

    const boton = screen.getByRole('button', { name: 'Votar' })
    expect(boton).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(boton)

    // Antes de que responda el servidor.
    expect(boton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('5 votos, incluido el tuyo')).toBeInTheDocument()
    expect(calls(fetchMock, URL_VOTO)[0][1]?.method).toBe('POST')

    respuesta.soltar(json({ votos: 6, votado: true }, 201))
    expect(await screen.findByText('6 votos, incluido el tuyo')).toBeInTheDocument()
    expect(onCambio).toHaveBeenCalledWith({ votos: 6, votado: true })
  })

  it('quitar el voto usa DELETE', async () => {
    accessTokenStore.set('a')
    const fetchMock = mockFetch({ [URL_VOTO]: () => json({ votos: 3, votado: false }) })
    render(<VoteButton reporte={reporte({ votado: true })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Votar' }))

    expect(await screen.findByText('3 votos')).toBeInTheDocument()
    expect(calls(fetchMock, URL_VOTO)[0][1]?.method).toBe('DELETE')
    expect(screen.getByRole('button', { name: 'Votar' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('si falla la red, vuelve al estado anterior y lo dice', async () => {
    accessTokenStore.set('a')
    mockFetch({ [URL_VOTO]: 'offline' })
    render(<VoteButton reporte={reporte()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Votar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión: no se guardó tu voto')
    expect(screen.getByRole('button', { name: 'Votar' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('4 votos')).toBeInTheDocument()
  })

  it('si el servidor lo rechaza, revierte y muestra su motivo', async () => {
    accessTokenStore.set('a')
    mockFetch({
      [URL_VOTO]: () =>
        json({ detail: 'Este reporte ya está resuelto: los votos están cerrados.' }, 403),
    })
    render(<VoteButton reporte={reporte()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Votar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ya está resuelto')
    expect(screen.getByText('4 votos')).toBeInTheDocument()
  })

  it('un doble toque rápido no manda dos peticiones', async () => {
    accessTokenStore.set('a')
    const respuesta = diferida()
    const fetchMock = mockFetch({ [URL_VOTO]: () => respuesta.promesa })
    render(<VoteButton reporte={reporte()} />)
    const boton = screen.getByRole('button', { name: 'Votar' })

    await userEvent.dblClick(boton)
    expect(boton).toHaveAttribute('aria-disabled', 'true')
    respuesta.soltar(json({ votos: 5, votado: true }, 201))

    await waitFor(() => expect(boton).not.toHaveAttribute('aria-disabled'))
    expect(calls(fetchMock, URL_VOTO)).toHaveLength(1)
    expect(boton).toHaveAttribute('aria-pressed', 'true')
  })

  it('en el propio reporte muestra el conteo y "Tu reporte", sin botón', () => {
    render(<VoteButton reporte={reporte({ es_mio: true, puede_votar: false })} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Tu reporte · 4 votos')).toBeInTheDocument()
  })

  it('en un reporte resuelto explica que la votación se cerró', () => {
    render(<VoteButton reporte={reporte({ estado: 'resuelto', puede_votar: false })} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/ya está resuelto, la votación se cerró/)).toBeInTheDocument()
  })
})
