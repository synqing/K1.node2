/**
 * Exponential backoff with jitter utilities
 * Implements Subtask 2.4: Reconnection backoff with jitter
 */

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Ensure non-negative values
  const safeBaseDelay = Math.max(0, baseDelay)
  const safeMaxDelay = Math.max(0, maxDelay)
  
  if (attempt <= 0) {
    return safeBaseDelay
  }

  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = safeBaseDelay * Math.pow(2, attempt - 1)
  
  // Cap at maximum delay
  return Math.min(exponentialDelay, safeMaxDelay)
}

/**
 * Add jitter to a delay value
 */
export function calculateJitter(
  baseDelay: number,
  jitterPercent: number
): number {
  if (baseDelay <= 0 || jitterPercent <= 0) {
    return Math.max(0, baseDelay)
  }

  // Calculate jitter amount (0 to jitterPercent% of baseDelay)
  const jitterAmount = Math.random() * (jitterPercent / 100) * baseDelay
  
  return baseDelay + jitterAmount
}