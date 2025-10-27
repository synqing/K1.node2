/**
 * Browser-based mDNS/Device Discovery Service
 * Uses WebRTC and network scanning for local device discovery
 */

import { K1DiscoveredDevice } from '../types/k1-types';
import { K1Error, ErrorCode } from '../utils/error-types';

export class BrowserMDNSService {
  private abortController: AbortController | null = null;
  
  /**
   * Discover K1 devices on the local network
   */
  async discoverK1Devices(timeout: number = 5000): Promise<K1DiscoveredDevice[]> {
    this.abortController = new AbortController();
    const devices: K1DiscoveredDevice[] = [];
    
    try {
      // Get local network ranges to scan
      const networkRanges = await this.getLocalNetworkRanges();
      console.log('[BrowserMDNS] Scanning network ranges:', networkRanges);
      
      // Generate IP addresses to probe
      const ipsToProbe = this.generateIPsToProbe(networkRanges);
      console.log(`[BrowserMDNS] Probing ${ipsToProbe.length} IP addresses`);
      
      // Probe devices in parallel with timeout
      const probePromises = ipsToProbe.map(ip => 
        this.probeK1Device(ip, this.abortController!.signal)
      );
      
      const results = await Promise.allSettled(probePromises);
      
      // Collect successful probes
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          devices.push(result.value);
        }
      });
      
      console.log(`[BrowserMDNS] Found ${devices.length} K1 devices`);
      return devices;
      
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        throw new K1Error(
          ErrorCode.DISCOVERY_FAILED,
          'Discovery cancelled',
          'Device discovery was cancelled',
          false
        );
      }
      
      throw new K1Error(
        ErrorCode.DISCOVERY_FAILED,
        `Discovery failed: ${error}`,
        'Failed to discover devices on the network. Please try manual connection.',
        true,
        { originalError: error }
      );
    } finally {
      this.abortController = null;
    }
  }
  
  /**
   * Cancel ongoing discovery
   */
  cancelDiscovery(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
  
  /**
   * Get local network IP ranges using WebRTC
   */
  private async getLocalNetworkRanges(): Promise<string[]> {
    try {
      // Use WebRTC to discover local IP addresses
      const localIPs = await this.getLocalIPs();
      
      // Convert to network ranges (e.g., 192.168.1.x)
      const ranges = localIPs.map(ip => {
        const parts = ip.split('.');
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
        return null;
      }).filter(Boolean) as string[];
      
      // Add common network ranges if none found
      if (ranges.length === 0) {
        return ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
      }
      
      return [...new Set(ranges)]; // Remove duplicates
    } catch (error) {
      console.warn('[BrowserMDNS] Failed to get local IPs, using common ranges:', error);
      return ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    }
  }
  
  /**
   * Get local IP addresses using WebRTC
   */
  private async getLocalIPs(): Promise<string[]> {
    return new Promise((resolve) => {
      const ips: string[] = [];
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.createDataChannel('');
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (match && !ips.includes(match[1])) {
            ips.push(match[1]);
          }
        }
      };
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      // Timeout after 2 seconds
      setTimeout(() => {
        pc.close();
        resolve(ips);
      }, 2000);
    });
  }
  
  /**
   * Generate list of IPs to probe based on network ranges
   */
  private generateIPsToProbe(ranges: string[]): string[] {
    const ips: string[] = [];
    
    ranges.forEach(range => {
      // Probe common device IPs first (1, 100-110, 200-210)
      const commonIPs = [1, 100, 101, 102, 103, 104, 105, 200, 201, 202];
      commonIPs.forEach(lastOctet => {
        ips.push(`${range}.${lastOctet}`);
      });
    });
    
    return ips;
  }
  
  /**
   * Probe a specific IP for K1 device
   */
  private async probeK1Device(ip: string, signal: AbortSignal): Promise<K1DiscoveredDevice | null> {
    const ports = [80, 8080, 3000]; // Common K1 ports
    
    for (const port of ports) {
      try {
        const response = await fetch(`http://${ip}:${port}/api/device-info`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
          headers: { 'Accept': 'application/json' }
        });
        
        if (signal.aborted) return null;
        
        if (response.ok) {
          const deviceInfo = await response.json();
          
          // Validate this is actually a K1 device
          if (this.isK1Device(deviceInfo)) {
            return {
              id: `discovered-${ip}-${port}`,
              name: deviceInfo.device || `K1 Device (${ip})`,
              ip,
              port,
              mac: deviceInfo.mac || 'unknown',
              firmware: deviceInfo.firmware || 'unknown',
              lastSeen: new Date(),
              discoveryMethod: 'scan',
              rssi: this.calculateSignalStrength(response)
            };
          }
        }
      } catch (error) {
        // Device not found or not K1, continue to next port
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Validate if response is from a K1 device
   */
  private isK1Device(deviceInfo: any): boolean {
    return deviceInfo && 
           (deviceInfo.device?.toLowerCase().includes('k1') ||
            deviceInfo.type === 'k1' ||
            deviceInfo.product === 'k1');
  }
  
  /**
   * Calculate signal strength based on response timing
   */
  private calculateSignalStrength(response: Response): number {
    // Estimate signal strength based on response time
    // This is a rough approximation for UI purposes
    const responseTime = response.headers.get('x-response-time');
    if (responseTime) {
      const time = parseInt(responseTime);
      return Math.max(-80, -30 - (time / 10)); // Convert to dBm-like value
    }
    
    // Default to good signal if no timing info
    return -45;
  }
}