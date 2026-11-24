import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BackendStatus } from './BackendStatus'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('BackendStatus', () => {
  it('muestra "Servidor en línea" cuando /api/health/ responde 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: 'ok', database: 'ok', version: '0.1.0' }))
    vi.stubGlobal('fetch', fetchMock)

    render(<BackendStatus />)

    expect(screen.getByText('Conectando con el servidor…')).toBeInTheDocument()
    expect(await screen.findByText('Servidor en línea')).toBeInTheDocument()
    expect(screen.getByText(/API v0\.1\.0/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/health/', expect.any(Object))
  })

  it('explica el 503 de base de datos caída', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ status: 'error' }, 503)))

    render(<BackendStatus />)

    expect(await screen.findByText(/la base de datos no responde/)).toBeInTheDocument()
  })

  it('permite reintentar cuando no hay red', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json({ status: 'ok', database: 'ok', version: '0.1.0' }))
    vi.stubGlobal('fetch', fetchMock)

    render(<BackendStatus />)

    expect(await screen.findByText('No hay conexión con el servidor.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Servidor en línea')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
