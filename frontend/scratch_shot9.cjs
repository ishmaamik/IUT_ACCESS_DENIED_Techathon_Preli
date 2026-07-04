const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
const chromiumDir = fs.readdirSync(cacheDir).find((d) => d.startsWith('chromium-') && !d.includes('headless'));
const execPath = path.join(cacheDir, chromiumDir, 'chrome-linux64', 'chrome');

const out = '/tmp/claude-1000/-home-siyam-Documents-robotic-preli/0598b91e-5f93-43c0-aa8e-333a05a86f4c/scratchpad';

(async () => {
  const browser = await chromium.launch({ executablePath: execPath, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
  await page.goto('http://localhost:4321', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/v2_1.png` });
  await page.screenshot({ path: `${out}/v2_header.png`, clip: { x: 0, y: 0, width: 1500, height: 90 } });
  await browser.close();
})();
