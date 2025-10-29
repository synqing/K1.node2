# K1 Control App - Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- A K1.reinvented device on your local network
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Development Setup

1. **Install dependencies**:
   ```bash
   cd k1-control-app
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

3. **Build for production**:
   ```bash
   npm run build
   ```
   Output in `build/` directory

## Connecting to K1 Device

### Find Your K1 Device IP
1. Check your router's admin panel for connected devices
2. Look for device named "K1" or "ESP32"
3. Note the IP address (e.g., `192.168.1.100`)

### Test Connection
```bash
# Replace with your device IP
curl http://192.168.1.100/api/patterns

# Should return JSON with pattern list
```

### Configure in App
1. Open the control app in your browser
2. Enter the K1 device IP in the connection field
3. Click "Connect" - status should show "Connected"

## Development Workflow

### Project Structure
```
k1-control-app/
├── src/
│   ├── components/          # React components
│   │   ├── control/         # Pattern/parameter controls
│   │   ├── visualization/   # LED/audio visualizations
│   │   ├── device/         # Device management
│   │   └── ui/             # Reusable UI components
│   ├── api/                # K1 device communication
│   │   ├── k1-client.ts    # Main API client
│   │   ├── k1-data.ts      # Pattern/palette data
│   │   └── k1-types.ts     # TypeScript definitions
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── styles/             # Global styles
├── build/                  # Production build output
└── docs/                   # Documentation
```

### Key Files
- **`src/api/k1-client.ts`**: All K1 device communication
- **`src/api/k1-data.ts`**: Pattern and palette definitions
- **`src/types/k1-types.ts`**: TypeScript type definitions
- **`src/App.tsx`**: Main application component
- **`vite.config.ts`**: Build configuration

### Making Changes

1. **Start dev server**: `npm run dev`
2. **Make your changes** in `src/`
3. **Hot reload** updates automatically
4. **Test with K1 device** to verify functionality
5. **Build and test**: `npm run build`

## Testing

### Manual Testing Checklist
- [ ] App starts without errors
- [ ] Can connect to K1 device
- [ ] Pattern selection works (LEDs change)
- [ ] Parameter sliders work (immediate LED response)
- [ ] Palette selection works (colors change)
- [ ] Error handling works (disconnect device, try operations)

### Performance Testing
- [ ] App startup < 3 seconds
- [ ] Parameter changes < 100ms response time
- [ ] Memory usage < 150MB
- [ ] No memory leaks during extended use

### Browser Testing
Test in multiple browsers:
- Chrome (primary)
- Firefox
- Safari (macOS)
- Edge

## Common Issues & Solutions

### Connection Issues

**Problem**: "Failed to connect to K1 device"
- Check K1 device is powered on and connected to WiFi
- Verify IP address is correct
- Try `curl http://<ip>/api/patterns` from terminal
- Check firewall settings

**Problem**: "CORS errors in browser console"
- K1 firmware should include CORS headers
- Try different browser or disable CORS temporarily for testing

### Development Issues

**Problem**: "npm run dev fails"
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (need 18+)

**Problem**: "TypeScript errors"
- Run `npm run build` to see all errors
- Check `src/types/k1-types.ts` for type definitions
- Ensure all imports are correct

**Problem**: "Hot reload not working"
- Restart dev server
- Check file permissions
- Try hard refresh (Ctrl+Shift+R)

### Runtime Issues

**Problem**: "Parameter changes don't affect LEDs"
- Check K1 device connection status
- Verify parameter values are in correct range
- Check browser network tab for failed requests

**Problem**: "App is slow/unresponsive"
- Check browser memory usage
- Look for console errors
- Test with fewer browser tabs open

## API Integration

### K1Client Usage
```typescript
import { K1Client } from './api/k1-client';

// Create client
const client = new K1Client('192.168.1.100');

// Test connection
const connected = await client.testConnection();

// Select pattern
await client.selectPattern(3);

// Update parameters
await client.updateParameters({
  brightness: 90,  // 0-100%
  speed: 75,       // 0-100%
  palette_id: 12   // 0-32
});
```

### Error Handling
```typescript
try {
  await client.selectPattern(patternIndex);
} catch (error) {
  console.error('Pattern selection failed:', error);
  // Show user-friendly error message
}
```

### WebSocket (Future)
```typescript
// When WebSocket is implemented
client.connectWebSocket(
  (data) => {
    // Handle real-time updates
    console.log('LED data:', data.led_data);
  },
  (status) => {
    // Handle connection status
    console.log('Connection:', status);
  }
);
```

## Performance Guidelines

### React Best Practices
- Use `React.memo()` for expensive components
- Debounce parameter updates (150ms recommended)
- Avoid unnecessary re-renders
- Use `useCallback()` and `useMemo()` appropriately

### API Best Practices
- Batch parameter updates when possible
- Handle network errors gracefully
- Implement retry logic with exponential backoff
- Cache static data (patterns, palettes)

### Memory Management
- Clean up WebSocket connections
- Remove event listeners on unmount
- Avoid memory leaks in long-running sessions

## Debugging

### DevDebugPanel (Development Mode Only)
The application includes a comprehensive debug panel accessible via **Alt+Shift+D** hotkey:

**Features:**
- **Real-time Metrics**: Live subscription counts for realtime, audio, and performance monitoring
- **Abort Error Tracking**: Monitor HMR-related abort errors with configurable logging
- **Performance Monitoring**: Track HMR delays and debug timing
- **Interactive Controls**: Toggle abort logging and adjust summary windows

