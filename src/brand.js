// The BGA identity in one place.
//
// Everything that carries the school's colours or name - the newsletter
// email, the reminder emails, the admin panel and the demo masthead - reads
// from here, so re-skinning the whole tool is a single edit.
//
// >>> PROVISIONAL PALETTE <<<
// The four hexes under `palette` below are placeholders chosen to sit in the
// same roles as the original design (one deep brand colour, one bright
// accent). Replace them with the values from the BGA brand sheet; nothing
// else in the codebase needs to change. `public/css/admin.css` carries the
// same four values as CSS variables and is checked against this file by
// `npm test`, so drift cannot go unnoticed. After changing them, run
// `npm run masthead` to redraw the demo masthead in the new colours.

const palette = {
  // Deep brand colour: masthead, footer, article header bars, primary buttons.
  brand: '#12306b',
  // Darkest shade: the top bar, the quote banner, the masthead background.
  brandDeep: '#0a1c45',
  // Bright accent: rules, dividers, kickers, the hairline above the footer.
  accent: '#d8232a',
  // Accent dark enough to read as text on white.
  accentDeep: '#a3151b',

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

// The rotating colours of the article header bars, in order.
palette.barColors = [palette.brandDeep, palette.brand, palette.accentDeep, palette.ink];

// BGA's house colours, keyed by the lower-cased house name. A house created
// under a name listed here is coloured automatically; any other house starts
// in the brand colour and is recoloured with the per-row colour picker on the
// Houses page. Fill this in with the school's four houses when they are
// confirmed, e.g. { lions: '#DD2127' }.
palette.houseColors = {};

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
