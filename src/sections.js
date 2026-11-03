// Content areas a story can belong to. Each area has an SLT member
// responsible for checking its stories before they reach the newsletter.
// The keys are what the database stores (and what the Users-page import
// takes in its area column); the labels are BGA's own names for its areas.
// The original keys stay as they were so existing stories keep their area:
// whole_school is BGA as a whole, foundation the kindergarten, sixth_form
// the IB Diploma years.
const SECTIONS = {
  whole_school: 'BGA',
  foundation: 'ბაღი',
  primary: 'დაწყებითი საფეხური',
  secondary: 'საშუალო საფეხური',
  sixth_form: 'IB DP',
  co_curricular: 'კლასგარეშე აქტივობები',
  university: 'საუნივერსიტეტო მხარდაჭერის პროგრამა',
};

const SECTION_KEYS = Object.keys(SECTIONS);
const DEFAULT_SECTION = 'whole_school';

function sectionLabel(key) {
  return SECTIONS[key] || String(key || '').replace(/_/g, ' ');
}

function isSection(key) {
  return SECTION_KEYS.includes(key);
}

module.exports = { SECTIONS, SECTION_KEYS, DEFAULT_SECTION, sectionLabel, isSection };
