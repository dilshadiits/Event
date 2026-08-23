# Roles & Access

There are **two independent auth layers** in this app. Don't confuse them.

## Layer 1 - the shared admin password (whole app)

`PasswordGate` wraps every page. A visitor enters one shared username/password (`ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, default `admin`/`super123` - **not currently overridden in this project**) and gets a `localStorage` flag that unlocks the admin screens for `/`, `/events/**`, `/awards/**`. It is **not** per-person - everyone who knows the password looks identical to the app. A handful of paths are explicitly excluded from this gate because they're meant to be public (registration links, voting links, results pages, and everything under the Competitions module, which has its own real login instead).

This gate is purely client-side (a `localStorage` flag, checked in the browser) - it doesn't protect anything on the server, and one of its "public" path rules is broader than it looks (the Awards *admin* screen, not just the public vote page, ends up exempted). Full details, plus every other hidden default/gap found in this codebase, are in [`06-environment-and-hidden-behavior.md`](./06-environment-and-hidden-behavior.md) - worth a read before this ever goes anywhere public.

## Layer 2 - real per-person logins (Competitions module only)

Only `/admin/competitions/**`, `/judge/**`, and `/student/**` use actual accounts (the `User` model + NextAuth sessions). Four roles:

| Role | Logs in at | Scope | Can do |
|---|---|---|---|
| **Super Admin** | `/admin/competitions/login` | Everything | Create/manage any Fest, create Event Admins and Super Admins, everything an Event Admin can do, for every fest |
| **Event Admin** | `/admin/competitions/login` | One or more specific fests (`festIds` on their account) | Manage teams/participants/programs/judges/standings/certificates *only* for the fest(s) they're scoped to. Can create **Judge** accounts (not other admins), scoped to their own fests |
| **Judge** | `/judge/login` | Only the specific programs they're assigned to (`Program.judgePanel`) | See their scoring worklist, submit/edit scores until judging closes for that program. **Never sees participant/team names** - only chest numbers |
| **Student / Participant** | `/student/login` (phone + OTP, no password) | Only their own data | View their own schedule, chest numbers, check-in status, and results once published. Cannot self-register - an admin must provision the login first |

### How each role signs in

- **Super Admin / Event Admin / Judge** - email + password (`admin-credentials` provider). Accounts are created by a Super Admin (or an Event Admin, for Judges only) via `/admin/competitions/[festId]/judges` or a direct `POST /api/users` call.
- **Student** - phone number + a 6-digit OTP code (`student-otp` provider), the same OTP mechanism used elsewhere in the app. There is **no self-registration**: an Event Admin must first import the participant into the roster and click **"Enable Login"** on the Participants page, which creates the login tied to that participant's phone number.

### The very first account (bootstrapping)

Before anyone exists, there's no one to log in as. The very first Super Admin is created via a one-time bootstrap: a `POST /api/users` request with `role: "super-admin"` and a `bootstrapSecret` matching the `BOOTSTRAP_SECRET` environment variable. This only works while **zero** Super Admins exist - after the first one is created, every subsequent account creation requires a real Super Admin session.

### Blind judging, precisely

This is the one access rule worth calling out on its own: **no API response that a Judge's browser receives ever contains a participant or team name.** The judge's worklist (`GET /api/programs/[id]/judge/entries`) returns chest numbers and criteria only. Names only ever appear in Admin-facing, Student-facing (their own data), or public post-results views. This is enforced at the API layer, not hidden in the UI - so it holds even if someone inspects network traffic.

### Public, unauthenticated pages

No login of any kind is needed for:
- `/register/[id]`, `/spot/[id]` - event registration
- `/awards/[id]/vote` - award voting (this one asks for Google sign-in as a *voter identity* check, separate from the admin/judge/student system above)
- `/vote/[eventId]` - the legacy phone-based voting flow
- `/results/[festId]` and `/results/[festId]/programs/[programId]` - fest results, but **only once an admin has explicitly flipped the fest's "Results are Public" toggle**. Before that, these pages show a "not public yet" message to everyone, admin included (admins see the real data through their own logged-in Standings page instead).
