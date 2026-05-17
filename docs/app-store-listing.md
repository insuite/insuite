# App Store Listing — InSuite

Source of truth for everything we paste into App Store Connect's
**App Information** and **Version** screens. Tracked in repo so the
copy stays in sync with positioning and product changes.

Each section below is labeled with the App Store Connect field
name and Apple's character cap. Counts in this file are kept inside
the cap; verify with `wc -m <(echo -n "…")` before pasting.

Hard rules that bit me in past submissions:
- **Keywords**: no spaces after commas (wastes character budget).
- **Don't repeat** words already in App Name / Subtitle in keywords
  (Apple indexes those automatically; the redundancy wastes budget).
- **Promotional Text + What's New** can change without resubmission.
  Everything else requires a new version review.

---

## App Information (set once per app, not per version)

### App Name — max 30 chars

```
InSuite
```

Length: 7. Keeping it short — the subtitle does the explaining.
The product name is clean enough to stand alone.

### Subtitle — max 30 chars

```
Never dine alone in your hotel
```

Length: 30. Builds on the website tagline ("Never dine alone
again."), grounds it to the specific context (your hotel right
now), and is dense in search-relevant terms (`hotel`, `dine`,
`alone`).

### Bundle ID

`com.insuite.invite` — already in `app.json`.

### Categories

- **Primary**: Social Networking
- **Secondary**: Travel

Social Networking is the truthful primary — the app is a matching
+ messaging product. Travel is the dominant intent: people only
use it when they're staying somewhere away from home.

### Age Rating (questionnaire)

Recommended answers:

- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Sexual Content / Nudity: **None**
- Profanity / Crude Humor: **None**
- Mature / Suggestive Themes: **None**
- Horror / Fear: **None**
- Medical / Treatment Information: **None**
- Alcohol, Tobacco, or Drug Use or References: **Infrequent / Mild**
  (host can mention "drinks at the lounge" in a note — that's the
  ceiling)
- Simulated Gambling: **None**
- Contests: **None**
- **User-Generated Content**: **Yes** — and confirm the
  moderation question per Guideline 1.2 (we have report, block,
  admin queue; documented in `docs/app-review-notes.md`)
- **Unrestricted Web Access**: **No** (in-app web browser opens
  only privacy / terms / our own domain)

This typically yields a **17+** rating, which is standard for
social-networking apps with UGC.

### Privacy Policy URL

```
https://insuite.app/privacy.html
```

(Update once domain is confirmed; `docs/privacy.html` is the
source.)

### Support URL

```
https://insuite.app
```

(Or a dedicated support page if we add one — the homepage already
exposes the support contact email.)

### Marketing URL — optional

```
https://insuite.app
```

---

## Version-specific copy (re-set per submission)

### Promotional Text — max 170 chars · editable without resubmit

```
Solo guests at your hotel are closer than you think. Say so — pool, gym, lounge, breakfast, spa, dinner. Tonight, not tomorrow.
```

Length: 129. Stays under the cap so we have room to tweak for
launch beats (a press mention, a featured-app push, a seasonal
hook) without a new build.

### Description — max 4000 chars

