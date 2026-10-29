// The GitHub Pages front door (index.html) and its deep-link forwarder
// (404.html) each carry the platform's public address. They must agree, or
// the start page and saved links would open different places.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
function appUrl(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const m = /<meta name="bga-app-url" content="([^"]*)">/.exec(html);
  assert.ok(m, `${file} should carry <meta name="bga-app-url" content="...">`);
  return m[1].trim();
}

test('the Pages front door and 404 forwarder point at the same platform', () => {
  assert.strictEqual(appUrl('404.html'), appUrl('index.html'));
});

test('the platform address is empty (demo) or a bare https origin', () => {
  const url = appUrl('index.html');
  if (!url) return;
  assert.match(url, /^https:\/\/[a-z0-9.-]+(:\d+)?\/?$/i, 'use the https address with no path, e.g. https://name.up.railway.app');
});
