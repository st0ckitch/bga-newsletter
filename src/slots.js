// Named template sections. A-C are fixed parts of the layout: the header &
// quote, then always the events calendar (B, left) beside the principal's
// message (C, right). Below them the news columns lead: the primary school
// fills the left column (D/F/H), the secondary school and the kindergarten
// share the right (E/G/I); then the full-width sections follow in order -
// BGA as a whole (W), IB DP with the university support programme (X) and
// the extracurricular activities (Y). Labels use the area names from
// sections.js.
const { SECTIONS: L } = require('./sections');

const SLOT_LABELS = {
  A: 'A - Header & quote of the week (fixed)',
  B: 'B - Upcoming events · left column (fixed)',
  C: "C - Principal's message · right column (fixed)",
  W: `W - ${L.whole_school} · full width, under the columns`,
  D: `D - ${L.primary} · left column, top`,
  E: `E - ${L.secondary}/${L.foundation} · right column, top`,
  F: `F - ${L.primary} · left column, middle`,
  G: `G - ${L.secondary}/${L.foundation} · right column, middle`,
  H: `H - ${L.primary} · left column, bottom`,
  I: `I - ${L.secondary}/${L.foundation} · right column, bottom`,
  X: `X - ${L.sixth_form} / ${L.university} · full width, below the columns`,
  Y: `Y - ${L.co_curricular} · full width, at the bottom`,
};

const CONTENT_SLOTS = ['W', 'D', 'E', 'F', 'G', 'H', 'I', 'X', 'Y'];
const LEFT_SLOTS = ['D', 'F', 'H'];
const RIGHT_SLOTS = ['E', 'G', 'I'];
// The full-width bands: articles placed here render across the whole sheet,
// not inside a half-width column, so photos get the wide size treatment.
const WIDE_SLOTS = CONTENT_SLOTS.filter((s) => !LEFT_SLOTS.includes(s) && !RIGHT_SLOTS.includes(s));
const DEFAULT_SLOT = 'D';

// Keep stories short and scannable for parents.
const MAX_ARTICLE_WORDS = 100;

function wordCount(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean).length;
}

// Placement policy: the area decides where a story can go. The primary
// school owns the left column, the secondary school and kindergarten the
// right, and BGA / IB DP (shared with the university support programme) /
// extracurricular activities each have a full-width section.
const SECTION_SLOTS = {
  whole_school: ['W'],
  foundation: RIGHT_SLOTS, // single column, beside the primary stories
  primary: LEFT_SLOTS,
  secondary: RIGHT_SLOTS,
  sixth_form: ['X'],
  university: ['X'],
  co_curricular: ['Y'],
};

function allowedSlots(section) {
  return SECTION_SLOTS[section] || CONTENT_SLOTS;
}

// Topmost allowed slot: D for left-column and either-column areas, E for secondary.
function defaultSlot(section) {
  return allowedSlots(section)[0];
}

// The human-readable rule behind a refused placement (null = no restriction).
function columnRule(section) {
  if (section === 'whole_school') return `${L.whole_school} stories live in their own full-width section (W) under the columns.`;
  if (section === 'foundation') return `${L.foundation} stories go in the right column (E/G/I), alongside ${L.secondary}.`;
  if (section === 'primary') return `${L.primary} stories always go in the left column (D/F/H).`;
  if (section === 'secondary') return `${L.secondary} stories always go in the right column (E/G/I).`;
  if (section === 'sixth_form') return `${L.sixth_form} stories live in their own full-width section (X) below the columns.`;
  if (section === 'university') return `${L.university} stories share the full-width section X with ${L.sixth_form}.`;
  if (section === 'co_curricular') return `${L.co_curricular} stories live in their own full-width section (Y) at the bottom.`;
  return null;
}

module.exports = {
  SLOT_LABELS,
  CONTENT_SLOTS,
  LEFT_SLOTS,
  RIGHT_SLOTS,
  WIDE_SLOTS,
  DEFAULT_SLOT,
  MAX_ARTICLE_WORDS,
  wordCount,
  allowedSlots,
  defaultSlot,
  columnRule,
};
