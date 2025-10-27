
# K1.reinvented Control Application

Professional control interface for K1.reinvented LED systems. Built with React, TypeScript, and modern UI components.

## Features

- **Pattern Control**: Select from 11 professional light patterns
- **Palette Management**: Choose from 33 curated color palettes  
- **Real-time Parameters**: Adjust brightness, speed, saturation, and more
- **Audio Visualization**: Real-time spectrum and beat detection display
- **Device Management**: Auto-discovery and connection management
- **Performance Monitoring**: FPS, CPU, and memory usage tracking
- **Debug Panel**: Advanced development tools with real-time metrics (Alt+Shift+D)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS with CSS variables
- **Charts**: Recharts for real-time visualization
- **State**: React hooks + context for state management

## K1 Integration

Connects to K1.reinvented devices via REST API:
- `GET /api/patterns` - List available patterns
- `POST /api/select` - Switch active pattern
- `GET /api/params` - Get current parameters
- `POST /api/params` - Update parameters

## Development

The app automatically discovers K1 devices on the local network. For manual connection, enter the device IP address in the sidebar.

### Debug Tools

Press **Alt+Shift+D** in development mode to access the DevDebugPanel:
- Real-time subscription metrics
- Abort error tracking and logging
- HMR performance monitoring
- Interactive debug controls

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed debugging guide.

Default K1 device URL: `http://192.168.1.100`