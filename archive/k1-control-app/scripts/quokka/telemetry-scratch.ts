// Quokka scratch: quick telemetry experiment
// Run Quokka on this file to see inline results.

import { telemetryManager, K1Telemetry } from '../../src/utils/telemetry-manager';

// Emit a UI event via telemetry hooks/logging
K1Telemetry.recordEvent({
  type: 'ui',
  category: 'click',
  action: 'EffectSelector',
  metadata: { effect: 'mode1' },
  timestamp: Date.now(),
});

// Build a telemetry state using manager helpers
let telemetry = telemetryManager.resetTelemetry();
telemetry = telemetryManager.updateTelemetryForConnection(telemetry, 'attempt');
telemetry = telemetryManager.updateTelemetryForConnection(telemetry, 'success');
telemetry = telemetryManager.updateTelemetryForSuccess(telemetry, 'pattern_change', 123);

// Derive a summary and simple KPI
const summary = telemetryManager.getTelemetrySummary(telemetry);
console.log('Requests success rate:', summary.requests.successRate);
console.log('Connections success rate:', summary.connections.successRate);
console.log('Pattern changes:', telemetry.featureUsage.patternChanges);
console.log('Average latency:', summary.requests.averageLatency);