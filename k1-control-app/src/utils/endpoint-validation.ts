/**
 * Endpoint Validation Utilities
 * Validates and formats IPv4, IPv6, and hostname endpoints for K1 connections
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEndpoint?: string;
}

/**
 * IPv4 address pattern
 * Matches: 0.0.0.0 to 255.255.255.255
 */
const IPV4_PATTERN = /^((\d{1,3})\.){3}(\d{1,3})$/;

/**
 * IPv6 address pattern (simplified, covers most common cases)
 * Matches compressed and uncompressed IPv6 addresses
 */
const IPV6_PATTERN =
  /^(([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}|::(([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4})?)$/;

/**
 * Hostname pattern (DNS compatible)
 * Matches: hostname, hostname.com, hostname-1.example.co.uk, etc.
 */
const HOSTNAME_PATTERN = /^(?!-)([a-zA-Z0-9-]{1,63}(?<!-)\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/**
 * Port pattern
 */
const PORT_PATTERN = /^(\d{1,5})$/;

/**
 * Validate an IPv4 address
 */
function isValidIPv4(ip: string): boolean {
  if (!IPV4_PATTERN.test(ip)) {
    return false;
  }

  // Check each octet is in valid range
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate an IPv6 address
 */
function isValidIPv6(ip: string): boolean {
  // Remove brackets if present
  const cleaned = ip.replace(/^\[|\]$/g, '');
  return IPV6_PATTERN.test(cleaned);
}

/**
 * Validate a hostname (DNS name)
 */
function isValidHostname(hostname: string): boolean {
  // Maximum hostname length is 253 characters
  if (hostname.length > 253) {
    return false;
  }

  // Split into labels and validate each
  const labels = hostname.split('.');
  return (
    labels.length > 0 &&
    labels.every(label => {
      // Each label max 63 characters
      return label.length > 0 && label.length <= 63 && HOSTNAME_PATTERN.test(label);
    })
  );
}

/**
 * Validate a port number
 */
function isValidPort(port: string): boolean {
  if (!PORT_PATTERN.test(port)) {
    return false;
  }

  const num = parseInt(port, 10);
  return num > 0 && num <= 65535;
}

/**
 * Validate an endpoint (IP/hostname with optional port)
 *
 * @param input - Raw user input (e.g., "192.168.1.103", "k1.local:8080", "fe80::1")
 * @returns Validation result with normalized endpoint if valid
 *
 * @example
 * validateEndpoint("192.168.1.103")
 * // { isValid: true, normalizedEndpoint: "http://192.168.1.103" }
 *
 * @example
 * validateEndpoint("k1.local:8080")
 * // { isValid: true, normalizedEndpoint: "http://k1.local:8080" }
 *
 * @example
 * validateEndpoint("[fe80::1]")
 * // { isValid: true, normalizedEndpoint: "http://[fe80::1]" }
 */
export function validateEndpoint(input: string): ValidationResult {
  const trimmed = input.trim();

  // Check for empty input
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter an IP address or hostname',
    };
  }

  // Check if already a URL (with protocol)
  if (trimmed.match(/^https?:\/\//)) {
    return {
      isValid: true,
      normalizedEndpoint: trimmed,
    };
  }

  // Split into host and port
  let host = trimmed;
  let port = '80'; // Default port

  // Handle IPv6 addresses in brackets (e.g., [fe80::1]:8080)
  if (trimmed.startsWith('[')) {
    const bracketIndex = trimmed.indexOf(']');
    if (bracketIndex === -1) {
      return {
        isValid: false,
        error: 'Invalid IPv6 address format (unclosed bracket)',
      };
    }

    host = trimmed.substring(0, bracketIndex + 1);

    // Check for port after closing bracket
    const afterBracket = trimmed.substring(bracketIndex + 1);
    if (afterBracket.startsWith(':')) {
      port = afterBracket.substring(1);
    } else if (afterBracket.length > 0) {
      return {
        isValid: false,
        error: 'Invalid format after IPv6 address',
      };
    }
  } else {
    // For non-IPv6, split on last colon for port
    const lastColon = trimmed.lastIndexOf(':');
    if (lastColon > 0) {
      const potentialPort = trimmed.substring(lastColon + 1);
      // Check if this is actually a port (numeric)
      if (potentialPort.match(/^\d+$/)) {
        host = trimmed.substring(0, lastColon);
        port = potentialPort;
      }
    }
  }

  // Validate port if provided
  if (!isValidPort(port)) {
    return {
      isValid: false,
      error: `Invalid port number: ${port}. Must be between 1 and 65535`,
    };
  }

  // Validate host
  const isIPv4 = isValidIPv4(host);
  const isIPv6 = isValidIPv6(host);
  const isHostname = isValidHostname(host);

  if (!isIPv4 && !isIPv6 && !isHostname) {
    return {
      isValid: false,
      error: 'Invalid IP address or hostname. Examples: 192.168.1.103, k1.local, [fe80::1]',
    };
  }

  // Build normalized endpoint
  const protocol = port === '443' ? 'https' : 'http';
  const normalizedEndpoint = `${protocol}://${host}${port !== '80' && port !== '443' ? ':' + port : ''}`;

  return {
    isValid: true,
    normalizedEndpoint,
  };
}

/**
 * Extract hostname from a normalized endpoint
 *
 * @example
 * extractHostFromEndpoint("http://192.168.1.103")
 * // "192.168.1.103"
 *
 * @example
 * extractHostFromEndpoint("http://[fe80::1]:8080")
 * // "[fe80::1]"
 */
export function extractHostFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.hostname.startsWith('[') ? `[${url.hostname}]` : url.hostname;
  } catch {
    // Fallback for malformed URLs: return endpoint as-is or extract host manually
    // This should only happen if validateEndpoint wasn't called first
    const match = endpoint.match(/(?:https?:\/\/)?([^\/:]+)/);
    return match ? match[1] : endpoint;
  }
}

/**
 * Extract port from a normalized endpoint
 *
 * @example
 * extractPortFromEndpoint("http://192.168.1.103")
 * // "80"
 *
 * @example
 * extractPortFromEndpoint("https://k1.local:8443")
 * // "8443"
 */
export function extractPortFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.port || (url.protocol === 'https:' ? '443' : '80');
  } catch {
    // Fallback for malformed URLs
    const match = endpoint.match(/:(\d+)/);
    return match ? match[1] : '80';
  }
}

