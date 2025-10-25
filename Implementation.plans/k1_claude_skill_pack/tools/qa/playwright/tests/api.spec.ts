import { test, expect, request } from '@playwright/test';
import fs from 'node:fs';
import { artifactPath } from './helpers/config';

test.describe('K1 API smoke', () => {
  test('GET /api/patterns', async ({ request }) => {
    const res = await request.get('/api/patterns');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    fs.writeFileSync(artifactPath('patterns.json'), JSON.stringify(json, null, 2));
  });

  test('GET /api/pattern', async ({ request }) => {
    const res = await request.get('/api/pattern');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    fs.writeFileSync(artifactPath('pattern.json'), JSON.stringify(json, null, 2));
  });

  test('GET /api/params', async ({ request }) => {
    const res = await request.get('/api/params');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    fs.writeFileSync(artifactPath('params.json'), JSON.stringify(json, null, 2));
  });

  test('OPTIONAL POST /api/params (skips if no sample present)', async ({ request }) => {
    const samplePath = artifactPath('params.sample.json'); // copy one here if you want to test POST
    if (!fs.existsSync(samplePath)) test.skip();
    const body = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
    const res = await request.post('/api/params', { data: body });
    // Accept either 200 OK or 400 clamp-warning depending on current firmware semantics
    expect([200, 400]).toContain(res.status());
    fs.writeFileSync(artifactPath('params_post_response.json'), JSON.stringify(await res.json().catch(() => ({})), null, 2));
  });
});
