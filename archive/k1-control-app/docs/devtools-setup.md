# Dev Tools Setup (Trae IDE / VS fork)

This guide helps you install and use Console Ninja, Turbo Console Log, Quokka, and Wallaby with the K1 Control App (React + Vite + TypeScript + Vitest).

## Prerequisites

- Node and npm installed
- Project dev server: `npm run dev`
- Tests: `npm run test:ui` or `npm run test:run`

## 1) Workspace Extension Recommendations

- The workspace includes `.vscode/extensions.json` with recommendations:
  - Wallaby Console Ninja (`WallabyJs.console-ninja`)
  - Turbo Console Log (`ChakrounAnas.turbo-console-log`)
  - Quokka (`WallabyJs.quokka-vscode`)
  - Wallaby (`WallabyJs.wallaby-vscode`)
- Trae will prompt to install them. Install/enable across the workspace.

## 2) Console Ninja

- Shows `console.log` and runtime errors inline in the editor.
- Use directly in any `.ts`/`.tsx` file while the dev server is running.
- Tip: Prefer `console.error` for error paths; this will also be surfaced by Wallaby.

## 3) Turbo Console Log

- Quickly insert structured logs around variables/selections.
- Commands:
  - Insert log for selection: `Turbo Console Log: Insert log`
  - Delete all logs in file: `Turbo Console Log: Delete all logs`
- Configure the log message template from extension settings if desired.

## 4) Quokka

- Real-time scratchpad execution for TypeScript/JavaScript.
- Config: `quokka.config.js` aligns Quokka with `tsconfig.json` and project sources.
- Sample scratch file: `scripts/quokka/telemetry-scratch.ts`
  - Open the file
  - Start Quokka on the file
  - Observe inline values from `console.log`

## 5) Wallaby + Vitest

- Zero-config via `wallaby.js` (`autoDetect: true`) with Vitest.
- Behavior:
  - Runs tests continuously as you type
  - Surfaces coverage and failures inline
  - Treats `console.error` as failures (`reportConsoleErrorAsError: true`)
- Start Wallaby from the command palette.
- Ensure project dependencies are installed: `npm i`

### Vitest UI (optional)

- Run: `npm run test:ui`
- Interact with tests, filter, and inspect failures in a browser UI.

## Where to Start

- Run dev server: `npm run dev`
- Open a test: `src/providers/K1Provider.integration.test.tsx` and start Wallaby
- Use Console Ninja/Turbo logs in `src/components`, then validate via tests
- Try Quokka in `scripts/quokka/telemetry-scratch.ts` for quick experiments

## Notes

- Wallaby will auto-detect Vitest/vite config; custom tweaks can be added to `wallaby.js` if needed.
- For monorepo moves, update `quokka.config.js` and `wallaby.js` paths accordingly.