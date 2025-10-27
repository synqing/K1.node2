import { describe, it, expect, vi } from 'vitest'

// Mock potentially disruptive modules before component import
vi.mock('../components/debug/HMRDelayOverlay', () => ({ default: () => null }))

// Mock K1Provider hooks to isolate DebugHUD behavior
vi.mock('../providers/K1Provider', () => ({
  useK1Actions: () => ({
    subscribePerformance: (_cb: any) => undefined,
    subscribeAudio: (_cb: any) => undefined,
    setWebSocketEnabled: vi.fn(),
  }),
  useK1State: () => ({
    connection: 'disconnected',
    deviceInfo: null,
    transport: { wsAvailable: true, restAvailable: true, wsDisabled: false, activeTransport: 'rest' },
    reconnect: { attemptCount: 0, nextDelay: 100, maxDelay: 200, isActive: false },
    selectedPatternId: null,
    parameters: {} as any,
    activePaletteId: 0,
    lastError: null,
    errorHistory: [],
    featureFlags: { autoReconnect: true },
    telemetry: {} as any,
  }),
  useK1Config: () => ({})
}))

import { render, screen, waitFor } from '@testing-library/react'
import { DebugHUD } from '../components/debug/DebugHUD'

describe('DebugHUD transport listener', () => {
  it('mounts Transport & Timing and registers transport-change listener', async () => {
    try { localStorage.setItem('k1.debugHUDVisible', '1') } catch {}

    const addSpy = vi.spyOn(window, 'addEventListener')

    render(<DebugHUD k1Client={null} isConnected={false} />)

    await waitFor(() => {
      expect(screen.getByText(/Transport & Timing/i)).toBeInTheDocument()
    })

    // Basic structure assertions
    expect(screen.getByText(/Active Transport/i)).toBeInTheDocument()
    expect(screen.getByText(/WS Available/i)).toBeInTheDocument()

    // Listener registration assertion
    const registeredTypes = addSpy.mock.calls.map(call => call[0])
    expect(registeredTypes).toContain('k1:transportChange')
  })
})