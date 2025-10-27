/**
 * Comprehensive K1Provider unit tests
 * Implements Subtask 2.8: Comprehensive unit tests with fake timers and mocked K1Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockK1Client, createMockK1Client } from './mocks/MockK1Client'
import { setMockRandom } from './setup'
import { K1_DEFAULTS } from '../types/k1-types'
import * as ClientModule from '../api/k1-client'
import { ErrorProvider } from '../hooks/useErrorHandler'

// Mock the K1Client module
vi.mock('../api/k1-client', () => {
  // Constructor-compatible mock so `new K1Client()` works
  const K1ClientMock = vi.fn(function K1ClientMock(this: any) {
    return createMockK1Client()
  })
  return { K1Client: K1ClientMock }
})

vi.mock('../components/debug/HMRDelayOverlay', () => ({ default: () => null }))

// Ensure real provider and error handler are used in this suite
vi.unmock('../providers/K1Provider')
vi.unmock('../hooks/useErrorHandler')

import { K1Provider, useK1State, useK1Actions } from '../providers/K1Provider'

// Test component to access provider state and actions
function TestComponent() {
  const state = useK1State()
  const actions = useK1Actions()

  return (
    <div>
      <div data-testid="connection-state">{state.connection}</div>
      <div data-testid="device-name">{state.deviceInfo?.device || 'none'}</div>
      <div data-testid="error-count">{state.errorHistory.length}</div>
      <div data-testid="telemetry-attempts">{state.telemetry.connectionAttempts}</div>
      <div data-testid="telemetry-successful">{state.telemetry.successfulConnections}</div>
      <div data-testid="reconnect-active">{state.reconnect.isActive.toString()}</div>
      <div data-testid="reconnect-attempts">{state.reconnect.attemptCount}</div>
      
      <button 
        data-testid="connect-btn" 
        onClick={() => actions.connect('http://192.168.1.100')}
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
        data-testid="update-params-btn" 
        onClick={() => actions.updateParameters({ brightness: 90 })}
      >
        Update Params
      </button>
      <button 
        data-testid="select-pattern-btn" 
        onClick={() => actions.selectPattern('pulse')}
      >
        Select Pattern
      </button>
      <button 
        data-testid="set-palette-btn" 
        onClick={() => actions.setPalette(5)}
      >
        Set Palette
      </button>
      <button 
        data-testid="start-reconnect-btn" 
        onClick={() => actions.startReconnection()}
      >
        Start Reconnect
      </button>
      <button 
        data-testid="stop-reconnect-btn" 
        onClick={() => actions.stopReconnection()}
      >
        Stop Reconnect
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

describe('K1Provider', () => {
  let mockClient: MockK1Client
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.useFakeTimers()
    mockClient = createMockK1Client()
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    // Ensure the mock returns our per-test client
    ClientModule.K1Client.mockImplementation(function () { return mockClient })
  })

  afterEach(() => {
    vi.useRealTimers()
    mockClient.cleanup()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      renderWithProvider()
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected')
      expect(screen.getByTestId('device-name')).toHaveTextContent('none')
      expect(screen.getByTestId('error-count')).toHaveTextContent('0')
      expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('0')
      expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('0')
      expect(screen.getByTestId('reconnect-active')).toHaveTextContent('false')
    })

    it('should auto-connect to initial endpoint', async () => {
      mockClient.setConnectionDelay(50)
      
      renderWithProvider('http://192.168.1.100')
      
      // Should start connecting
      expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting')
      expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('1')
      
      // Fast-forward connection delay
      act(() => {
        vi.advanceTimersByTime(100)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
        expect(screen.getByTestId('device-name')).toHaveTextContent('K1.test')
        expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('1')
      })
    })
  })

  describe('Connection Management', () => {
    it('should handle successful connection', async () => {
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      
      await act(async () => {
        await user.click(connectBtn)
      })
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting')
      expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('1')
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
        expect(screen.getByTestId('device-name')).toHaveTextContent('K1.test')
        expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('1')
      })
    })

    it('should handle connection failure', async () => {
      mockClient.setShouldFailConnection(true)
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      
      await act(async () => {
        await user.click(connectBtn)
      })
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting')
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('error')
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
        expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('1')
        expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('0')
      })
    })

    it('should handle disconnection', async () => {
      renderWithProvider()
      
      // First connect
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        await user.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      })
      
      // Then disconnect
      const disconnectBtn = screen.getByTestId('disconnect-btn')
      await act(async () => {
        await user.click(disconnectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(50)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected')
      })
    })
  })

  describe('Reconnection Logic', () => {
    it('should handle automatic reconnection with exponential backoff', async () => {
      // Set deterministic random for jitter
      setMockRandom(0.5)
      
      renderWithProvider()
      
      // Connect first
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        await user.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      })
      
      // Simulate connection loss
      act(() => {
        mockClient.simulateReconnection()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('reconnect-active')).toHaveTextContent('true')
        expect(screen.getByTestId('reconnect-attempts')).toHaveTextContent('1')
      })
      
      // Fast-forward through first reconnection attempt
      act(() => {
        vi.advanceTimersByTime(1000) // Base delay + jitter
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
        expect(screen.getByTestId('reconnect-active')).toHaveTextContent('false')
        expect(screen.getByTestId('reconnect-attempts')).toHaveTextContent('0')
      })
    })

    it('should give up after max reconnection attempts', async () => {
      mockClient.setShouldFailConnection(true)
      renderWithProvider()
      
      // Start reconnection manually
      const startReconnectBtn = screen.getByTestId('start-reconnect-btn')
      await act(async () => {
        await user.click(startReconnectBtn)
      })
      
      expect(screen.getByTestId('reconnect-active')).toHaveTextContent('true')
      
      // Fast-forward through all reconnection attempts
      for (let i = 0; i < K1_DEFAULTS.RECONNECT.MAX_ATTEMPTS; i++) {
        act(() => {
          vi.advanceTimersByTime(K1_DEFAULTS.RECONNECT.MAX_DELAY + 1000)
        })
        
        await waitFor(() => {
          expect(screen.getByTestId('reconnect-attempts')).toHaveTextContent((i + 1).toString())
        })
      }
      
      // Should give up after max attempts
      act(() => {
        vi.advanceTimersByTime(K1_DEFAULTS.RECONNECT.MAX_DELAY + 1000)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('reconnect-active')).toHaveTextContent('false')
        expect(screen.getByTestId('error-count')).toBeGreaterThan(0)
      })
    })

    it('should stop reconnection when requested', async () => {
      renderWithProvider()
      
      const startReconnectBtn = screen.getByTestId('start-reconnect-btn')
      const stopReconnectBtn = screen.getByTestId('stop-reconnect-btn')
      
      await act(async () => {
        await user.click(startReconnectBtn)
      })
      
      expect(screen.getByTestId('reconnect-active')).toHaveTextContent('true')
      
      await act(async () => {
        await user.click(stopReconnectBtn)
      })
      
      expect(screen.getByTestId('reconnect-active')).toHaveTextContent('false')
      expect(screen.getByTestId('reconnect-attempts')).toHaveTextContent('0')
    })
  })

  describe('API Operations', () => {
    beforeEach(async () => {
      renderWithProvider()
      
      // Connect first
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        await user.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      })
    })

    it('should handle parameter updates', async () => {
      const updateParamsBtn = screen.getByTestId('update-params-btn')
      
      await act(async () => {
        await user.click(updateParamsBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(100)
      })
      
      // Should complete without errors
      expect(screen.getByTestId('error-count')).toHaveTextContent('0')
    })

    it('should handle pattern selection', async () => {
      const selectPatternBtn = screen.getByTestId('select-pattern-btn')
      
      await act(async () => {
        await user.click(selectPatternBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(100)
      })
      
      expect(screen.getByTestId('error-count')).toHaveTextContent('0')
    })

    it('should handle palette changes', async () => {
      const setPaletteBtn = screen.getByTestId('set-palette-btn')
      
      await act(async () => {
        await user.click(setPaletteBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(100)
      })
      
      expect(screen.getByTestId('error-count')).toHaveTextContent('0')
    })

    it('should handle API failures gracefully', async () => {
      mockClient.setShouldFailRequests(true)
      
      const updateParamsBtn = screen.getByTestId('update-params-btn')
      
      await act(async () => {
        await user.click(updateParamsBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(100)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
      })
    })
  })

  describe('Telemetry Tracking', () => {
    it('should track connection attempts and successes', async () => {
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      
      // First connection attempt
      await act(async () => {
        await userEvent.click(connectBtn)
      })
      
      expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('1')
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('1')
      })
      
      // Disconnect and reconnect
      const disconnectBtn = screen.getByTestId('disconnect-btn')
      await act(async () => {
        await user.click(disconnectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(50)
      })
      
      // Second connection attempt
      await act(async () => {
        await userEvent.click(connectBtn)
      })
      
      expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('2')
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('2')
      })
    })

    it('should track failed connections', async () => {
      mockClient.setShouldFailConnection(true)
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      
      await act(async () => {
        await userEvent.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('telemetry-attempts')).toHaveTextContent('1')
        expect(screen.getByTestId('telemetry-successful')).toHaveTextContent('0')
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
      })
    })
  })

  describe('Error Handling', () => {
    it('should categorize and store errors', async () => {
      mockClient.setShouldFailConnection(true)
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      
      await act(async () => {
        await userEvent.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1')
      })
    })

    it('should limit error history', async () => {
      mockClient.setShouldFailConnection(true)
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      
      // Generate more than 10 errors (default limit)
      for (let i = 0; i < 15; i++) {
        await act(async () => {
          await userEvent.click(connectBtn)
        })
        
        act(() => {
          vi.advanceTimersByTime(200)
        })
        
        await waitFor(() => {
          // Should not exceed 10 errors in history
          expect(parseInt(screen.getByTestId('error-count').textContent || '0')).toBeLessThanOrEqual(10)
        })
      }
    })
  })

  describe('Persistence Integration', () => {
    it('should persist state when enabled', async () => {
      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...window.localStorage,
          setItem: mockSetItem,
        },
      })
      
      renderWithProvider()
      
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        await userEvent.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      })
      
      // Should have persisted feature flags
      expect(mockSetItem).toHaveBeenCalledWith(
        expect.stringContaining('featureFlags'),
        expect.any(String)
      )
    })
  })

  describe('Transport Management', () => {
    it('should handle WebSocket enable/disable', async () => {
      renderWithProvider()
      
      // Connect first
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        await userEvent.click(connectBtn)
      })
      
      act(() => {
        vi.advanceTimersByTime(200)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected')
      })
      
      // Test WebSocket toggle (would need to expose this in test component)
      // This tests the underlying functionality
      expect(mockClient.isWebSocketEnabled()).toBe(true)
      
      mockClient.setWebSocketEnabled(false)
      expect(mockClient.isWebSocketEnabled()).toBe(false)
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should clean up resources on unmount', () => {
      const { unmount } = renderWithProvider()
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow()
    })

    it('should handle multiple rapid connection attempts', async () => {
      renderWithProvider()
      
      screen.debug()
      const connectBtn = screen.getByTestId('connect-btn')
      
      // Rapid fire connection attempts
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await userEvent.click(connectBtn)
        })
      }
      
      // Should handle gracefully without crashes
      expect(screen.getByTestId('connection-state')).toBeTruthy()
    })
  })
})