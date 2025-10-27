/**
 * Retry utility with exponential backoff
 */

import { K1Error } from './error-types';

interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = (error) => {
      const k1Error = K1Error.fromUnknown(error);
      return k1Error.shouldRetry();
    }
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !retryCondition(error)) {
        throw error;
      }
      
      const k1Error = K1Error.fromUnknown(error);
      const delay = Math.min(
        k1Error.getRetryDelay() * Math.pow(backoffFactor, attempt - 1), 
        maxDelay
      );
      
      console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}