# Environment Variables & Hidden Behavior

This is the "things that aren't obvious from clicking around the UI" doc — every environment variable the app reads, what happens when one is missing, and a handful of real gotchas found while auditing this codebase for hidden gates, default credentials, and unauthenticated endpoints. Some of these are genuine, pre-existing gaps worth knowing about before this app goes anywhere near production or a public network. A copy-pasteable template is at [`.env.example`](../.env.example) in the project root.

## Environment variables — full reference

| Variable | Required for | If missing |
|---|---|---|
| `MONGODB_URI` | Everything — the app can't touch the database without it | Every DB-backed request throws `Please define the MONGODB_URI environment variable` |
| `NEXTAUTH_SECRET` | Signing/verifying Competitions-module session tokens (Super Admin / Event Admin / Judge / Student) | Sessions can't be trusted; NextAuth will still run but with an insecure/unstable secret |
| `NEXTAUTH_URL` | NextAuth generating correct sign-in/callback URLs | NextAuth **guesses** the URL from the request, which gets it wrong in dev on a non-default port (this app runs on **4000**, not 3000 — see the "Found and fixed" section below) and can break Google OAuth callback matching entirely |
| `BOOTSTRAP_SECRET` | Creating the very first Super Admin account (one-time) | You can never create the first Super Admin — nobody can ever log into the Competitions module |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in on the Award **voting** page (`/awards/[id]/vote`) — this is a *voter identity check*, unrelated to admin login | The Google provider is registered with `undefined` credentials; anyone trying to sign in to vote gets an OAuth error |
| `FAST2SMS_API_KEY` | Sending the actual SMS for any phone+OTP flow — the legacy `/vote/[eventId]` page **and** the Student Portal login (`/student/login`) | `POST /api/otp` returns `500 SMS service not configured`. **As of this audit, this key is not set** — phone-OTP login does not currently deliver real SMS in this deployment |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | The shared password gate (`PasswordGate`) in front of `/`, `/events/**`, `/awards/**` | Falls back to **`admin` / `super123`** — hardcoded in `src/app/api/password/route.ts`. **Not currently overridden in this project's `.env`.** |
| `ADMIN_PHONE` | Legacy `/vote/[eventId]` flow only — a phone number matching this skips OTP entirely | Falls back to a **hardcoded phone number** baked into `src/app/api/otp/route.ts`. Not currently overridden. |
| `ADMIN_EMAIL` / `ADMIN_NAME` | Award voting (`/api/award-votes`) — grants 20x vote weight and unlimited voting | Falls back to `admin@example.com` / **`"admin"`**. Not currently overridden — see the security note below, this one is worth reading. |

None of `GOOGLE_CLIENT_ID/SECRET`, `FAST2SMS_API_KEY`, `ADMIN_USERNAME/PASSWORD`, `ADMIN_PHONE`, or `ADMIN_EMAIL/NAME` are set in this project's `.env` right now — everything in that list is currently running on its hardcoded default.

---

## Found and fixed during this audit

Two real, active problems were caught and corrected directly in `.env` — worth knowing about since they explain some odd behavior seen earlier in this project's testing (unexpected session drops, wrong sign-in URLs):

1. **`.env` had two different values for `NEXTAUTH_SECRET`.** A duplicate key silently gets resolved by "last one wins" — nothing errors, nothing warns, it just quietly uses whichever value happens to load last. Since the two values were different, any session token signed while one value was active would fail to validate once the other took over (this is the likely cause of a session going from valid to `{}` empty between two testing sessions). Fixed by removing the stale duplicate.
2. **`NEXTAUTH_URL` was never set**, and the app runs on port **4000** (`next dev -p 4000`), not NextAuth's assumed default of 3000. `GET /api/auth/providers` was returning `http://localhost:3000/...` sign-in URLs — harmless for the custom login pages in this app (they call `signIn()` client-side, which uses the real page origin regardless), but this **would** break Google OAuth for award voting, since Google validates the callback URL against what's registered in the Google Cloud Console. Fixed by setting it explicitly.

