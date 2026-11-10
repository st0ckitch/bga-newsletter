// An issue that never went out does not take the principal's message with it.
//
// Messages are filed under the week they were written for. When a week's
// newsletter is skipped, the site moves on to the next week on Monday and the
// page shows an empty message, although the text is still there under the
// week before. This brings that message into the current issue, so a skipped
// week never loses it.
//
// It only moves a message when it is sure the issue it was written for did
// not go out: the Mailchimp draft for that week was never sent (or there was
// never an issue at all). A message whose issue was sent stays where it is.
// Demo text is never carried over. A message written for the current week
// always wins: nothing is brought over once this week has one.

const { db } = require('./db');
const mailchimp = require('./mailchimp');
const { addDays } = require('./week');
const { generationWeekStart } = require('./appweek');

// How far back an unsent message is still brought forward: last week's, or
// the one before (a skipped week next to a holiday week).
const LOOKBACK_DAYS = 14;

// Campaign states that mean the issue reached (or is about to reach) parents.
const WENT_OUT = ['sent', 'sending', 'schedule'];

async function campaignWentOut(campaignId) {
  try {
    const campaign = await mailchimp.getCampaign(campaignId);
    return WENT_OUT.includes(campaign.status);
  } catch (err) {
    if (err.status === 404) return false; // the draft was deleted unsent
    throw err;
  }
}

// true / false, or throws when Mailchimp cannot tell right now.
async function issueWentOut(weekStart) {
  const issue = db.prepare('SELECT * FROM issues WHERE week_start = ? ORDER BY id DESC').get(weekStart);
  if (!issue) return false;
  // Sent, then regenerated into a fresh draft (src/generate.js).
  if (issue.sent_at) return true;
  if (issue.campaign_id && mailchimp.isConfigured()) return campaignWentOut(issue.campaign_id);
  // No Mailchimp record to ask: an approved issue is taken as sent.
  return Boolean(issue.approved_at);
}

// Returns { moved: 'YYYY-MM-DD' } when a message was brought into weekStart,
// otherwise { moved: null, reason }.
async function carryOverPrincipalMessage(weekStart = generationWeekStart()) {
  if (db.prepare('SELECT 1 FROM principal_messages WHERE week_start = ?').get(weekStart)) {
    return { moved: null, reason: 'this week already has a message' };
  }
  const earliest = addDays(weekStart, -LOOKBACK_DAYS);
  const candidate = db
    .prepare(
      'SELECT * FROM principal_messages WHERE week_start < ? AND week_start >= ? ORDER BY week_start DESC LIMIT 1'
    )
    .get(weekStart, earliest);
  if (!candidate) return { moved: null, reason: 'no recent message' };
  if (candidate.is_demo) return { moved: null, reason: 'the recent message is demo text' };

  // Neither its own issue nor any issue since may have gone out.
  const weeks = db
    .prepare('SELECT DISTINCT week_start FROM issues WHERE week_start >= ? AND week_start < ?')
    .all(candidate.week_start, weekStart)
    .map((r) => r.week_start);
  for (const w of weeks) {
    if (await issueWentOut(w)) return { moved: null, reason: `the issue of ${w} was sent` };
  }

  // Checked again here: someone may have saved this week's message meanwhile.
  const info = db
    .prepare(
      `UPDATE principal_messages SET week_start = ?, carried_from = ?
       WHERE id = ? AND NOT EXISTS (SELECT 1 FROM principal_messages WHERE week_start = ?)`
    )
    .run(weekStart, candidate.week_start, candidate.id, weekStart);
  if (!info.changes) return { moved: null, reason: 'this week already has a message' };
  console.log(
    `[carry-over] The principal's message for the week of ${candidate.week_start} was not sent; brought into the week of ${weekStart}.`
  );
  return { moved: candidate.week_start };
}

// Runs at most once per week and process once it has an answer (a failed
// Mailchimp check is retried after a few minutes), so it can sit in front of
// every signed-in page for free.
let settledWeek = null;
let retryAfter = 0;
let inFlight = null;

async function ensureCarriedOver() {
  const week = generationWeekStart();
  if (settledWeek === week || Date.now() < retryAfter) return;
  if (!inFlight) {
    inFlight = carryOverPrincipalMessage(week)
      .then(() => {
        settledWeek = week;
      })
      .catch((err) => {
        retryAfter = Date.now() + 5 * 60 * 1000;
        console.error("[carry-over] Could not check last week's issue:", err.message);
      })
      .finally(() => {
        inFlight = null;
      });
  }
  await inFlight;
}

function carryOverMiddleware(req, res, next) {
  if (!req.user) return next();
  ensureCarriedOver().then(() => next(), next);
}

module.exports = { carryOverPrincipalMessage, ensureCarriedOver, carryOverMiddleware, campaignWentOut };
