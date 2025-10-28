---
author: Claude Code Agent
date: 2025-10-28
status: published
intent: Executable checklist for Week 0 cleanup sprint kickoff
---

# Week 0 Cleanup Sprint — Execution Checklist

**Objective**: Fix 168 TypeScript errors, setup architecture, enforce quality gates

**Duration**: 3-5 days

**Team**: 3-4 engineers (1 primary, 1-2 supporting, 1 infrastructure)

**Success Criteria**: `tsc --noEmit` returns 0 errors + pre-commit hooks active + all engineers shipping code

---

## Pre-Kickoff (Today)

- [ ] **Read Context Documents**
  - [ ] TYPESCRIPT_ERRORS_ROOT_CAUSE_ANALYSIS.md
  - [ ] PHASE_C_PF5_INTEGRATED_ROADMAP.md
  - [ ] TASKMASTER_WORKFLOW_COMPLETION_SUMMARY.md

- [ ] **Review Generated Tasks**
  - [ ] Run `tm get-tasks --status=pending` to see Week 0 tasks
  - [ ] Review task 15.2 for implementation guidance
  - [ ] Understand dependencies: Week 0 blocks Phase C

- [ ] **Setup Environment**
  - [ ] `npm install` in k1-control-app/
  - [ ] Run `npm run type-check` to verify 168 errors
  - [ ] Create feature branch: `git checkout -b feature/week-0-cleanup`

- [ ] **Team Sync** (30 min)
  - [ ] Confirm 3-4 engineer roles
  - [ ] Assign primary owner for each Week 0 task
  - [ ] Schedule daily standup (9 AM)
  - [ ] Agree on commit message format

---

## Day 1: TypeScript Error Triage (W0.1)

### Task 1: Fix Unused React Imports (84 errors)

**Estimated**: 2-3 hours

**Steps**:

1. Run type check and capture error list:
   ```bash
   npm run type-check > /tmp/ts-errors.txt 2>&1
   grep "TS6133" /tmp/ts-errors.txt | wc -l
   ```

2. Extract filenames with unused React:
   ```bash
   grep "TS6133.*'React'" /tmp/ts-errors.txt | sed "s/:.*//g" | sort -u > /tmp/react-files.txt
   ```

3. Remove unused imports using find + sed:
   ```bash
   # Dry run first:
   cat /tmp/react-files.txt | while read f; do
     grep -l "^import React from 'react';" "$f" 2>/dev/null && echo "$f"
   done

   # Then apply fix:
   cat /tmp/react-files.txt | while read f; do
     sed -i "" "/^import React from 'react';$/d" "$f"
   done
   ```

4. Verify errors reduced:
   ```bash
   npm run type-check 2>&1 | grep "TS6133" | wc -l
   # Should drop from 84 to ~5-10 (remaining unused variables)
   ```

5. **Checkpoint**: Commit with message
   ```
   fix(types): Remove unused React imports from 84 files

   React 17+ automatic JSX transform no longer requires React import.
   This fixes TS6133 errors across:
   - src/components/
   - src/hooks/
   - src/providers/

   Reduces TypeScript errors: 168 → ~84 remaining
   ```

- [ ] Unused React imports fixed
- [ ] Type check run locally
- [ ] Changes committed

### Task 2: Migrate styled-jsx to Tailwind (5 errors)

**Estimated**: 2-3 hours

**Affected Files**:
- `src/components/k1/K1Button.tsx` (line 199)
- `src/components/k1/K1Card.tsx` (line 124)
- `src/components/k1/K1Input.tsx` (line 134)
- `src/components/k1/K1Modal.tsx` (line 231)
- `src/components/k1/K1Toast.tsx` (line 127)

**Steps**:

1. For each file, identify styles in `<style jsx>` blocks
2. Extract styles and convert to Tailwind classes
3. Remove `<style jsx>` block entirely
4. Test component rendering

