import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorProvider } from '../hooks/useErrorHandler'
import { K1Provider } from '../providers/K1Provider'
import { DeviceManager } from '../components/DeviceManager'

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ErrorProvider>
      <K1Provider>
        {ui}
      </K1Provider>
    </ErrorProvider>
  )
}

describe('Device list (RTL example)', () => {
  it('shows empty state when no devices discovered', () => {
    vi.mock('../services/discovery-service', () => ({
      useDeviceDiscovery: () => ({
        discoverDevices: vi.fn(),
        getDiscoveredDevices: vi.fn().mockReturnValue([]),
        addManualDevice: vi.fn(),
        isDiscovering: vi.fn().mockReturnValue(false),
      }),
    }))

    renderWithProviders(<DeviceManager />)
    expect(screen.getByText(/No devices found/i)).toBeInTheDocument()
  })

  it('renders rows for discovered devices', () => {
    const devices = [
      { id: 'a', name: 'K1 Alpha', ip: '192.168.1.10', port: 80, firmware: '1.0.0', lastSeen: new Date(), discoveryCount: 1 },
      { id: 'b', name: 'K1 Beta', ip: '192.168.1.11', port: 80, firmware: '1.0.0', lastSeen: new Date(), discoveryCount: 2 },
      { id: 'c', name: 'K1 Gamma', ip: '192.168.1.12', port: 80, firmware: '1.0.0', lastSeen: new Date(), discoveryCount: 3 },
    ]

    vi.mock('../services/discovery-service', () => ({
      useDeviceDiscovery: () => ({
        discoverDevices: vi.fn(),
        getDiscoveredDevices: vi.fn().mockReturnValue(devices),
        addManualDevice: vi.fn(),
        isDiscovering: vi.fn().mockReturnValue(false),
      }),
    }))

    renderWithProviders(<DeviceManager />)
    devices.forEach(d => {
      expect(screen.getByText(d.name)).toBeInTheDocument()
      expect(screen.getByText(new RegExp(`${d.ip}:${d.port}`))).toBeInTheDocument()
    })
  })

  it('shows loading indicator while discovering', () => {
    vi.mock('../services/discovery-service', () => ({
      useDeviceDiscovery: () => ({
        discoverDevices: vi.fn(),
        getDiscoveredDevices: vi.fn().mockReturnValue([]),
        addManualDevice: vi.fn(),
        isDiscovering: vi.fn().mockReturnValue(true),
      }),
    }))

    renderWithProviders(<DeviceManager />)
    expect(screen.getByText(/Scanning/i)).toBeInTheDocument()
  })
})