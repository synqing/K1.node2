#!/usr/bin/env node

// K1 Diagnose: end-to-end API sanity checks against a device
// Usage: node tools/k1-diagnose/k1-diagnose.mjs --ip=192.168.1.103 [--dry]

const fs = await import('fs');
const path = await import('path');

function parseArgs() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [k, v] = arg.split('=');
    const key = k.replace(/^--/, '');
    return [key, v === undefined ? true : v];
  }));
  return args;
}

function base(ip) {
  if (!ip) throw new Error('Missing --ip');
  const trimmed = String(ip).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.replace(/\/+$/, '');
  return `http://${trimmed}`;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function getJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, ok: res.ok, json, text };
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function summarizeResult(ok, msg, details) {
  return { ok, msg, details };
}

function pick(obj, keys) {
  const out = {}; keys.forEach(k => { if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]; });
  return out;
}

async function run() {
  const args = parseArgs();
  const ip = args.ip || args.host || args.device;
  const dry = Boolean(args.dry);
  const waitMs = Number(args.wait || 350); // comply with /api/params POST 300ms window
  const waitAudioMs = Math.max(waitMs, 500); // be more conservative for audio-config verify
  const b = base(ip);

  const report = {
    target: b,
    startedAt: new Date().toISOString(),
    steps: [],
    summary: {},
  };

  const record = (name, res) => {
    report.steps.push({ name, ...res });
    console.log(`${res.ok ? '✓' : '✗'} ${name} — ${res.msg}`);
  };

  // 0) Test connection (if available)
  try {
    const r = await getJson(`${b}/api/test-connection`);
    record('test-connection', summarizeResult(r.ok, `HTTP ${r.status}`, { body: r.json ?? r.text }));
  } catch (e) {
    record('test-connection', summarizeResult(false, String(e), {}));
  }

  // 1) Snapshot current state
  const snap = {};
  const p1 = await getJson(`${b}/api/params`);
  const p2 = await getJson(`${b}/api/patterns`);
  const p3 = await getJson(`${b}/api/audio-config`);
  if (p1.ok) snap.params = p1.json; else snap.params = null;
  if (p2.ok) snap.patterns = p2.json; else snap.patterns = null;
  if (p3.ok) snap.audio = p3.json; else snap.audio = null;
  record('snapshot', summarizeResult(p1.ok && p2.ok, `params ${p1.status}, patterns ${p2.status}`, pick(snap, ['params','patterns','audio'])));

  // Helper to POST params and confirm
  async function postParamsAndConfirm(partial, confirmKeys) {
    if (dry) return summarizeResult(true, 'dry-run', { sent: partial });
    const res = await getJson(`${b}/api/params`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) return summarizeResult(false, `POST ${res.status}`, { sent: partial, body: res.text || res.json });
    await sleep(waitMs);
    const verify = await getJson(`${b}/api/params`);
    if (!verify.ok) return summarizeResult(false, `GET verify ${verify.status}`, { sent: partial });
    const got = verify.json || {};
    const conf = {};
    let pass = true;
    for (const k of confirmKeys) {
      conf[k] = { sent: partial[k], got: got[k] };
      if (typeof partial[k] === 'number' && typeof got[k] === 'number') {
        // allow small epsilon
        if (Math.abs(Number(partial[k]) - Number(got[k])) > 0.05) pass = false;
      } else if (partial[k] !== got[k]) pass = false;
    }
    return summarizeResult(pass, pass ? 'confirmed' : 'mismatch', { sent: partial, confirmed: conf });
  }

  // 2) Choose palette-aware pattern if available
  let originalPattern = null;
  try {
    if (snap.patterns && Array.isArray(snap.patterns.patterns)) {
      const names = ['Departure','Lava','Twilight'];
      const found = snap.patterns.patterns.find(p => names.includes(String(p.name)));
      if (found && typeof found.index === 'number') {
        originalPattern = snap.patterns.current_pattern;
        const sel = await getJson(`${b}/api/select`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ index: found.index }) });
        record('select.palette-aware', summarizeResult(sel.ok, `HTTP ${sel.status}`, { selected: found }));
        await sleep(waitMs);
      }
    }
  } catch (e) {
    record('select.palette-aware', summarizeResult(false, String(e), {}));
  }

  // 3) Palette tests
  if (snap.params) {
    const curPid = Number(snap.params.palette_id || 0);
    const newPid = curPid === 0 ? 1 : 0;
    const r1 = await postParamsAndConfirm({ palette_id: newPid }, ['palette_id']);
    record('palette.valid', r1);
    await sleep(waitMs);
    const r2 = await postParamsAndConfirm({ palette_id: 255 }, ['palette_id']);
    record('palette.clamp', r2);
  } else {
    record('palette.skip', summarizeResult(false, 'no params snapshot', {}));
  }

  // 4) Brightness & HSV tests
  const r3 = await postParamsAndConfirm({ brightness: 0.8 }, ['brightness']);
  record('brightness.set', r3);
  await sleep(waitMs);
  const r4 = await postParamsAndConfirm({ color: 0.38, saturation: 0.8, brightness: 0.9 }, ['color','saturation','brightness']);
  record('hsv.set', r4);

  // 5) Void trail param channel
  const r5 = await postParamsAndConfirm({ custom_param_1: 0.85 }, ['custom_param_1']);
  record('voidTrail.custom_param_1', r5);

  // 6) Audio reactivity toggle
  if (snap.audio && Object.prototype.hasOwnProperty.call(snap.audio, 'active')) {
    if (!dry) {
      const off = await getJson(`${b}/api/audio-config`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active: false }) });
      await sleep(waitAudioMs);
      const offGet = await getJson(`${b}/api/audio-config`);
      record('audio.off', summarizeResult(off.ok && offGet.ok && offGet.json && offGet.json.active === false, `off ${off.status}, verify ${offGet.status}`, { body: offGet.json }));
      const on = await getJson(`${b}/api/audio-config`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active: true }) });
      await sleep(waitAudioMs);
      const onGet = await getJson(`${b}/api/audio-config`);
      record('audio.on', summarizeResult(on.ok && onGet.ok && onGet.json && onGet.json.active === true, `on ${on.status}, verify ${onGet.status}`, { body: onGet.json }));
    } else {
      record('audio.skip', summarizeResult(true, 'dry-run', {}));
    }
  } else {
    record('audio.skip', summarizeResult(false, 'no audio config or missing "active"', { audio: snap.audio }));
  }

  // 7) Rate limit probe: 3 rapid POSTs (<300ms)
  try {
    const t0 = Date.now();
    const a = await getJson(`${b}/api/params`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brightness: 0.2 }) });
    const aStatus = a.status;
    const b1 = await getJson(`${b}/api/params`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brightness: 0.3 }) });
    const bStatus = b1.status;
    const c = await getJson(`${b}/api/params`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brightness: 0.4 }) });
    const cStatus = c.status;
    const dt = Date.now() - t0;
    const limited = (bStatus === 429) || (cStatus === 429);
    record('rate-limit.probe', summarizeResult(limited, `statuses: [${aStatus}, ${bStatus}, ${cStatus}] in ${dt}ms`, {}));
    await sleep(waitMs);
  } catch (e) {
    record('rate-limit.probe', summarizeResult(false, String(e), {}));
  }

  // 8) Restore original state
  try {
    if (!dry && snap.params) {
      const restore = {};
      const keys = ['brightness','softness','color','color_range','saturation','warmth','background','speed','palette_id','custom_param_1','custom_param_2','custom_param_3'];
      for (const k of keys) { if (k in snap.params) restore[k] = snap.params[k]; }
      if (Object.keys(restore).length) {
        const r = await getJson(`${b}/api/params`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(restore) });
        await sleep(waitMs);
        record('restore.params', summarizeResult(r.ok, `HTTP ${r.status}`, { sent: restore }));
      }
    }
    if (!dry && typeof originalPattern === 'number') {
      const r = await getJson(`${b}/api/select`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ index: originalPattern }) });
      await sleep(waitMs);
      record('restore.pattern', summarizeResult(r.ok, `HTTP ${r.status}`, { index: originalPattern }));
    }
    if (!dry && snap.audio && Object.prototype.hasOwnProperty.call(snap.audio, 'active')) {
      const r = await getJson(`${b}/api/audio-config`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ active: !!snap.audio.active }) });
      await sleep(waitMs);
      record('restore.audio', summarizeResult(r.ok, `HTTP ${r.status}`, { active: !!snap.audio.active }));
    }
  } catch (e) {
    record('restore', summarizeResult(false, String(e), {}));
  }

  // Summary
  const failures = report.steps.filter(s => !s.ok);
  report.summary = {
    total: report.steps.length,
    failures: failures.length,
    failedSteps: failures.map(f => f.name),
  };
  report.finishedAt = new Date().toISOString();

  // Persist report
  try {
    const outDir = path.resolve(process.cwd(), 'tools', 'k1-diagnose', 'reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `report-${nowStamp()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`\nReport saved: ${outFile}`);
  } catch {}

  // Exit code
  process.exit(failures.length ? 2 : 0);
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
