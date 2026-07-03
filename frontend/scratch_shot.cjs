const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
const chromiumDir = fs.readdirSync(cacheDir).find((d) => d.startsWith('chromium-') && !d.includes('headless'));
const execPath = path.join(cacheDir, chromiumDir, 'chrome-linux64', 'chrome');

(async () => {
  const browser = await chromium.launch({ executablePath: execPath, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
  page.on('requestfailed', (req) => console.log('REQFAILED:', req.url(), req.failure()?.errorText));
  await page.goto('http://localhost:4321', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/claude-1000/-home-siyam-Documents-robotic-preli/0598b91e-5f93-43c0-aa8e-333a05a86f4c/scratchpad/scene.png' });
  await browser.close();
})();