**Example**:
```typescript
// BEFORE
<style jsx>{`
  .k1-button-primary:hover:not(:disabled) {
    background: var(--k1-accent-hover);
  }
`}</style>

// AFTER
// Add to className: hover:bg-accent hover:shadow-elevation-3
<button className="k1-button-primary hover:bg-accent hover:shadow-elevation-3 ...">
```

**Checkpoint**: Commit with message
```
fix(styles): Migrate styled-jsx to Tailwind CSS in 5 components

Convert <style jsx> blocks to Tailwind classes in:
- K1Button.tsx
- K1Card.tsx
- K1Input.tsx
- K1Modal.tsx
- K1Toast.tsx

Removes TS2322 errors and eliminates styled-jsx dependency.
Reduces TypeScript errors: ~84 → ~50 remaining
```

- [ ] All 5 components migrated
- [ ] Components render correctly
- [ ] Changes committed

---

## Day 2: Missing Type Implementations (W0.1 continued)

### Task 3: Implement K1TelemetryManager.recordError()

**Estimated**: 1-2 hours

**File**: `src/services/K1TelemetryManager.ts`

**Steps**:

1. Review current implementation:
   ```bash
   grep -n "handleError\|recordError" src/services/K1TelemetryManager.ts
   ```

2. Add `recordError` method:
   ```typescript
   recordError(error: K1Error, context?: Record<string, unknown>) {
     const entry: TelemetryErrorEntry = {
       id: crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(),
       ts: Date.now(),
       ...error,
       context
     };
     this.errors.unshift(entry);
     this.emitter.emit('error', entry);
     try { this.persist?.(entry); } catch {}
     if (this.postUrl) {
       fetch(this.postUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(entry)
       }).catch(() => {});
     }
     return entry.id;
   }
   ```

3. Add type definitions:
   ```typescript
   export type K1Error = {
     code: string;
     message: string;
     stack?: string;
     severity?: 'info'|'warn'|'error'|'fatal';
     origin?: 'ui'|'worklet'|'network'|'store';
     data?: unknown;
   };
   ```

4. Test integration:
   ```bash
   npm run test -- K1TelemetryManager
   ```

**Checkpoint**: Commit with message
```
feat(telemetry): Implement K1TelemetryManager.recordError()

Add recordError method with:
- Automatic ID and timestamp generation
- Context tracking
- Event emission for subscribers
- Storage persistence
- Optional backend POST

Fixes TS2339: 'recordError' does not exist
Reduces TypeScript errors: ~50 → ~35 remaining
```

- [ ] recordError method implemented
- [ ] Types defined
- [ ] Tests passing
- [ ] Changes committed

### Task 4: Extend K1ContextValue Types

**Estimated**: 1-2 hours

**File**: `src/providers/K1Provider.tsx`

**Steps**:

1. Find K1ContextValue interface:
   ```bash
   grep -n "interface K1ContextValue\|type K1ContextValue" src/providers/K1Provider.tsx
   ```

2. Add missing properties:
   ```typescript
   export interface K1ContextValue {
     // ... existing properties
     sendCommand(command: K1Command): Promise<void>;
     isConnected: boolean;
   }
   ```

3. Implement in provider:
   ```typescript
   const contextValue: K1ContextValue = {
     // ... existing values
     sendCommand: async (cmd) => {
       // Implementation
     },
     isConnected: state.connection === 'connected'
   };
   ```

4. Test in consuming components:
   ```bash
   npm run type-check -- src/components/audio/AudioReactivePresets.tsx
   ```

**Checkpoint**: Commit with message
```
feat(types): Extend K1ContextValue with sendCommand and isConnected

Add properties to K1ContextValue:
- sendCommand(command: K1Command): Promise<void>
- isConnected: boolean

Fixes TS2339 errors in AudioReactivePresets.tsx and related components
Reduces TypeScript errors: ~35 → ~20 remaining
```

- [ ] Properties added to interface
- [ ] Provider implementation complete
- [ ] Tests passing
- [ ] Changes committed

