# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 16 (App Router) event management app: attendee registration/QR check-in, an award/nomination voting system, and Excel-based recipient/invite generation. MongoDB (via Mongoose) is the datastore.

## Commands

```bash
npm run dev     # starts dev server on port 4000 (not 3000 - see package.json)
npm run build   # next build
npm run start   # next start (production)
npm run lint    # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured in this repo (no `test` script, no test files). If asked to add tests, ask the user which framework they want before introducing one.

`generate_test_excel.js` is a standalone Node script (not part of the app) for producing `test_recipients.xlsx`-style fixtures for the award-recipient upload flow.

## Environment variables

No `.env.example` is committed. Based on usage in code, the app expects:
- `MONGODB_URI` - required; connection throws if unset (`src/lib/mongodb.ts`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` - Google OAuth via NextAuth (`src/app/api/auth/[...nextauth]/route.ts`)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` - admin login gate, default to `admin`/`super123` if unset (`src/app/api/password/route.ts`)
- `ADMIN_PHONE` - bypasses OTP for this phone number, defaults to a hardcoded number (`src/app/api/otp/route.ts`)

## Architecture

### Two parallel domains sharing one DB layer

This app is really two features glued together, both defined in `src/models/index.ts`:

1. **Attendance/registration** - `Event` → `Attendee` (+ `InviteCode`). Attendees register for an `Event` via a dynamic `formConfig` (array of field defs with type/required/options), get QR-coded, and are checked in via `/api/scan`. Guests attached to an attendee (`guest_names`) have their own QR check-in path, distinguished by scan-data format (`{id}-GUEST-{n}` legacy or `{id}_guest_{name}`).
2. **Awards/voting** - `AwardEvent` → `AwardCategory` → `Nominee`/`Vote`, plus a separate `AwardRecipient` (Excel-uploaded, token-based, for a claim/redemption flow distinct from voting). Note `Vote.nomineeId` refs `Attendee`, not `Nominee` - nominees for voting are drawn from the attendance side; `Nominee`/`AwardRecipient` are a separate, newer sub-system for award ceremonies.

All models use `mongoose.models.X || mongoose.model(...)` guards (required under Next.js hot reload / serverless re-invocation to avoid "model already compiled" errors) - follow this pattern for any new model.

### Request flow

Every API route follows: `dbConnect()` (cached global connection, `src/lib/mongodb.ts`) → Zod-parse the body against a schema in `src/lib/validate.ts` → Mongoose query → response via `successResponse`/`errorResponse` from `src/lib/api-utils.ts`. Newer routes wrap the whole handler in `withErrorHandler` (catches `ZodError` and generic errors uniformly, hides internal error messages outside dev); older routes (e.g. `scan`) do manual try/catch. Prefer `withErrorHandler` for new routes.

`isValidObjectId` (in `validate.ts`) must gate any raw ID from a client before it hits Mongoose - routes return a soft `successResponse({success:false, message})` for bad QR/ID input rather than a 400, since the scanner UI expects a 200 with a message to display, not an exception.

### Auth model - two separate, unrelated systems

- **Admin app access**: `PasswordGate` (`src/components/PasswordGate.tsx`) wraps the whole app client-side, checking `localStorage` (`admin_session_v2`) against `/api/password`. This is a UI gate, not real auth - anyone hitting an API route directly bypasses it. Routes under `/awards/*`, `/vote/*`, `/spot/*`, `/register/*` are public (see `PUBLIC_ROUTES`/`isPublicRoute`) and intentionally skip the gate.
- **Voter identity**: phone-based OTP (`/api/otp`, `OTP` model with TTL index) or Google OAuth via NextAuth, depending on the voting flow. `Vote` stores `voterPhone` and/or `voterEmail` with compound indexes to prevent duplicate votes per category.

When adding a new page, decide up front which bucket it's in (admin-gated vs public voter-facing) and update `PUBLIC_ROUTES`/`isPublicRoute` accordingly - this logic is pathname-based and easy to get wrong for nested routes.

### File uploads

`/api/upload` writes directly to `public/uploads/` on the local filesystem (`fs/promises`). This does not work on serverless/read-only deployments (e.g. Vercel) - if deploying there, this needs to move to object storage (S3/R2/Cloudinary) before it will function.

### Frontend structure

`src/app/` is the Next.js App Router tree - page routes are colocated with their route segment (e.g. `awards/[id]/vote/page.tsx`). `src/components/` holds shared client components (`FormBuilder` for the dynamic registration form editor, `Scanner` for QR scanning, `QRCodeModal`, `AwardCategoryManager`, `EditAttendeeModal`). There's no separate `hooks/` or `utils/` directory yet - utility logic lives in `src/lib/`.