**Usage:**
```typescript
// Toggle debug panel
// Press Alt+Shift+D in development mode

// Enable abort logging programmatically
import { setAbortLoggingEnabled } from './utils/error-utils';
setAbortLoggingEnabled(true);

// Access real-time metrics
import { getRealtimeMetrics } from './utils/realtime-metrics';
const metrics = getRealtimeMetrics();
```


## QA Artifacts Configuration

The QA tab reads analysis outputs (JSON) produced by the host QA agents.

- Development (default):
  - The dev server serves `/artifacts` from `../tools/artifacts` via middleware.
  - `.env.development` sets `VITE_ARTIFACT_BASE=/artifacts`.
  - Run host QA agents to populate files:
    - `cd tools && npm install && npm run build`
    - `npm run qa:graph -- --graph ./artifacts/graph.csr.json --src 0 --out ./artifacts`
    - `npm run qa:estimate -- --graph ./artifacts/graph.csr.json --kinds ./artifacts/graph-kinds.json --out ./artifacts`
    - `npm run qa:gates -- --in ./artifacts --out ./artifacts`

- Production:
  - Set `VITE_ARTIFACT_BASE` to a reachable URL hosting artifacts (e.g., bucket or Pages):
    - In CI: export `VITE_ARTIFACT_BASE=https://example.com/k1/artifacts/<build-id>/` before `npm run build`.
    - Locally: edit `k1-control-app/.env.production` and set `VITE_ARTIFACT_BASE`.
  - The QA tab fetches from `${VITE_ARTIFACT_BASE}/...`.

### Expected Files
The QA tab expects the following JSONs under the artifact base:
- `graph.metrics.json`
- `bench.topo.json`
- `graph.csr.json`
- `graph-kinds.json`
- `graph.estimate.json`
- `graph.impact.json`
- `graph.validation.json`
- `gates.status.json`

If any are missing, the QA view shows an empty/error state per card and lets you refresh.
### Debug HUD Toggles

The Debug HUD (Alt+D) exposes quick dev-only toggles:
- Abort logging: enables detailed abort/HMR suppression logging in the console and telemetry.
- HMR overlay: shows a compact overlay indicating HMR delay and last hot-update.

Behavior and persistence:
- Keys: `localStorage['k1.debugAborts']`, `localStorage['k1.hmrOverlay']` store choices.
- Reactivity: HUD writes both storage and emits a custom event `k1:hmrOverlayChange` so the overlay updates instantly in the same tab.
- URL and env: URL flags `?debugAborts=true` and `?hmrOverlay=false`, plus env `VITE_K1_HMR_DELAY_MS` and `VITE_K1_DEBUG_ABORTS`, can seed defaults in dev.

Programmatic control:
```ts
import { setAbortLoggingEnabled } from './src/utils/error-utils';
setAbortLoggingEnabled(true);

// Toggle HMR overlay from code
localStorage.setItem('k1.hmrOverlay', 'false');
window.dispatchEvent(new CustomEvent('k1:hmrOverlayChange', { detail: { enabled: false } }));
```

Transport toggle UX:
- The HUD WS/REST toggle is disabled when WebSocket is currently unavailable to avoid futile switches.
- Title clarifies state: "WebSocket not available; will enable when available".

### Browser DevTools
1. **Console**: Check for JavaScript errors
2. **Network**: Monitor API requests/responses
3. **Performance**: Profile memory and CPU usage
4. **React DevTools**: Inspect component state

### K1 Device Debugging
```bash
# Test API endpoints directly
curl http://192.168.1.100/api/patterns
curl -X POST http://192.168.1.100/api/select -d '{"index":2}' -H "Content-Type: application/json"
curl http://192.168.1.100/api/params
```

### Advanced Debugging Features

#### Abort Error Management
```typescript
// Configure abort error handling
import { 
  setAbortLoggingEnabled, 
  setAbortWindowMs, 
  getAbortStats 
} from './utils/error-utils';

// Enable detailed abort logging
setAbortLoggingEnabled(true);

// Set summary window (default: 10 seconds)
setAbortWindowMs(10000);

// Get current abort statistics
const stats = getAbortStats();
console.log(`Aborts in window: ${stats.windowCount}, Total: ${stats.totalCount}`);
```

#### Real-time Metrics Tracking
```typescript
// Monitor subscription activity
import { 
  recordSubscription, 
  recordStart, 
  recordStop, 
  getActiveCounts 
} from './utils/realtime-metrics';

// Track subscription lifecycle
recordSubscription('audio');
recordStart('audio');
// ... later
recordStop('audio');

// Get active counts by category
const activeCounts = getActiveCounts();
console.log('Active subscriptions:', activeCounts);
```

### Logging
Enhanced debug logging with categorization:
```typescript
// Enable detailed logging
localStorage.setItem('k1-debug', 'true');

// In code with abort error filtering
import { isAbortError } from './utils/error-utils';

try {
  // API call
} catch (err) {
  if (!isAbortError(err)) {
    console.error('Non-abort error:', err);
  }
}
```

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use Prettier for formatting

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### Pull Request Checklist
- [ ] Code builds without errors
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Performance impact considered
- [ ] Documentation updated if needed

## Resources

- **K1 Firmware API**: `docs/api/K1_FIRMWARE_API.md`
- **TaskMaster Tasks**: `.taskmaster/tasks/tasks.json`
- **Project PRD**: `.taskmaster/docs/control-interface-revolution.txt`
- **React Documentation**: https://react.dev/
- **Vite Documentation**: https://vitejs.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**Need Help?** Check the troubleshooting section above or review the API documentation.