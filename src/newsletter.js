// Renders the weekly newsletter as email-safe HTML (tables + inline styles).
// The layout is the school's three-page issue rebuilt in the BGA design
// language:
//   A  masthead (the newsletter name + "Newsletter by …") and the quote banner
//   B  Upcoming Events table - left column
//   C  Principal's Message - right column
//   D/F/H and E/G/I - admin-assigned article slots in the left and right
//   columns, each article under a colored header bar with its photos
//   Footer - staff directory grid + branding.
const { TEXT, CIRCLE_NEWS, GEORGIAN_RE, caps, monthName, weekdayShort, issueDate: issueDateText, issueMonth, untilDate } = require('./newsletter-text');
const { LEFT_SLOTS, RIGHT_SLOTS, CONTENT_SLOTS, WIDE_SLOTS, DEFAULT_SLOT, MAX_ARTICLE_WORDS } = require('./slots');
const { palette, identity } = require('./brand');
const { SECTIONS } = require('./sections');

// The BGA palette - a deep brand colour carrying the masthead, footer and
// header bars, a bright accent for rules and kickers, a white sheet on a cool
// grey page and slate body text. The values live in src/brand.js.
const BRAND = palette.brand;
const BRAND_DEEP = palette.brandDeep;
const ACCENT = palette.accent;
const ACCENT_DEEP = palette.accentDeep;
const ACCENT_SOFT = palette.accentSoft; // light text on the brand colour
const SHEET = palette.sheet; // the sheet
const PAGE_BG = palette.pageBg; // behind the sheet
const INK = palette.ink;
const MUTED = palette.muted;
const CARD_BORDER = palette.cardBorder;
const BAR_COLORS = palette.barColors;
// Behind the events list in the top block: the lightest tint of the accent.
const EVENTS_PANEL = tint(ACCENT, 0.86);

// Letter-spacing for a small label: the wide tracking that suits Latin
// capitals pulls Georgian words apart, so Georgian stays close to normal.
function track(text, px) {
  return `letter-spacing:${GEORGIAN_RE.test(String(text || '')) ? 0.5 : px}px;`;
}

// Mixes a hex colour toward white - used for the soft tinted bands that have
// to follow whatever accent the brand sheet specifies.
function tint(hex, amount) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  return `#${[m[1], m[2], m[3]]
    .map((h) => Math.round(parseInt(h, 16) + (255 - parseInt(h, 16)) * amount))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

// FiraGO (OFL) - Fira with full Georgian support. Heavy carries titles,
// Light carries running text; email clients without webfont support fall
// back to the system sans stack.
// ('Fira Sans' is left out: it is the same face without Georgian, and hardly
// ever installed - every email repeats this list a hundred times or more.)
const FIRAGO = "'FiraGO', 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = FIRAGO; // display/title role - used with font-weight:800
const SANS = FIRAGO; // text role - used with font-weight:300

const FONT_WEIGHTS = [
  ['Light', 300],
  ['Regular', 400],
  ['SemiBold', 600],
  ['Heavy', 800],
];

// @font-face block for the newsletter/reminder <head>. The URLs must be
// publicly reachable for the fonts to load in email clients that support
// webfonts (Apple Mail etc.); everything else falls back gracefully.
function fontFaceCss(base) {
  return FONT_WEIGHTS.map(
    ([name, weight]) =>
      `@font-face{font-family:'FiraGO';font-style:normal;font-weight:${weight};font-display:swap;src:url('${base}/fonts/FiraGO-${name}.woff2') format('woff2');}`
  ).join('\n');
}

// Column geometry: 680px sheet, 14px outer padding, 16px gutter.
const COL_W = 318;
const CARD_TEXT_W = COL_W - 2 - 28; // 1px borders + 14px card padding => 288
const PHOTO_GAP = 8; // between two photos in a row
const PAIR_W = Math.floor((CARD_TEXT_W - PHOTO_GAP) / 2); // two same-shape photos side by side => 140
// Full-width band articles (W/X/Y) span both columns plus the gutter, so
// their photos get the wider rows.
const FULL_W = COL_W * 2 + 16; // both columns + gutter => 652
const FULL_CARD_TEXT_W = FULL_W - 2 - 28; // => 622

// Responsive rules for phones (<=640px): the two columns stack into one,
// photo rows stretch to the full screen width (a lone photo stays at most
// 400px tall, so portrait shots don't fill the whole screen), running text
// steps up a size and the masthead/footer reflow. Desktop and tablet keep
// the fixed two-column sheet; Outlook ignores media queries and always gets
// the desktop layout.
const MOBILE_CSS = `
  @media only screen and (max-width: 640px) {
    .sheet { width: 100% !important; }
    .col { display: block !important; width: 100% !important; }
    .gutter { display: none !important; }
    .mast-pad { padding: 20px 18px 18px 18px !important; }
    .mast-cell { display: block !important; width: 100% !important; }
    .mast-title { font-size: 34px !important; letter-spacing: 3px !important; }
    .mast-side { display: block !important; width: 100% !important; text-align: left !important; padding: 12px 0 0 0 !important; }
    .quote-pad { padding: 24px 18px 22px 18px !important; }
    .wrap-pad { padding: 14px 10px 2px 10px !important; }
    .atext p { font-size: 16px !important; line-height: 1.7 !important; }
    .ph-row { width: 100% !important; }
    .ph-one { width: auto !important; max-width: 100% !important; max-height: 400px !important; }
    .mob-principal { display: block !important; max-height: none !important; overflow: visible !important; }
    .desk-principal, .desk-principal-cell { display: none !important; }
    .cn-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .cn-cta { padding: 22px 20px !important; }
    .dir-table, .dir-table tbody, .dir-table tr { display: block !important; width: 100% !important; }
    .dir-cell { display: block !important; width: 100% !important; text-align: center !important; padding: 5px 0 !important; }
    .dir-fill { display: none !important; }
    .foot-pad { padding: 22px 16px 20px 16px !important; }
    .hp-table, .hp-table tbody, .hp-table tr { display: block !important; width: 100% !important; }
    .hp-cell { display: inline-block !important; width: 48% !important; box-sizing: border-box !important; }
    .awards-table th, .awards-table td { padding: 7px 6px !important; font-size: 11px !important; }
    .pt-table, .pt-body { display: block !important; width: 100% !important; }
    .pt-row { display: inline !important; }
    .pt-cell { display: inline-block !important; width: 32% !important; box-sizing: border-box !important; vertical-align: top !important; }
    .pt-fill { display: none !important; }
    .pt-two .pt-cell { width: 48% !important; }
  }`;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Hyperlinks in plain text: "[link text](https://url)" and bare
// http(s):// URLs become styled anchors. Runs on already-escaped text (so
// user HTML stays inert) and only ever links http/https URLs.
function anchorHtml(url, label) {
  return `<a href="${url}" style="color:${ACCENT_DEEP}; font-weight:600; text-decoration:underline;">${label}</a>`;
}

// A raw pasted URL reads as three lines of token soup in the email, so a
// bare link shows a short friendly label instead of its address. Writers
// who want their own wording use [their words](url).
function linkLabel(href) {
  let host;
  let pathname;
  try {
    const u = new URL(href.replace(/&amp;/g, '&'));
    host = u.hostname.replace(/^www\./, '');
    pathname = u.pathname;
  } catch {
    return href;
  }
  if (host === 'forms.gle' || (host === 'docs.google.com' && pathname.startsWith('/forms'))) return TEXT.openForm;
  if (host === 'docs.google.com' && pathname.startsWith('/document')) return TEXT.openGoogleDocs;
  if (host === 'docs.google.com' && pathname.startsWith('/spreadsheets')) return TEXT.openGoogleSheets;
  if (host === 'docs.google.com' && pathname.startsWith('/presentation')) return TEXT.openGoogleSlides;
  if (host === 'drive.google.com' || host === 'docs.google.com') return TEXT.openGoogleDrive;
  if (host === 'youtube.com' || host === 'youtu.be') return TEXT.watchYouTube;
  return host;
}

// A pasted URL almost always refers to words already in the sentence -
// "please complete this form", "see the attached guide". When such a phrase
// appears shortly before a bare URL, the link moves INTO those words and the
// raw address disappears from the text. Works by rewriting to the same
// [words](url) notation writers can type by hand; when no phrase is found
// the URL falls back to linkify's short service label.
const LINK_PHRASE_RE = new RegExp(
  '(?:(?:the|this|that|these|a|an|our|your)\\s+)?' +
    '(?:(?:attached|following|linked|online|short|google|registration|order|booking|consent|sign-?up)\\s+){0,2}' +
    '(?:guidelines|guide|form|survey|questionnaire|link|page|document|letter|menu|flyer|poster|booklet|leaflet|brochure|presentation|slides|video|recording|album|photos|pictures|gallery|calendar|schedule|timetable|handbook|policy|invitation)\\b' +
    '|\\bhere\\b',
  'gi'
);
const BARE_URL_RE = /https?:\/\/[^\s<]+|\b(?:www\.|drive\.google\.com\/|docs\.google\.com\/|forms\.gle\/)[^\s<]+/g;

function bindBareLinks(escaped) {
  let out = '';
  let cursor = 0;
  let lastUrlEnd = 0;
  let m;
  BARE_URL_RE.lastIndex = 0;
  while ((m = BARE_URL_RE.exec(escaped))) {
    const urlStart = m.index;
    const raw = m[0];
    const urlEnd = urlStart + raw.length;
    if (escaped.slice(urlStart - 2, urlStart) === '](') {
      lastUrlEnd = urlEnd;
      continue; // already [words](url)
    }
    // Same trimming linkify applies: sentence punctuation and a closing
    // bracket belong to the text, not the address.
    let url = raw.replace(/[.,;:!?]+$/, '');
    if (url.endsWith(')') && !url.includes('(')) url = url.slice(0, -1).replace(/[.,;:!?]+$/, '');
    const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
    // Look for the phrase within the sentence or two before the URL (never
    // inside an earlier URL, whose slug can contain words like "forms").
    const windowStart = Math.max(cursor, lastUrlEnd, urlStart - 250);
    lastUrlEnd = urlEnd;
    const win = escaped.slice(windowStart, urlStart);
    let phrase = null;
    let pm;
    LINK_PHRASE_RE.lastIndex = 0;
    while ((pm = LINK_PHRASE_RE.exec(win))) phrase = pm; // nearest to the URL wins
    if (!phrase) continue;
    const pStart = windowStart + phrase.index;
    const pEnd = pStart + phrase[0].length;
    // Text between the phrase and the URL survives; only trailing whitespace
    // and a separator glued to the URL ("form: <url>") go with the address.
    const between = escaped.slice(pEnd, urlStart).replace(/\s+$/, '').replace(/[:\-–—]$/, '');
    out += escaped.slice(cursor, pStart) + `[${phrase[0]}](${href})` + between;
    cursor = urlStart + url.length; // sentence punctuation after the URL stays
  }
  return out + escaped.slice(cursor);
}

function linkify(escaped) {
  return escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+|\b(?:www\.|drive\.google\.com\/|docs\.google\.com\/|forms\.gle\/)[^\s<]+)/g,
    (match, label, url, bare) => {
      if (bare) {
        // Trailing punctuation belongs to the sentence, not the URL - and so
        // does a closing bracket, as in "(see https://...)".
        let trimmed = bare.replace(/[.,;:!?]+$/, '');
        if (trimmed.endsWith(')') && !trimmed.includes('(')) trimmed = trimmed.slice(0, -1).replace(/[.,;:!?]+$/, '');
        const href = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
        return anchorHtml(href, `${linkLabel(href)}&nbsp;&rsaquo;`) + bare.slice(trimmed.length);
      }
      return anchorHtml(url, label);
    }
  );
}

// Plain text -> paragraphs. Blank line separates paragraphs, single newline = <br>.
function textToHtml(text, color = INK, size = 15, leadHtml = '') {
  // leadHtml (a floated portrait) is injected INSIDE the first paragraph:
  // Outlook's Word engine only wraps text around a floated image that lives
  // in the same block - an image before a following <div>/<p> gets the text
  // pushed below it there.
  return bindBareLinks(escapeHtml(text))
    .split(/\r?\n\s*\r?\n/)
    .filter((p) => p.trim() !== '')
    .map(
      (p, i) =>
        `<p style="margin:0 0 12px 0; line-height:1.65; font-size:${size}px; font-weight:300; font-family:${SANS}; color:${color};">${
          i === 0 ? leadHtml : ''
        }${linkify(p).replace(/\r?\n/g, '<br>')}</p>`
    )
    .join('');
}

function monthLabel(dateStr) {
  return monthName(dateStr);
}

function dayParts(dateStr) {
  return {
    num: Number(dateStr.split('-')[2]),
    weekday: weekdayShort(dateStr),
  };
}

function accentDivider(width = 42, align = 'left') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="${align}" style="margin:${
    align === 'center' ? '0 auto' : '0'
  };"><tr><td width="${width}" height="3" style="background:${ACCENT}; font-size:0; line-height:0;">&nbsp;</td></tr></table>`;
}