---

## Day 2-3: Architecture Setup (W0.2)

### Task 5: Create src/features/ Directory Structure

**Estimated**: 30 minutes

**Steps**:

1. Create directories:
   ```bash
   mkdir -p src/features/nodeEditor/{components,types,services,state,__tests__}
   mkdir -p src/features/audioReactivity/{components,workers,dsp,types,__tests__}
   mkdir -p src/features/colorGeneration/{components,types,services,__tests__}
   ```

2. Create index.ts files for exports:
   ```typescript
   // src/features/nodeEditor/index.ts
   export * from './types';
   export * from './services';
   export * from './state';
   export { NodeEditor } from './components/NodeEditor';
   ```

3. Verify structure:
   ```bash
   tree src/features/
   ```

**Checkpoint**: Commit with message
```
feat(architecture): Create src/features/ directory structure

Organize codebase by feature:
- src/features/nodeEditor/ (Phase C)
- src/features/audioReactivity/ (PF-5 Phase 1)
- src/features/colorGeneration/ (PF-5 Phase 2)

Each feature has:
- components/
- types/
- services/
- state/
- __tests__/
- index.ts for exports

Supports parallel development and clean separation of concerns.
```

- [ ] Directory structure created
- [ ] index.ts files created
- [ ] Structure documented
- [ ] Changes committed

### Task 6: Extend K1Provider State

**Estimated**: 2-3 hours

**Files**:
- `src/providers/K1Provider.tsx`
- Type definitions

**Steps**:

1. Define new state namespaces:
   ```typescript
   export interface K1ProviderState {
     // ... existing
     nodeEditor: {
       selectedNodeId?: string;
       isEditingParam?: boolean;
       zoomLevel: number;
       panX: number;
       panY: number;
     };
     aiFeatures: {
       audioReactivityEnabled: boolean;
       audioAnalysis?: AudioAnalysisState;
       colorExtractionEnabled: boolean;
     };
   }
   ```

2. Initialize in provider:
   ```typescript
   const initialState: K1ProviderState = {
     // ... existing
     nodeEditor: {
       selectedNodeId: undefined,
       isEditingParam: false,
       zoomLevel: 1,
       panX: 0,
       panY: 0
     },
     aiFeatures: {
       audioReactivityEnabled: false,
       colorExtractionEnabled: false
     }
   };
   ```

3. Add reducer cases:
   ```typescript
   case 'nodeEditor/selectNode':
     return { ...state, nodeEditor: { ...state.nodeEditor, selectedNodeId: action.payload } };
   case 'aiFeatures/toggleAudioReactivity':
     return { ...state, aiFeatures: { ...state.aiFeatures, audioReactivityEnabled: action.payload } };
   ```

4. Test:
   ```bash
   npm run type-check
   npm run test -- K1Provider
   ```

**Checkpoint**: Commit with message
```
feat(state): Extend K1Provider with nodeEditor and aiFeatures namespaces

Add state sections:
- nodeEditor: UI state for Phase C (selected node, zoom, pan)
- aiFeatures: AI feature flags and state (audio, color)

Includes:
- Type definitions for state shape
- Provider initialization
- Reducer cases for updates
- Documentation

Enables parallel Phase C + PF-5 development
```

- [ ] State namespaces defined
- [ ] Provider updated
- [ ] Reducer cases added
- [ ] Tests passing
- [ ] Changes committed

---

## Day 3-4: Quality Gates (W0.3)

### Task 7: Setup Pre-Commit Hooks

**Estimated**: 1-2 hours

**Steps**:

1. Install husky:
   ```bash
   npm install -D husky
   npx husky install
   npm set-script prepare "husky install"
   ```

2. Create pre-commit hook:
   ```bash
   npx husky add .husky/pre-commit "npm run type-check && npm run lint"
   chmod +x .husky/pre-commit
   ```

