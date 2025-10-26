import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const artifacts = process.env.K1_ARTIFACTS || path.resolve(process.cwd(), 'playwright-artifacts');
const baseURL = process.env.K1_BASE_URL || 'http://127.0.0.1:8080';
const dashboardPath = process.env.K1_DASHBOARD_PATH || '/';

if (!fs.existsSync(artifacts)) {
  fs.mkdirSync(artifacts, { recursive: true });
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(artifacts, 'playwright-report.json') }]
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});

export const K1_DASHBOARD_PATH = dashboardPath;