function columnHeading(kicker, title, rightHtml = '') {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td valign="bottom">
        <p style="margin:0 0 4px 0; font-family:${SANS}; font-size:10px; font-weight:600; ${track(kicker, 3)} color:${ACCENT_DEEP};">${escapeHtml(
    caps(kicker)
  )}</p>
        <h2 style="margin:0 0 8px 0; font-family:${SERIF}; font-size:22px; font-weight:800; line-height:1.2; color:${BRAND};">${escapeHtml(
    title
  )}</h2>
        ${accentDivider()}
      </td>
      ${rightHtml ? `<td align="right" valign="bottom" style="padding-bottom:10px;">${rightHtml}</td>` : ''}
    </tr>
  </table>`;
}

/* ---------- Placeholders (admin preview only) ---------- */

// In the admin preview every template section stays visible: an empty slot
// renders as a labelled dashed box and fills with content once assigned.
function placeholderBox(letter, title, hint) {
  // data-slot-block makes empty sections drop targets for the live editor's
  // drag-and-drop; placeholders never reach the generated draft.
  return `
  <div data-slot-block="${escapeHtml(letter)}" data-empty="1" style="padding:0 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border:2px dashed #d8dce4; border-radius:10px; background:#f7f8fb;">
      <tr>
        <td align="center" style="padding:22px 14px;">
          <p style="margin:0; font-family:${SERIF}; font-size:20px; font-weight:800; letter-spacing:3px; color:#b8c0d2;">SECTION ${escapeHtml(
    letter
  )}</p>
          <p style="margin:6px 0 0 0; font-family:${SANS}; font-size:12px; font-weight:600; color:${MUTED};">${escapeHtml(
    title
  )}</p>
          <p style="margin:4px 0 0 0; font-family:${SANS}; font-size:11px; color:#9aa1b0;">${escapeHtml(hint)}</p>
        </td>
      </tr>
    </table>
  </div>`;
}

/* ---------- Section B: Upcoming Events ---------- */

function renderEventRow(ev, editable) {
  const day = dayParts(ev.event_date);
  const ed = (field) => (editable && ev.id ? ` data-edit="event:${ev.id}:${field}"` : '');
  let range = '';
  const metaHtml = [];
  if (ev.end_date && ev.end_date !== ev.event_date) {
    const end = dayParts(ev.end_date);
    if (ev.end_date.slice(0, 7) === ev.event_date.slice(0, 7)) {
      range = `<span style="font-size:10px; color:#dfe4ee;">-${end.num}</span>`;
    } else {
      // Range crosses a month boundary - "31-2" would mislead, spell it out.
      metaHtml.push(escapeHtml(untilDate(ev.end_date)));
    }
  }
  if (ev.location) metaHtml.push(`<span${ed('location')}>${linkify(bindBareLinks(escapeHtml(ev.location)))}</span>`);
  if (ev.time_note) metaHtml.push(`<span${ed('time_note')}>${linkify(bindBareLinks(escapeHtml(ev.time_note)))}</span>`);
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; background:#ffffff; border:1px solid ${CARD_BORDER}; border-radius:10px;">
    <tr>
      <td width="54" align="center" valign="middle" style="background:${BRAND}; border-radius:10px 0 0 10px; padding:10px 4px;">
        <p style="margin:0; font-family:${SANS}; font-size:9px; font-weight:600; ${track(day.weekday, 2)} color:${ACCENT};">${day.weekday}</p>
        <p style="margin:1px 0 0 0; font-family:${SERIF}; font-size:20px; font-weight:800; line-height:1; color:#ffffff;">${day.num}${range}</p>
      </td>
      <td valign="middle" style="padding:8px 12px;">
        <p style="margin:0; font-family:${SANS}; font-size:13px; font-weight:600; color:${BRAND}; line-height:1.35;"><span${ed(
    'title'
  )}>${escapeHtml(ev.title)}</span></p>
        ${
          metaHtml.length
            ? `<p style="margin:3px 0 0 0; font-family:${SANS}; font-size:11px; color:${MUTED};">${metaHtml.join(
                ' &nbsp;&bull;&nbsp; '
              )}</p>`
            : ''
        }
      </td>
    </tr>
  </table>`;
}

function renderEventsBlock(events, calendarUrl, editable, { framed = false } = {}) {
  if (!events.length) return '';
  const calendarChip = calendarUrl
    ? `<a href="${escapeHtml(
        calendarUrl
      )}" style="display:inline-block; border:1px solid ${ACCENT}; border-radius:14px; padding:4px 12px; font-family:${SANS}; font-size:10px; font-weight:600; ${track(TEXT.calendar, 2)} color:${ACCENT_DEEP}; text-decoration:none;">${escapeHtml(TEXT.calendar)}</a>`
    : '';
  let rows = '';
  let lastMonth = '';
  for (const ev of events) {
    const m = monthLabel(ev.event_date);
    if (m !== lastMonth) {
      lastMonth = m;
      rows += `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 8px 0;"><tr>
        <td width="7" height="7" style="background:${ACCENT}; border-radius:7px; font-size:0; line-height:0;">&nbsp;</td>
        <td style="font-family:${SANS}; font-size:10px; font-weight:600; ${track(m, 3)} color:${BRAND}; padding:0 0 0 8px;">${escapeHtml(
        caps(m)
      )}</td>
      </tr></table>`;
    }
    rows += `<div style="padding:0 0 7px 0;">${renderEventRow(ev, editable)}</div>`;
  }
  return `
  <div style="padding:${framed ? '0' : '0 0 18px 0'};">
    ${columnHeading(TEXT.saveTheDate, TEXT.upcomingEvents, calendarChip)}
    <div style="padding-top:8px;">${rows}</div>
  </div>`;
}