3. Test hook:
   ```bash
   # Make a small change
   echo "// test" >> src/components/test.tsx

   # Try to commit (should fail if type-check fails)
   git add .
   git commit -m "test"

   # Should output type-check and lint results
   ```

4. Configure in package.json if needed:
   ```json
   {
     "husky": {
       "hooks": {
         "pre-commit": "npm run type-check && npm run lint"
       }
     }
   }
   ```

**Checkpoint**: Commit with message
```
chore(ci): Setup husky pre-commit hooks

Add pre-commit hooks that enforce:
- npm run type-check (TypeScript validation)
- npm run lint (ESLint validation)

Prevents commits with type errors or linting violations.
Ensures code quality before pushing to remote.
```

- [ ] Husky installed
- [ ] Pre-commit hook created
- [ ] Hook tested locally
- [ ] Changes committed

### Task 8: Configure ESLint for Unused Imports

**Estimated**: 1 hour

**File**: `.eslintrc.json` or equivalent

**Steps**:

1. Check ESLint config:
   ```bash
   cat .eslintrc.json | grep -A5 -B5 "no-unused-vars\|unused"
   ```

2. Enable unused import rules:
   ```json
   {
     "rules": {
       "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
       "import/no-unused-modules": ["error", { "unusedExports": true }]
     }
   }
   ```

3. Test linting:
   ```bash
   npm run lint -- src/components/
   ```

**Checkpoint**: Commit with message
```
chore(lint): Configure ESLint for unused imports and variables

Enable rules:
- no-unused-vars: catches unused imports and variables
- import/no-unused-modules: catches unused exports

Prevents TS6133 errors from re-accumulating
Works with pre-commit hooks to enforce on every commit
```

- [ ] ESLint rules configured
- [ ] Test run successful
- [ ] Changes committed

### Task 9: Add GitHub Actions Type-Check Workflow

**Estimated**: 1 hour

**File**: `.github/workflows/type-check.yml`

**Steps**:

1. Create workflow directory:
   ```bash
   mkdir -p .github/workflows
   ```

2. Create type-check workflow:
   ```yaml
   name: Type Check & Lint
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]

   jobs:
     type-check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
         - run: npm ci
         - run: npm run type-check
         - run: npm run lint
   ```

3. Test locally with act (optional):
   ```bash
   npm install -D act
   act push
   ```

**Checkpoint**: Commit with message
```
chore(ci): Add GitHub Actions workflow for type checking

Add workflow that runs on push/PR:
- npm run type-check
- npm run lint

Ensures no TypeScript errors merge to main
Enforces code quality on all contributions
```

- [ ] Workflow file created
- [ ] Syntax validated
- [ ] Changes committed

---

## Day 4-5: Testing & Documentation (W0.4)

### Task 10: Run Full Test Suite

**Estimated**: 1-2 hours

**Steps**:

1. Run all tests:
   ```bash
   npm run test
   ```

2. Fix any broken tests:
   - Update tests if types changed
   - Fix assertions if behavior changed
   - Ensure >90% coverage

3. Run type-check one final time:
   ```bash
   npm run type-check
   ```

   **Expected output**: `0 errors`

**Checkpoint**: All tests passing

- [ ] All tests passing
- [ ] Type check: 0 errors
- [ ] Coverage acceptable

### Task 11: Documentation

**Estimated**: 1-2 hours

**Files to Create/Update**:

1. **ARCHITECTURE.md** (new):
   ```markdown
   # K1.reinvented Architecture

   ## Directory Structure

   src/
   ├── features/           # Feature-organized modules
   │   ├── nodeEditor/     # Phase C: Node graph editor
   │   ├── audioReactivity/ # PF-5 Phase 1: Audio analysis
   │   └── colorGeneration/ # PF-5 Phase 2: Color intelligence
   ├── providers/          # Context providers
   ├── components/         # Shared UI components
   ├── hooks/              # Custom React hooks
   ├── services/           # Business logic services
   └── types/              # Shared type definitions

   ## State Management

   K1Provider (Context API):
   - connection
   - deviceInfo
   - nodeEditor (NEW)
   - aiFeatures (NEW)
   ...
   ```

