// A skipped issue does not lose the principal's message: it moves into the
// next issue, unless the week it was written for was actually sent.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bga-carry-'));
process.env.SESSION_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const { db } = require('../src/db');
const mailchimp = require('../src/mailchimp');
const { carryOverPrincipalMessage } = require('../src/carry-over');

const THIS_WEEK = '2026-11-09';
const LAST_WEEK = '2026-11-02';

// Mailchimp stand-in: campaign id -> status, or an error to throw.
let campaigns = {};
mailchimp.isConfigured = () => true;
mailchimp.getCampaign = async (id) => {
  const c = campaigns[id];
  if (c instanceof Error) throw c;
  if (!c) {
    const err = new Error('not found');
    err.status = 404;
    throw err;
  }
  return { id, status: c };
};

function reset() {
  db.prepare('DELETE FROM principal_messages').run();
  db.prepare('DELETE FROM issues').run();
  campaigns = {};
}
function message(week, body, extra = {}) {
  db.prepare('INSERT INTO principal_messages (week_start, body, is_demo) VALUES (?, ?, ?)').run(week, body, extra.demo ? 1 : 0);
}
function issue(week, campaignId, approved = false) {
  db.prepare(
    "INSERT INTO issues (week_start, campaign_id, html, status, approved_at) VALUES (?, ?, '<p>x</p>', 'draft_created', ?)"
  ).run(week, campaignId, approved ? '2026-11-06 10:00:00' : null);
}
const messageFor = (week) => db.prepare('SELECT * FROM principal_messages WHERE week_start = ?').get(week);

test('an unsent draft hands its message to the next issue', async () => {
  reset();
  message(LAST_WEEK, 'Dear Parents, last week.');
  issue(LAST_WEEK, 'c1');
  campaigns.c1 = 'save'; // still a draft in Mailchimp
  assert.deepStrictEqual(await carryOverPrincipalMessage(THIS_WEEK), { moved: LAST_WEEK });
  const moved = messageFor(THIS_WEEK);
  assert.strictEqual(moved.body, 'Dear Parents, last week.');
  assert.strictEqual(moved.carried_from, LAST_WEEK);
  assert.strictEqual(messageFor(LAST_WEEK), undefined, 'moved, not copied');
  // Running again changes nothing.
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);
});

test('a week that was never generated, or whose draft was deleted, also hands it on', async () => {
  reset();
  message(LAST_WEEK, 'never generated');
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, LAST_WEEK);

  reset();
  message(LAST_WEEK, 'draft deleted in Mailchimp');
  issue(LAST_WEEK, 'gone');
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, LAST_WEEK);
});

test('a sent or scheduled issue keeps its message', async () => {
  for (const status of ['sent', 'sending', 'schedule']) {
    reset();
    message(LAST_WEEK, 'went out');
    issue(LAST_WEEK, 'c1');
    campaigns.c1 = status;
    assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null, status);
    assert.ok(messageFor(LAST_WEEK), `${status}: stays on its own week`);
    assert.strictEqual(messageFor(THIS_WEEK), undefined);
  }

  // Sent, then regenerated into a new draft: still counts as sent.
  reset();
  message(LAST_WEEK, 'went out, then regenerated');
  issue(LAST_WEEK, 'c2');
  db.prepare("UPDATE issues SET sent_at = '2026-11-06 12:00:00'").run();
  campaigns.c2 = 'save';
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);
});

test("this week's own message, demo text and old messages are left alone", async () => {
  reset();
  message(LAST_WEEK, 'old');
  message(THIS_WEEK, 'new');
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);
  assert.strictEqual(messageFor(THIS_WEEK).body, 'new');
  assert.strictEqual(messageFor(LAST_WEEK).body, 'old');

  reset();
  message(LAST_WEEK, 'demo', { demo: true });
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);

  reset();
  message('2026-10-19', 'three weeks ago');
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);
});

test('a message two weeks back moves only if no issue went out since', async () => {
  reset();
  message('2026-10-26', 'before the skipped weeks');
  issue('2026-10-26', 'c1');
  campaigns.c1 = 'save';
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, '2026-10-26');

  reset();
  message('2026-10-26', 'before a sent issue');
  issue('2026-10-26', 'c1');
  issue(LAST_WEEK, 'c2');
  campaigns.c1 = 'save';
  campaigns.c2 = 'sent'; // last week's issue went out without a message
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);
});

test('when Mailchimp cannot answer, nothing moves until it can', async () => {
  reset();
  message(LAST_WEEK, 'waiting');
  issue(LAST_WEEK, 'c1');
  campaigns.c1 = new Error('network down');
  await assert.rejects(carryOverPrincipalMessage(THIS_WEEK), /network down/);
  assert.ok(messageFor(LAST_WEEK));
  campaigns.c1 = 'save';
  assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, LAST_WEEK);
});

test('without Mailchimp, an approved issue counts as sent', async () => {
  mailchimp.isConfigured = () => false;
  try {
    reset();
    message(LAST_WEEK, 'approved');
    issue(LAST_WEEK, null, true);
    assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, null);

    reset();
    message(LAST_WEEK, 'not approved');
    issue(LAST_WEEK, null, false);
    assert.strictEqual((await carryOverPrincipalMessage(THIS_WEEK)).moved, LAST_WEEK);
  } finally {
    mailchimp.isConfigured = () => true;
  }
});