/* ---------- Section C: Principal's Message ---------- */

function renderPrincipalBlock(principalMessage, editable, { framed = false } = {}) {
  if (!principalMessage) return '';
  const week = principalMessage.weekStart || '';
  const canEdit = editable && week;
  // Framed: the surrounding table cell draws the card's outline, so the card
  // runs to the bottom of the row whatever sits beside it.
  const bodyFrame = framed ? '' : ` border:1px solid ${CARD_BORDER}; border-top:none; border-radius:0 0 10px 10px;`;
  return `
  <div style="padding:${framed ? '0' : '0 0 18px 0'};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
      <tr>
        <td style="background:${BRAND}; border-radius:${framed ? '9px 9px' : '10px 10px'} 0 0; padding:11px 14px;">
          <p style="margin:0; font-family:${SANS}; font-size:13px; font-weight:600; ${track(TEXT.principalsMessage, 2)} color:#ffffff;">${escapeHtml(TEXT.principalsMessage)}</p>
        </td>
      </tr>
      <tr><td height="3" style="background:${ACCENT}; font-size:0; line-height:0;">&nbsp;</td></tr>
      <tr>
        <td style="background:#ffffff;${bodyFrame} padding:16px 14px 6px 14px;"${
    canEdit ? ` data-principal-week="${week}"${principalMessage.photoUrl ? '' : ' data-no-portrait="1"'}` : ''
  }>
          ${(() => {
            const portrait = principalMessage.photoUrl
              ? `<img src="${escapeHtml(principalMessage.photoUrl)}"${
                  canEdit ? ` data-photo="principal:${week}"` : ''
                } alt="${escapeHtml(TEXT.principalAlt)}" width="96" align="right" style="width:96px; height:auto; border-radius:8px; margin:0 0 8px 12px;">`
              : '';
            return canEdit
              ? `${portrait}<div class="atext" data-edit="principal:${week}:body">${textToHtml(principalMessage.body, INK, 13.5)}</div>`
              : `<div class="atext">${textToHtml(principalMessage.body, INK, 13.5, portrait)}</div>`;
          })()}
        </td>
      </tr>
    </table>
  </div>`;
}

/* ---------- Article slots D-I ---------- */

const photoUrl = (p) => (typeof p === 'string' ? p : p.url);
const photoAttr = (p, editable) => (editable && typeof p !== 'string' && p.id ? ` data-photo="${p.id}"` : '');
// Width/height ratio from the photo's real size; unknown sizes count as 4:3.
const photoRatio = (p) => (p && p.w > 0 && p.h > 0 ? p.w / p.h : 4 / 3);

// Photos are never cropped - every one shows its whole frame. They sit in
// rows of one or two: two photos side by side share one height, each as wide
// as its shape needs, and no row grows taller than a landscape photo filling
// the width (a bit more in the narrow columns). Portrait shots therefore come
// out smaller and centred instead of cut off or towering over the text.
function renderPhotos(photos, editable, wide) {
  if (!photos || !photos.length) return '';
  const rowW = wide ? FULL_CARD_TEXT_W : CARD_TEXT_W;
  const maxH = wide ? Math.ceil(FULL_CARD_TEXT_W * 0.75) : 300;
  let first = true;
  const row = (items) => {
    const ratios = items.map(photoRatio);
    const gaps = PHOTO_GAP * (items.length - 1);
    // One shared height: what fills the row, unless that is too tall - then
    // the row is narrower and centred.
    const h = Math.min((rowW - gaps) / ratios.reduce((sum, r) => sum + r, 0), maxH);
    const exact = ratios.map((r) => h * r);
    const exactTotal = exact.reduce((sum, w) => sum + w, 0) + gaps;
    const total = Math.round(exactTotal);
    const widths = exact.map((w) => Math.max(1, Math.round(w)));
    widths[widths.length - 1] = Math.max(1, total - gaps - widths.slice(0, -1).reduce((sum, w) => sum + w, 0));
    // Exact shares, so both photos keep one height at any row width.
    const pct = (w) => `${((w / exactTotal) * 100).toFixed(3)}%`;
    const one = items.length === 1;
    // Outlook sizes by the width/height attributes; everyone else by the
    // percentages, which keep both photos the same height as a row shrinks.
    const cells = items.map(
      (p, i) => `
        <td width="${widths[i]}" align="center" valign="top" style="width:${pct(exact[i])}; padding:0;">
          <img src="${escapeHtml(photoUrl(p))}"${photoAttr(p, editable)} alt="${escapeHtml(TEXT.photoAlt)}" class="${
            one ? 'ph-one' : 'ph-two'
          }" width="${widths[i]}" height="${Math.round(h)}" style="display:block; width:100%; height:auto; margin:0 auto; border-radius:${
            one ? 9 : 8
          }px;">
        </td>`
    );
    const gapCell = `
        <td width="${PHOTO_GAP}" style="width:${pct(PHOTO_GAP)}; padding:0; font-size:0; line-height:0;">&nbsp;</td>`;
    const margin = first ? 10 : 8;
    first = false;
    return `
    <table role="presentation" class="ph-row" align="center" width="${total}" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:${total}px; max-width:100%; margin:${margin}px auto 0 auto;">
      <tr>${cells.join(gapCell)}
      </tr>
    </table>`;
  };
  // The layout follows the count: an odd number leads with one photo on its
  // own and pairs the rest; an even number pairs up completely - so two
  // photos sit side by side in one row and no photo is left alone in a
  // half-empty row.
  const list = [...photos];
  let html = '';
  if (list.length % 2 === 1) html += row([list.shift()]);
  for (let i = 0; i < list.length; i += 2) html += row([list[i], list[i + 1]]);
  return html;
}

function renderArticle(article, barColor, slotLetter, editable) {
  const ed = (field) => (editable && article.id ? ` data-edit="news:${article.id}:${field}"` : '');
  // Band articles span the full sheet; their photos get the wide sizes.
  const wide = WIDE_SLOTS.includes(article.slot || DEFAULT_SLOT);
  // Optional head-of-grade portrait: small, top-right beside the text - the
  // same treatment as the principal's photo. Content photos stay below.
  const leadPhoto = article.leadPhotoUrl
    ? `<img src="${escapeHtml(article.leadPhotoUrl)}" alt="${escapeHtml(TEXT.sectionHeadAlt)}" width="96" align="right" style="width:96px; height:auto; border-radius:8px; margin:0 0 8px 12px;">`
    : '';
  const slotChip = slotLetter
    ? `<span style="display:inline-block; background:rgba(255,255,255,0.28); border-radius:4px; padding:1px 7px; font-family:${SANS}; font-size:9px; font-weight:600; letter-spacing:1px; margin-right:8px;">${escapeHtml(
        slotLetter
      )}</span>`
    : '';
  // In the live editor the block advertises its slot and the header bar is
  // the drag handle for section drag-and-drop; drafts carry none of this.
  const dragBlock = editable && slotLetter && article.id ? ` data-slot-block="${escapeHtml(slotLetter)}"` : '';
  const dragBar = editable && slotLetter && article.id ? ` data-drag-bar="${article.id}"` : '';
  return `
  <div${dragBlock} style="padding:0 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
      <tr>
        <td${dragBar} style="background:${barColor}; border-radius:10px 10px 0 0; padding:11px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:${SANS}; font-size:14px; font-weight:600; color:#ffffff; line-height:1.35;">${slotChip}<span${ed(
    'title'
  )}>${escapeHtml(article.title)}</span></td>
            ${
              article.sectionLabel
                ? `<td align="right" valign="top" style="font-family:${SANS}; font-size:11px; font-weight:700; ${track(article.sectionLabel, 2)} color:#ffffff; opacity:0.95; padding-left:8px; ${
                    // Short labels stay on one line; long ones (the university
                    // support programme) wrap instead of squeezing the title.
                    article.sectionLabel.length > 18 ? 'width:38%; line-height:1.3;' : 'white-space:nowrap;'
                  }">${escapeHtml(
                    caps(article.sectionLabel)
                  )}</td>`
                : ''
            }
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff; border:1px solid ${CARD_BORDER}; border-top:none; border-radius:0 0 10px 10px; padding:14px 14px 8px 14px;"${
    editable && article.id ? ` data-add-photo="${article.id}"` : ''
  }>
          ${editable ? leadPhoto : ''}<div class="atext"${ed('body')}>${textToHtml(article.body, INK, 13.5, editable ? '' : leadPhoto)}</div>
          ${renderPhotos(article.photos, editable, wide)}
        </td>
      </tr>
    </table>
  </div>`;
}

