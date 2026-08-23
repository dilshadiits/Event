# Fresh Setup & Full Feature Test Checklist

A literal, step-by-step script for taking this app from **zero** - a brand new database, no `.env`, nothing installed - through a complete pass of every feature and every role. Follow it top to bottom on a throwaway/test database. Each step says what to do and what you should see; if what you see doesn't match, stop and look there before continuing (later steps assume earlier ones worked).

This is a checklist, not a tutorial - for the *why* behind any given screen, see the other docs in this folder ([`README.md`](./README.md) is the index). For what every env var does and a list of known gaps, see [`06-environment-and-hidden-behavior.md`](./06-environment-and-hidden-behavior.md) - read that once before you start, since several steps below exist specifically to work around defaults described there.

---

## Part A - Fresh Setup

### A.1 Prerequisites

- [ ] Node.js installed (whatever version this repo's `package.json`/lockfile targets).
- [ ] A MongoDB database you're OK wiping - either a fresh MongoDB Atlas cluster (with your IP allow-listed under Network Access) or a local `mongod`. **Use a database nobody else depends on** - this checklist creates and deletes real documents in it.
- [ ] *(Optional, only if you intend to test Google-based Award voting)* A Google OAuth app with a Client ID/Secret, redirect URI set to `http://localhost:4000/api/auth/callback/google`.
- [ ] *(Optional, only if you intend to test real SMS delivery)* A Fast2SMS API key. Without one, OTP flows (legacy phone voting, Student Portal login) can still be tested by inserting the OTP code directly into the database instead of receiving a real text - see A.5 and Part B, Section VI.

### A.2 Install

```bash
git clone <this repo>
cd Event
npm install
```

### A.3 Configure environment

- [ ] Copy the template: `cp .env.example .env`
- [ ] Fill in `MONGODB_URI` with your fresh database's connection string.
- [ ] Generate real secrets rather than leaving placeholders:
  ```bash
  openssl rand -base64 32   # → NEXTAUTH_SECRET
  openssl rand -hex 16      # → BOOTSTRAP_SECRET
  ```
- [ ] Set `NEXTAUTH_URL=http://localhost:4000` (must match the port `npm run dev` actually uses - this repo runs on **4000**, not the Next.js default of 3000).
- [ ] Set your own `ADMIN_USERNAME` / `ADMIN_PASSWORD` - don't leave these unset, or the shared admin gate falls back to the well-known `admin`/`super123` default (see [`06`](./06-environment-and-hidden-behavior.md)).
- [ ] Leave `GOOGLE_CLIENT_ID/SECRET` and `FAST2SMS_API_KEY` blank for now unless you completed the optional prerequisites above - the checklist below has a fallback path for both.

### A.4 First boot

```bash
npm run dev
```
- [ ] Open `http://localhost:4000/` - you should see the `PasswordGate` login screen ("Event QR Manager - Enter credentials to continue"), **not** the dashboard. This confirms the app is serving pages and the shared-password gate is active.
- [ ] Log in with the `ADMIN_USERNAME`/`ADMIN_PASSWORD` you set in A.3. You should land on an **empty** Events dashboard (no events listed) - confirms the database connection works and it's genuinely fresh.

### A.5 Bootstrap the first Super Admin

The database has zero users, so nobody can sign into the Competitions module yet. Create the first Super Admin with a direct API call, using the `BOOTSTRAP_SECRET` from A.3:

```bash
curl -s -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "you@yourdomain.com",
    "password": "choose-a-real-password",
    "role": "super-admin",
    "bootstrapSecret": "<paste BOOTSTRAP_SECRET from .env>"
  }'
```
- [ ] Response should be `201` with `{"id": "...", "role": "super-admin", ...}`.
- [ ] Repeat the same call *without* changing anything - it should now be **rejected** (a Super Admin already exists, so the bootstrap exception no longer applies; further account creation requires an authenticated Super Admin session).
- [ ] Go to `/admin/competitions/login` and sign in with the email/password you just created. You should land on an empty Fest list.

Setup is done. Everything below assumes you're signed in as this Super Admin unless a step says otherwise.

---

## Part B - Full Feature Test Checklist

Go through these in order - later sections (especially IV) build on data created in earlier ones.

### Section I - Shared admin password gate

- [ ] Open a private/incognito window, hit `/`, confirm the login screen reappears (proves the gate is per-browser via `localStorage`, not a real session).
- [ ] Try `/events/nonexistent-id` and `/awards` while logged out - both should be gated too.
- [ ] Try `/register/anything`, `/spot/anything`, `/vote/anything`, `/results/anything` while logged out - all four should load **without** the password screen (they're intentionally public).

### Section II - Attendance & Check-in

*(As Admin, logged in via the shared password)*

- [ ] Create an Event (`/`) - give it a name and date.
- [ ] Open the event, use **Form Settings** to enable a couple of custom fields (e.g. a text field "T-Shirt Size").
- [ ] Under **Event Settings**, upload an entry-pass template image.
- [ ] Copy the registration link.
- [ ] Generate an invite link and copy it separately.

*(As a member of the public, no login)*
- [ ] Open the registration link in a new incognito tab, fill out the form (including your custom field), submit. Confirm you land on a page showing a QR code / entry pass with your name on the template.
- [ ] Try submitting the same form 11 times in under a minute from the same tab - the 11th should be rate-limited (`429`).
- [ ] Open `/spot/[eventId]` and submit a second, different registration - this simulates a walk-in registered by staff.

*(Back as Admin)*
- [ ] On the event page, confirm both new attendees appear (it polls every 5s, or hit refresh).
- [ ] Edit one attendee's details, confirm the change sticks.
- [ ] Click the QR icon on an attendee to view/download their entry pass again.
- [ ] Click **All QR** to bulk-generate every attendee's pass.
- [ ] Click **PDF** to export the attendee list.
- [ ] Click **Stop Registration** - confirm the dialog, then confirm seat numbers get assigned to everyone.

*(Check-in)*
- [ ] Open `/scan?eventId=<id>` on a phone (or a second browser tab with camera access). Scan one attendee's QR (display it on another screen, or use the downloaded PNG). Confirm a green "Access Granted" screen with their name and seat number.
- [ ] Scan the **same** code again - confirm a blue "Already Checked In" screen with a timestamp, not an error.
- [ ] Scan a QR that doesn't belong to this event (e.g. from a different event you create) - confirm a red "Access Denied" screen.

### Section III - Awards & Voting

*(As Admin)*
- [ ] At `/awards`, create an Award Ceremony - name, description, upload a header banner.
- [ ] Add two Categories.
- [ ] Add at least two Nominees per category (name + photo).
- [ ] Copy the public voting link.

*(As a voter, Google sign-in required)*
- [ ] Open the voting link in an incognito tab, sign in with a Google account, vote in both categories.
- [ ] Try voting again in the same category with the same account - confirm it's rejected as a duplicate.
- [ ] If you have a second Google account handy, vote with it too, to see more than one vote registered.

*(Admin-weight check - optional, only if you set `ADMIN_EMAIL`/`ADMIN_NAME` in `.env`)*
- [ ] Vote using the Google account matching `ADMIN_EMAIL` (or whose Google display name matches `ADMIN_NAME`). Confirm this vote is **not** blocked as a duplicate even on a repeat attempt, and check the category's vote count jumps by 20 rather than 1 once results are shown.

*(Back as Admin)*
- [ ] Toggle **Show Results** on one category, confirm the leaderboard becomes visible to voters mid-vote.
- [ ] Use the bulk stop/start voting toggle, confirm categories go inactive/active together.
- [ ] Export the winners PDF.

*(Legacy phone-voting flow, optional)*
- [ ] Open `/vote/[eventId]` for an Event that has Attendees (from Section II). Request an OTP.
  - If `FAST2SMS_API_KEY` isn't set: `POST /api/otp` will return `500 SMS service not configured` - this is expected. To proceed anyway, insert an OTP record directly:
    ```bash
    # in a mongo shell / Compass / a quick node script against your MONGODB_URI:
    db.otps.insertOne({ phone: "<10-digit phone>", code: "123456", expiresAt: new Date(Date.now()+5*60*1000), verified: false, createdAt: new Date() })
    ```
  - Verify with that code, then submit a vote for an Attendee. Confirm a duplicate vote from the same phone in the same category is rejected.

### Section IV - Competitions / Fest module

This is the big one - see [`04-fest-competition-flow.md`](./04-fest-competition-flow.md) for the narrative version of everything below.

#### IV.1 - Setup (Super Admin)

- [ ] At `/admin/competitions/new`, create a Fest.
- [ ] *(Optional, tests delegation)* Create an Event Admin account scoped to this fest:
  ```bash
  curl -s -X POST http://localhost:4000/api/users \
    -H "Content-Type: application/json" -b <your session cookie> \
    -d '{"name":"Event Admin","email":"eventadmin@test.local","password":"testpass123","role":"event-admin","festIds":["<festId>"]}'
  ```
  Sign in as this account in a separate browser profile and confirm they only see this one fest at `/admin/competitions`, and cannot see or create *other* fests.
- [ ] Create at least 2 Teams.
- [ ] Add at least 6 Participants - try both the manual add form **and** the bulk Excel import (columns: `Name, Team, Email, Phone`). Assign some to teams, leave at least one unassigned (to later confirm unassigned participants still rank individually but don't add team points).
- [ ] Create at least one Judge account with an email/password.
- [ ] Create at least two Programs: one `solo`/`stage`, one `team`/`off-stage`. Give each at least 2 judging criteria with different max scores and weights via the Criteria Builder.
- [ ] On each program's detail page, assign the Judge to the panel.
- [ ] Enroll entries: for the solo program, add several Participants; for the team program, add both Teams.
- [ ] Click **Shuffle Chest Numbers** on each program. Confirm every entry gets a unique code, and that the *same* participant (if entered in both programs) gets a *different* chest number in each.
- [ ] On the Participants page, click **Enable Login** for at least one participant who has a phone number - confirms the "Login enabled" badge appears and the button disappears for them.

#### IV.2 - Live judging day

*(Check-in)*
- [ ] Open the solo program's `/admin/competitions/[festId]/programs/[id]/scan` page and scan (or manually POST) each entry's chest-card QR. Confirm the on-page total/checked-in/no-show counts update.
- [ ] Re-scan one already-checked-in entry - confirm "Already Checked In" with a timestamp, not an error.

*(Judging - sign in as the Judge account, not the Admin)*
- [ ] At `/judge/login`, sign in.
- [ ] On `/judge`, confirm you see only the program(s) you were assigned to, with a "0/N scored" counter.
- [ ] Open the scoring page. **Confirm you only ever see chest numbers - never a participant or team name, anywhere on this screen.**
- [ ] Score one entry, submit. Confirm the counter updates and the entry shows as scored.
- [ ] Try submitting a score missing one criterion, or with a value above its max - confirm both are rejected with a clear message.
- [ ] Resubmit a score for the same entry with different values - confirm it updates in place (check the admin's entries view afterward shows one score, not two).
- [ ] Score every entry in the program.

*(Live standings preview - back as Admin)*
- [ ] Open `/admin/competitions/[festId]/standings` **before** closing/publishing anything. Confirm team points are already showing, each contributing program labeled "(preview)".

*(Close & publish)*
- [ ] On the program detail page, click **Close Judging**. As the Judge, confirm the scoring page now refuses new/edited submissions.
- [ ] Click **Publish Results**. Confirm entries now show a rank, and that ties (if you engineered any equal scores) share a rank with the next place skipping ahead (e.g. 1, 2, 2, 4).
- [ ] Repeat close → publish for the second program.
- [ ] Back on Standings, confirm the same programs' contribution is now labeled as official (no longer "(preview)"), and the point totals match your configured points scheme.

#### IV.3 - Results & public visibility

- [ ] On the Standings page, confirm `/results/[festId]` returns "not public yet" in a separate incognito tab **before** you flip the toggle.
- [ ] Flip **"Results are Public."**
- [ ] Reload `/results/[festId]` in the incognito tab - no login - confirm the live standings now render.
- [ ] Open `/results/[festId]/programs/[programId]` for a published program - confirm the ranked list with real names is visible.

#### IV.4 - Student portal

- [ ] Sign out of everything. At `/student/login`, enter the phone number of the participant you enabled login for in IV.1.
  - If `FAST2SMS_API_KEY` isn't set, sending will fail - insert the OTP directly as in Section III's fallback, then enter that code.
- [ ] Confirm you land on `/student` showing their name, team, and every program they're entered in with schedule/venue/chest number.
- [ ] Confirm `/student/results` shows their rank for any program you've published, and nothing for ones you haven't.

#### IV.5 - Certificates & posters

*(Back as Admin)*
- [ ] At `/admin/competitions/[festId]/certificates`, upload a certificate template image and a poster template image, save.
- [ ] Pick a published program from the dropdown.
- [ ] Click **Generate All Certificates** - confirm one PNG downloads per ranked entry, with their name/program/placement visibly composited onto the template.
- [ ] Click **Download Poster** - confirm one PNG downloads listing the top 3 for that program.

### Section V - Auth boundary spot-checks

Quick negative tests worth running once, since they're easy to silently break in future changes:

- [ ] Signed out entirely: `GET /api/fests`, `GET /api/programs?festId=...`, `GET /api/student/me` all return `403`.
- [ ] Signed in as **Judge**: hitting an Admin-only endpoint (e.g. `POST /api/fests`) returns `403`.
- [ ] Signed in as **Judge**, but not on a given program's panel: `GET /api/programs/[id]/judge/entries` for that program returns `403`.
- [ ] Signed in as **Student**: hitting `/api/judge/programs` or any Admin route returns `403`.
- [ ] Signed in as **Event Admin** scoped to Fest A: try to access Fest B's data (a fest they weren't given `festIds` access to) - confirm `403`.

### Section VI - Cleanup

Since everything above ran against a real database:
- [ ] Delete test Fests/Events/Ceremonies through the UI where possible (note: entries/scores block deletion by design once judging has started - see [`04-fest-competition-flow.md`](./04-fest-competition-flow.md) - you may need to remove entries first, or just leave a clearly-named test fest in place rather than fighting the guardrails).
- [ ] If you inserted any OTP records directly into the database as a Fast2SMS workaround, they self-expire after 5 minutes and don't need manual cleanup.
- [ ] Rotate or delete the Super Admin credentials you bootstrapped in A.5 if this was ever anything other than a fully throwaway database.

---

Reaching the end of this checklist with every box checked means every role (Super Admin, Event Admin, Judge, Student, and the unauthenticated Public) has exercised every feature in this app at least once, starting from nothing.
