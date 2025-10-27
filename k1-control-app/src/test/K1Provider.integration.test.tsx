/**
 * K1Provider Integration Tests
 * Tests against REAL K1 device - no mocks
 * 
 * Prerequisites:
 * - K1 device must be powered on
 * - Device must be accessible at K1_DEVICE_IP
 * - Network must be stable
 * 
 * Run with: npm test -- K1Provider.integration.test.tsx
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { K1Provider, useK1State, useK1Actions } from '../providers/K1Provider'
import { ErrorProvider } from '../hooks/useErrorHandler'

// Configuration
const K1_DEVICE_IP = '192.168.1.103'
const K1_ENDPOINT = `http://${K1_DEVICE_IP}`
const CONNECTION_TIMEOUT = 10000 // 10 seconds
const TEST_TIMEOUT = 30000 // 30 seconds per test

// Test component to access provider state and actions
function TestComponent() {
  const state = useK1State()
  const actions = useK1Actions()

  return (
    <div>
      <div data-testid="connection-state">{state.connection}</div>
      <div data-testid="device-name">{state.deviceInfo?.device || 'none'}</div>
      <div data-testid="device-firmware">{state.deviceInfo?.firmware || 'none'}</div>
      <div data-testid="device-ip">{state.deviceInfo?.ip || 'none'}</div>
      <div data-testid="error-count">{state.errorHistory.length}</div>
      <div data-testid="telemetry-attempts">{state.telemetry.connectionAttempts}</div>
      <div data-testid="telemetry-successful">{state.telemetry.successfulConnections}</div>
      <div data-testid="selected-pattern">{state.selectedPatternId || 'none'}</div>
      <div data-testid="brightness">{state.parameters.brightness}</div>
      <div data-testid="speed">{state.parameters.speed}</div>
      <div data-testid="palette-id">{state.activePaletteId}</div>
      
      <button 
        data-testid="connect-btn" 
        onClick={() => actions.connect(K1_ENDPOINT)}
      >
        Connect
      </button>
      <button 
        data-testid="disconnect-btn" 
        onClick={() => actions.disconnect()}
      >
        Disconnect
      </button>
      <button 
        data-testid="update-brightness-btn" 
        onClick={() => actions.updateParameters({ brightness: 90 })}
      >
        Set Brightness 90
      </button>
      <button 
        data-testid="update-speed-btn" 
        onClick={() => actions.updateParameters({ speed: 75 })}
      >
        Set Speed 75
      </button>
      <button 
        data-testid="set-palette-btn" 
        onClick={() => actions.setPalette(5)}
      >
        Set Palette 5
      </button>
    </div>
  )
}

function renderWithProvider(initialEndpoint: string = '') {
  return render(
    <ErrorProvider>
      <K1Provider initialEndpoint={initialEndpoint}>
        <TestComponent />
      </K1Provider>
    </ErrorProvider>
  )
}

describe('K1Provider Integration Tests (Real Device)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeAll(() => {
    console.log(`\n🔌 Testing against K1 device at ${K1_ENDPOINT}`)
    console.log('⚠️  Make sure your K1 device is powered on and connected!\n')
  })

  beforeEach(() => {
    user = userEvent.setup()
  })

  afterAll(() => {
    console.log('\n✅ Integration tests complete\n')
  })

  describe('Connection Management', () => {
    it('should connect to real K1 device', async () => {
      renderWithProvider()
      
      // Initial state should be disconnected
      expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected')
      
      // Click connect button
      const connectBtn = screen.getByTestId('connect-btn')
      await user.click(connectBtn)
      
      // Should transition to connecting
      expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting')
      
      // Wait for connection to complete
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      }, { timeout: CONNECTION_TIMEOUT })
      
      // Should have device info
      expect(screen.getByTestId('device-name')).not.toHaveTextContent('none')
      expect(screen.getByTestId('device-firmware')).not.toHaveTextContent('none')
      expect(screen.getByTestId('device-ip')).toHaveTextContent(K1_DEVICE_IP)
      
      // Telemetry should be updated
      expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('1')
      expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('1')
      
      console.log('✓ Successfully connected to K1 device')
    }, TEST_TIMEOUT)

    it('should auto-connect when initialEndpoint is provided', async () => {
      renderWithProvider(K1_ENDPOINT)
      
      // Should start connecting immediately
      expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting')
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      }, { timeout: CONNECTION_TIMEOUT })
      
      // Should have device info
      expect(screen.getByTestId('device-name')).not.toHaveTextContent('none')
      
      console.log('✓ Auto-connect successful')
    }, TEST_TIMEOUT)

    it('should disconnect from device', async () => {
      renderWithProvider(K1_ENDPOINT)
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      }, { timeout: CONNECTION_TIMEOUT })
      
      // Click disconnect
      const disconnectBtn = screen.getByTestId('disconnect-btn')
      await user.click(disconnectBtn)
      
      // Should disconnect
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected')
      }, { timeout: 5000 })
      
      console.log('✓ Disconnect successful')
    }, TEST_TIMEOUT)
  })

  describe('Parameter Updates', () => {
    it('should update brightness on real device', async () => {
      renderWithProvider(K1_ENDPOINT)
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      }, { timeout: CONNECTION_TIMEOUT })
      
      // Get initial brightness
      const initialBrightness = screen.getByTestId('brightness').textContent
      console.log(`Initial brightness: ${initialBrightness}`)
      
      // Update brightness
      const updateBtn = screen.getByTestId('update-brightness-btn')
      await user.click(updateBtn)
      
      // Wait for update
      await waitFor(() => {
        expect(screen.getByTestId('brightness')).toHaveTextContent('90')
      }, { timeout: 5000 })
      
      console.log('✓ Brightness updated to 90')
    }, TEST_TIMEOUT)

    it('should update speed on real device', async () => {
      renderWithProvider(K1_ENDPOINT)
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      }, { timeout: CONNECTION_TIMEOUT })
      
      // Update speed
      const updateBtn = screen.getByTestId('update-speed-btn')
      await user.click(updateBtn)
      
      // Wait for update
      await waitFor(() => {
        expect(screen.getByTestId('speed')).toHaveTextContent('75')
      }, { timeout: 5000 })
      
      console.log('✓ Speed updated to 75')
    }, TEST_TIMEOUT)
  })

  describe('Palette Management', () => {
    it('should change palette on real device', async () => {
      renderWithProvider(K1_ENDPOINT)
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      }, { timeout: CONNECTION_TIMEOUT })
      
      // Get initial palette
      const initialPalette = screen.getByTestId('palette-id').textContent
      console.log(`Initial palette: ${initialPalette}`)
      
      // Change palette
      const setPaletteBtn = screen.getByTestId('set-palette-btn')
      await user.click(setPaletteBtn)
      
      // Wait for update
      await waitFor(() => {
        expect(screen.getByTestId('palette-id')).toHaveTextContent('5')
      }, { timeout: 5000 })
      
      console.log('✓ Palette changed to 5')
    }, TEST_TIMEOUT)
  })

  describe('Error Handling', () => {
    it('should handle connection to invalid IP gracefully', async () => {
      renderWithProvider()
      
      // Try to connect to invalid IP
      const connectBtn = screen.getByTestId('connect-btn')
      
      // Manually trigger connection to bad IP
      const { rerender } = renderWithProvider('http://192.168.1.254')
      
      // Should show connecting
      expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting')
      
      // Should eventually show error
      await waitFor(() => {
        const state = screen.getByTestId('connection-state').textContent
        expect(state).toMatch(/error|disconnected/)
      }, { timeout: 15000 })
      
      // Should have error in history
      await waitFor(() => {
        const errorCount = parseInt(screen.getByTestId('error-count').textContent || '0')
        expect(errorCount).toBeGreaterThan(0)
      }, { timeout: 5000 })
      
      console.log('✓ Error handling works correctly')
    }, TEST_TIMEOUT)
  })
})
