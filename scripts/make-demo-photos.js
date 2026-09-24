// Redraws the "SAMPLE PHOTO" placeholders in assets/demo/ from the palette in
// src/brand.js. They are only used by the "Fill with demo content" button on
// the Preview page, which populates every template section so the layout can
// be shown to staff before any real content exists.
//
//   npm run demo-photos
//
// The glyphs are drawn as white silhouettes from an emoji font (Noto Color
// Emoji on Debian/Ubuntu: `apt-get install fonts-noto-color-emoji`). Without
// one they come out as boxes - the captions still render, so it is worth
// looking at the output.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { palette } = require('../src/brand');

const WIDTH = 900;
const HEIGHT = 600;
const DIR = path.join(__dirname, '..', 'assets', 'demo');

// Every photo the demo content references, with the glyph and caption that
// stand in for the real thing.
const PHOTOS = [
  { file: 'tennis1.png', emoji: '\u{1F3BE}', caption: 'Tennis Tournament', tone: 'brand' },
  { file: 'tennis2.png', emoji: '\u{1F3C6}', caption: 'Tournament Champions', tone: 'accent' },
  { file: 'tennis3.png', emoji: '\u{1F3C5}', caption: 'Medal Winners', tone: 'mixed' },
  { file: 'chess1.png', emoji: '\u{265F}', caption: 'Chessboard Challenge', tone: 'brand' },
  { file: 'khachapuri1.png', emoji: '\u{1F35E}', caption: 'Adjarian Khachapuri', tone: 'accent' },
  { file: 'khachapuri2.png', emoji: '\u{1F9C0}', caption: 'Baking Together', tone: 'mixed' },
  { file: 'principal.png', emoji: '\u{1F464}', caption: '', tone: 'brand', width: 400, height: 500 },
];

const TONES = {
  brand: [palette.brandDeep, palette.brand],
  accent: [palette.accentDeep, palette.accent],
  mixed: [palette.brand, palette.accentDeep],
};

const SERIF = 'Georgia, "Times New Roman", "Liberation Serif", serif';
const SANS = '"Fira Sans", "DejaVu Sans", Helvetica, Arial, sans-serif';

function svgFor({ emoji, caption, tone, width = WIDTH, height = HEIGHT }) {
  const [from, to] = TONES[tone];
  const mid = height / 2;
  const emojiSize = Math.round(height * 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <text x="${width / 2}" y="${mid - (caption ? 20 : -emojiSize / 3)}" font-size="${emojiSize}"
        text-anchor="middle" fill="#ffffff" fill-opacity="0.92"
        font-family="Noto Color Emoji">${emoji}</text>
  ${
    caption
      ? `<text x="${width / 2}" y="${mid + 90}" font-size="40" fill="#ffffff" text-anchor="middle"
        font-family='${SERIF}'>${caption}</text>
  <text x="${width / 2}" y="${mid + 130}" font-size="18" fill="#ffffff" fill-opacity="0.72"
        letter-spacing="4" text-anchor="middle" font-family='${SANS}'>SAMPLE PHOTO</text>`
      : ''
  }
</svg>`;
}

(async () => {
  for (const photo of PHOTOS) {
    const out = path.join(DIR, photo.file);
    await sharp(Buffer.from(svgFor(photo))).png({ compressionLevel: 9 }).toFile(out);
    console.log(`Wrote assets/demo/${photo.file} (${Math.round(fs.statSync(out).size / 1024)} kB)`);
  }
})().catch((err) => {
  console.error('Could not draw the demo photos:', err.message);
  process.exitCode = 1;
});