// Articles carry a slot letter; D/F/H flow down the left column, E/G/I down
// the right, in slot order (matching the original page layout); W/X/Y render
// as full-width bands elsewhere. In placeholder mode an empty slot renders as
// a labelled dashed box instead of disappearing.
function columnHtml(letters, articles, articleHtml, placeholders, strays = []) {
  const known = new Set(CONTENT_SLOTS);
  let html = '';
  for (const letter of letters) {
    const inSlot = articles.filter((a) => (a.slot || DEFAULT_SLOT) === letter);
    if (inSlot.length) {
      html += inSlot.map((a) => articleHtml(a, letter)).join('');
    } else if (placeholders) {
      const left = LEFT_SLOTS.includes(letter);
      const pos = ['top', 'middle', 'bottom'][(left ? LEFT_SLOTS : RIGHT_SLOTS).indexOf(letter)];
      html += placeholderBox(
        letter,
        `${left ? SECTIONS.primary : `${SECTIONS.secondary}/${SECTIONS.foundation}`} - ${left ? 'left' : 'right'} column, ${pos}`,
        'Assign an article to this section in the News list.'
      );
    }
  }
  html += strays.filter((a) => !known.has(a.slot || DEFAULT_SLOT)).map((a) => articleHtml(a, DEFAULT_SLOT)).join('');
  return html;
}

/* ---------- School menus ---------- */

// Titled links curated on the Menus page ("Foundation", "Year 1-5", ...)
// rendered as accent buttons in a brand-coloured strip. No links = no section in the
// sent email; the preview shows a labelled placeholder instead.
function renderMenusBlock(menus, placeholders) {
  if (!menus || !menus.length) {
    return placeholders
      ? placeholderBox('M', 'School menus', 'Add the menu links (title + web address) on the Menus page.')
      : '';
  }
  const buttons = menus
    .map(
      (m) => `<a href="${escapeHtml(m.url)}" target="_blank" style="display:inline-block; background:${ACCENT}; color:${BRAND_DEEP}; font-family:${SANS}; font-size:12px; font-weight:700; letter-spacing:0.5px; text-decoration:none; padding:9px 16px; border-radius:6px; margin:10px 8px 0 0;">${escapeHtml(
        m.title
      )} &rarr;</a>`
    )
    .join('');
  return `
  <div style="padding:0 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
      <tr>
        <td style="background:${BRAND}; border-radius:10px; padding:14px 16px 16px 16px;">
          <p style="margin:0; font-family:${SANS}; font-size:10px; font-weight:600; ${track(TEXT.schoolMenus, 3)} color:${ACCENT};">${escapeHtml(TEXT.schoolMenus)}</p>
          <p style="margin:6px 0 0 0; font-family:${SANS}; font-size:12.5px; color:${ACCENT_SOFT};">${escapeHtml(TEXT.menusIntro)}</p>
          ${buttons}
        </td>
      </tr>
    </table>
  </div>`;
}

/* ---------- House points ---------- */

// The running house standings, styled after the school's own graphic: each
// house is a solid tile in its brand colour with the crest, the house name
// and "N Points" inside, two tiles per row. Leader (most points) comes
// first. Fixed right under the events/principal top block in every issue;
// managers keep the numbers current on the Houses page.
function houseTileText() {
  // As in BGA's house artwork: a white crest and a white name on the house
  // colour, with the points in white beneath.
  return { name: '#ffffff', points: '#ffffff' };
}

function renderHousePointsBlock(houses, placeholders, hidden, { compact = false } = {}) {
  if (hidden) {
    return placeholders
      ? placeholderBox('HP', 'House Points - hidden', 'Hidden from the newsletter this week - switch it back on from the Houses page.')
      : '';
  }
  if (!houses || !houses.length) {
    return placeholders
      ? placeholderBox('HP', 'House Points', 'Add the houses (name, logo, points) on the Houses page.')
      : '';
  }
  // Compact: half-width tiles in a column beside the principal's message.
  const sz = compact
    ? { logo: 64, gap: 8, initial: 40, pad: '16px 6px 14px 6px', name: 14, nameTrack: 1, points: 15, pointsGap: 6 }
    : { logo: 110, gap: 14, initial: 64, pad: '28px 12px 24px 12px', name: 24, nameTrack: 4, points: 20, pointsGap: 10 };
  const tile = (h, leader) => {
    const color = h.color || BRAND;
    const text = houseTileText(color);
    const logo = h.logoUrl
      ? `<img src="${escapeHtml(h.logoUrl)}" alt="" width="${sz.logo}" style="width:${sz.logo}px; height:${sz.logo}px; object-fit:contain; display:block; margin:0 auto ${sz.gap}px auto;">`
      : `<p style="margin:0 0 ${sz.gap}px 0; font-family:${SERIF}; font-size:${sz.initial}px; font-weight:800; line-height:1; color:${text.name};">${escapeHtml(
          caps((h.name || '?').charAt(0))
        )}</p>`;
    return `
      <td class="hp-cell" width="50%" valign="top" style="padding:6px;">
        <div style="background:${escapeHtml(color)}; border-radius:4px; ${leader ? `outline:4px solid ${ACCENT}; ` : ''}padding:${sz.pad}; text-align:center;">
          ${logo}
          <p style="margin:0; font-family:${SERIF}; font-size:${sz.name}px; font-weight:800; letter-spacing:${sz.nameTrack}px; line-height:1.2; color:${text.name}; text-transform:uppercase;">${escapeHtml(
      h.name
    )}</p>
          <p style="margin:${sz.pointsGap}px 0 0 0; font-family:${SANS}; font-size:${sz.points}px; font-weight:700; color:${text.points};">${escapeHtml(TEXT.points(Number(h.points) || 0))}</p>
          ${leader ? `<p style="margin:6px 0 0 0; font-family:${SANS}; font-size:10px; font-weight:600; ${track(TEXT.leading, 3)} color:${text.points};">&#9733; ${escapeHtml(TEXT.leading)}</p>` : ''}
        </div>
      </td>`;
  };
  let rows = '';
  for (let i = 0; i < houses.length; i += 2) {
    const pair = [houses[i], houses[i + 1]];
    rows += `<tr>${pair
      .map((h, j) => (h ? tile(h, i + j === 0 && h.points > 0) : '<td class="hp-cell" width="50%" style="padding:5px;">&nbsp;</td>'))
      .join('')}</tr>`;
  }
  return `
  <div style="padding:0 0 18px 0;">
    ${columnHeading(TEXT.houseSpirit, TEXT.housePoints)}
    <table role="presentation" class="hp-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:8px;">
      ${rows}
    </table>
  </div>`;
}

/* ---------- Primary rewards ---------- */

// The Primary Certificates of Recognition block: an accent title band, the
// week's topic underneath ("Generosity of Spirit Certificate Winners
// 12.12.25"), then a bordered table of class -> student names, two
// class/students pairs per row, closed by a congratulations line.
const REWARDS_BAND = ACCENT_DEEP;
const REWARDS_BORDER = '#b7bfce';
const REWARDS_SHADE = '#dde2ec'; // light grey on the class columns
const REWARDS_TINT = tint(ACCENT, 0.9); // the congratulations band

function renderAwardsBlock(awards, topic, placeholders) {
  if (!awards || !awards.length) {
    return placeholders
      ? placeholderBox('PR', 'Primary Certificates of Recognition', 'Staff add the topic title and each class&#39;s winners on the Awards page.')
      : '';
  }
  // Class cells sit on a light grey ground, student cells on white - the
  // alternating columns give the table its rhythm.
  const cell = (value, bold, width) =>
    `<td width="${width}" valign="middle" style="font-family:${SANS}; font-size:12.5px; font-weight:${bold ? 600 : 300}; color:${bold ? BRAND : INK}; background:${bold ? REWARDS_SHADE : '#ffffff'}; padding:10px 12px; border:1px solid ${REWARDS_BORDER};">${escapeHtml(
      value || ''
    )}</td>`;
  let rows = '';
  for (let i = 0; i < awards.length; i += 2) {
    const pair = [awards[i], awards[i + 1]];
    rows += `<tr>${pair
      .map((a) =>
        a
          ? cell(a.grade_stage, true, '22%') + cell(a.student_name, false, '28%')
          : `<td width="22%" style="background:${REWARDS_SHADE}; border:1px solid ${REWARDS_BORDER};">&nbsp;</td><td width="28%" style="background:#ffffff; border:1px solid ${REWARDS_BORDER};">&nbsp;</td>`
      )
      .join('')}</tr>`;
  }
  return `
  <div style="padding:0 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="background:${REWARDS_BAND}; border-radius:8px; padding:12px 16px; border-bottom:3px solid ${ACCENT};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:${SANS}; font-size:19px; font-weight:800; color:#ffffff;">${escapeHtml(TEXT.primaryCertificates)}</td>
          <td align="right" style="font-size:22px; line-height:1;">\u{1F3C6}</td>
        </tr></table>
      </td></tr>
    </table>
    ${
      topic
        ? `<p style="margin:12px 0 10px 0; font-family:${SANS}; font-size:16px; font-weight:700; line-height:1.35; color:${ACCENT_DEEP};">${escapeHtml(
            topic
          )} \u2B50</p>`
        : '<div style="height:12px; font-size:0; line-height:0;">&nbsp;</div>'
    }
    <table role="presentation" class="awards-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#ffffff;">
      ${rows}
      <tr><td colspan="4" align="center" style="background:${REWARDS_TINT}; font-family:${SANS}; font-size:13.5px; font-weight:700; font-style:italic; color:${BRAND}; padding:11px 10px; border:1px solid ${REWARDS_BORDER};">${escapeHtml(TEXT.congratulations)} \u{1F38A}</td></tr>
    </table>
  </div>`;
}

/* ---------- Balancing the top block ---------- */

// Rough desktop heights (px) of what sits in the top block's two columns,
// tuned in Chrome with FiraGO. They only decide how many of the sections that
// follow move up under the events when the principal's message is long, so a
// few percent either way does not matter.
const GEO_W_TEXT = 7.68; // Georgian, 13.5px light (the message)
const LAT_W_TEXT = 6.02; // Latin, same
const GEO_W_TITLE = 7.55; // Georgian, 13px semibold (event titles)
const LAT_W_TITLE = 5.89;
const WRAP = 0.93; // words never fill a line completely

function textWidth(text, geoW, latW) {
  let w = 0;
  for (const ch of String(text || '')) w += GEORGIAN_RE.test(ch) ? geoW : latW;
  return w;
}

function lineCount(text, width, geoW, latW) {
  return String(text || '')
    .split(/\r?\n/)
    .reduce((n, line) => n + Math.max(1, Math.ceil(textWidth(line, geoW, latW) / (width * WRAP))), 0);
}

function estimatePrincipalHeight(pm) {
  let h = 44 + 3 + 16 + 6; // header bar, rule, body padding
  for (const para of String(pm.body || '').split(/\r?\n\s*\r?\n/).filter((t) => t.trim())) {
    h += lineCount(para, CARD_TEXT_W, GEO_W_TEXT, LAT_W_TEXT) * 22.3 + 12;
  }
  return h + (pm.photoUrl ? 40 : 0); // a portrait narrows the first lines
}

function estimateEventsHeight(events) {
  const textW = COL_W - 2 - 24 - 2 - 54 - 24; // panel, card, date tile, padding => 212
  let h = 23 + 65; // panel padding, heading (two lines in Georgian), list padding
  let lastMonth = '';
  for (const ev of events) {
    const m = ev.event_date.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      h += 32;
    }
    const title = lineCount(ev.title, textW, GEO_W_TITLE, LAT_W_TITLE) * 17.6;
    const metaText = [ev.location, ev.time_note].filter(Boolean).join(' • ');
    const meta = metaText ? 3 + lineCount(metaText, textW, GEO_W_TITLE * 0.85, LAT_W_TITLE * 0.85) * 15.4 : 0;
    h += Math.max(56, 18 + title + meta) + 7;
  }
  return h;
}

// Column heights of the sections that can move up (measured, see above).
const JOIN_COL_H = 640;
const housesColHeight = (n) => 104 + Math.ceil(n / 2) * 152;
const menusColHeight = (menus) => 144 + (Math.ceil(menus.length / 2) - 1) * 38;

/* ---------- Footer ---------- */

// Lines like "Nino Beridze - Principal" become a staff directory grid;
// anything else falls back to plain text.
function parseDirectory(footerNote) {
  const lines = String(footerNote || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(/\s+(?:-|-|\||-)\s+/);
    return { name: parts[0], title: parts.slice(1).join(' - ') };
  });
}

/* ---------- Circle partner offers ---------- */

// The partners of Circle (circle.bga.ge), styled like the website's cards:
// the logo and the offer badge, five to a row, in BGA blue (the brand book
// has no gold). A
// different set every issue when Settings says so (see src/partners.js); the details of each offer
// stay behind the members' login, which the button under the grid links to.
// Offer badges: the light tint of BGA blue with dark blue text.
const BADGE_BG = ACCENT;
const BADGE_TEXT = BRAND_DEEP;
// How many partners, as the newsletter says it: "30+" rather than an exact
// number that changes whenever a partner joins (exact below 10).
const partnerCount = (n) => (n >= 10 ? `${Math.floor(n / 10) * 10}+` : String(n));
const PARTNER_SCHOOL = 'BGA';

function partnerLogo(p) {
  if (!p.logo) return '';
  // Small and visually even: a square logo is 30px tall, wider ones get
  // shorter as they get wider (so a long wordmark does not dwarf a crest),
  // and none is wider than 88px.
  if (!(p.w && p.h)) {
    return `<img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.partner)}" height="24" class="pt-img" style="height:24px; max-width:88px;">`;
  }
  const ratio = p.w / p.h;
  let h = Math.min(30, Math.max(16, 30 / Math.pow(Math.max(ratio, 1), 0.35)));
  let w = h * ratio;
  if (w > 88) {
    w = 88;
    h = 88 / ratio;
  }
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  return `<img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.partner)}" width="${w}" height="${h}" class="pt-img">`;
}

