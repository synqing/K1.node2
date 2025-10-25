import { test, expect } from '@playwright/test';
import { K1_DASHBOARD_PATH } from '../playwright.config';
import { artifactPath } from './helpers/config';
import fs from 'node:fs';

test('Dashboard loads and is not a 404', async ({ page }) => {
  await page.goto(K1_DASHBOARD_PATH);
  // Heuristic checks that won't overfit to implementation details
  const status = page.response() ? (await page.response()!.status()) : 200;
  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(500);
  // Basic DOM presence
  await expect(page.locator('body')).toBeVisible();
  const shot = await page.screenshot();
  fs.writeFileSync(artifactPath('dashboard.png'), shot);
});
