/**
 * Comprehensive discovery service tests
 * Tests Subtask 3.1: Discovery abstraction with K1Client or fallback scanner
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

describe('K1DiscoveryService', () => {
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

  describe('Basic Discovery', () => {
    it('should discover devices via mDNS successfully', async () => {
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

      const discoveryPromise = service.discoverDevices({ 
        timeout: 1000,
        preferredMethods: ['mdns'] // Only mDNS to avoid scan timeout
      })

      // Fast-forward any timers
      vi.advanceTimersByTime(1000)

      const result = await discoveryPromise

      expect(result.devices).toHaveLength(1)
      expect(result.devices[0].discoveryMethod).toBe('mdns')
      expect(result.method).toBe('mdns')
      expect(result.duration).toBeGreaterThan(0)
      expect(mockDiscover).toHaveBeenCalledWith(500) // timeout / 2
    })

    it('should fallback to scan when mDNS fails', async () => {
      mockDiscover.mockRejectedValue(new Error('mDNS not available'))

      const discoveryPromise = service.discoverDevices({ 
        timeout: 2000,
        preferredMethods: ['mdns', 'scan'] 
      })

      // Fast-forward scan timeout
      vi.advanceTimersByTime(1000)

      const result = await discoveryPromise

      expect(result.devices).toHaveLength(1) // Mock scan result
      expect(result.method).toBe('scan')
      expect(result.errors).toContain('mDNS discovery failed: Error: mDNS not available')
    })

    it('should combine mDNS and scan results', async () => {
      const mdnsDevices: K1DiscoveredDevice[] = [
        {
          id: 'k1-mdns',
          name: 'K1.mdns',
          ip: '192.168.1.100',
          port: 80,
          mac: '00:11:22:33:44:55',
          firmware: '1.0.0',
          lastSeen: new Date(),
          discoveryMethod: 'mdns',
        },
      ]

      mockDiscover.mockResolvedValue(mdnsDevices)

      const discoveryPromise = service.discoverDevices({ 
        timeout: 2000,
        preferredMethods: ['mdns', 'scan'] 
      })

      // Fast-forward scan timeout
      vi.advanceTimersByTime(1500)

      const result = await discoveryPromise

      expect(result.devices).toHaveLength(2) // mDNS + scan results
      expect(result.method).toBe('hybrid')
      expect(result.devices.some(d => d.discoveryMethod === 'mdns')).toBe(true)
      expect(result.devices.some(d => d.discoveryMethod === 'scan')).toBe(true)
    })
  })

  describe('Discovery Options', () => {
    it('should respect timeout option', async () => {
      mockDiscover.mockImplementation((timeout) => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), timeout)
        })
      })

      const startTime = Date.now()
      const discoveryPromise = service.discoverDevices({ timeout: 1000 })

      vi.advanceTimersByTime(1000)

      const result = await discoveryPromise
      
      expect(result.duration).toBeLessThan(1200) // Allow some margin
      expect(mockDiscover).toHaveBeenCalledWith(500) // timeout / 2
    })

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

      const result = await service.discoverDevices({ includeOffline: false })

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

      const result = await service.discoverDevices({ includeOffline: true })

      expect(result.devices).toHaveLength(1)
      expect(result.devices[0].id).toBe('k1-old')
    })
  })

  describe('Device Cache Management', () => {
    it('should cache discovered devices', async () => {
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

      await service.discoverDevices()

      const cachedDevices = service.getDiscoveredDevices()
      expect(cachedDevices).toHaveLength(1)
      expect(cachedDevices[0].id).toBe('k1-001')
    })

    it('should update existing devices with newer information', async () => {
      const initialDevice: K1DiscoveredDevice = {
        id: 'k1-001',
        name: 'K1.test',
        ip: '192.168.1.100',
        port: 80,
        mac: '00:11:22:33:44:55',
        firmware: '1.0.0',
        lastSeen: new Date(Date.now() - 60000), // 1 minute ago
        discoveryMethod: 'mdns',
      }

      const updatedDevice: K1DiscoveredDevice = {
        ...initialDevice,
        firmware: '1.0.1', // Updated firmware
        lastSeen: new Date(), // More recent
      }

      // First discovery
      mockDiscover.mockResolvedValue([initialDevice])
      await service.discoverDevices()

      // Second discovery with updated info
      mockDiscover.mockResolvedValue([updatedDevice])
      await service.discoverDevices()

      const cachedDevices = service.getDiscoveredDevices()
      expect(cachedDevices).toHaveLength(1)
      expect(cachedDevices[0].firmware).toBe('1.0.1')
      expect(cachedDevices[0].lastSeen.getTime()).toBeGreaterThan(initialDevice.lastSeen.getTime())
    })

    it('should get device by ID or IP', async () => {
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
      await service.discoverDevices()

      // Get by ID
      const deviceById = service.getDevice('k1-001')
      expect(deviceById?.id).toBe('k1-001')

      // Get by IP
      const deviceByIp = service.getDevice('192.168.1.100')
      expect(deviceByIp?.ip).toBe('192.168.1.100')

      // Non-existent device
      const nonExistent = service.getDevice('not-found')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Manual Device Addition', () => {
    it('should add manual devices', () => {
      const device = service.addManualDevice('192.168.1.200', 8080)

      expect(device.id).toBe('manual-192.168.1.200')
      expect(device.ip).toBe('192.168.1.200')
      expect(device.port).toBe(8080)
      expect(device.discoveryMethod).toBe('manual')

      const cachedDevices = service.getDiscoveredDevices()
      expect(cachedDevices).toHaveLength(1)
      expect(cachedDevices[0].id).toBe('manual-192.168.1.200')
    })

    it('should use default port for manual devices', () => {
      const device = service.addManualDevice('192.168.1.200')

      expect(device.port).toBe(80)
    })
  })

  describe('Discovery Cancellation', () => {
    it('should cancel ongoing discovery', async () => {
      mockDiscover.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([]), 5000) // Long timeout
        })
      })

      const discoveryPromise = service.discoverDevices({ timeout: 10000 })

      // Cancel after a short time
      setTimeout(() => service.cancelDiscovery(), 100)
      vi.advanceTimersByTime(100)

      expect(service.isDiscovering()).toBe(false)
    })

    it('should handle cancellation gracefully', async () => {
      mockDiscover.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Cancelled')), 1000)
        })
      })

      service.cancelDiscovery() // Cancel before starting

      const result = await service.discoverDevices({ timeout: 2000 })
      
      // Should still complete with scan fallback
      expect(result.devices).toBeDefined()
    })
  })

  describe('Continuous Discovery', () => {
    it('should start and stop continuous discovery', async () => {
      mockDiscover.mockResolvedValue([])

      service.startContinuousDiscovery(1000)

      expect(service.isDiscovering()).toBe(true)

      // Fast-forward to trigger interval
      vi.advanceTimersByTime(2000)

      expect(mockDiscover).toHaveBeenCalledTimes(2) // Initial + interval

      service.stopContinuousDiscovery()
      
      // Fast-forward more - should not trigger additional calls
      vi.advanceTimersByTime(2000)
      
      expect(mockDiscover).toHaveBeenCalledTimes(2) // Still 2
    })

    it('should not start new discovery if one is already running', async () => {
      mockDiscover.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), 2000) // Long discovery
        })
      })

      service.startContinuousDiscovery(500) // Short interval

      // Fast-forward through multiple intervals
      vi.advanceTimersByTime(1500)

      // Should only have started one discovery (the initial one is still running)
      expect(mockDiscover).toHaveBeenCalledTimes(1)
    })
  })

  describe('Event Emission', () => {
    it('should emit discovery events', async () => {
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

      const startedSpy = vi.fn()
      const foundSpy = vi.fn()
      const completedSpy = vi.fn()

      service.on('discovery-started', startedSpy)
      service.on('devices-found', foundSpy)
      service.on('discovery-completed', completedSpy)

      await service.discoverDevices()

      expect(startedSpy).toHaveBeenCalledTimes(1)
      expect(foundSpy).toHaveBeenCalledWith(mockDevices)
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          devices: mockDevices,
          method: 'mdns',
        })
      )
    })

    it('should emit error events', async () => {
      const error = new Error('Discovery failed')
      mockDiscover.mockRejectedValue(error)

      const errorSpy = vi.fn()
      service.on('discovery-error', errorSpy)

      // Disable scan fallback to force error
      await expect(
        service.discoverDevices({ preferredMethods: ['mdns'] })
      ).rejects.toThrow('Discovery failed')

      expect(errorSpy).toHaveBeenCalledWith(error)
    })

    it('should emit device-updated events', async () => {
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

      const updatedSpy = vi.fn()
      service.on('device-updated', updatedSpy)

      await service.discoverDevices()

      expect(updatedSpy).toHaveBeenCalledWith(mockDevice)
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources', () => {
      service.startContinuousDiscovery(1000)
      
      const listenerCount = service.listenerCount('devices-found')
      service.on('devices-found', () => {})
      
      expect(service.listenerCount('devices-found')).toBeGreaterThan(listenerCount)

      service.cleanup()

      expect(service.isDiscovering()).toBe(false)
      expect(service.listenerCount('devices-found')).toBe(0)
      expect(service.getDiscoveredDevices()).toHaveLength(0)
    })
  })
})