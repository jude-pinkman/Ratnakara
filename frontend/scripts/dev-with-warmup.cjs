const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || '3010';
const BASE_URL = process.env.WARMUP_BASE_URL || `http://127.0.0.1:${PORT}`;
const ENABLE_WARMUP = process.env.WARMUP_ROUTES !== '0';

function walkPages(dir, rootDir) {
  const routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) {
        continue;
      }
      routes.push(...walkPages(absolute, rootDir));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name !== 'page.tsx' && entry.name !== 'page.jsx' && entry.name !== 'page.ts') {
      continue;
    }

    const relDir = path.relative(rootDir, path.dirname(absolute)).replace(/\\/g, '/');
    const route = toRoute(relDir);
    if (route) {
      routes.push(route);
    }
  }

  return routes;
}

function toRoute(relDir) {
  if (!relDir || relDir === '.') {
    return '/';
  }

  const parts = relDir
    .split('/')
    .filter(Boolean)
    .filter((part) => !part.startsWith('(') && !part.endsWith(')'))
    .filter((part) => !part.startsWith('@'));

  // Skip dynamic routes for warm-up because they require params.
  if (parts.some((part) => part.startsWith('[') && part.endsWith(']'))) {
    return null;
  }

  return `/${parts.join('/')}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilUp(url, timeoutMs = 120000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch (err) {
      // Server not ready yet.
    }
    await delay(1000);
  }

  return false;
}

async function warmRoutes(baseUrl, routes) {
  console.log(`[warmup] Warming ${routes.length} route(s) at ${baseUrl}`);

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      console.log(`[warmup] ${route} -> ${res.status}`);
    } catch (err) {
      console.log(`[warmup] ${route} -> failed: ${err.message}`);
    }
    await delay(150);
  }

  console.log('[warmup] Completed route warm-up');
}

function startNextDev() {
  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(PORT)], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code || 0);
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));

  return child;
}

async function main() {
  startNextDev();

  if (!ENABLE_WARMUP) {
    console.log('[warmup] Disabled via WARMUP_ROUTES=0');
    return;
  }

  const appDir = path.join(process.cwd(), 'app');
  if (!fs.existsSync(appDir)) {
    console.log('[warmup] app directory not found, skipping warm-up');
    return;
  }

  const isReady = await waitUntilUp(`${BASE_URL}/`);
  if (!isReady) {
    console.log('[warmup] Server did not become ready in time, skipping warm-up');
    return;
  }

  const discovered = walkPages(appDir, appDir);
  const routes = Array.from(new Set(['/'].concat(discovered))).sort();
  await warmRoutes(BASE_URL, routes);
}

main().catch((err) => {
  console.error('[warmup] Unexpected error:', err);
  process.exit(1);
});
