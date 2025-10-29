import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import React from 'react'

// Test-local component to demonstrate MSW integration
function DevicesList() {
  const [state, setState] = React.useState<'idle'|'loading'|'error'|'ready'>('idle')
  const [devices, setDevices] = React.useState<any[]>([])

  React.useEffect(() => {
    let cancelled = false
    setState('loading')
    fetch('/api/devices')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) { setDevices(data.devices ?? []); setState('ready') } })
      .catch(() => { if (!cancelled) { setState('error') } })
    return () => { cancelled = true }
  }, [])

  if (state === 'loading') return <div aria-label="loading">Loading devices…</div>
  if (state === 'error') return <div role="alert">Failed to load devices</div>
  if (devices.length === 0) return <div>No devices</div>
  return (
    <ul aria-label="devices">
      {devices.map(d => (<li key={d.id}>{d.name} — {d.ip}:{d.port}</li>))}
    </ul>
  )
}

const server = setupServer(
  http.get('/api/devices', () => {
    return HttpResponse.json({ devices: [
      { id: '1', name: 'K1 Alpha', ip: '192.168.1.10', port: 80 },
      { id: '2', name: 'K1 Beta', ip: '192.168.1.11', port: 80 },
    ] })
  })
)

describe('Devices API integration (MSW example)', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('renders devices from /api/devices', async () => {
    render(<DevicesList />)
    expect(screen.getByLabelText('loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('devices')).toBeInTheDocument())
    expect(screen.getByText(/K1 Alpha/)).toBeInTheDocument()
    expect(screen.getByText(/K1 Beta/)).toBeInTheDocument()
  })

  it('shows error state on server failure', async () => {
    server.use(http.get('/api/devices', () => HttpResponse.text('boom', { status: 500 })))
    render(<DevicesList />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText(/Failed to load devices/i)).toBeInTheDocument()
  })
})