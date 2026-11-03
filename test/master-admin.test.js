// The master admin (the ADMIN_EMAIL account) against the other admins: nobody
// else can change, lock out or delete it, and only it grants or removes admin
// access. Everything else on the Users page stays open to every admin.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bga-master-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'Master@Test.local'; // matched case-insensitively
process.env.ADMIN_PASSWORD = 'master-password';
process.env.MAILCHIMP_API_KEY = '';
process.env.MAILCHIMP_SERVER_PREFIX = '';
process.env.MAILCHIMP_AUDIENCE_ID = '';
process.env.MAILCHIMP_TEACHERS_AUDIENCE_ID = '';

const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { seedAdmin, db } = require('../src/db');
const { createApp } = require('../src/app');

let server;
let base;

test.before(async () => {
  seedAdmin();
  const hash = bcrypt.hashSync('pass-12345', 4);
  const add = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)');
  add.run('other.admin@test.local', 'Other Admin', hash, 'admin');
  add.run('second.admin@test.local', 'Second Admin', hash, 'admin');
  add.run('teacher@test.local', 'Teacher', hash, 'staff');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const idOf = (email) => db.prepare('SELECT id FROM users WHERE email = ?').get(email).id;
const userBy = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

async function session(email, password) {
  let jar = '';
  const keep = (res) => {
    const c = (res.headers.getSetCookie() || []).map((s) => s.split(';')[0]).join('; ');
    if (c) jar = c;
  };
  const csrf = async (url) => {
    const r = await fetch(base + url, { headers: { cookie: jar } });
    keep(r);
    return /name="_csrf" value="([^"]+)"/.exec(await r.text())[1];
  };
  const post = async (url, body) => {
    const _csrf = await csrf('/users');
    const r = await fetch(base + url, {
      method: 'POST',
      redirect: 'manual',
      headers: { cookie: jar, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ _csrf, ...body }),
    });
    keep(r);
    return r;
  };
  const loginCsrf = await csrf('/login');
  const r = await fetch(base + '/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: jar, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ _csrf: loginCsrf, email, password }),
  });
  keep(r);
  assert.strictEqual(r.status, 302, `login as ${email}`);
  const get = async (url) => (await fetch(base + url, { headers: { cookie: jar } })).text();
  return { post, get };
}

test('another admin cannot change, lock out or delete the master admin', async () => {
  const other = await session('other.admin@test.local', 'pass-12345');
  const master = idOf('master@test.local');
  assert.strictEqual((await other.post(`/users/${master}/role`, { role: 'staff' })).status, 403);
  assert.strictEqual((await other.post(`/users/${master}/password`, { password: 'hijacked-pw' })).status, 403);
  assert.strictEqual((await other.post(`/users/${master}/delete`, {})).status, 403);
  await other.post('/users/set-roles', { lines: 'master@test.local, staff' });
  const m = userBy('master@test.local');
  assert.strictEqual(m.role, 'admin', 'still an admin');
  assert.ok(bcrypt.compareSync('master-password', m.password_hash), 'password untouched');
});

test('only the master admin grants or removes admin access', async () => {
  const other = await session('other.admin@test.local', 'pass-12345');
  // Promote a teacher, demote or delete a fellow admin: all refused.
  assert.strictEqual((await other.post(`/users/${idOf('teacher@test.local')}/role`, { role: 'admin' })).status, 403);
  assert.strictEqual((await other.post(`/users/${idOf('second.admin@test.local')}/role`, { role: 'staff' })).status, 403);
  assert.strictEqual((await other.post(`/users/${idOf('second.admin@test.local')}/password`, { password: 'reset-pass-1' })).status, 403);
  assert.strictEqual((await other.post(`/users/${idOf('second.admin@test.local')}/delete`, {})).status, 403);
  assert.strictEqual((await other.post('/users', { email: 'new.admin@test.local', name: 'New', role: 'admin', password: 'pass-12345' })).status, 400);
  await other.post('/users/import', { csv: 'Imported Admin,imported.admin@test.local,admin' });
  assert.strictEqual(userBy('imported.admin@test.local'), undefined, 'admin rows are refused on import');
  assert.strictEqual(userBy('teacher@test.local').role, 'staff');
  assert.strictEqual(userBy('second.admin@test.local').role, 'admin');

  // The admin role is not even offered to them, and the master row is locked.
  const page = await other.get('/users');
  assert.ok(!/<option value="admin"/.test(page), 'no admin option for non-master admins');
  assert.match(page, /master admin<\/span>/);

  // Everything else stays open to every admin.
  await other.post('/users/import', { csv: 'New Teacher,new.teacher@test.local,staff' });
  assert.strictEqual(userBy('new.teacher@test.local').role, 'staff');
  assert.strictEqual((await other.post(`/users/${idOf('teacher@test.local')}/password`, { password: 'teacher-pw-2' })).status, 302);
  assert.strictEqual((await other.post(`/users/${idOf('other.admin@test.local')}/password`, { password: 'own-new-pw-1' })).status, 302, 'own password');
});

test('the master admin manages admins, imports admin staff, and always stays an admin', async () => {
  const master = await session('master@test.local', 'master-password');
  assert.strictEqual((await master.post(`/users/${idOf('teacher@test.local')}/role`, { role: 'admin' })).status, 302);
  assert.strictEqual(userBy('teacher@test.local').role, 'admin');
  assert.strictEqual((await master.post(`/users/${idOf('second.admin@test.local')}/role`, { role: 'staff' })).status, 302);
  assert.strictEqual(userBy('second.admin@test.local').role, 'staff');
  await master.post('/users/import', { csv: 'Imported Admin,imported.admin@test.local,admin' });
  assert.strictEqual(userBy('imported.admin@test.local').role, 'admin');
  assert.strictEqual(userBy('imported.admin@test.local').password_hash, '', 'waits for an invitation');
  assert.strictEqual((await master.post(`/users/${idOf('master@test.local')}/role`, { role: 'staff' })).status, 403);
  assert.strictEqual(userBy('master@test.local').role, 'admin');
  assert.match(await master.get('/users'), /<option value="admin"/);
});
