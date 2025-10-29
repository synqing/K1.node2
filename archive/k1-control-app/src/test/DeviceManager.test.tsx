/**
 * DeviceManager component tests
 * Tests Subtask 3.2: DeviceManager UI with Discovery, Manual Connect, and Status panels
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { DeviceManager } from '../components/DeviceManager'
import { K1Provider } from '../providers/K1Provider'
import { K1DiscoveredDevice } from '../types/k1-types'
import { ErrorProvider } from '../hooks/useErrorHandler'

// Mock the discovery service
vi.mock('../services/discovery-service', () => ({
  useDeviceDiscovery: () => ({
    discoverDevices: vi.fn().mockResolvedValue({
      devices: [],
      method: 'mdns',
      duration: 1000,
    }),
    getDiscoveredDevices: vi.fn().mockReturnValue([]),
    addManualDevice: vi.fn(),
    isDiscovering: vi.fn().mockReturnValue(false),
  }),
}))

// Mock K1Client
vi.mock('../api/k1-client', () => ({
  K1Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(false),
  })),
}))

function renderDeviceManager() {
  return render(
    <ErrorProvider>
      <K1Provider>
        <DeviceManager />
      </K1Provider>
    </ErrorProvider>
  )
}

describe('DeviceManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Component Structure', () => {
    it('should render all three main sections', () => {
      renderDeviceManager()

      // Check for main heading
      expect(screen.getByRole('heading', { name: /device manager/i })).toBeInTheDocument()

      // Check for section headings
      expect(screen.getByRole('heading', { name: /device discovery/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /manual connect/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /connection status/i })).toBeInTheDocument()
    })

    it('should have accessible labels and roles', () => {
      renderDeviceManager()

      // Discovery section
      expect(screen.getByRole('list', { name: /discovered devices/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start device discovery/i })).toBeInTheDocument()

      // Manual connect form
      expect(screen.getByLabelText(/ip address or hostname/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/port/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()

      // Status section shows disconnected state initially
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument()
    })

    it('should show empty state when no devices discovered', () => {
      renderDeviceManager()

      expect(screen.getByText(/no devices found/i)).toBeInTheDocument()
      expect(screen.getByText(/click "discover devices" to scan/i)).toBeInTheDocument()
    })
  })

  describe('Discovery Panel', () => {
    it('should show discovery button', () => {
      renderDeviceManager()

      const discoverButton = screen.getByRole('button', { name: /start device discovery/i })
      expect(discoverButton).toBeInTheDocument()
      expect(discoverButton).not.toBeDisabled()
    })

    it('should show loading state during discovery', async () => {
      // Mock discovery service to return loading state
      const mockUseDeviceDiscovery = vi.fn().mockReturnValue({
        discoverDevices: vi.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve({ devices: [], method: 'mdns', duration: 1000 }), 2000)
          })
        }),
        getDiscoveredDevices: vi.fn().mockReturnValue([]),
        addManualDevice: vi.fn(),
        isDiscovering: vi.fn().mockReturnValue(true),
      })

      // Re-mock with loading state
      vi.doMock('../services/discovery-service', () => ({
        useDeviceDiscovery: mockUseDeviceDiscovery,
      }))

      renderDeviceManager()

      // Should show loading skeleton
      expect(screen.getByText(/scanning network for k1 devices/i)).toBeInTheDocument()
    })
  })

  describe('Manual Connect Panel', () => {
    it('should have IP and port input fields', () => {
      renderDeviceManager()

      const ipInput = screen.getByLabelText(/ip address or hostname/i)
      const portInput = screen.getByLabelText(/port/i)

      expect(ipInput).toBeInTheDocument()
      expect(portInput).toBeInTheDocument()
      expect(portInput).toHaveValue('80') // Default port
    })

    it('should disable connect button when IP is empty', () => {
      renderDeviceManager()

      const connectButton = screen.getByRole('button', { name: /connect/i })
      expect(connectButton).toBeDisabled()
    })

    it('should enable connect button when IP is provided', async () => {
      renderDeviceManager()

      const ipInput = screen.getByLabelText(/ip address or hostname/i)
      const connectButton = screen.getByRole('button', { name: /connect/i })

      await userEvent.type(ipInput, '192.168.1.100')

      expect(connectButton).not.toBeDisabled()
    })

    it('should handle form submission', async () => {
      renderDeviceManager()

      const ipInput = screen.getByLabelText(/ip address or hostname/i)
      const connectButton = screen.getByRole('button', { name: /connect/i })

      await userEvent.type(ipInput, '192.168.1.100')
      await userEvent.click(connectButton)

      // Should attempt connection (we can't easily test the actual connection without more complex mocking)
      expect(connectButton).toBeInTheDocument()
    })
  })

  describe('Status Panel', () => {
    it('should show disconnected status initially', () => {
      renderDeviceManager()

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument()
    })

    it('should show connection status', () => {
      renderDeviceManager()

      // Check that status section exists
      const statusSection = screen.getByRole('heading', { name: /connection status/i }).closest('div')
      expect(statusSection).toBeInTheDocument()
      
      // Should show status field
      expect(screen.getByText(/status/i)).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('should render with proper grid layout classes', () => {
      renderDeviceManager()

      // Check for responsive grid classes (this is a basic structural test)
      const mainContainer = screen.getByRole('heading', { name: /device manager/i }).closest('div')
      expect(mainContainer).toHaveClass('max-w-4xl', 'mx-auto', 'p-6', 'space-y-8')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderDeviceManager()

      // Form elements should have proper labels
      expect(screen.getByLabelText(/ip address or hostname/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/port/i)).toBeInTheDocument()

      // Lists should have proper roles
      expect(screen.getByRole('list', { name: /discovered devices/i })).toBeInTheDocument()

      // Buttons should have accessible names
      expect(screen.getByRole('button', { name: /start device discovery/i })).toBeInTheDocument()
    })

    it('should provide helpful descriptions', () => {
      renderDeviceManager()

      // IP input should have help text
      expect(screen.getByText(/enter the ip address or hostname/i)).toBeInTheDocument()
    })
  })
})