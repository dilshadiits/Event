# Usage Flows - Index

This folder documents **how the app is actually used**, end to end, by every role - not how the code is structured (see the root `CLAUDE.md` for that). Read this if you want to understand the full lifecycle of running a real event/fest on this platform, from the first login to the last certificate download.

The app has **three separate features** living side by side. They don't share data with each other (only the design system and a couple of utilities like QR/upload/PDF generation):

| Feature | What it's for | Doc |
|---|---|---|
| **Attendance & Check-in** | Single-session event registration, QR entry passes, gate check-in | [`02-attendance-flow.md`](./02-attendance-flow.md) |
| **Awards & Voting** | Audience-voted award ceremonies (Google sign-in, one vote per category) | [`03-awards-voting-flow.md`](./03-awards-voting-flow.md) |
| **Competitions / Fest** | Multi-program fests with teams, blind judging, chest numbers, live standings, certificates | [`04-fest-competition-flow.md`](./04-fest-competition-flow.md) |

Start here:

1. [`01-roles-and-access.md`](./01-roles-and-access.md) - every role in the app, what they can do, and how they log in.
2. [`04-fest-competition-flow.md`](./04-fest-competition-flow.md) - the big one. This is the newest and most involved feature (teams, judges, chest numbers, standings), and most likely what you want if you're running a college-fest-style event.
3. [`05-end-to-end-example.md`](./05-end-to-end-example.md) - a single worked example ("Founders' Day 2026") that walks through literally every step, in order, across every role, so you can see the whole thing as one story instead of a feature-by-feature reference.
4. [`06-environment-and-hidden-behavior.md`](./06-environment-and-hidden-behavior.md) - every environment variable the app reads, what breaks (or silently falls back to a default) when one's missing, and a list of real, pre-existing access-control gaps found while auditing this codebase. **Read this before deploying anywhere public.**
5. [`07-fresh-setup-and-full-test-checklist.md`](./07-fresh-setup-and-full-test-checklist.md) - a literal, step-by-step script for standing the app up from a totally empty database and exercising every feature and every role, in order. Use this to QA a fresh deployment or verify nothing's broken after a change.

## Quick orientation

- **Admin app access** (`/`, `/events/**`, `/awards/**`) is behind a single shared password (`PasswordGate`) - anyone with the password gets in. This is *not* per-user auth, just a UI gate to keep the general public out of the admin screens.
- **The Competitions module** (`/admin/competitions/**`, `/judge/**`, `/student/**`) has real, separate, per-person logins (Super Admin / Event Admin / Judge / Student), layered on top of the shared password gate - see [`01-roles-and-access.md`](./01-roles-and-access.md).
- **Public-facing pages** (`/register/[id]`, `/spot/[id]`, `/awards/[id]/vote`, `/vote/[eventId]`, `/results/[festId]`) need no login at all and are reachable by anyone with the link.
- **The shared password gate only protects pages, not the API routes behind them** - see [`06-environment-and-hidden-behavior.md`](./06-environment-and-hidden-behavior.md) for exactly what that means in practice.
- Every environment variable referenced anywhere in this app is documented in [`06-environment-and-hidden-behavior.md`](./06-environment-and-hidden-behavior.md), with a ready-to-copy template at [`.env.example`](../.env.example).
