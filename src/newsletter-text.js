// The newsletter's own wording, in Georgian: every heading, label, button and
// date parents see in the email. BGA's newsletter goes out once a month.
//
// What staff write (stories, events, the principal's message, the quote)
// goes out exactly as typed, and the newsletter and school names come from
// Settings. The admin-only placeholder boxes in the preview stay in English.
// Change the wording here; nothing else needs to move.

const MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];
// Genitive forms, for "until 2 December" = "2 დეკემბრის ჩათვლით".
const MONTHS_GENITIVE = [
  'იანვრის', 'თებერვლის', 'მარტის', 'აპრილის', 'მაისის', 'ივნისის',
  'ივლისის', 'აგვისტოს', 'სექტემბრის', 'ოქტომბრის', 'ნოემბრის', 'დეკემბრის',
];
// Monday first, as on the event date tiles.
const WEEKDAYS_SHORT = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

const GEORGIAN_RE = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;

// Capitals for Latin labels only. Georgian has no capital letters - upper-
// casing it produces Mtavruli, which most email clients' fonts can't show.
function caps(text) {
  const s = String(text || '');
  return GEORGIAN_RE.test(s) ? s : s.toUpperCase();
}

const parse = (dateStr) => String(dateStr).split('-').map(Number);

// "ნოემბერი" for 2026-11-13.
function monthName(dateStr) {
  return MONTHS[parse(dateStr)[1] - 1];
}

// "პარ" for a Friday.
function weekdayShort(dateStr) {
  const [y, m, d] = parse(dateStr);
  return WEEKDAYS_SHORT[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

// "13 ნოემბერი, 2026" - the issue date in the footer.
function issueDate(dateStr) {
  const [y, m, d] = parse(dateStr);
  return `${d} ${MONTHS[m - 1]}, ${y}`;
}

// "ნოემბერი 2026" - the month the issue covers, under the masthead.
function issueMonth(dateStr) {
  const [y, m] = parse(dateStr);
  return `${MONTHS[m - 1]} ${y}`;
}

// An event running into the next month: "2 დეკემბრის ჩათვლით".
function untilDate(dateStr) {
  const [, m, d] = parse(dateStr);
  return `${d} ${MONTHS_GENITIVE[m - 1]} ჩათვლით`;
}

const TEXT = {
  // Masthead
  monthly: 'ყოველთვიური',
  // Default email subject tail, when nobody writes one on the Preview page.
  defaultSubject: 'ყოველთვიური ბიულეტენი',

  // Upcoming events
  saveTheDate: 'მონიშნეთ კალენდარში',
  upcomingEvents: 'ღონისძიებების კალენდარი',
  calendar: 'კალენდარი',

  // Principal's message
  principalsMessage: 'დირექტორის მიმართვა',
  principalAlt: 'დირექტორი',

  // House points
  houseSpirit: 'გუნდური სული',
  housePoints: 'სახლების ქულები',
  points: (n) => `${n} ქულა`,
  leading: 'ლიდერი',

  // School menus
  schoolMenus: 'სასკოლო მენიუ',
  menusIntro: 'რა გვაქვს ამ თვეში სუფრაზე - აირჩიეთ კლასი:',

  // Primary awards
  primaryCertificates: 'დაწყებითი საფეხურის სიგელები',
  congratulations: 'გილოცავთ ყველა გამარჯვებულს!',

  // Circle partner offers
  memberBenefits: 'Circle - წევრების შეღავათები',
  partnerOffers: 'პარტნიორების შეთავაზებები',
  partnersIntro: (school, linkHtml) =>
    `Circle-ის მეშვეობით ${school}-ს ოჯახები და თანამშრომლები ჩვენი პარტნიორებისგან სპეციალურ ფასებს იღებენ. შედით ${linkHtml}-ზე, რომ ნახოთ ყველა შეთავაზება და გაიგოთ, როგორ ისარგებლოთ მათით.`,
  seeAllOffers: (count, host) => `ნახეთ ${count} შეთავაზება ${host}-ზე`,
  seeEveryOffer: (host) => `ნახეთ ყველა შეთავაზება ${host}-ზე`,

  // Link buttons that replace bare web addresses in stories
  openForm: 'გახსენით ფორმა',
  openGoogleDocs: 'გახსენით Google Docs-ში',
  openGoogleSheets: 'გახსენით Google Sheets-ში',
  openGoogleSlides: 'გახსენით Google Slides-ში',
  openGoogleDrive: 'გახსენით Google Drive-ში',
  watchYouTube: 'უყურეთ YouTube-ზე',

  // Picture descriptions, shown when an email app blocks images
  photoAlt: 'ფოტო',
  sectionHeadAlt: 'სექციის ხელმძღვანელი',
};

// The Circle news item ("the 3 most interesting topics"), from BGA's design
// of 27 November 2026. Shown in the middle of the newsletter, after the
// stories; switched off under Settings once it has gone out.
const CIRCLE_NEWS = {
  kicker: 'CIRCLE · ზრდა და განვითარება',
  title: 'ცნობილია 3 ყველაზე საინტერესო თემა',
  logoAlt: 'ბრიტანულ-ქართული აკადემია',
  // The intro, with its bold phrase in the middle.
  intro: [
    'CIRCLE პროგრამის ',
    'ზრდისა და განვითარების',
    ' მიმართულებაში მშობლების არჩევანით უკვე ცნობილია სამი ყველაზე საინტერესო თემა. პირველი აქტივობები სწორედ მათ დაეთმობა:',
  ],
  topics: [
    'AI და მომავლის უნარები',
    'სტრესის მართვა და ფსიქოლოგიური კეთილდღეობა',
    'ტექნოლოგიები და ციფრული კეთილდღეობა',
  ],
  after: [
    'აქტივობების ზუსტ თარიღებს უახლოეს დღეებში გაცნობებთ.',
    'მადლობას ვუხდით ყველა მშობელს, ვინც CIRCLE-ში ჩაერთო და თავისი აზრი გაგვიზიარა.',
  ],
  ctaKicker: 'ჯერ არ დარეგისტრირებულხართ?',
  ctaText: 'გელოდებით! დარეგისტრირდით CIRCLE-ზე და თქვენც შეძლებთ ამ ღონისძიებებზე დასწრებას.',
  ctaButton: 'დარეგისტრირდით',
};

module.exports = { TEXT, CIRCLE_NEWS, GEORGIAN_RE, caps, MONTHS, monthName, weekdayShort, issueDate, issueMonth, untilDate };