// Rough line count for text in a partner tile (about `perLine` characters a
// line), so every tile of an issue can reserve room for the longest name and
// badge and the tiles stay level - BGA's Georgian names run long.
function tileLines(text, perLine) {
  let lines = 1;
  let len = 0;
  for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
    if (len && len + 1 + word.length > perLine) {
      lines += 1;
      len = word.length;
    } else {
      len += (len ? 1 : 0) + word.length;
    }
  }
  return Math.min(lines, 4);
}

function renderPartnersBlock(partners, placeholders, hidden) {
  if (hidden) {
    return placeholders
      ? placeholderBox('P', 'Partner offers - hidden', 'Hidden from the newsletter - switch it back on under Settings.')
      : '';
  }
  if (!partners || !partners.list || !partners.list.length) {
    return placeholders
      ? placeholderBox('P', 'Partner offers', 'Circle partner offers from circle.bga.ge appear here automatically.')
      : '';
  }
  const site = partners.site || 'https://circle.bga.ge';
  const host = site.replace(/^https?:\/\//, '');
  // Logo and badge only, five to a row. On phones the rows dissolve and the
  // tiles run on three to a line (the empty fillers drop out); the fixed logo
  // and badge heights keep every tile the same height either way.
  const PER_ROW = 5;
  const badgeH = 16 * Math.max(1, ...partners.list.map((p) => tileLines(p.badge, 10))) + 10;
  // One line per tile, styled by the classes in PARTNER_CSS: the partner grid
  // is the biggest part of an issue, and Gmail cuts off emails over about 102 KB.
  const tile = (p) =>
    `<td class="pt-cell" width="20%" valign="top" style="padding:4px;"><table role="presentation" class="pt-card" width="100%" cellpadding="0" cellspacing="0"><tr><td class="pt-logo" height="34" align="center" valign="middle">${partnerLogo(p)}</td></tr><tr><td class="pt-bd" height="${badgeH}" align="center" valign="middle">${
      p.badge
        ? `<span class="pt-badge" style="background:${BADGE_BG}; color:${BADGE_TEXT};">${escapeHtml(p.badge)}</span>`
        : '&nbsp;'
    }</td></tr></table></td>`;
  // On phones the tiles run three to a line - two when a badge has a word
  // too long for a third of the screen (Georgian words often are), so every
  // tile stays the same size.
  const longWord = partners.list.some((p) => String(p.badge || '').split(/\s+/).some((w) => w.length > 9));
  let rows = '';
  for (let i = 0; i < partners.list.length; i += PER_ROW) {
    const row = partners.list.slice(i, i + PER_ROW);
    rows += `<tr class="pt-row">${row.map(tile).join('')}${'<td class="pt-fill" width="20%" style="padding:4px;">&nbsp;</td>'.repeat(
      PER_ROW - row.length
    )}</tr>`;
  }
  const more =
    partners.total > partners.list.length
      ? TEXT.seeAllOffers(partnerCount(partners.total), host)
      : TEXT.seeEveryOffer(host);
  return `
  <div style="padding:4px 0 18px 0;">
    ${columnHeading(TEXT.memberBenefits, TEXT.partnerOffers)}
    <p style="margin:2px 0 6px 0; font-family:${SANS}; font-size:13.5px; line-height:1.6; color:${INK};">${TEXT.partnersIntro(
      escapeHtml(PARTNER_SCHOOL),
      `<a href="${escapeHtml(site)}" target="_blank" style="color:${BRAND}; font-weight:600;">${escapeHtml(host)}</a>`
    )}</p>
    <table role="presentation" class="pt-table${longWord ? ' pt-two' : ''}" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; table-layout:fixed;">
      <tbody class="pt-body">${rows}</tbody>
    </table>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="border-collapse:separate; margin:12px auto 0 auto;">
      <tr><td style="background:${BRAND}; border-radius:999px; padding:10px 22px;">
        <a href="${escapeHtml(site)}" target="_blank" style="font-family:${SANS}; font-size:13.5px; font-weight:800; color:#ffffff; text-decoration:none;">${escapeHtml(more)} &rsaquo;</a>
      </td></tr>
    </table>
  </div>`;
}

/* ---------- Circle news: the 3 topics ---------- */

// A news item from Circle, after the stories: BGA's logo and the headline on
// BGA blue, the three topics parents chose, and an invitation to register.
// Built from BGA's design (flex layout and SVG redrawn as email tables).
const NEWS_TEXT = '#1d2b3a';
const NEWS_TINT = tint(BRAND, 0.9);
const NEWS_SOFT = tint(BRAND, 0.8);
const NEWS_RULE = tint(BRAND, 0.3);

function renderCircleNewsBlock(partners, base, placeholders, hidden) {
  if (hidden) {
    return placeholders
      ? placeholderBox('CN', 'Circle news - hidden', 'Hidden from the newsletter - switch it back on under Settings.')
      : '';
  }
  const N = CIRCLE_NEWS;
  const site = ((partners && partners.site) || 'https://circle.bga.ge').replace(/\/+$/, '');
  const host = site.replace(/^https?:\/\//, '');
  const para = (html, last) =>
    `<p style="margin:0 0 ${last ? 0 : 18}px 0; font-family:${SANS}; font-size:16px; font-weight:400; line-height:1.65; color:${NEWS_TEXT};">${html}</p>`;
  const topics = N.topics
    .map(
      (t, i) => `
      <tr><td style="padding:0 0 10px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; background:${NEWS_TINT}; border-radius:12px;">
          <tr>
            <td width="54" valign="middle" style="padding:14px 0 14px 18px;"><div style="width:36px; height:36px; border-radius:18px; background:${BRAND}; color:#ffffff; font-family:${SANS}; font-size:15px; font-weight:700; line-height:36px; text-align:center;">${
              i + 1
            }</div></td>
            <td valign="middle" style="padding:14px 18px 14px 0; font-family:${SANS}; font-size:16px; font-weight:600; line-height:1.4; color:${BRAND_DEEP};">${escapeHtml(t)}</td>
          </tr>
        </table>
      </td></tr>`
    )
    .join('');
  return `
  <div style="padding:6px 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; background:#ffffff; border:1px solid ${CARD_BORDER}; border-radius:14px;">
      <tr><td class="cn-pad" style="background:${BRAND}; border-radius:13px 13px 0 0; padding:32px 44px;">
        <img src="${escapeHtml(base)}/img/bga-logo-ka-white.png" alt="${escapeHtml(N.logoAlt)}" width="230" height="40" style="width:230px; height:auto; display:block; border:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:22px 0;"><tr><td height="1" style="background:${NEWS_RULE}; font-size:0; line-height:0;">&nbsp;</td></tr></table>
        <p style="margin:0 0 10px 0; font-family:${SANS}; font-size:13px; font-weight:700; ${track(N.kicker, 2)} color:#ffffff;">${escapeHtml(N.kicker)}</p>
        <h2 style="margin:0; font-family:${SERIF}; font-size:30px; font-weight:800; line-height:1.3; color:#ffffff;">${escapeHtml(N.title)}</h2>
      </td></tr>
      <tr><td class="cn-pad" style="padding:32px 44px 8px 44px;">
        ${para(`${escapeHtml(N.intro[0])}<b style="font-weight:700;">${escapeHtml(N.intro[1])}</b>${escapeHtml(N.intro[2])}`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0 0 8px 0;">${topics}</table>
        ${N.after.map((t, i) => para(escapeHtml(t), i === N.after.length - 1)).join('')}
      </td></tr>
      <tr><td class="cn-pad" style="padding:24px 44px 40px 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; background:${BRAND}; border-radius:16px;">
          <tr><td class="cn-cta" style="padding:28px 30px;">
            <p style="margin:0 0 12px 0; font-family:${SANS}; font-size:13px; font-weight:700; ${track(N.ctaKicker, 1)} color:${NEWS_SOFT};">${escapeHtml(N.ctaKicker)}</p>
            <p style="margin:0 0 18px 0; font-family:${SANS}; font-size:20px; font-weight:700; line-height:1.45; color:#ffffff;">${escapeHtml(N.ctaText)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
              <tr><td style="background:#ffffff; border-radius:999px; padding:14px 26px;"><a href="${escapeHtml(site)}/?join=1" target="_blank" style="font-family:${SANS}; font-size:16px; font-weight:700; color:${BRAND}; text-decoration:none;">${escapeHtml(
                N.ctaButton
              )} &rarr;</a></td></tr>
            </table>
            <p style="margin:12px 0 0 0; font-family:${SANS}; font-size:14px; font-weight:600; color:#ffffff;">${escapeHtml(host)}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

/* ---------- Join Circle: the invitation to register ---------- */

// Right after the calendar and the principal's message: an invitation, in
// Georgian, to join Circle - the BGA community programme - with a button
// straight to the registration form on circle.bga.ge (?join=1 opens it on
// Register). On BGA blue with a white button - the brand book's two colours.
function renderJoinCircleBlock(partners, placeholders, hidden, { column = false } = {}) {
  if (hidden) {
    return placeholders
      ? placeholderBox('J', 'Join Circle - hidden', 'Hidden from the newsletter - switch it back on under Settings.')
      : '';
  }
  const site = ((partners && partners.site) || 'https://circle.bga.ge').replace(/\/+$/, '');
  const host = site.replace(/^https?:\/\//, '');
  const join = `${site}/?join=1`;
  const link = (href, label) =>
    `<a href="${escapeHtml(href)}" target="_blank" style="color:#ffffff; font-weight:700; text-decoration:underline;">${label}</a>`;
  // The wording is BGA's own (10 November 2026).
  const steps = [
    `ეწვიეთ ${link(join, escapeHtml(host))}-ს და მონიშნეთ თქვენი სტატუსი: მშობელი / მეურვე ან თანამშრომელი.`,
    'შეიყვანეთ თქვენი ელფოსტა (მშობლებმა და მეურვეებმა დამატებით მიუთითეთ ბავშვის პირადი ნომერი, ხოლო თანამშრომლებმა გამოიყენეთ სკოლის ელფოსტა).',
    'გადადით მეილზე მიღებულ ბმულზე და შექმენით პაროლი.',
  ];
  const stepRows = steps
    .map(
      (s, i) =>
        `<tr><td width="32" valign="top" style="padding:0 0 8px 0;"><span style="display:inline-block; width:22px; height:22px; border-radius:11px; background:${ACCENT}; color:${BRAND_DEEP}; font-family:${SANS}; font-size:12px; font-weight:800; line-height:22px; text-align:center;">${
          i + 1
        }</span></td><td valign="top" style="padding:2px 0 8px 0; font-family:${SANS}; font-size:14px; line-height:1.55; color:#ffffff;">${s}</td></tr>`
    )
    .join('');
  return `
  <div style="padding:2px 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; background:${BRAND}; border-top:3px solid ${ACCENT}; border-radius:14px;">
      <tr><td style="padding:${column ? '18px 16px 16px 16px' : '22px 24px 20px 24px'};">
        <h2 style="margin:0 0 10px 0; font-family:${SERIF}; font-size:${column ? 21 : 24}px; font-weight:800; line-height:1.25; color:#ffffff;">შემოუერთდით Circle-ს</h2>
        <p style="margin:0 0 16px 0; font-family:${SANS}; font-size:14.5px; line-height:1.6; color:${ACCENT_SOFT};">Circle-ი BGA-ს მშობლებს, მოსწავლეებსა და გუნდს აერთიანებს. პროგრამა გთავაზობთ საერთო შეხვედრებსა და მასტერკლასებს თქვენ მიერ შერჩეულ თემებზე და სპეციალურ შეთავაზებებს 40-მდე პარტნიორ კომპანიაში.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${stepRows}</table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate; margin:10px 0 0 0;">
          <tr><td style="background:#ffffff; border-radius:999px; padding:11px 24px;"><a href="${escapeHtml(join)}" target="_blank" style="font-family:${SANS}; font-size:14px; font-weight:800; color:${BRAND}; text-decoration:none;">დარეგისტრირდით &rsaquo;</a></td></tr>
        </table>
        <p style="margin:12px 0 0 0; font-family:${SANS}; font-size:12.5px; line-height:1.5; color:${ACCENT_SOFT};">უკვე დარეგისტრირებული ხართ? ${link(`${site}/?login=1`, 'შედით სისტემაში')} და ნახეთ ყველა შეთავაზება.</p>
      </td></tr>
    </table>
  </div>`;
}

function renderFooter(footerNote, newsletterName, schoolName, issueDateLabel) {
  const entries = parseDirectory(footerNote);
  const hasDirectory = entries.length > 0 && entries.some((e) => e.title);
  let directoryHtml = '';
  if (hasDirectory) {
    let rows = '';
    for (let i = 0; i < entries.length; i += 3) {
      const triple = entries.slice(i, i + 3);
      rows += `<tr>${triple
        .map(
          (e) => `
        <td class="dir-cell" width="33%" valign="top" align="center" style="padding:7px 10px; text-align:center;">
          <p style="margin:0; font-family:${SANS}; font-size:12px; font-weight:600; color:#ffffff;">${escapeHtml(
            e.name
          )}</p>
          ${
            e.title
              ? `<p style="margin:2px 0 0 0; font-family:${SANS}; font-size:10px; letter-spacing:1px; color:${ACCENT};">${escapeHtml(
                  e.title
                )}</p>`
              : ''
          }
        </td>`
        )
        .join('')}${triple.length < 3 ? `<td class="dir-fill" width="${(3 - triple.length) * 33}%">&nbsp;</td>` : ''}</tr>`;
    }
    directoryHtml = `
      <table role="presentation" class="dir-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:16px;">${rows}</table>
      <div style="margin:0 auto 16px auto;">${accentDivider(42, 'center')}</div>`;
  } else if (footerNote) {
    directoryHtml = `<div style="margin-bottom:12px;">${textToHtml(footerNote, ACCENT_SOFT, 12)}</div>`;
  }
  return `
    <tr><td height="5" style="background:${ACCENT}; font-size:0; line-height:0;">&nbsp;</td></tr>
    <tr>
      <td class="foot-pad" align="center" style="background:${BRAND_DEEP}; padding:26px 24px 24px 24px;">
        ${directoryHtml}
        <p style="margin:0; font-family:${SERIF}; font-size:19px; font-weight:800; ${track(newsletterName, 3)} color:#ffffff;">${escapeHtml(
    caps(newsletterName)
  )}</p>
        <p style="margin:7px 0 0 0; font-family:${SANS}; font-size:10px; ${track(schoolName, 2)} color:${ACCENT};">${escapeHtml(
    caps(schoolName)
  )}</p>
        <p style="margin:12px 0 0 0; font-family:${SANS}; font-size:11px; color:${ACCENT_SOFT};">${escapeHtml(
    issueDateLabel
  )}</p>
      </td>
    </tr>`;
}

/* ---------- The full issue ---------- */

// Gmail cuts off an email whose HTML is over about 102 KB ("View entire
// message"), so the finished issue drops what costs bytes without showing:
// indentation, HTML comments and the spaces inside inline styles.
function compactHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n\s+/g, '\n')
    .replace(/ style="([^"]*)"/g, (m, css) => ` style="${css.replace(/\s*([;:,])\s*/g, '$1').replace(/;$/, '')}"`);
}

// The partner tiles' look, written once for all of them: 30-odd tiles each
// carrying these styles cost over 10 KB, and Gmail cuts off emails over about
// 102 KB. The badge keeps its colours inline, for email apps that drop <style>.
const PARTNER_CSS = `
  .pt-card { background: #ffffff; border: 1px solid #E7E4DB; border-radius: 12px; }
  .pt-logo { padding: 12px 4px 0 4px; }
  .pt-img { max-width: 100%; vertical-align: middle; border: 0; }
  .pt-bd { padding: 6px 4px 10px 4px; }
  .pt-badge { display: inline-block; font-family: ${SANS}; font-size: 12px; font-weight: 800; line-height: 16px; padding: 4px 9px; border-radius: 14px; }`;

function renderNewsletter(data) {
  const {
    newsletterName = identity.newsletterName,
    schoolName = identity.schoolName,
    issueDate,
    quote,
    events = [],
    principalMessage,
    articles = [],
    footerNote = '',
    calendarUrl = '',
  } = data;

  const issueDateLabel = issueDateText(issueDate);
  const placeholders = Boolean(data.placeholders);
  const editable = Boolean(data.editable);
  const fontBase = data.fontBase || '';

  // Optional masthead background photo behind the wordmark. The brand colour stays as
  // background-color so the white text is readable while the image loads (or
  // in clients that strip background images, e.g. Outlook desktop).
  const mastheadUrl = data.mastheadUrl || '';
  const mastheadBg = mastheadUrl
    ? ` background="${escapeHtml(mastheadUrl)}" style="background-color:${BRAND_DEEP}; background-image:url('${escapeHtml(
        mastheadUrl
      )}'); background-size:cover; background-position:center; background-repeat:no-repeat; padding:26px 30px 24px 30px;"`
    : ` style="background:${BRAND_DEEP}; background-color:${BRAND_DEEP}; padding:26px 30px 24px 30px;"`;
  const mastheadEdit = editable ? ` data-masthead="1"${mastheadUrl ? '' : ' data-no-bg="1"'}` : '';

  let barIndex = 0;
  const articleHtml = (a, letter) =>
    renderArticle(a, BAR_COLORS[barIndex++ % BAR_COLORS.length], placeholders ? letter : null, editable);

  const eventsHtml = events.length
    ? renderEventsBlock(events, calendarUrl, editable)
    : placeholders
      ? placeholderBox('B', 'Upcoming Events', 'Add events on the Events page.')
      : '';
  const principalHtml = principalMessage
    ? renderPrincipalBlock(principalMessage, editable)
    : placeholders
      ? placeholderBox('C', "Principal's Message", "Written on the Principal's message page.")
      : '';

  // Phones read top-down, so the stacked order there is: principal's message
  // first, then the events calendar, then the articles. Desktop keeps the
  // print layout (events left, principal right). Implemented with a small
  // mobile-only copy of the principal block: hidden by default (and from
  // Outlook via mso-hide), shown on <=640px while the in-column copy hides.
  const mobilePrincipal = principalHtml
    ? `<div class="mob-principal" style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${principalHtml}</div>`
    : '';
  // The two columns of the top block are framed by their table cells, which
  // share the row's height: the events panel and the principal's card always
  // end on the same line, however long the message or the events list.
  const topFrame = (bg) =>
    `box-sizing:border-box; background:${bg}; border:1px solid ${CARD_BORDER}; border-radius:10px;`;
  const topEventsCell = events.length
    ? `<td class="col" width="${COL_W}" valign="top" style="${topFrame(EVENTS_PANEL)} padding:14px 12px 7px 12px;">${renderEventsBlock(
        events,
        calendarUrl,
        editable,
        { framed: true }
      )}</td>`
    : `<td class="col" width="${COL_W}" valign="top">${eventsHtml || '&nbsp;'}</td>`;
  const topPrincipalCell = principalMessage
    ? `<td class="col desk-principal-cell" width="${COL_W}" valign="top" style="${topFrame('#ffffff')}"><div class="desk-principal">${renderPrincipalBlock(
        principalMessage,
        editable,
        { framed: true }
      )}</div></td>`
    : `<td class="col" width="${COL_W}" valign="top">${principalHtml ? `<div class="desk-principal">${principalHtml}</div>` : '&nbsp;'}</td>`;
  // A long principal's message leaves the events column short. The sections
  // that follow the top block (Join Circle, House Points, School menus) then
  // move up under the events, in their order, for as long as each one brings
  // the two columns closer to the same length.
  const sections = [
    {
      show: !data.joinCircleHidden,
      h: JOIN_COL_H,
      html: (col) => renderJoinCircleBlock(data.partners, placeholders, data.joinCircleHidden, { column: col }),
    },
    {
      show: !data.housePointsHidden && (data.houses || []).length > 0,
      h: housesColHeight((data.houses || []).length),
      html: (col) => renderHousePointsBlock(data.houses, placeholders, data.housePointsHidden, { compact: col }),
    },
    {
      show: (data.menus || []).length > 0,
      h: menusColHeight(data.menus || []),
      html: () => renderMenusBlock(data.menus, placeholders),
    },
  ];
  if (events.length && principalMessage) {
    const target = estimatePrincipalHeight(principalMessage);
    let left = estimateEventsHeight(events);
    for (const sec of sections) {
      if (!sec.show) continue;
      if (left + sec.h / 2 > target) break;
      sec.up = true;
      left += sec.h + 18;
    }
  }
  const movedUp = sections.filter((sec) => sec.up);
  const topEventsBody = renderEventsBlock(events, calendarUrl, editable, { framed: true });
  const topEventsCellHtml = movedUp.length
    ? `<td class="col" width="${COL_W}" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr><td style="${topFrame(
        EVENTS_PANEL
      )} padding:14px 12px 7px 12px;">${topEventsBody}</td></tr></table><div style="height:18px; line-height:18px; font-size:0;">&nbsp;</div>${movedUp
        .map((sec) => sec.html(true))
        .join('')}</td>`
    : topEventsCell;
  const topFramed = Boolean(events.length || principalMessage);
  const leftColumn = columnHtml(LEFT_SLOTS, articles, articleHtml, placeholders, articles);
  const rightColumn = columnHtml(RIGHT_SLOTS, articles, articleHtml, placeholders);

  // Dedicated full-width sections: BGA as a whole (W), then IB DP with the
  // university support programme (X) and extracurricular activities (Y). An empty band collapses
  // entirely in drafts and shows a labelled placeholder in the preview.
  const bandHtml = (letter, label, hint) => {
    const inSlot = articles.filter((a) => (a.slot || DEFAULT_SLOT) === letter);
    if (inSlot.length) return inSlot.map((a) => articleHtml(a, letter)).join('');
    return placeholders ? placeholderBox(letter, label, hint) : '';
  };
  // The column news leads; the full-width sections follow, with BGA as a
  // whole first among them.
  const S = SECTIONS;
  const lowerBands =
    bandHtml('W', `${S.whole_school} - full width`, `${S.whole_school} stories run full width here, right under the news columns.`) +
    bandHtml('X', `${S.sixth_form} / ${S.university} - full width`, `${S.sixth_form} and ${S.university} stories run full width here, below ${S.whole_school}.`) +
    bandHtml('Y', `${S.co_curricular} - full width`, `${S.co_curricular} stories run full width here, at the bottom.`);
  const lowerBandsRow = lowerBands
    ? `
    <tr>
      <td class="wrap-pad" style="padding:0 14px 6px 14px;">${lowerBands}</td>
    </tr>`
    : '';
  // Circle partner offers close the issue, just above the footer.
  const partnersHtml = renderPartnersBlock(data.partners, placeholders, data.partnersHidden);
  const partnersRow = partnersHtml
    ? `
    <tr>
      <td class="wrap-pad" style="padding:0 14px 6px 14px;">${partnersHtml}</td>
    </tr>`
    : '';

  const quoteBlock =
    quote && quote.text
      ? `
    <tr>
      <td class="quote-pad" style="background:${BRAND_DEEP}; background-color:${BRAND_DEEP}; padding:30px 36px 28px 36px; text-align:center;">
        <p style="margin:0; font-family:${SERIF}; font-size:46px; font-weight:800; line-height:0.6; color:${ACCENT};">&ldquo;</p>
        <p style="margin:8px 0 0 0; font-family:${SERIF}; font-style:italic; font-size:18px; font-weight:300; color:#ffffff; line-height:1.6;"${
          editable && quote.weekStart ? ` data-edit="quote:${quote.weekStart}:text"` : ''
        }>${escapeHtml(quote.text)}</p>
        ${
          quote.author
            ? `<div style="margin-top:14px;">${accentDivider(36, 'center')}</div>
        <p style="margin:10px 0 0 0; font-family:${SANS}; font-size:10px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:${ACCENT};"${
                editable && quote.weekStart ? ` data-edit="quote:${quote.weekStart}:author"` : ''
              }>${escapeHtml(editable ? quote.author : caps(quote.author))}</p>`
            : ''
        }
      </td>
    </tr>`
      : placeholders
        ? `<tr><td style="padding:16px 14px 0 14px;">${placeholderBox(
            'A',
            'Quote of the week',
            "Added together with the principal's message."
          )}</td></tr>`
        : '';

  return compactHtml(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(newsletterName)} - ${escapeHtml(issueDateLabel)}</title>
<meta name="x-apple-disable-message-reformatting">
<style>
${fontFaceCss(fontBase)}
</style>
<style>
  ${PARTNER_CSS}
  ${MOBILE_CSS}
</style>
</head>
<body style="margin:0; padding:0; background:${PAGE_BG}; -webkit-text-size-adjust:100%;"${
    editable ? ` data-csrf="${escapeHtml(data.csrf || '')}" data-max-words="${data.maxWords || MAX_ARTICLE_WORDS}"` : ''
  }>
  <center>
  <table role="presentation" class="sheet" width="680" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:680px; max-width:100%; background:${SHEET};">

    <!-- A: masthead -->
    <tr><td height="6" style="background:${ACCENT}; font-size:0; line-height:0;">&nbsp;</td></tr>
    <tr>
      <td class="mast-pad"${mastheadBg}${mastheadEdit}>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td class="mast-cell" valign="bottom">
              <h1 class="mast-title" style="margin:0; font-family:${SERIF}; font-size:52px; font-weight:800; ${track(newsletterName, 5)} line-height:1; color:#ffffff;">${escapeHtml(
    caps(newsletterName)
  )}</h1>
            </td>
            <td class="mast-side" align="right" valign="bottom" style="padding-left:12px;">
              <p style="margin:0; font-family:${SANS}; font-size:12px; font-weight:600; color:#ffffff;">${escapeHtml(
    schoolName
  )}</p>
              <p style="margin:5px 0 0 0; font-family:${SANS}; font-size:9px; ${track(TEXT.monthly, 2)} color:${ACCENT_SOFT};">${escapeHtml(TEXT.monthly)} &bull; ${escapeHtml(
    issueMonth(issueDate)
  )}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${quoteBlock}

    <!-- B/C + article slots: two columns, as in the print layout -->
    <tr>
      <td class="wrap-pad" style="padding:20px 14px 6px 14px;">
        ${mobilePrincipal}
        <!-- Fixed top block: the events calendar and the principal's message
             always come first, whatever the week's stories are. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0;">
          <tr>
            ${topEventsCellHtml}
            <td class="gutter" width="16" style="font-size:0; line-height:0;">&nbsp;</td>
            ${topPrincipalCell}
          </tr>
        </table>
        ${topFramed ? '<div style="height:18px; line-height:18px; font-size:0;">&nbsp;</div>' : ''}
        ${sections
          .filter((sec) => !sec.up)
          .map((sec) => sec.html(false))
          .join('')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td class="col" width="${COL_W}" valign="top">${leftColumn || '&nbsp;'}</td>
            <td class="gutter" width="16" style="font-size:0; line-height:0;">&nbsp;</td>
            <td class="col" width="${COL_W}" valign="top">${rightColumn || '&nbsp;'}</td>
          </tr>
        </table>
        ${renderCircleNewsBlock(data.partners, fontBase, placeholders, data.circleNewsHidden)}
        ${renderAwardsBlock(data.awards, data.awardTopic, placeholders)}
      </td>
    </tr>
    ${lowerBandsRow}
    ${partnersRow}

    ${renderFooter(footerNote, newsletterName, schoolName, issueDateLabel)}
  </table>
  </center>
  ${
    // The CSRF token travels as an attribute on <body> - the page's CSP
    // (script-src 'self') forbids inline scripts, so an inline
    // window.CSRF assignment would be silently blocked and every editor
    // save would fail with 403.
    editable ? `<script src="/js/preview-editor.js"></script>` : ''
  }
</body>
</html>`);
}

// One article rendered exactly as the newsletter will show it, at column
// width - the live preview beside the news form. Photo sources are limited
// to data URIs, local uploads and http(s) images.
function renderArticlePreview({ title, body, sectionLabel = '', photos = [] } = {}) {
  // Each photo is a URL string, or {url, w, h} when its size is known.
  const safePhotos = (Array.isArray(photos) ? photos : [])
    .map((p) => (typeof p === 'string' ? { url: p } : p || {}))
    .filter((p) => typeof p.url === 'string' && /^(data:image\/|\/uploads\/|https?:\/\/)/.test(p.url))
    .slice(0, 12)
    .map((p) => ({ id: null, url: p.url, w: Number(p.w) || 0, h: Number(p.h) || 0 }));
  const article = {
    id: null,
    title: String(title || '').slice(0, 200) || 'Untitled article',
    body: String(body || '').slice(0, 20000) || 'Start typing the article text…',
    sectionLabel: String(sectionLabel || ''),
    photos: safePhotos,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Article preview</title>
<style>
${fontFaceCss('')}
</style>
</head>
<body style="margin:0; padding:18px 10px; background:${SHEET};">
  <center>
  <table role="presentation" width="${COL_W}" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:${COL_W}px; max-width:100%;">
    <tr><td>${renderArticle(article, BAR_COLORS[0], null, false)}</td></tr>
  </table>
  </center>
</body>
</html>`;
}

// Branded template for reminder emails to staff (brand + accent, red for the
// hard-deadline variant via headingColor).
function renderReminderEmail({ heading, headingColor, bodyHtml, buttonUrl, buttonLabel, schoolName, fontBase }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(heading)}</title><style>
${fontFaceCss(fontBase || '')}
@media only screen and (max-width: 640px) { .sheet { width: 100% !important; margin: 0 !important; } }
</style></head>
<body style="margin:0; padding:0; background:${PAGE_BG}; -webkit-text-size-adjust:100%;">
  <center>
  <table role="presentation" class="sheet" width="560" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:560px; max-width:100%; background:#ffffff; margin:24px 0;">
    <tr><td height="5" style="background:${ACCENT}; font-size:0; line-height:0;">&nbsp;</td></tr>
    <tr><td style="background:${BRAND_DEEP}; padding:18px 26px; font-family:${SERIF}; font-size:24px; font-weight:800; letter-spacing:3px; color:#ffffff;">${escapeHtml(caps(identity.newsletterName))}</td></tr>
    <tr><td style="background:${escapeHtml(headingColor)}; padding:14px 26px; font-family:${SANS}; font-size:17px; font-weight:600; color:#ffffff;">${escapeHtml(
    heading
  )}</td></tr>
    <tr><td style="padding:22px 26px 8px 26px; font-family:${SANS};">${bodyHtml}</td></tr>
    ${
      buttonUrl
        ? `<tr><td style="padding:8px 26px 26px 26px;">
      <a href="${escapeHtml(buttonUrl)}" style="display:inline-block; background:${BRAND}; color:#ffffff; font-family:${SANS}; font-size:15px; font-weight:600; text-decoration:none; padding:13px 26px; border-radius:8px; border-bottom:3px solid ${ACCENT_DEEP};">${escapeHtml(
            buttonLabel || 'Open the admin panel'
          )}</a></td></tr>`
        : ''
    }
    <tr><td style="padding:12px 26px 22px 26px; font-family:${SANS}; font-size:12px; color:#6b7280;">${escapeHtml(
    schoolName
  )} - automated newsletter reminder.</td></tr>
  </table>
  </center>
</body>
</html>`;
}

module.exports = {
  renderNewsletter,
  renderReminderEmail,
  renderArticlePreview,
  escapeHtml,
  textToHtml,
  PALETTE: { BRAND, BRAND_DEEP, ACCENT, ACCENT_DEEP, SHEET, INK },
  WIDTHS: { CARD_TEXT_W, PAIR_W },
  // Height estimates for balancing the top block (exported for tests).
  estimate: { principal: estimatePrincipalHeight, events: estimateEventsHeight },
};
