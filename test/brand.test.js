// The brand lives in src/brand.js, but the admin panel is plain CSS and the
// GitHub Pages demo is a standalone HTML file, so both carry their own copy
// of the four brand hexes. These tests fail the moment the copies drift -
// so re-skinning for a new brand sheet stays a single edit plus whatever
// this test tells you to change.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { palette, identity } = require('../src/brand');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// `--brand: #12306b;` -> '#12306b'
function cssVar(css, name) {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
  return m ? m[1].toLowerCase() : null;
}

const CSS_VARS = [
  ['brand', 'brand'],
  ['brand-deep', 'brandDeep'],
  ['accent', 'accent'],
  ['accent-deep', 'accentDeep'],
];

test('the admin stylesheet uses the palette from src/brand.js', () => {
  const css = read('public/css/admin.css');
  for (const [cssName, key] of CSS_VARS) {
    assert.strictEqual(
      cssVar(css, cssName),
      palette[key].toLowerCase(),
      `public/css/admin.css --${cssName} should be ${palette[key]} (from src/brand.js)`
    );
  }
});

test('the published demo uses the palette from src/brand.js', () => {
  const html = read('docs/index.html');
  for (const [cssName, key] of CSS_VARS) {
    assert.strictEqual(
      cssVar(html, cssName),
      palette[key].toLowerCase(),
      `docs/index.html --${cssName} should be ${palette[key]} (from src/brand.js)`
    );
  }
  // The demo also inlines a copy of the newsletter renderer's palette.
  for (const hex of [palette.brand, palette.brandDeep, palette.accent, palette.accentDeep]) {
    assert.ok(html.includes(hex), `docs/index.html should carry ${hex} in the inlined renderer palette`);
  }
});

test('the live preview editor uses the palette from src/brand.js', () => {
  // The editor is injected into the preview document and carries its own copy.
  const js = read('public/js/preview-editor.js');
  const m = /var C = \{([^}]*)\}/.exec(js);
  assert.ok(m, 'preview-editor.js should declare its colour block as `var C = { ... }`');
  for (const [key, value] of Object.entries({ brand: palette.brand, brandDeep: palette.brandDeep, accent: palette.accent, accentDeep: palette.accentDeep, ink: palette.ink })) {
    assert.ok(
      new RegExp(`${key}:\\s*'${value}'`, 'i').test(m[1]),
      `preview-editor.js ${key} should be ${value} (from src/brand.js)`
    );
  }
  // The published demo inlines the same file, so it must carry it too.
  assert.ok(read('docs/index.html').includes(m[0]), 'docs/index.html inlines a stale copy of preview-editor.js - re-inline it');
});

test('every palette value is a six-digit hex colour', () => {
  const groups = { barColors: Object.values(palette.barColors), houseColors: Object.values(palette.houseColors) };
  for (const [key, value] of Object.entries(palette)) {
    if (key in groups) continue;
    assert.match(value, /^#[0-9a-f]{6}$/i, `palette.${key} is not a hex colour`);
  }
  for (const [group, values] of Object.entries(groups)) {
    for (const value of values) {
      assert.match(value, /^#[0-9a-f]{6}$/i, `a colour in palette.${group} is not a hex colour`);
    }
  }
  assert.strictEqual(palette.barColors.length, 4, 'four rotating article header colours');
});

test('no BIST branding is left in the shipped identity', () => {
  const blob = JSON.stringify(identity).toLowerCase();
  for (const word of ['bist', 'roar']) {
    assert.ok(!blob.includes(word), `identity still mentions "${word}"`);
  }
});
