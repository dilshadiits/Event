---
description: Scaffold a new App Router page following this repo's conventions
---

Add a new page for: $ARGUMENTS

Follow the existing conventions in this codebase:

1. Place it under `src/app/<route>/page.tsx` (use `[id]` / `[eventId]`-style dynamic segments matching the existing routes in `src/app/`, e.g. `src/app/awards/[id]/page.tsx`).
2. Decide whether this page is **admin-gated** or **public voter-facing**. Public routes (voting links, registration, spot pages, QR check-in) must be reflected in `PUBLIC_ROUTES`/`isPublicRoute` in `src/components/PasswordGate.tsx`, or the admin login screen will block real users. Admin-only pages need no change there.
3. Reuse existing shared components from `src/components/` where possible (`FormBuilder`, `Scanner`, `QRCodeModal`, `AwardCategoryManager`, `EditAttendeeModal`) rather than duplicating logic.
4. For any data fetching, call the corresponding `/api/...` route (add one first via `/new-api-route` if it doesn't exist) - don't query Mongoose directly from a client component.
5. Match the existing Tailwind styling conventions (dark theme, `bg-card`/`bg-muted`/`border-border` tokens, gradient purple/pink accents) visible in `PasswordGate.tsx` and other components.

After scaffolding, run `npm run lint` and fix any issues before finishing.
