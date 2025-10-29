# Implementation Plan

- [x] 1. Implement custom React hooks for metrics access
  - Create three custom hooks that provide real-time access to discovery metrics, cache stats, and queue configuration
  - _Requirements: 1.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 1.1 Implement useDiscoveryMetrics hook
  - Create `src/hooks/useDiscoveryMetrics.ts` with polling logic
  - Implement useState for metrics data storage
  - Implement useEffect with setInterval for 1-second polling
  - Fetch data from discoveryMetrics singleton
  - Calculate aggregate statistics (totalDiscoveries, totalDevicesFound, avgDevicesPerDiscovery)
  - Implement interval cleanup on unmount
  - Add error handling for missing singleton
  - _Requirements: 1.2, 6.1, 6.4_

- [x] 1.2 Implement useCacheStats hook
  - Create `src/hooks/useCacheStats.ts` with polling logic
  - Implement useState for cache metrics storage
  - Implement useEffect with setInterval for 1-second polling
  - Fetch cache config from device-discovery singleton
  - Fetch cache metrics from discoveryMetrics singleton
  - Calculate hit rate with division-by-zero protection
  - Implement interval cleanup on unmount
  - _Requirements: 2.1, 2.2, 2.3, 6.2, 6.5_

- [x] 1.3 Implement useDiscoveryQueueConfig hook
  - Create `src/hooks/useDiscoveryQueueConfig.ts` with one-time fetch
  - Implement useState for config storage
  - Implement useEffect with empty dependency array (mount only)
  - Fetch config from device-discovery singleton
  - Return null if config unavailable
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.3_

- [x] 2. Create dashboard component structure and panels
  - Build the main DiscoveryMonitoringDashboard component with five distinct panels for metrics visualization
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.1 Create dashboard component skeleton
  - Create `src/components/discovery/DiscoveryMonitoringDashboard.tsx`
  - Define DiscoveryMonitoringDashboardProps interface with refreshIntervalMs prop
  - Implement functional component with TypeScript
  - Call all three custom hooks (useDiscoveryMetrics, useCacheStats, useDiscoveryQueueConfig)
  - Pass refreshIntervalMs to hooks that support it
  - Create basic layout structure for 5 panels
  - _Requirements: 1.1, 1.5, 4.5_

- [x] 2.2 Implement Panel 1: Live Statistics
  - Create 4-column grid layout (responsive: 2x2 tablet, 1x4 mobile)
  - Implement Card 1: Total Discoveries (large number display)
  - Implement Card 2: Devices Found (large number display)
  - Implement Card 3: Cache Size with progress bar (size/maxSize)
  - Implement Card 4: Cache Hit Rate with percentage gauge
  - Use data from useDiscoveryMetrics().aggregate and useCacheStats()
  - Apply large font styling (48px+) for metrics
  - _Requirements: 1.1, 1.3, 2.1, 5.1, 5.2, 5.4_

- [x] 2.3 Implement Panel 2: Method Performance Chart
  - Install recharts library: `npm install recharts`
  - Import BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
  - Transform methodMetrics Map to array format for Recharts
  - Configure X-axis with method names
  - Configure Y-axis with success rate (0-100%)
  - Implement conditional bar colors: green (>80%), yellow (50-80%), red (<50%)
  - Add custom tooltip showing success rate, avg duration, attempt count
  - Wrap chart in ResponsiveContainer
  - _Requirements: 1.3, 5.3_

- [x] 2.4 Implement Panel 3: Discovery Timeline Chart
  - Import LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
  - Extract last 20 snapshots from useDiscoveryMetrics().history
  - Transform snapshots to chart data format (timestamp, durationMs, devicesFound)
  - Configure dual Y-axis: left for duration (seconds), right for devices found
  - Configure X-axis with time labels
  - Add Line for duration (blue, left axis)
  - Add Line for devicesFound (orange, right axis)
  - Add custom tooltip with formatted time and metrics
  - Wrap chart in ResponsiveContainer
  - _Requirements: 1.3, 1.4, 5.3_

- [x] 2.5 Implement Panel 4: Cache Health Metrics
  - Create key-value list layout
  - Display totalHits from useCacheStats()
  - Display totalMisses from useCacheStats()
  - Display totalEvictions from useCacheStats()
  - Display calculated hitRate as percentage
  - Implement conditional styling: green if >80%, yellow if <60%
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 2.6 Implement Panel 5: Queue Configuration Display
  - Display current strategy with badge styling
  - Implement strategy badge colors: blue (hybrid), green (sequential), orange (race)
  - Iterate over methods from useDiscoveryQueueConfig()
  - Display method name and priority for each method
  - Display timeout and retries for each method
  - Display enabled/disabled status with checkmark/X icon
  - Implement priority progress bar (priority/10)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2.7 Create dashboard CSS styles
  - Create `src/components/discovery/DiscoveryMonitoringDashboard.css`
  - Define grid layouts for panels (desktop, tablet, mobile)
  - Style statistics cards with borders and shadows
  - Define large font sizes for metrics (48px+)
  - Style progress bars and gauges
  - Define color scheme for success/warning/error states
  - Implement responsive breakpoints
  - Add chart container styling
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 3. Integrate dashboard into DebugHUD
  - Add the monitoring dashboard as a new tab in the existing DebugHUD component
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3.1 Update DebugHUD component
  - Open `src/components/debug/DebugHUD.tsx`
  - Import DiscoveryMonitoringDashboard component
  - Add "Discovery" tab to Tabs.List
  - Add Tabs.Content for "discovery" value
  - Render DiscoveryMonitoringDashboard with refreshIntervalMs={1000}
  - Verify existing tabs (Performance, Transport) still work
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Implement comprehensive test suite
  - Create unit tests for hooks, component tests for dashboard, and integration tests for end-to-end scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.1 Create useDiscoveryMetrics hook tests
  - Create `src/hooks/__tests__/useDiscoveryMetrics.test.ts`
  - Test: Returns initial metrics structure
  - Test: Updates metrics at specified interval
  - Test: Aggregates method metrics correctly
  - Test: Includes snapshot history
  - Test: Handles empty metrics gracefully
  - Test: Cleans up interval on unmount
  - Test: Respects custom refresh interval
  - Test: Sets loading state correctly
  - Use React Testing Library renderHook
  - Mock discoveryMetrics singleton
  - _Requirements: 7.1, 7.4_

