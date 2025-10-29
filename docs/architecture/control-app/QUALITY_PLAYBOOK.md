# K1 Control App - Quality Playbook

## Current State Assessment

### Missing Quality Infrastructure
The K1 Control App currently lacks several standard quality assurance tools and configurations:

- ❌ **TypeScript Configuration**: No `tsconfig.json` (using Vite defaults)
- ❌ **Linting**: No ESLint configuration
- ❌ **Code Formatting**: No Prettier configuration
- ❌ **Testing Framework**: No unit or integration tests
- ❌ **End-to-End Testing**: No E2E test framework
- ❌ **CI/CD Pipeline**: No automated quality checks
- ❌ **Pre-commit Hooks**: No automated quality gates

### Existing Quality Measures
- ✅ **TypeScript**: Type safety via TypeScript 5.6.3
- ✅ **Build Validation**: `npm run type-check` for type checking
- ✅ **Modern Tooling**: Vite + SWC for fast development
- ✅ **Component Library**: Consistent UI via shadcn/ui + Radix

## TypeScript Configuration

### Recommended `tsconfig.json`
Create `k1-control-app/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    
    // Strict Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    
    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/api/*": ["./src/api/*"],
      "@/types/*": ["./src/types/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  },
  "include": [
    "src/**/*",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "build",
    "dist"
  ]
}
```

### Benefits of Strict TypeScript
- **Null Safety**: Prevents null/undefined runtime errors
- **Type Inference**: Better IDE support and autocomplete
- **Refactoring Safety**: Catch breaking changes at compile time
- **Documentation**: Types serve as inline documentation

## Linting Configuration

### ESLint Setup
Install ESLint with React and TypeScript support:

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

### Recommended `.eslintrc.json`
Create `k1-control-app/.eslintrc.json`:

```json
{
  "env": {
    "browser": true,
    "es2022": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "jsx-a11y"
  ],
  "rules": {
    // React Rules
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/exhaustive-deps": "warn",
    
    // TypeScript Rules
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    
    // General Rules
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### ESLint Scripts
Add to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix"
  }
}
```

## Code Formatting

### Prettier Configuration
Install Prettier:

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

### Recommended `.prettierrc`
Create `k1-control-app/.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Prettier Scripts
Add to `package.json`:

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\""
  }
}
```

## Testing Infrastructure

### Unit Testing with Vitest
Install Vitest and React Testing Library:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Configuration
Create `k1-control-app/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'build/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup File
Create `k1-control-app/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebSocket for testing
global.WebSocket = vi.fn(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

### Testing Scripts
Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Example Component Test
Create `k1-control-app/src/components/control/__tests__/EffectSelector.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EffectSelector } from '../EffectSelector';

describe('EffectSelector', () => {
  const mockProps = {
    selectedEffect: 'analog' as const,
    onEffectChange: vi.fn(),
    disabled: false,
  };

  it('renders all pattern options', () => {
    render(<EffectSelector {...mockProps} />);
    
    expect(screen.getByText('Analog')).toBeInTheDocument();
    expect(screen.getByText('Spectrum')).toBeInTheDocument();
    expect(screen.getByText('Octave')).toBeInTheDocument();
  });

  it('calls onEffectChange when pattern is selected', () => {
    render(<EffectSelector {...mockProps} />);
    
    fireEvent.click(screen.getByText('Spectrum'));
    expect(mockProps.onEffectChange).toHaveBeenCalledWith('spectrum');
  });

  it('disables interaction when disabled prop is true', () => {
    render(<EffectSelector {...mockProps} disabled={true} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
```

### API Testing with MSW
Install Mock Service Worker for API mocking:

```bash
npm install -D msw
```

Create `k1-control-app/src/test/mocks/handlers.ts`:

```typescript
import { rest } from 'msw';

export const handlers = [
  rest.get('http://192.168.1.100/api/patterns', (req, res, ctx) => {
    return res(
      ctx.json({
        patterns: [
          { index: 0, id: 'analog', name: 'Analog', description: 'Test pattern', is_audio_reactive: false },
        ],
        current_pattern: 0,
      })
    );
  }),

  rest.post('http://192.168.1.100/api/params', (req, res, ctx) => {
    return res(
      ctx.json({
        brightness: 0.75,
        speed: 0.5,
        // ... other parameters
      })
    );
  }),
];
```

## End-to-End Testing

### Playwright Setup
Install Playwright for E2E testing:

```bash
npm install -D @playwright/test
npx playwright install
```

### Playwright Configuration
Create `k1-control-app/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example E2E Test
Create `k1-control-app/src/test/e2e/control-panel.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Control Panel', () => {
  test('should connect to device and select pattern', async ({ page }) => {
    await page.goto('/');
    
    // Enter device IP
    await page.fill('[data-testid="ip-input"]', '192.168.1.100');
    await page.click('[data-testid="connect-button"]');
    
    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    
    // Select a pattern
    await page.click('[data-testid="pattern-spectrum"]');
    
    // Verify pattern is selected
    await expect(page.locator('[data-testid="selected-pattern"]')).toContainText('Spectrum');
  });

  test('should adjust parameters and see real-time updates', async ({ page }) => {
    // Setup connection (could be extracted to beforeEach)
    await page.goto('/');
    // ... connection setup
    
    // Adjust brightness slider
    const brightnessSlider = page.locator('[data-testid="brightness-slider"]');
    await brightnessSlider.fill('75');
    
    // Verify parameter update
    await expect(page.locator('[data-testid="brightness-value"]')).toContainText('75%');
  });
});
```

### E2E Testing Scripts
Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

## Performance Standards and Budgets

### Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Bundle Size** | <500KB | 500-750KB | >750KB |
| **Time to Interactive** | <3s | 3-5s | >5s |
| **First Contentful Paint** | <1.5s | 1.5-2.5s | >2.5s |
| **Parameter Update Latency** | <100ms | 100-200ms | >200ms |
| **Memory Usage** | <50MB | 50-100MB | >100MB |

### Bundle Analysis
Add bundle analyzer to `vite.config.ts`:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
});
```

