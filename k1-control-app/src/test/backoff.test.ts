/**
 * Comprehensive backoff and reconnection logic tests
 * Tests Subtask 2.4: Reconnection backoff with jitter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateBackoffDelay, calculateJitter } from '../utils/backoff'
import { setMockRandom } from './setup'

describe('Backoff Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const baseDelay = 1000
      const maxDelay = 30000

      // First attempt (attempt 1)
      expect(calculateBackoffDelay(1, baseDelay, maxDelay)).toBe(1000)
      
      // Second attempt (attempt 2)
      expect(calculateBackoffDelay(2, baseDelay, maxDelay)).toBe(2000)
      
      // Third attempt (attempt 3)
      expect(calculateBackoffDelay(3, baseDelay, maxDelay)).toBe(4000)
      
      // Fourth attempt (attempt 4)
      expect(calculateBackoffDelay(4, baseDelay, maxDelay)).toBe(8000)
      
      // Fifth attempt (attempt 5)
      expect(calculateBackoffDelay(5, baseDelay, maxDelay)).toBe(16000)
      
      // Sixth attempt (attempt 6) - should cap at maxDelay
      expect(calculateBackoffDelay(6, baseDelay, maxDelay)).toBe(30000)
      
      // Seventh attempt (attempt 7) - should stay at maxDelay
      expect(calculateBackoffDelay(7, baseDelay, maxDelay)).toBe(30000)
    })

    it('should handle edge cases', () => {
      const baseDelay = 500
      const maxDelay = 10000

      // Zero attempts should return base delay
      expect(calculateBackoffDelay(0, baseDelay, maxDelay)).toBe(baseDelay)
      
      // Negative attempts should return base delay
      expect(calculateBackoffDelay(-1, baseDelay, maxDelay)).toBe(baseDelay)
      
      // Very high attempts should cap at max delay
      expect(calculateBackoffDelay(100, baseDelay, maxDelay)).toBe(maxDelay)
    })

    it('should handle small max delays', () => {
      const baseDelay = 1000
      const maxDelay = 1500

      // Should immediately cap at max delay
      expect(calculateBackoffDelay(2, baseDelay, maxDelay)).toBe(maxDelay)
      expect(calculateBackoffDelay(3, baseDelay, maxDelay)).toBe(maxDelay)
    })
  })

  describe('calculateJitter', () => {
    it('should add deterministic jitter with fixed random', () => {
      const baseDelay = 1000
      const jitterPercent = 20

      // Set deterministic random value
      setMockRandom(0.5) // Middle of range
      
      const jitteredDelay = calculateJitter(baseDelay, jitterPercent)
      
      // With 20% jitter and 0.5 random:
      // jitter = 0.5 * 0.2 * 1000 = 100
      // result = 1000 + 100 = 1100
      expect(jitteredDelay).toBe(1100)
    })

    it('should handle minimum jitter', () => {
      const baseDelay = 1000
      const jitterPercent = 20

      // Set random to 0 (minimum jitter)
      setMockRandom(0)
      
      const jitteredDelay = calculateJitter(baseDelay, jitterPercent)
      
      // With 20% jitter and 0.0 random:
      // jitter = 0.0 * 0.2 * 1000 = 0
      // result = 1000 + 0 = 1000
      expect(jitteredDelay).toBe(1000)
    })

    it('should handle maximum jitter', () => {
      const baseDelay = 1000
      const jitterPercent = 20

      // Set random to 1 (maximum jitter)
      setMockRandom(1)
      
      const jitteredDelay = calculateJitter(baseDelay, jitterPercent)
      
      // With 20% jitter and 1.0 random:
      // jitter = 1.0 * 0.2 * 1000 = 200
      // result = 1000 + 200 = 1200
      expect(jitteredDelay).toBe(1200)
    })

    it('should handle zero jitter percent', () => {
      const baseDelay = 1000
      const jitterPercent = 0

      setMockRandom(0.5)
      
      const jitteredDelay = calculateJitter(baseDelay, jitterPercent)
      
      // No jitter should be added
      expect(jitteredDelay).toBe(1000)
    })

    it('should handle different jitter percentages', () => {
      const baseDelay = 1000
      setMockRandom(0.5)

      // 10% jitter
      expect(calculateJitter(baseDelay, 10)).toBe(1050)
      
      // 30% jitter
      expect(calculateJitter(baseDelay, 30)).toBe(1150)
      
      // 50% jitter
      expect(calculateJitter(baseDelay, 50)).toBe(1250)
    })
  })

  describe('Combined Backoff with Jitter', () => {
    it('should produce deterministic results with fixed random', () => {
      const baseDelay = 500
      const maxDelay = 30000
      const jitterPercent = 20

      setMockRandom(0.3)

      const results = []
      for (let attempt = 1; attempt <= 10; attempt++) {
        const backoffDelay = calculateBackoffDelay(attempt, baseDelay, maxDelay)
        const finalDelay = calculateJitter(backoffDelay, jitterPercent)
        results.push(finalDelay)
      }

      // Expected results with 0.3 random and 20% jitter:
      // Attempt 1: 500 + (0.3 * 0.2 * 500) = 500 + 30 = 530
      // Attempt 2: 1000 + (0.3 * 0.2 * 1000) = 1000 + 60 = 1060
      // Attempt 3: 2000 + (0.3 * 0.2 * 2000) = 2000 + 120 = 2120
      // etc.
      
      expect(results[0]).toBe(530)   // Attempt 1
      expect(results[1]).toBe(1060)  // Attempt 2
      expect(results[2]).toBe(2120)  // Attempt 3
      expect(results[3]).toBe(4240)  // Attempt 4
      expect(results[4]).toBe(8480)  // Attempt 5
      expect(results[5]).toBe(16960) // Attempt 6
      expect(results[6]).toBe(30000 + (0.3 * 0.2 * 30000)) // Attempt 7 (capped)
    })

    it('should handle edge cases in combination', () => {
      const baseDelay = 100
      const maxDelay = 1000
      const jitterPercent = 50

      setMockRandom(0.8)

      // Test with small delays and high jitter
      const backoffDelay = calculateBackoffDelay(3, baseDelay, maxDelay)
      const finalDelay = calculateJitter(backoffDelay, jitterPercent)

      // Attempt 3: 400ms base + (0.8 * 0.5 * 400) = 400 + 160 = 560
      expect(finalDelay).toBe(560)
    })
  })

  describe('Realistic Reconnection Scenarios', () => {
    it('should simulate realistic reconnection timing', () => {
      const baseDelay = 1000
      const maxDelay = 30000
      const jitterPercent = 20
      const maxAttempts = 10

      // Simulate different random values for each attempt
      const randomValues = [0.1, 0.3, 0.7, 0.2, 0.9, 0.4, 0.6, 0.8, 0.5, 0.0]
      const delays = []

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        setMockRandom(randomValues[attempt - 1])
        
        const backoffDelay = calculateBackoffDelay(attempt, baseDelay, maxDelay)
        const finalDelay = calculateJitter(backoffDelay, jitterPercent)
        delays.push(finalDelay)
      }

      // Verify exponential growth with jitter
      expect(delays[0]).toBeGreaterThanOrEqual(1000) // At least base delay
      expect(delays[0]).toBeLessThan(1200) // With max 20% jitter
      
      expect(delays[1]).toBeGreaterThanOrEqual(2000)
      expect(delays[1]).toBeLessThan(2400)
      
      expect(delays[2]).toBeGreaterThanOrEqual(4000)
      expect(delays[2]).toBeLessThan(4800)
      
      // Later attempts should be capped at maxDelay
      expect(delays[9]).toBeLessThanOrEqual(maxDelay * 1.2) // Max delay + max jitter
    })

    it('should handle rapid successive failures', () => {
      const baseDelay = 500
      const maxDelay = 10000
      const jitterPercent = 15

      setMockRandom(0.5)

      // Simulate 20 rapid failures
      const delays = []
      for (let attempt = 1; attempt <= 20; attempt++) {
        const backoffDelay = calculateBackoffDelay(attempt, baseDelay, maxDelay)
        const finalDelay = calculateJitter(backoffDelay, jitterPercent)
        delays.push(finalDelay)
      }

      // All delays after reaching max should be similar (with jitter)
      const maxDelayWithJitter = maxDelay + (0.5 * 0.15 * maxDelay)
      
      // Find first delay that hits the cap
      let capIndex = -1
      for (let i = 0; i < delays.length; i++) {
        if (calculateBackoffDelay(i + 1, baseDelay, maxDelay) === maxDelay) {
          capIndex = i
          break
        }
      }

      // All delays from cap index onwards should be the same (with jitter)
      for (let i = capIndex; i < delays.length; i++) {
        expect(delays[i]).toBe(maxDelayWithJitter)
      }
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle very large attempt numbers', () => {
      const baseDelay = 1000
      const maxDelay = 60000

      // Should not overflow or cause performance issues
      expect(() => {
        calculateBackoffDelay(1000000, baseDelay, maxDelay)
      }).not.toThrow()

      expect(calculateBackoffDelay(1000000, baseDelay, maxDelay)).toBe(maxDelay)
    })

    it('should handle zero and negative delays', () => {
      expect(calculateBackoffDelay(1, 0, 1000)).toBe(0)
      expect(calculateBackoffDelay(1, -100, 1000)).toBe(0) // Should clamp to 0
      
      expect(calculateJitter(0, 20)).toBe(0)
      expect(calculateJitter(-100, 20)).toBe(0) // Should clamp to 0
    })

    it('should handle invalid jitter percentages', () => {
      const baseDelay = 1000

      // Negative jitter should be treated as 0
      expect(calculateJitter(baseDelay, -10)).toBe(baseDelay)
      
      // Very high jitter should work but be unusual
      setMockRandom(0.5)
      expect(calculateJitter(baseDelay, 100)).toBe(1500) // 50% of 100% jitter
    })
  })
})