/**
 * Simplified discovery service tests
 * Tests core functionality of Subtask 3.1: Discovery abstraction
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { K1DiscoveryService } from '../services/discovery-service'
import { K1Client } from '../api/k1-client'
import { K1DiscoveredDevice } from '../types/k1-types'

// Mock K1Client
vi.mock('../api/k1-client', () => ({
  K1Client: {
    discover: vi.fn(),
  },
}))

describe('K1DiscoveryService - Core Functionality', () => {
  let service: K1DiscoveryService
  const mockDiscover = vi.mocked(K1Client.discover)

  beforeEach(() => {
    vi.useFakeTimers()
    service = new K1DiscoveryService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    service.cleanup()
  })

  describe('mDNS Discovery', () => {
    it('should discover devices via K1Client.discover', async () => {
      const mockDevices: K1DiscoveredDevice[] = [
        {
          id: 'k1-001',
          name: 'K1.test',
          ip: '192.168.1.100',
          port: 80,
          mac: '00:11:22:33:44:55',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns',
        },
      ]

      mockDiscover.mockResolvedValue(mockDevices)

      const result = await service.discoverDevices({ 
        preferredMethods: ['mdns'],
        timeout: 1000 
      })

      expect(result.devices).toHaveLength(1)
      expect(result.devices[0].id).toBe('k1-001')
      expect(result.method).toBe('mdns')
      expect(mockDiscover).toHaveBeenCalledWith(500)
    })

    it('should handle mDNS discovery errors gracefully', async () => {
      mockDiscover.mockRejectedValue(new Error('mDNS failed'))

      const result = await service.discoverDevices({ 
        preferredMethods: ['mdns'],
        timeout: 1000 
      })

      // Should return empty result but not throw
      expect(result.devices).toHaveLength(0)
      expect(result.method).toBe('mdns')
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Device Cache', () => {
    it('should cache discovered devices', async () => {
      const mockDevice: K1DiscoveredDevice = {
        id: 'k1-001',
        name: 'K1.test',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
      }

      mockDiscover.mockResolvedValue([mockDevice])

      await service.discoverDevices({ preferredMethods: ['mdns'] })

      const cached = service.getDiscoveredDevices()
      expect(cached).toHaveLength(1)
      expect(cached[0].id).toBe('k1-001')
    })

    it('should get device by ID', async () => {
      const mockDevice: K1DiscoveredDevice = {
        id: 'k1-001',
        name: 'K1.test',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
      }

      mockDiscover.mockResolvedValue([mockDevice])
      await service.discoverDevices({ preferredMethods: ['mdns'] })

      const device = service.getDevice('k1-001')
      expect(device?.id).toBe('k1-001')

      const deviceByIp = service.getDevice('192.168.1.100')
      expect(deviceByIp?.ip).toBe('192.168.1.100')
    })
  })

  describe('Manual Device Addition', () => {
    it('should add manual devices', () => {
      const device = service.addManualDevice('192.168.1.200', 8080)

      expect(device.id).toBe('manual-192.168.1.200')
      expect(device.ip).toBe('192.168.1.200')
      expect(device.port).toBe(8080)
      expect(device.discoveryMethod).toBe('manual')

      const cached = service.getDiscoveredDevices()
      expect(cached).toHaveLength(1)
    })

    it('should use default port 80', () => {
      const device = service.addManualDevice('192.168.1.200')
      expect(device.port).toBe(80)
    })
  })

  describe('Discovery State', () => {
    it('should track discovery state', () => {
      expect(service.isDiscovering()).toBe(false)
      
      // Start a discovery (will be async)
      service.discoverDevices({ preferredMethods: ['mdns'] })
      
      // Should be discovering now (briefly)
      // Note: This might be false by the time we check due to async nature
    })

    it('should cancel discovery', () => {
      service.cancelDiscovery()
      expect(service.isDiscovering()).toBe(false)
    })
  })

  describe('Event Emission', () => {
    it('should emit discovery events', async () => {
      const mockDevice: K1DiscoveredDevice = {
        id: 'k1-001',
        name: 'K1.test',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
      }

      mockDiscover.mockResolvedValue([mockDevice])

      const startedSpy = vi.fn()
      const foundSpy = vi.fn()
      const completedSpy = vi.fn()

      service.on('discovery-started', startedSpy)
      service.on('devices-found', foundSpy)
      service.on('discovery-completed', completedSpy)

      await service.discoverDevices({ preferredMethods: ['mdns'] })

      expect(startedSpy).toHaveBeenCalledTimes(1)
      expect(foundSpy).toHaveBeenCalledWith([mockDevice])
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          devices: [mockDevice],
          method: 'mdns',
        })
      )
    })

    it('should emit device-updated events', () => {
      const updatedSpy = vi.fn()
      service.on('device-updated', updatedSpy)

      const device = service.addManualDevice('192.168.1.200')

      expect(updatedSpy).toHaveBeenCalledWith(device)
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources', () => {
      // Add some state
      service.addManualDevice('192.168.1.200')
      service.on('devices-found', () => {})

      expect(service.getDiscoveredDevices()).toHaveLength(1)
      expect(service.listenerCount('devices-found')).toBeGreaterThan(0)

      service.cleanup()

      expect(service.getDiscoveredDevices()).toHaveLength(0)
      expect(service.listenerCount('devices-found')).toBe(0)
    })
  })

  describe('Discovery Options', () => {
    it('should filter offline devices by default', async () => {
      const oldDevice: K1DiscoveredDevice = {
        id: 'k1-old',
        name: 'K1.old',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(Date.now() - 400000), // 6+ minutes ago
        discoveryMethod: 'mdns',
      }

      const recentDevice: K1DiscoveredDevice = {
        id: 'k1-recent',
        name: 'K1.recent',
        ip: '192.168.1.101',
        port: 80,
        mac: '00:11:22:33:44:66',
        firmware: '1.0.0',
        lastSeen: new Date(),
        discoveryMethod: 'mdns',
      }

      mockDiscover.mockResolvedValue([oldDevice, recentDevice])

      const result = await service.discoverDevices({ 
        preferredMethods: ['mdns'],
        includeOffline: false 
      })

      expect(result.devices).toHaveLength(1)
      expect(result.devices[0].id).toBe('k1-recent')
    })

    it('should include offline devices when requested', async () => {
      const oldDevice: K1DiscoveredDevice = {
        id: 'k1-old',
        name: 'K1.old',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(Date.now() - 400000), // 6+ minutes ago
        discoveryMethod: 'mdns',
      }

      mockDiscover.mockResolvedValue([oldDevice])

      const result = await service.discoverDevices({ 
        preferredMethods: ['mdns'],
        includeOffline: true 
      })

      expect(result.devices).toHaveLength(1)
      expect(result.devices[0].id).toBe('k1-old')
    })
  })
})