---

## Hidden gates & unauthenticated endpoints

These aren't bugs introduced by any recent work — they're pre-existing characteristics of how the app is built, surfaced here because "is this page protected?" turned out to have some non-obvious answers.

### `PasswordGate` only protects pages, never APIs
`PasswordGate` is a **client-side React component** — it decides whether to render a login form or your actual page based on a flag in `localStorage`. It never runs on the server and has no way to intercept a direct HTTP request. That means:

- Every API route under the Attendance and Awards features (`/api/events`, `/api/attendees`, `/api/awards`, `/api/categories`, `/api/nominees`, …) has **no server-side authentication of its own**. Anyone who knows or discovers the URL can call these directly (`curl`, a script, browser dev tools) and read or write data — attendee lists, event settings, award categories — without ever knowing the admin password. The password only stops someone from *seeing the UI*; it doesn't stop someone who skips the UI. *(This is a pre-existing characteristic already noted in the project's `CLAUDE.md`, repeated here because it's exactly the kind of thing worth being explicit about.)*
- This is a different situation from the Competitions module, whose API routes each independently check a real server-side session (`requireRole`/`requireFestAccess`) — those are properly protected regardless of what the frontend does.

### The Awards *admin* page is accidentally public
`PasswordGate`'s rule for "don't gate this path" is a blanket prefix match on `/awards/`. That was meant to exempt the public voting page (`/awards/[id]/vote`), but the match is broad enough that it also exempts `/awards/[id]` itself — which is the **admin** ceremony management screen (categories, nominees, branding, bulk publish/hide, PDF export). Anyone who has or guesses a ceremony's ID can open its full admin controls without ever entering the shared password. Only the ceremony **list** page (`/awards`, no trailing content) still requires it.

### `/api/upload` has no authentication at all
Any request to `POST /api/upload` gets accepted and written to `public/uploads/` on the server's local disk — no login, no rate limit, no file-size cap (just an image-mimetype check). Anyone with the URL can use this endpoint. Combined with the fact that this only works on a persistent filesystem in the first place (see `CLAUDE.md` re: serverless deployments), this is worth locking down before any public-facing deployment.

### `/api/password` has no rate limiting
The endpoint backing the shared admin login accepts unlimited attempts with no throttling or lockout. Since it's currently guarding the (also currently default) `admin`/`super123` credentials, this combination is worth fixing together.

### Award & legacy voting trust whatever identity the client claims
Neither `POST /api/award-votes` nor `POST /api/votes` checks a real server-side session — they simply record whatever `voterEmail`/`voterName` (or `voterPhone`) is in the request body. The Google sign-in / OTP verification on the *frontend* is a UX nicety, not something the vote-submission endpoint actually cross-checks. Practically, this means:
- The "one vote per category" limit is only as strong as trusting the client not to submit a different email each time — someone scripting requests directly can vote repeatedly under fabricated identities.
- Because of the `ADMIN_EMAIL`/`ADMIN_NAME` default noted above, **anyone who submits a vote with `voterName: "admin"` gets the 20x weight and unlimited-voting bypass**, with no actual admin credentials required — the check only compares the submitted name string, not who's actually authenticated.

### Rate limiting is narrow, in-memory, and per-process
`checkRateLimit` (10 requests/min/IP by default) is only wired up on two endpoints: attendee self-registration and invite-code creation. Nowhere else in the app uses it. It's also a plain in-memory `Map` — it resets on every server restart and won't coordinate correctly across multiple server instances if this is ever deployed behind a load balancer or as multiple serverless function instances.

---

## None of this affects the Competitions module's own auth

Everything above is about the **original two features** (Attendance/QR and Awards/Voting) and the shared password gate in front of them. The Competitions module (Fests/Teams/Programs/Judges/Standings) added later has its own, separately-verified session-based auth on every API route — see [`01-roles-and-access.md`](./01-roles-and-access.md) for how that one works, and none of the gaps above apply to it.
