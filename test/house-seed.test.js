// BGA's four houses are set up once on a new site, with their colours and
// crests, and never brought back or changed after that.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bga-houses-'));
process.env.SESSION_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const config = require('../src/config');
const { db } = require('../src/db');
const { palette } = require('../src/brand');
const { seedHouses, BGA_HOUSES } = require('../src/house-seed');

const houses = () => db.prepare('SELECT * FROM houses ORDER BY id').all();

test('the crest files exist and every house has a brand colour', () => {
  for (const h of BGA_HOUSES) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'houses', h.crest)), `${h.crest} is in assets/houses`);
    assert.match(palette.houseColors[h.name.toLowerCase()], /^#[0-9a-f]{6}$/i, `${h.name} has a colour`);
  }
});

test('a new site gets Ilia, Rustaveli, Tamar Mepe and Pirosmani, once', () => {
  assert.deepStrictEqual(seedHouses().added, ['Ilia', 'Rustaveli', 'Tamar Mepe', 'Pirosmani']);
  const rows = houses();
  assert.deepStrictEqual(rows.map((h) => h.name), ['Ilia', 'Rustaveli', 'Tamar Mepe', 'Pirosmani']);
  for (const h of rows) {
    assert.strictEqual(h.color, palette.houseColors[h.name.toLowerCase()]);
    assert.strictEqual(h.points, 0);
    assert.ok(h.logo && fs.existsSync(path.join(config.uploadDir, h.logo)), `${h.name} crest copied into uploads`);
  }

  // An admin deletes one house and renames another: a restart changes nothing.
  db.prepare("DELETE FROM houses WHERE name = 'Pirosmani'").run();
  db.prepare("UPDATE houses SET points = 120 WHERE name = 'Ilia'").run();
  assert.deepStrictEqual(seedHouses().added, []);
  assert.deepStrictEqual(houses().map((h) => h.name), ['Ilia', 'Rustaveli', 'Tamar Mepe']);
  assert.strictEqual(houses()[0].points, 120);
});
