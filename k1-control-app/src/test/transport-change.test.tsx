import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { K1Provider, useK1Actions, useK1State } from '../providers/K1Provider'

function TransportTestComponent() {
  const actions = useK1Actions()
  const state = useK1State()
  return (
    <div>
      <div data-testid="ws-disabled">{state.transport.wsDisabled ? 'true' : 'false'}</div>
      <button data-testid="enable-ws" onClick={() => actions.setWebSocketEnabled(true)}>enable</button>
      <button data-testid="disable-ws" onClick={() => actions.setWebSocketEnabled(false)}>disable</button>
    </div>
  )
}

describe('Transport change event emission', () => {
  it('dispatches k1:transportChange with correct detail and updates state', async () => {
    const handler = vi.fn()
    window.addEventListener('k1:transportChange', handler as EventListener)

    render(
      <K1Provider>
        <TransportTestComponent />
      </K1Provider>
    )

    // Disable WS
    await userEvent.click(screen.getByTestId('disable-ws'))

    // Assert state updated
    expect(screen.getByTestId('ws-disabled')).toHaveTextContent('true')

    // Assert event dispatched
    expect(handler).toHaveBeenCalled()
    const evt1 = handler.mock.calls.at(-1)?.[0] as CustomEvent
    expect(evt1).toBeTruthy()
    expect((evt1 as any).detail).toMatchObject({ preferredTransport: 'rest', wsEnabled: false })

    // Enable WS
    await userEvent.click(screen.getByTestId('enable-ws'))

    // Assert state updated
    expect(screen.getByTestId('ws-disabled')).toHaveTextContent('false')

    // Assert event dispatched with ws
    const evt2 = handler.mock.calls.at(-1)?.[0] as CustomEvent
    expect(evt2).toBeTruthy()
    expect((evt2 as any).detail).toMatchObject({ preferredTransport: 'ws', wsEnabled: true })
  })
})