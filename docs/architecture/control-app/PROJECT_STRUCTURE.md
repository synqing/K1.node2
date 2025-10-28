---
title: K1 Control App - Project Structure
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1 Control App - Project Structure

## Directory Overview

```
k1-control-app/
├── build/                    # Production build output (generated)
├── node_modules/            # Dependencies (generated)
├── src/                     # Source code
│   ├── api/                 # K1 device communication
│   ├── assets/              # Static assets (images, etc.)
│   ├── components/          # React components
│   │   ├── control/         # Control panel components
│   │   ├── figma/           # Figma-imported components
│   │   ├── profiling/       # Performance monitoring components
│   │   ├── ui/              # shadcn/ui component library
│   │   └── views/           # Top-level view components
│   ├── guidelines/          # Development guidelines
│   ├── styles/              # Global styles and CSS
│   └── types/               # TypeScript type definitions
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite build configuration
├── README.md                # Project documentation
├── DEVELOPMENT.md           # Development setup guide
└── src/DESIGN_SPECS.md      # UI/UX design specifications
```

## Key Files and Their Purposes

### Root Configuration
- **`vite.config.ts`** - Vite build tool configuration with React SWC plugin and extensive alias mappings
- **`package.json`** - Project metadata, dependencies, and npm scripts
- **`index.html`** - HTML template with root div for React mounting

### Application Entry Points
- **`src/main.tsx`** - Application bootstrap, renders App component into DOM
- **`src/App.tsx`** - Root React component with routing, connection state, and layout
- **`src/index.css`** - Global Tailwind CSS imports and custom styles

### API Layer (`src/api/`)
- **`k1-client.ts`** - K1Client class for REST/WebSocket communication with device
- **`k1-data.ts`** - Static pattern and palette definitions matching firmware

### Type Definitions (`src/types/`)
- **`k1-types.ts`** - TypeScript interfaces for K1 API, patterns, parameters, and UI state

### Component Architecture (`src/components/`)

#### Layout Components
- **`TopNav.tsx`** - Top navigation bar with view tabs and connection status
- **`Sidebar.tsx`** - Left sidebar with device connection controls and quick actions

#### View Components (`src/components/views/`)
- **`ControlPanelView.tsx`** - Main control interface with pattern/parameter controls
- **`ProfilingView.tsx`** - Performance monitoring and analytics dashboard
- **`TerminalView.tsx`** - Device terminal interface for debugging

#### Control Components (`src/components/control/`)
- **`EffectSelector.tsx`** - Pattern selection grid with categories and descriptions
- **`EffectParameters.tsx`** - Real-time parameter sliders and controls
- **`ColorManagement.tsx`** - Palette selection and color controls
- **`GlobalSettings.tsx`** - Device-wide settings (brightness, gamma, etc.)
- **`StatusBar.tsx`** - Performance metrics and connection status

#### Profiling Components (`src/components/profiling/`)
- **`ProfilingFilters.tsx`** - Filtering controls for performance data
- **`ProfilingCharts.tsx`** - Charts for FPS, CPU, memory visualization
- **`LiveStatistics.tsx`** - Real-time performance metrics table

#### UI Primitives (`src/components/ui/`)
Complete shadcn/ui component library (47 components) including:
- Form controls: `button.tsx`, `input.tsx`, `slider.tsx`, `select.tsx`
- Layout: `card.tsx`, `separator.tsx`, `tabs.tsx`, `dialog.tsx`
- Feedback: `toast.tsx`, `progress.tsx`, `badge.tsx`, `alert.tsx`
- Navigation: `dropdown-menu.tsx`, `tooltip.tsx`, `popover.tsx`

### Styling (`src/styles/`)
- **`globals.css`** - Additional global styles and CSS custom properties

### Assets (`src/assets/`)
- Static images and resources imported by components

### Documentation
- **`README.md`** - Project overview and quick start
- **`DEVELOPMENT.md`** - Detailed development setup and workflows
- **`src/DESIGN_SPECS.md`** - Comprehensive UI/UX design system documentation

## Build Configuration Details

### Vite Configuration (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],                    // React SWC plugin for fast compilation
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // Path alias for imports
      // Extensive version-pinned library aliases for Radix UI components
    },
  },
  build: {
    target: 'esnext',                    // Modern JavaScript target
    outDir: 'build',                     // Output directory
  },
  server: {
    port: 3000,                          // Development server port
    open: true,                          // Auto-open browser
  },
});
```

### Package Scripts
```json
{
  "scripts": {
    "dev": "vite --host",               // Development server with network access
    "build": "vite build",              // Production build
    "preview": "vite preview",          // Preview production build
    "type-check": "tsc --noEmit"        // TypeScript type checking
  }
}
```

## Import Patterns and Conventions

### Path Aliases
- `@/` → `src/` for clean relative imports
- Version-pinned aliases for Radix UI components to ensure consistency

### Component Organization
- **Views** - Top-level route components
- **Controls** - Reusable control widgets
- **UI** - Primitive components from shadcn/ui
- **API** - Data fetching and device communication

### File Naming
- **Components** - PascalCase (e.g., `EffectSelector.tsx`)
- **Utilities** - camelCase (e.g., `k1-client.ts`)
- **Types** - kebab-case (e.g., `k1-types.ts`)

## Missing Configuration Files

The following standard configuration files are not present and represent optimization opportunities:

- **`tsconfig.json`** - TypeScript compiler configuration (using Vite defaults)
- **`.eslintrc.*`** - ESLint configuration for code quality
- **`.prettierrc`** - Prettier configuration for code formatting
- **`jest.config.js`** - Testing framework configuration
- **`.github/workflows/`** - CI/CD pipeline configuration

## Cross-References

- [Build Pipeline](./BUILD_PIPELINE.md) - Detailed Vite configuration
- [Component Hierarchy](./COMPONENT_HIERARCHY.md) - Component relationships
- [Development Workflows](./DEVELOPMENT_WORKFLOWS.md) - Setup and development processes
- [Quality Playbook](./QUALITY_PLAYBOOK.md) - Recommendations for missing configurations