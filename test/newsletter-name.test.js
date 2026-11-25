// The newsletter is "BGA სიახლეები". A database that saved the old name
// "BGA Newsletter" under Settings takes the new one on the next start - once;
// any other name, and a name chosen after that, is left alone. (A singleton
// module, so each boot is a child process.)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const ENV = (dataDir) => ({ ...process.env, DATA_DIR: dataDir, ADMIN_PASSWORD: '', MAILCHIMP_API_KEY: '' });
const boot = (dataDir) =>
  execFileSync(process.execPath, ['-e', "require('./src/db.js')"], { cwd: path.join(__dirname, '..'), env: ENV(dataDir) });
const withDb = (dbPath, fn) => {
  const db = new DatabaseSync(dbPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
};
const name = (dbPath) =>
  withDb(dbPath, (db) => (db.prepare("SELECT value FROM settings WHERE key = 'newsletter_name'").get() || {}).value);
const store = (dbPath, value, { migrated } = {}) =>
  withDb(dbPath, (db) => {
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('newsletter_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(value);
    if (!migrated) db.prepare("DELETE FROM settings WHERE key = 'newsletter_name_ka'").run();
  });

for (const [before, after] of [['BGA Newsletter', 'BGA სიახლეები'], ['School News', 'School News']]) {
  test(`newsletter name: a database saved as "${before}" boots as "${after}"`, () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-name-'));
    const dbPath = path.join(dataDir, 'newsletter.sqlite');
    boot(dataDir);
    store(dbPath, before); // as an older database left it
    boot(dataDir);
    assert.strictEqual(name(dbPath), after);
    // Set back to the old name on purpose afterwards: it stays.
    store(dbPath, 'BGA Newsletter', { migrated: true });
    boot(dataDir);
    assert.strictEqual(name(dbPath), 'BGA Newsletter');
  });
}

test('the default name is Georgian and stays un-uppercased in capitals', () => {
  const { identity } = require('../src/brand');
  const { caps } = require('../src/newsletter-text');
  assert.strictEqual(identity.newsletterName, 'BGA სიახლეები');
  assert.strictEqual(caps(identity.newsletterName), 'BGA სიახლეები', 'no Mtavruli');
  assert.strictEqual(caps('BGA Newsletter'), 'BGA NEWSLETTER');
});
