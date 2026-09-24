// Redraws assets/demo/masthead.png - the banner that sits behind the
// wordmark in the newsletter masthead - from the palette in src/brand.js.
// Run it after changing the brand colours:
//
//   npm run masthead
//
// It is only the demo/starter background: a manager can upload the school's
// own artwork under Settings, and that upload is never overwritten.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { palette } = require('../src/brand');

const WIDTH = 1360;
const HEIGHT = 400;
const OUT = path.join(__dirname, '..', 'assets', 'demo', 'masthead.png');

// A band of diagonal stripes, as x-offsets at the top edge and widths.
const STRIPES = [
  { x: 120, w: 4, fill: palette.accent, opacity: 0.85 },
  { x: 190, w: 10, fill: '#ffffff', opacity: 0.12 },
  { x: 245, w: 3, fill: '#ffffff', opacity: 0.35 },
  { x: 960, w: 5, fill: palette.accent, opacity: 0.9 },
  { x: 1035, w: 26, fill: '#ffffff', opacity: 0.1 },
  { x: 1090, w: 4, fill: '#ffffff', opacity: 0.45 },
];

// The stripes lean the same way as the original: 130px of run over the
// full height of the banner.
const LEAN = 130;

const stripeSvg = STRIPES.map(
  ({ x, w, fill, opacity }) =>
    `<polygon points="${x},0 ${x + w},0 ${x + w - LEAN},${HEIGHT} ${x - LEAN},${HEIGHT}" fill="${fill}" opacity="${opacity}"/>`
).join('\n  ');

// The faint dot grid in the top right corner.
let dots = '';
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 8; col++) {
    dots += `<circle cx="${1120 + col * 24}" cy="${58 + row * 22}" r="2" fill="${palette.accent}" opacity="0.55"/>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.brandDeep}"/>
      <stop offset="55%" stop-color="${palette.brand}"/>
      <stop offset="100%" stop-color="${palette.brandDeep}"/>
    </linearGradient>
    <linearGradient id="glow" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="${palette.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  ${stripeSvg}
  ${dots}
  <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="${palette.accent}"/>
</svg>`;

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(OUT)
  .then(() => {
    const kb = Math.round(fs.statSync(OUT).size / 1024);
    console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${WIDTH}x${HEIGHT}, ${kb} kB)`);
  })
  .catch((err) => {
    console.error('Could not draw the masthead:', err.message);
    process.exitCode = 1;
  });