/**
 * Check if an endpoint is reachable (basic connectivity check)
 * This is a simple check using fetch with a short timeout
 *
 * @param endpoint - Normalized endpoint URL
 * @param timeout - Timeout in milliseconds (default 3000)
 * @returns Promise that resolves to true if endpoint is reachable, false otherwise
 */
export async function isEndpointReachable(
  endpoint: string,
  timeout = 3000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${endpoint}/api/patterns`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Sanitize an endpoint for display (hide sensitive parts)
 *
 * @example
 * sanitizeEndpointForDisplay("http://192.168.1.1:8080/api/secret?token=xyz")
 * // "http://192.168.1.1:8080"
 */
export function sanitizeEndpointForDisplay(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
  } catch {
    return endpoint;
  }
}

/**
 * Strip credentials from an endpoint URL
 * Removes username:password@ from URLs before storage/display
 *
 * @example
 * stripCredentialsFromEndpoint("http://user:pass@192.168.1.1:8080")
 * // "http://192.168.1.1:8080"
 */
export function stripCredentialsFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    // Reconstruct URL without credentials
    return `${url.protocol}//${url.host}${url.pathname}${url.search}${url.hash}`;
  } catch {
    // Fallback: use regex to remove user:pass@
    return endpoint.replace(/^(https?:\/\/)([^@]+@)(.+)$/, '$1$3');
  }
}
