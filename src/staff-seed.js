// The staff list, loaded from the host instead of the code.
//
// STAFF_ACCOUNTS holds one person per line (or separated by ";"), in the same
// format as the import box on the Users page:
//
//   Name,email[,role[,area]]      e.g.  Nino Beridze,n.beridze@bga.ge,admin
//
// A bare email is fine too - the name is made from it ("nino.beridze" ->
// "Nino Beridze") and the role is staff. On every start each listed person who
// is not on the Users page yet is added there without a password, waiting for
// their invitation - exactly like an import. The list lives on the host, not
// in this public repository, so the addresses are never published.
//
// Each address is added once: someone an admin later deletes is not brought
// back, and nothing about an existing account (role, name, password) is ever
// changed from here.
const config = require('./config');
const { db, getSetting, setSetting } = require('./db');
const { ALL_ROLES } = require('./roles');
const { SECTION_KEYS } = require('./sections');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DONE_KEY = 'staff_accounts_added';

function nameFromEmail(email) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => (w.length === 1 ? `${w.toUpperCase()}.` : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function parseStaffAccounts(text) {
  const rows = [];
  for (const raw of String(text || '').split(/[\r\n;]+/)) {
    const line = raw.trim();
    if (!line) continue;
    let cols = line.split(',').map((c) => c.trim());
    if (cols.length === 1 || EMAIL_RE.test(cols[0])) cols = ['', ...cols]; // "email[,role]" form
    const email = (cols[1] || '').toLowerCase();
    if (!EMAIL_RE.test(email)) continue;
    let role = (cols[2] || 'staff').toLowerCase();
    if (!ALL_ROLES.includes(role)) role = 'staff';
    const section = (cols[3] || '').toLowerCase();
    rows.push({
      email,
      name: cols[0] || nameFromEmail(email),
      role,
      section: role === 'slt' && SECTION_KEYS.includes(section) ? section : null,
    });
  }
  return rows;
}

function seedStaffAccounts(text = config.staffAccounts) {
  const rows = parseStaffAccounts(text);
  if (!rows.length) return { added: [] };
  let done;
  try {
    done = new Set(JSON.parse(getSetting(DONE_KEY) || '[]'));
  } catch {
    done = new Set();
  }
  const added = [];
  const insert = db.prepare("INSERT INTO users (email, name, password_hash, role, section) VALUES (?, ?, '', ?, ?)");
  for (const r of rows) {
    if (done.has(r.email)) continue;
    if (!db.prepare('SELECT 1 FROM users WHERE email = ?').get(r.email)) {
      insert.run(r.email, r.name, r.role, r.section);
      added.push(r.email);
    }
    done.add(r.email);
  }
  setSetting(DONE_KEY, JSON.stringify([...done]));
  if (added.length) {
    console.log(`[staff] Added ${added.length} account(s) from STAFF_ACCOUNTS - send their invitations from the Users page.`);
  }
  return { added };
}

module.exports = { seedStaffAccounts, parseStaffAccounts, nameFromEmail };
