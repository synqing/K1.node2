---
title: K1 Control App - Development Workflows
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1 Control App - Development Workflows

## Environment Setup and Onboarding

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18.x or 20.x | JavaScript runtime |
| **npm** | 9.x+ | Package manager |
| **Git** | 2.x+ | Version control |
| **Modern Browser** | Chrome 100+, Firefox 100+, Safari 15+ | Development and testing |

### Quick Start Guide

```bash
# 1. Clone the repository
git clone <repository-url>
cd K1.reinvented

# 2. Navigate to control app
cd k1-control-app

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev

# 5. Open browser (auto-opens to http://localhost:3000)
```

### Verification Steps

```bash
# Verify Node.js version
node --version  # Should be 18.x or 20.x

# Verify npm version
npm --version   # Should be 9.x+

# Check TypeScript compilation
npm run type-check  # Should complete without errors

# Test production build
npm run build       # Should create build/ directory
npm run preview     # Should serve on http://localhost:4173
```

## Development Server Configuration

### Vite Development Server
- **Port**: 3000 (configurable via `--port` flag)
- **Host**: `0.0.0.0` (accessible on network via `--host` flag)
- **Hot Module Replacement**: Enabled by default
- **TypeScript**: Real-time type checking via SWC

### Available Scripts

```json
{
  "scripts": {
    "dev": "vite --host",           // Development server with network access
    "build": "vite build",          // Production build
    "preview": "vite preview",      // Preview production build
    "type-check": "tsc --noEmit"    // TypeScript validation
  }
}
```

### Development Server Features
- **Fast Refresh**: React components update without losing state
- **Error Overlay**: TypeScript and runtime errors displayed in browser
- **Network Access**: `--host` flag allows testing on mobile devices
- **Auto-reload**: Automatic browser refresh on file changes

## Live Device Testing Workflow

### Device Connection Setup

1. **Ensure K1 Device is Powered On**
   ```bash
   # Check device is accessible
   ping 192.168.1.100  # Replace with your device IP
   ```

2. **Configure Device IP in App**
   - Open sidebar in the application
   - Enter device IP address (e.g., `192.168.1.100`)
   - Click "Connect" button

3. **Verify Connection**
   - Connection status should show "Connected"
   - Device info should populate in sidebar
   - Pattern selection should be responsive

### Common Connection Issues

#### CORS Issues
**Problem**: Browser blocks requests to device due to CORS policy

**Solution**: 
```bash
# Start development server with CORS proxy (if needed)
# Add to vite.config.ts:
server: {
  proxy: {
    '/api': {
      target: 'http://192.168.1.100',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api')
    }
  }
}
```

#### Network Connectivity
**Problem**: Device not reachable from development machine

**Troubleshooting**:
```bash
# Check network connectivity
ping 192.168.1.100

# Check if device API is responding
curl http://192.168.1.100/api/patterns

# Verify firewall settings
# Ensure port 80 is accessible on device network
```

#### IP Address Validation
**Problem**: Invalid IP address format

**Validation**: App includes IP validation in Sidebar component
- IPv4 format validation
- Real-time feedback for invalid addresses
- Prevents connection attempts with malformed IPs

### Testing Workflows

#### Pattern Testing
1. Connect to device
2. Select different patterns from EffectSelector
3. Verify LED output changes on physical device
4. Test audio-reactive patterns with music input

#### Parameter Testing
1. Adjust parameter sliders (brightness, speed, etc.)
2. Observe real-time changes on device
3. Test parameter persistence across pattern switches
4. Verify parameter ranges and validation

#### Performance Testing
1. Open Profiling view
2. Monitor FPS, CPU, and memory metrics
3. Test under various load conditions
4. Verify performance stays within acceptable ranges

#### Debug Panel Testing (Development Mode)
1. Press **Alt+Shift+D** to toggle DevDebugPanel
2. Verify real-time metrics display correctly
3. Test abort error logging toggle
4. Monitor HMR delay and subscription counts
5. Adjust summary window and verify updates

## Debugging and Troubleshooting

### Enhanced Debug Panel (Alt+Shift+D)

The DevDebugPanel provides comprehensive development insights:

#### Real-time Monitoring
- **Subscription Tracking**: Live counts for realtime, audio, and performance subscriptions
- **Abort Error Analysis**: HMR-related error tracking with configurable logging
- **Performance Metrics**: HMR delay monitoring and timing analysis
- **Interactive Controls**: Runtime configuration of debug settings

#### Usage Workflow
```typescript
// 1. Enable debug panel
// Press Alt+Shift+D in development mode

// 2. Monitor subscription activity
// Watch live counts update as components mount/unmount

// 3. Track abort errors during HMR
// Enable abort logging to see detailed error information

// 4. Analyze performance bottlenecks
// Monitor HMR delays and subscription overhead
```

### Browser Developer Tools

#### Network Tab Debugging
```javascript
// Monitor API requests
// Look for failed requests to /api/* endpoints
// Check request/response payloads
// Verify timing and status codes
```

#### Console Debugging
```javascript
// Enable verbose logging (add to App.tsx)
window.K1_DEBUG = true;

// K1Client includes console.error for failures
// Connection test failures logged with details
// WebSocket events logged for debugging
```

#### React Developer Tools
- Install React DevTools browser extension
- Inspect component state and props
- Monitor state changes and re-renders
- Profile component performance

### Common Development Issues

#### TypeScript Errors
```bash
# Run type checking
npm run type-check

# Common fixes:
# - Add missing type imports
# - Fix prop type mismatches
# - Update interface definitions
```

#### Build Failures
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for dependency conflicts
npm ls
```

#### Hot Reload Issues
```bash
# Restart development server
# Check for syntax errors in modified files
# Verify file paths and imports are correct
```

### Performance Profiling

#### React Profiler
```typescript
// Wrap components with Profiler for performance monitoring
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log('Component:', id, 'Phase:', phase, 'Duration:', actualDuration);
};

<Profiler id="ControlPanel" onRender={onRenderCallback}>
  <ControlPanelView />
</Profiler>
```

#### Network Performance
```javascript
// Monitor API response times
const startTime = performance.now();
await k1Client.updateParameters(params);
const endTime = performance.now();
console.log(`Parameter update took ${endTime - startTime}ms`);
```

#### Memory Profiling
- Use browser Memory tab to detect memory leaks
- Monitor heap size during extended usage
- Check for retained objects after component unmount

## Code Organization and Conventions

### File Structure Conventions
```
src/
├── components/
│   ├── control/          # Control-specific components
│   ├── views/            # Top-level view components
│   ├── ui/               # Reusable UI primitives
│   └── [Component].tsx   # PascalCase for components
├── api/
│   └── [module].ts       # kebab-case for utilities
├── types/
│   └── [module]-types.ts # Type definitions
└── styles/
    └── [module].css      # Styling files
```

### Import Conventions
```typescript
// External libraries first
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

// Internal imports second
import { K1Client } from '../api/k1-client';
import { K1Parameters } from '../types/k1-types';