- [x] 4.2 Create useCacheStats hook tests
  - Create `src/hooks/__tests__/useCacheStats.test.ts`
  - Test: Returns cache size and max size
  - Test: Includes hit/miss/eviction counts
  - Test: Calculates hit rate correctly
  - Test: Returns list of cached devices
  - Test: Updates cache stats on interval
  - Test: Handles empty cache gracefully
  - Use React Testing Library renderHook
  - Mock device-discovery and discoveryMetrics singletons
  - _Requirements: 7.1, 7.4, 7.5_

- [x] 4.3 Create useDiscoveryQueueConfig hook tests
  - Create `src/hooks/__tests__/useDiscoveryQueueConfig.test.ts`
  - Test: Fetches config on mount
  - Test: Returns null if config unavailable
  - Test: Includes strategy and methods
  - Test: Does not re-fetch on re-render
  - Use React Testing Library renderHook
  - Mock device-discovery singleton
  - _Requirements: 7.1, 7.5_

- [x] 4.4 Create dashboard component tests
  - Create `src/components/discovery/__tests__/DiscoveryMonitoringDashboard.test.tsx`
  - Test: Renders all 5 panels without errors
  - Test: Displays live statistics cards
  - Test: Displays charts without errors
  - Test: Shows correct totalDiscoveries count
  - Test: Shows correct cache size/max size
  - Test: Shows hit rate percentage
  - Test: Shows method names with priorities
  - Test: BarChart renders with method data
  - Test: LineChart renders with timeline data
  - Test: Live stats update at interval
  - Test: Charts update with new snapshots
  - Test: Panels stack on mobile, grid on desktop
  - Use React Testing Library render and screen
  - Mock all three custom hooks
  - _Requirements: 7.2, 7.5_

- [x] 4.5 Create integration tests
  - Create `src/components/discovery/__tests__/DiscoveryMonitoringDashboard.integration.test.tsx`
  - Scenario 1: Dashboard with active discoveries (start discoveries, verify counts increase, verify charts update)
  - Scenario 2: Dashboard with cache activity (perform discoveries, verify hit rate, verify cache stats)
  - Scenario 3: Dashboard with queue configuration (change strategy, verify dashboard reflects change)
  - Use real singletons (no mocks)
  - Verify end-to-end data flow
  - _Requirements: 7.3_

- [x] 5. Verify performance and accessibility
  - Measure and validate performance metrics, ensure accessibility compliance
  - _Requirements: 1.5, 4.5, 5.5_

- [x] 5.1 Measure component performance
  - Use React Profiler to measure initial render time (target: <100ms)
  - Measure re-render time on data updates (target: <50ms)
  - Use Chrome DevTools to measure memory usage (target: <100KB)
  - Verify hook update time (target: <10ms)
  - Document performance results
  - _Requirements: 1.5, 4.5, 5.5_

- [x] 5.2 Verify accessibility compliance
  - Add aria-label attributes to all charts
  - Add aria-live="polite" to statistics cards
  - Verify keyboard navigation works for all interactive elements
  - Test with screen reader (VoiceOver/NVDA)
  - Verify color contrast meets WCAG 2.1 AA (4.5:1)
  - Ensure color is not the only indicator (use icons + text)
  - Document accessibility test results
  - _Requirements: 5.4_

- [-] 6. Final validation and documentation
  - Run all tests, verify integration, and document the implementation
  - _Requirements: 4.3, 4.4, 7.1, 7.2, 7.3_

- [ ] 6.1 Run complete test suite
  - Execute: `npm test -- useDiscoveryMetrics`
  - Execute: `npm test -- useCacheStats`
  - Execute: `npm test -- useDiscoveryQueueConfig`
  - Execute: `npm test -- DiscoveryMonitoringDashboard`
  - Verify all tests pass
  - Verify no TypeScript errors
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6.2 Verify DebugHUD integration
  - Start development server
  - Open DebugHUD in browser
  - Verify "Discovery" tab appears
  - Click "Discovery" tab and verify dashboard loads
  - Verify existing tabs (Performance, Transport) still work
  - Verify no console errors
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6.3 Create implementation documentation
  - Document hook usage examples
  - Document dashboard component props
  - Document integration steps for DebugHUD
  - Document performance characteristics
  - Document accessibility features
  - Add JSDoc comments to all public APIs
  - _Requirements: 4.3_
