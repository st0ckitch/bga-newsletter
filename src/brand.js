// The BGA identity in one place.
//
// Everything that carries the school's colours or name - the newsletter
// email, the reminder emails, the admin panel and the demo masthead - reads
// from here, so re-skinning the whole tool is a single edit.
//
// The palette follows the BGA brand book, which names two colours: BLUE
// #005198 (CMYK 100/76/10/1, Pantone P 104-16U) and WHITE #ffffff. `brand` is
// that blue exactly; the other three brand roles are a darker shade and two
// lighter tones of the same blue, because the layout needs more than one
// strength of it (there is no second brand colour). `public/css/admin.css`
// carries the same four values as CSS variables and is checked against this
// file by `npm test`, so drift cannot go unnoticed. After changing them, run
// `npm run masthead` to redraw the demo masthead in the new colours.

const palette = {
  // BGA blue from the brand book: footer, article header bars, primary
  // buttons, the Join Circle invitation.
  brand: '#005198',
  // A darker shade of BGA blue: the top bar, the quote banner, the masthead.
  brandDeep: '#003767',
  // A light tint of BGA blue: rules, dividers, and small text on the blues.
  accent: '#8ac4f2',
  // A mid tone of BGA blue, dark enough to read as text on white.
  accentDeep: '#1f6cb3',

  // Supporting neutrals - these carry the layout, not the brand.
  accentSoft: '#dfe4ee', // muted light text on the brand colour
  sheet: '#ffffff', // the newsletter "sheet"
  pageBg: '#eceef2', // behind the sheet, in the email client
  ink: '#3a4258', // body text
  muted: '#6b7280', // secondary text
  cardBorder: '#d8dce4', // card outlines in the email
  // Admin panel surfaces
  adminPage: '#f5f6f8',
  adminBorder: '#e2e5ea',
  danger: '#c4432e',
  ok: '#2e7d52',
};

// The rotating colours of the article header bars, in order: the three
// strengths of BGA blue that carry white text.
palette.barColors = [palette.brandDeep, palette.brand, palette.accentDeep];

// BGA's four houses, from the school's 2024 house artwork. The colours are
// the ones the house logos are drawn on (the separate colour sheet in that
// pack lists slightly different values). Keyed by the lower-cased house
// name: a house created under one of these names gets its colour
// automatically; any other starts in the brand colour. The white crests are
// in assets/houses/, and src/house-seed.js sets the houses up on a new site.
palette.houseColors = {
  ilia: '#22694c',
  rustaveli: '#f7c017',
  'tamar mepe': '#df1e32',
  pirosmani: '#633972',
};

const identity = {
  // Masthead wordmark and the footer lockup. Also the default for the
  // `newsletter_name` setting, which staff can change under Settings.
  newsletterName: 'BGA Newsletter',
  // Printed as "Newsletter by ..." beside the masthead.
  schoolName: 'British-Georgian Academy',
  // Short form, for page titles and the admin top bar.
  shortName: 'BGA',
  // Where parents' replies to the newsletter land.
  replyTo: 'office@bga.ge',
  // First-run admin account, when ADMIN_EMAIL is not set.
  adminEmail: 'admin@bga.ge',
  // Used only in help text, to show what APP_BASE_URL should look like.
  publicUrlExample: 'https://newsletter.bga.ge',
  // Prefix for the session cookie and for temporary Mailchimp test uploads.
  slug: 'bga',
};

module.exports = { palette, identity };
