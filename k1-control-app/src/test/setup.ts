import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
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
  
  // Reset mock random to default
  setMockRandom(0.5)
})