// Relative imports last
import './Component.css';
```

### Component Patterns
```typescript
// Functional components with TypeScript
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 = 0 }) => {
  const [state, setState] = useState<StateType>(initialState);
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### State Management Patterns
```typescript
// Local state for component-specific data
const [localState, setLocalState] = useState<LocalType>(initial);

// Props for shared state
interface Props {
  sharedState: SharedType;
  onStateChange: (newState: SharedType) => void;
}

// Future: Context for global state
const { globalState, updateGlobalState } = useK1Context();
```

## Git Workflow and Branching

### Branch Naming Conventions
```bash
# Feature branches
feature/pattern-selector-improvements
feature/websocket-reconnection

# Bug fixes
fix/parameter-validation-error
fix/connection-timeout-handling

# Documentation
docs/architecture-updates
docs/api-documentation
```

### Commit Message Format
```bash
# Format: type(scope): description
feat(controls): add parameter coalescing for smooth updates
fix(connection): handle WebSocket reconnection with exponential backoff
docs(readme): update setup instructions for development
refactor(state): migrate from props drilling to Context API
```

### Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test
npm run dev
npm run type-check

# 3. Commit changes
git add .
git commit -m "feat(feature): implement new functionality"

# 4. Push and create PR
git push origin feature/new-feature
```

## Testing Workflows

### Manual Testing Checklist

#### Connection Testing
- [ ] Connect to device with valid IP
- [ ] Handle invalid IP addresses gracefully
- [ ] Test connection timeout scenarios
- [ ] Verify reconnection after device restart

#### Pattern Testing
- [ ] Select each of the 11 available patterns
- [ ] Verify pattern metadata displays correctly
- [ ] Test audio-reactive patterns with audio input
- [ ] Confirm pattern persistence across sessions

#### Parameter Testing
- [ ] Adjust all parameter sliders
- [ ] Verify real-time updates on device
- [ ] Test parameter bounds (0-100%)
- [ ] Confirm parameter persistence per pattern

#### UI/UX Testing
- [ ] Test responsive design on different screen sizes
- [ ] Verify keyboard navigation works
- [ ] Check accessibility with screen reader
- [ ] Test dark/light theme switching (if implemented)

#### Debug Panel Testing (Development Mode)
- [ ] Press Alt+Shift+D to toggle DevDebugPanel visibility
- [ ] Verify real-time metrics update correctly (subscriptions, starts, stops)
- [ ] Test abort error logging toggle functionality
- [ ] Monitor HMR delay measurements during hot reloads
- [ ] Adjust summary window duration and verify changes
- [ ] Confirm active subscription counts match component activity
- [ ] Validate abort error statistics during navigation/HMR events

### Automated Testing (Future)

#### Unit Testing Setup
```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Add test script to package.json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

#### Component Testing Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { EffectSelector } from './EffectSelector';

describe('EffectSelector', () => {
  it('should select pattern when clicked', () => {
    const onEffectChange = jest.fn();
    render(
      <EffectSelector 
        selectedEffect="analog" 
        onEffectChange={onEffectChange}
        disabled={false}
      />
    );
    
    fireEvent.click(screen.getByText('Spectrum'));
    expect(onEffectChange).toHaveBeenCalledWith('spectrum');
  });
});
```

## Deployment and Build Workflows

### Production Build Process
```bash
# 1. Run type checking
npm run type-check

# 2. Create production build
npm run build

# 3. Test production build locally
npm run preview

# 4. Verify build output
ls -la build/
# Should contain: index.html, assets/, etc.
```

### Build Optimization
```bash
# Analyze bundle size
npm install -D rollup-plugin-visualizer
# Add to vite.config.ts and run build
# Open dist/stats.html to see bundle analysis
```

### Environment-Specific Builds
```bash
# Development build (with source maps)
npm run build -- --mode development

# Production build (optimized)
npm run build -- --mode production

# Custom environment
VITE_CUSTOM_VAR=value npm run build
```

## Troubleshooting Guide

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Port 3000 in use** | `EADDRINUSE` error | Use `npm run dev -- --port 3001` |
| **TypeScript errors** | Red squiggles, build failures | Run `npm run type-check` and fix errors |
| **Stale cache** | Old code running | Clear cache: `rm -rf node_modules/.vite` |
| **Dependency conflicts** | Build errors, runtime issues | `rm -rf node_modules package-lock.json && npm install` |
| **Device connection fails** | Connection timeout | Check device IP, network connectivity, firewall |

### Performance Issues
- **Slow development server**: Check for large files in src/, clear cache
- **Slow builds**: Analyze bundle size, consider code splitting
- **Memory leaks**: Use React DevTools Profiler, check for retained objects

### Network Issues
- **CORS errors**: Configure proxy in vite.config.ts
- **Timeout errors**: Increase timeout in K1Client configuration
- **WebSocket failures**: Check device WebSocket support, network stability

## Cross-References

- [Project Structure](./PROJECT_STRUCTURE.md) - Understanding the codebase organization
- [Build Pipeline](./BUILD_PIPELINE.md) - Detailed build configuration
- [K1 Integration](./K1_INTEGRATION.md) - Device communication setup
- [Quality Playbook](./QUALITY_PLAYBOOK.md) - Testing and code quality standards
- [Development Guide](../../../k1-control-app/DEVELOPMENT.md) - Existing setup documentation