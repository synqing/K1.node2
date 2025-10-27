import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { K1Provider } from '../providers/K1Provider'
import DebugHUD from '../components/debug/DebugHUD'

describe('DebugHUD transport listener', () => {
  it('renders last transport change details when event is dispatched', async () => {
    render(
      <K1Provider>
        <DebugHUD k1Client={null} isConnected={false} />
      </K1Provider>
    )

    // Dispatch a transport change event
    const evt = new CustomEvent('k1:transportChange', { detail: { preferredTransport: 'ws', wsEnabled: true } })
    window.dispatchEvent(evt)

    // Assert the HUD displays the event details
    expect(screen.getByText(/Last Transport Change:/)).toBeInTheDocument()
    expect(screen.getByText(/ws/)).toBeInTheDocument()
    expect(screen.getByText(/ws enabled/i)).toBeInTheDocument()
  })
})