// STAFF_ACCOUNTS: the host-held staff list that lands on the Users page
// waiting for invitations.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bga-staff-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'master@test.local';
process.env.ADMIN_PASSWORD = 'master-password';

const test = require('node:test');
const assert = require('node:assert');
const { seedAdmin, db } = require('../src/db');
const { seedStaffAccounts, parseStaffAccounts, nameFromEmail } = require('../src/staff-seed');

const user = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

test('names are made from addresses when only the email is given', () => {
  assert.strictEqual(nameFromEmail('jane.doe@test.local'), 'Jane Doe');
  assert.strictEqual(nameFromEmail('m.smith@test.local'), 'M. Smith');
  const rows = parseStaffAccounts('ann.lee@test.local, admin\nbad line\n\nSam Porter, S.Porter@test.local, admin; x@y.z');
  assert.deepStrictEqual(
    rows.map((r) => [r.name, r.email, r.role]),
    [
      ['Ann Lee', 'ann.lee@test.local', 'admin'],
      ['Sam Porter', 's.porter@test.local', 'admin'],
      ['X.', 'x@y.z', 'staff'],
    ]
  );
});

test('listed staff are added once, waiting for their invitation', () => {
  seedAdmin();
  const list = [
    'Pat Kane,pat.kane@test.local,admin',
    'Sam Porter,s.porter@test.local,admin',
    'Master@Test.local,staff', // the master admin is listed too: left alone
    'Lou Reed,l.reed@test.local,slt,primary',
  ].join('\n');
  const first = seedStaffAccounts(list);
  assert.deepStrictEqual(first.added.sort(), ['l.reed@test.local', 'pat.kane@test.local', 's.porter@test.local']);
  const pat = user('pat.kane@test.local');
  assert.strictEqual(pat.role, 'admin');
  assert.strictEqual(pat.password_hash, '', 'no password: shows as waiting for an invitation');
  assert.strictEqual(user('l.reed@test.local').section, 'primary');
  assert.strictEqual(user('master@test.local').role, 'admin', 'existing accounts are never changed');

  // An admin deletes someone and renames someone else; a restart must not undo either.
  db.prepare('DELETE FROM users WHERE email = ?').run('s.porter@test.local');
  db.prepare('UPDATE users SET name = ? WHERE email = ?').run('Pat K.', 'pat.kane@test.local');
  const again = seedStaffAccounts(list + '\nnew.person@test.local');
  assert.deepStrictEqual(again.added, ['new.person@test.local'], 'only people new to the list are added');
  assert.strictEqual(user('s.porter@test.local'), undefined, 'a deleted account stays deleted');
  assert.strictEqual(user('pat.kane@test.local').name, 'Pat K.');
  assert.strictEqual(user('new.person@test.local').role, 'staff');
});

test('an empty or missing list does nothing', () => {
  const before = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  assert.deepStrictEqual(seedStaffAccounts(''), { added: [] });
  assert.deepStrictEqual(seedStaffAccounts(undefined), { added: [] });
  assert.strictEqual(db.prepare('SELECT COUNT(*) AS c FROM users').get().c, before);
});
