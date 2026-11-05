// BGA's houses - Ilia, Rustaveli, Tamar Mepe and Pirosmani - set up on a new
// site, so the House Points strip is ready with each house's name, colour and
// crest. It runs on start but acts only once, and only when there are no
// houses yet: houses an admin later renames, recolours or deletes on the
// Houses page are never touched or brought back. Points start at 0.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { db, getSetting, setSetting } = require('./db');
const { palette } = require('./brand');

const DONE_KEY = 'bga_houses_added';
const CREST_DIR = path.join(__dirname, '..', 'assets', 'houses');
const BGA_HOUSES = [
  { name: 'Ilia', crest: 'ilia.png' },
  { name: 'Rustaveli', crest: 'rustaveli.png' },
  { name: 'Tamar Mepe', crest: 'tamar-mepe.png' },
  { name: 'Pirosmani', crest: 'pirosmani.png' },
];

function seedHouses() {
  if (getSetting(DONE_KEY) === '1') return { added: [] };
  const added = [];
  if (db.prepare('SELECT COUNT(*) AS c FROM houses').get().c === 0) {
    const insert = db.prepare('INSERT INTO houses (name, points, color, logo) VALUES (?, 0, ?, ?)');
    for (const h of BGA_HOUSES) {
      // Crests are copied into the uploads folder like any uploaded logo, so
      // replacing or removing one on the Houses page works the same way.
      const logo = `house-${crypto.randomBytes(8).toString('hex')}.png`;
      fs.copyFileSync(path.join(CREST_DIR, h.crest), path.join(config.uploadDir, logo));
      insert.run(h.name, palette.houseColors[h.name.toLowerCase()], logo);
      added.push(h.name);
    }
    console.log(`[houses] Set up ${added.join(', ')} with their colours and crests.`);
  }
  setSetting(DONE_KEY, '1');
  return { added };
}

module.exports = { seedHouses, BGA_HOUSES };
