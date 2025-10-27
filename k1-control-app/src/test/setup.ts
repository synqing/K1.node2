import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage with in-memory backing
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => (key in storage ? storage[key] : null)),
  setItem: vi.fn((key: string, value: string) => { storage[key] = String(value); (localStorageMock as any).length = Object.keys(storage).length }),
  removeItem: vi.fn((key: string) => { if (key in storage) { delete storage[key]; (localStorageMock as any).length = Object.keys(storage).length } }),
  clear: vi.fn(() => { for (const k of Object.keys(storage)) delete storage[k]; (localStorageMock as any).length = 0 }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(storage)[index] ?? null),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Use jsdom's real Document. Avoid overriding global document to ensure
// React DOM features (setAttribute, listeners, etc.) work in tests.
// Individual tests can spy on document methods as needed.


// Mock WebSocket
// Provide static readyState constants to match browser WebSocket API
const WebSocketMock: any = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 0, // CONNECTING
}))
WebSocketMock.CONNECTING = 0
WebSocketMock.OPEN = 1
WebSocketMock.CLOSING = 2
WebSocketMock.CLOSED = 3
global.WebSocket = WebSocketMock

// Mock fetch
global.fetch = vi.fn()

// Mock Math.random for deterministic tests
let mockRandomValue = 0.5
export const setMockRandom = (value: number) => {
  mockRandomValue = value
}

vi.spyOn(Math, 'random').mockImplementation(() => mockRandomValue)

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  // Do not clear the backing store here; individual tests call localStorage.clear()
  // Reset mock random to default
  setMockRandom(0.5)
})