2. **K1Provider.md** (new):
   ```markdown
   # K1Provider Reference

   ## nodeEditor State
   ```typescript
   nodeEditor: {
     selectedNodeId?: string;
     isEditingParam?: boolean;
     zoomLevel: number;
     panX: number;
     panY: number;
   }
   ```

   ## aiFeatures State
   ```typescript
   aiFeatures: {
     audioReactivityEnabled: boolean;
     audioAnalysis?: AudioAnalysisState;
     colorExtractionEnabled: boolean;
   }
   ```
   ```

3. **TypeScript_Conventions.md** (new):
   ```markdown
   # TypeScript Conventions

   ## Rules Enforced by CI/CD

   - No unused variables or imports (TS6133)
   - All types must be defined (no implicit any)
   - Discriminated unions preferred for variants
   - Branded IDs for domain entities
   ...
   ```

**Checkpoint**: Commit with message
```
docs: Add architecture and TypeScript convention documentation

Add:
- ARCHITECTURE.md: System design and directory structure
- K1Provider.md: State management reference
- TypeScript_Conventions.md: Type system rules

Guides new engineers and enforces consistency
```

- [ ] ARCHITECTURE.md created
- [ ] K1Provider.md created
- [ ] TypeScript_Conventions.md created
- [ ] Changes committed

---

## Week 0 Exit Criteria

### Must-Have (Blocking Phase C)

- [ ] `npm run type-check` returns **0 errors**
- [ ] `npm run lint` returns **0 errors** (or warnings only)
- [ ] Pre-commit hooks active and tested
- [ ] CI/CD workflow rejecting non-compliant PRs
- [ ] All tests passing (>90% coverage)
- [ ] Feature directory structure in place
- [ ] K1Provider extended and documented
- [ ] All engineers can commit without friction

### Nice-to-Have (Week 0 bonus)

- [ ] Week 0 team retrospective completed
- [ ] Performance baseline captured (build time, test time)
- [ ] Documentation reviewed by team
- [ ] Slack/Discord notifications for CI/CD failures configured

---

## Daily Standup Template

**Time**: 9 AM
**Duration**: 15 minutes
**Attendees**: All Week 0 team

**Format**:

1. **Completed Today**:
   - [ ] W0.1 Task 1: Unused React imports (Engineer A)
   - [ ] W0.1 Task 2: styled-jsx migration (Engineer B)

2. **In Progress**:
   - [ ] W0.1 Task 3: recordError implementation (Engineer A)
   - [ ] W0.2 Task 5: Feature directory setup (Engineer C)

3. **Blockers**:
   - [ ] None / List any issues requiring escalation

4. **Commit Summary**:
   - Show recent commits and branch status

5. **Type Check Status**:
   - Current error count: X (target: 0)
   - Trend: ↓ (improving)

---

## Rollback Plan

If Week 0 fails to reach **0 TypeScript errors** by end of Day 5:

1. **Assess Impact**:
   - Which errors remain?
   - How many are "nice-to-have" vs "blocking"?

2. **Options**:
   - **Extend Week 0** (into following week) if >10 errors remain
   - **Accept Technical Debt** with clear escalation if <5 errors remain
   - **Scope Reduction** if some errors are out of scope

3. **Decision Gate**:
   - Maintainer (@spectrasynq) must approve any deviation
   - Document rationale in Week 0 completion report

---

## Success Celebration

When you see this:

```
npm run type-check
✓ 0 errors found
```

**You've completed Week 0.** 🎉

**Next**: Phase C + PF-5 parallel development begins Monday.

---

**Week 0 Owner**: [Assign Name]
**Backup Owner**: [Assign Name]
**CI/CD Contact**: [Assign Name]

**Start Date**: [Insert Date]
**Target End Date**: [Insert Date + 5 days]