```
You travel. You're at a nice hotel. The lobby's quiet, the lounge is half-empty, and the only conversation you'll have today is with your phone.

InSuite is for the rest of the people who feel that. Solo travellers staying at the same property, in the same city, on the same day — quietly opting in to share a slot at the pool, gym, executive lounge, breakfast, spa, or a proper dinner.

— HOW IT WORKS —

1. Pick the hotel you're at, the venue you want company for, and a time slot. Add a one-line note if you like.

2. Other guests at hotels in the same city see your post in Discover. They request to join. You accept who you want.

3. Once you accept, a private chat opens. Confirm where to meet. That's it.

There are no public profiles open to the world. No follower count. No swipes. You appear only to other authenticated guests who happen to be in your city, and only on the activities you choose to post.

— WHO IT'S FOR —

Travellers who arrive somewhere with nothing on the calendar and would rather not eat dinner at the bar reading a book again. Business trippers between meetings. Solo holidaymakers who like company but not crowds. Loyalty-program regulars who treat lounges as their second living room.

If you've ever scanned a breakfast room thinking "I bet half these people would have said yes if I'd asked" — that's the room InSuite is trying to make.

— LUXURY-HOTEL FOCUS —

InSuite is scoped to luxury and upscale properties in major cities — Tokyo, Hong Kong, Taipei, Singapore, Seoul, Bangkok, Sydney, London, Paris, New York, and growing. If your hotel isn't yet in the catalog, suggest it from inside the app and we'll review.

— SAFETY AND PRIVACY —

- Apple Sign-In only. No passwords, no email forms.
- Email is auth-only — never displayed, never shared with other users.
- Block and report on every profile, every activity, every message.
- A human reviews every report within 24 hours.
- You're invisible to people you've blocked, and they're invisible to you.

— PRICING —

- First activity post is free, forever.
- Trip Pass — $2.99 for 14 days of unlimited posting. One-time, not a subscription.
- Refer a friend — both of you get a 7-day pass when they post their first activity.

No ads. No analytics SDKs watching what you tap. No personalised recommendation algorithm trying to maximise your time-in-app.

— A QUIET THING —

InSuite is small on purpose. The app does one thing: let solo guests at the same hotel find each other before the moment passes. We hope you only need to open it a few times per trip — and that each time, it works.

Welcome.
```

Length: ~2750 chars. Comfortably under 4000.

### Keywords — max 100 chars · comma-separated, no spaces

```
travel,solo,luxury,lounge,breakfast,gym,spa,dinner,social,meetup,traveler,concierge,jetlag,club
```

Length: 95. Word picks intentionally avoid duplicating words
already in the App Name (`InSuite`) or Subtitle (`hotel`, `dine`,
`alone`) — Apple indexes those automatically. Singular forms only
(Apple stems plurals).

Notable picks:
- `jetlag` — covers the night-arrival "can't sleep, anyone up?"
  search.
- `concierge` — proxy for luxury-hotel intent.
- `meetup` — competitive, but our exact use case.

### What's New in This Version — max 4000 chars

First submission:

```
First public release.

InSuite is a quiet way for solo guests at the same hotel to find company for the pool, the gym, breakfast, the lounge, the spa, or dinner. No follower count, no public profile, no algorithm — just the people staying where you're staying, on the day you're there.

Thanks for trying it. If something doesn't work the way it should, write to liphamju@gmail.com.
```

Length: ~430. Update each version with what changed; keep it
human, not changelog-style. ("Bug fixes and performance
improvements" is fine for tiny releases but reads as lazy on a
new product.)

---

## Screenshots checklist (separate workstream)

Apple requires screenshots for **6.7"** or **6.9"** iPhone display
size. Optional but worth including: **6.5"**, **5.5"**, iPad
**12.9"**.

Suggested 6-frame story (in order):

1. **Hero**: Discover feed with two or three nearby activities,
   showing the gold accent + the venue chips. Caption overlay:
   "Never dine alone in your hotel."
2. **Activity detail**: a real post with host avatar + note,
   "Request to join" button visible.
3. **Activity creation step 1**: hotel picker, demonstrating the
   "your hotel, your city" scoping.
4. **Activity creation step 2/3**: venue picker showing all 6
   icons.
5. **Chat thread**: warm two-bubble exchange, demonstrating that
   the messaging is real and activity-scoped.
6. **Plans / Pricing**: showing that Trip Pass is $2.99 one-time
   (counters the "is this a subscription trap" worry).

Generate via `scripts/gen-iap-screenshot.ps1` and friends — extend
or duplicate the script per frame as needed.

---

## Things to re-check before each submission

- App icon mark (currently a placeholder?) updated and in
  `assets/images/icon.png`.
- `app.json` `expo.version` and `expo.ios.buildNumber` bumped.
- This file's **What's New** rewritten for the actual changes.
- This file's **Promotional Text** considered — is there a launch
  beat (press, partnership, featured app) we want to lead with?
- Screenshots refreshed if any in-screen copy / colors changed.
- `docs/app-review-notes.md` cross-check (especially if a new
  surface needs Apple 1.2 narrative).
- `docs/privacy-manifest-draft.md` cross-check (especially if any
  data-collection or third-party-SDK changed).
