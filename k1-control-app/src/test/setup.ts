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

// Mock DOM methods for telemetry manager
const mockElement = {
  id: '',
  style: { cssText: '' },
  innerHTML: '',
  addEventListener: vi.fn(),
  appendChild: vi.fn(),
  remove: vi.fn(),
}

const mockDocument = {
  getElementById: vi.fn(),
  createElement: vi.fn(() => ({ ...mockElement })),
  body: { appendChild: vi.fn() },
  head: { appendChild: vi.fn() },
}

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
})

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
}))

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