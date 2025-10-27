import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { K1Provider } from '../providers/K1Provider'
import { ErrorProvider } from '../components/ErrorProvider'
import { DebugHUD } from '../components/debug/DebugHUD'

describe('DebugHUD transport listener', () => {
  it('renders last transport change details when event is dispatched', async () => {
    render(
      <ErrorProvider>
        <K1Provider>
          <DebugHUD k1Client={null} isConnected={false} />
        </K1Provider>
      </ErrorProvider>
    )

    // Ensure HUD content has mounted (effect attached)
    await waitFor(() => {
      expect(screen.getByText(/Transport & Timing/i)).toBeInTheDocument()
    })

    // Dispatch a transport change event after mount
    const evt = new CustomEvent('k1:transportChange', { detail: { preferredTransport: 'ws', wsEnabled: true } })
    window.dispatchEvent(evt)

    // Assert the HUD displays the event details
    await waitFor(() => {
      expect(screen.getByText(/Last Transport Change:/)).toBeInTheDocument()
      expect(screen.getByText(/ws/)).toBeInTheDocument()
      expect(screen.getByText(/ws enabled/i)).toBeInTheDocument()
    })
  })
})