### Performance Monitoring
Create `k1-control-app/src/utils/performance.ts`:

```typescript
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  measureParameterUpdate<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      if (duration > 100) {
        console.warn(`Parameter update took ${duration}ms (target: <100ms)`);
      }
    });
  }
  
  measureBundleSize(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log('Network:', connection.effectiveType);
    }
    
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    scripts.forEach(script => {
      // Estimate script sizes for monitoring
    });
  }
}
```

## Code Quality Standards

### Code Review Checklist

#### TypeScript
- [ ] All functions have appropriate return types
- [ ] No `any` types without justification
- [ ] Interfaces are properly defined and exported
- [ ] Null checks are in place where needed

#### React Components
- [ ] Components are properly typed with interfaces
- [ ] useEffect dependencies are correct
- [ ] Event handlers are memoized with useCallback
- [ ] Expensive computations use useMemo

#### Performance
- [ ] No unnecessary re-renders
- [ ] Large lists are virtualized if needed
- [ ] Images are optimized and lazy-loaded
- [ ] Bundle size impact is considered

#### Accessibility
- [ ] Proper ARIA labels and roles
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader compatibility

#### Testing
- [ ] Unit tests cover critical functionality
- [ ] Integration tests cover user workflows
- [ ] Edge cases are tested
- [ ] Mocks are properly configured

## CI/CD Pipeline Configuration

### GitHub Actions Workflow
Create `.github/workflows/quality.yml`:

```yaml
name: Quality Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: k1-control-app/package-lock.json
      
      - name: Install dependencies
        working-directory: k1-control-app
        run: npm ci
      
      - name: Type check
        working-directory: k1-control-app
        run: npm run type-check
      
      - name: Lint
        working-directory: k1-control-app
        run: npm run lint
      
      - name: Format check
        working-directory: k1-control-app
        run: npm run format:check
      
      - name: Unit tests
        working-directory: k1-control-app
        run: npm run test:run
      
      - name: Build
        working-directory: k1-control-app
        run: npm run build
      
      - name: E2E tests
        working-directory: k1-control-app
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: k1-control-app/coverage/lcov.info
```

## Pre-commit Hooks

### Husky and lint-staged Setup
Install pre-commit tools:

```bash
npm install -D husky lint-staged
```

### Husky Configuration
Add to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd k1-control-app
npm run type-check
npx lint-staged
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Add `tsconfig.json` with strict settings
2. Install and configure ESLint
3. Install and configure Prettier
4. Set up pre-commit hooks

### Phase 2: Testing Infrastructure (Week 2)
1. Set up Vitest with React Testing Library
2. Write tests for core components
3. Set up MSW for API mocking
4. Achieve 80% test coverage

### Phase 3: E2E Testing (Week 3)
1. Install and configure Playwright
2. Write critical user journey tests
3. Set up visual regression testing
4. Integrate with CI pipeline

### Phase 4: CI/CD and Monitoring (Week 4)
1. Set up GitHub Actions workflow
2. Add performance monitoring
3. Set up bundle size tracking
4. Configure automated deployments

## Maintenance and Monitoring

### Regular Quality Audits
- **Weekly**: Review test coverage reports
- **Monthly**: Analyze bundle size trends
- **Quarterly**: Update dependencies and tools
- **Annually**: Review and update quality standards

### Quality Metrics Dashboard
Track key metrics:
- Test coverage percentage
- Build success rate
- Bundle size over time
- Performance regression alerts
- Code quality scores

### Dependency Management
```bash
# Check for outdated dependencies
npm outdated

# Update dependencies safely
npm update

# Audit for security vulnerabilities
npm audit
npm audit fix
```

## Cross-References

- [Development Workflows](./DEVELOPMENT_WORKFLOWS.md) - Setup and development processes
- [Build Pipeline](./BUILD_PIPELINE.md) - Build configuration and optimization
- [Component Hierarchy](./COMPONENT_HIERARCHY.md) - Testing strategies for components
- [K1 Integration](./K1_INTEGRATION.md) - API testing approaches