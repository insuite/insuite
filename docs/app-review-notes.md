# App Review Notes — InSuite

Copy the body of this file (everything below the rule) into the
**App Review Information → Notes** field on App Store Connect when
submitting a new build. Keep this file updated alongside the
codebase so each submission has matching notes.

---

Hi reviewer — thanks for taking the time. A few things that will
make this build quicker to evaluate:

## What InSuite is

A social app for solo luxury-hotel guests to find company for shared
facilities at the same property — pool, gym, executive lounge,
breakfast, spa, dinner. Posts are pinned to a specific hotel and
time slot. Other guests in the same city see the post in Discover
and can request to join; the host approves or declines.

## Signing in

The only sign-in method is **Sign in with Apple**, per our auth
design. You can sign in with any Apple ID — we never see your real
email when you choose "Hide my email" (Apple gives us a relay
address). No demo account credentials are needed.

The first sign-in walks you through a short onboarding
(name → languages → activities you're open to → optional bio).
Subsequent sign-ins land directly on Discover.

## Reviewing the paid flow without paying

For App Store review only: redeem the internal tester code
**LOVEJU9** on `Profile → Plans → Redeem code` (or
`Profile → Redeem code`). This grants a 90-day pass equivalent
to the paid Trip Pass, so you can post unlimited activities and
exercise every gated path without going through StoreKit. The code
is server-side validated and revocable.

If you would rather test the StoreKit purchase flow itself, the
three consumable products are
`com.insuite.invite.pass7d/pass14d/pass30d`. Sandbox-tester
accounts are accepted.

## Guideline 1.2 — abuse handling

InSuite handles user-generated content (profiles, activity posts,
chat messages). Every UGC surface ships with a report-and-block
affordance, and we operate a 24-hour moderation review process.

**In-app reporting**:
- Report a user from any profile screen → `…` menu → Report.
- Report an activity from the detail screen → `…` menu →
  Report activity.
- Report a single chat message: long-press the bubble → Report
  message.

Every report opens a sheet asking for a reason (harassment, sexual
content, spam, impersonation, underage user, or other) and an
optional detail field. Submitted reports land in our server-side
moderation queue.

**In-app blocking**:
- Block a user from any profile screen → `…` menu → Block.
- A block is bidirectional: blocked users disappear from your
  Discover feed and Messages, and you disappear from theirs.
- Unblock from the same menu, or via `Profile → Blocked` list.

**Moderation workflow**:
- An admin-only set of routes (gated by both a UI check and
  Postgres RLS) lets the operator review the queue, see context
  (user / activity / specific message), and take action:
  delete an activity, delete a message, clear an inappropriate
  avatar or bio, or dismiss a report as non-violating.
- All actions are audit-trailed by flipping the report's status to
  Actioned or Dismissed.

**Response SLA**: We commit to reviewing every report within
**24 hours**. The published contact for moderation escalation is
**liphamju@gmail.com** (also linked from the in-app Privacy Policy
and Terms of Service pages, and the public website at
<https://insuite.app>).

## Suggested 5-minute walkthrough

1. Sign in with Apple → finish onboarding.
2. Activities tab → New → pick any hotel + venue + time → post.
   Discover is scoped to your last-used hotel's city, so this also
   seeds the feed.
3. From any activity's host avatar → Profile → `…` menu shows
   Block / Report (user-side abuse tooling).
4. Long-press any incoming chat bubble (use a second Apple ID, or
   the matching flow seeded above) to see the message-level Report
   sheet.
5. Apply **LOVEJU9** on `Profile → Redeem code` to lift the
   first-activity-free paywall.

## Contact

For anything urgent during review: **liphamju@gmail.com**.

Thank you again.
