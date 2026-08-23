---
description: Scaffold a new Next.js API route following this repo's conventions
---

Add a new API route for: $ARGUMENTS

Follow the existing conventions in this codebase exactly:

1. **Model** (if new data is involved): add the Mongoose schema to `src/models/index.ts`, guarded with `mongoose.models.X || mongoose.model('X', XSchema)`. Add indexes for any field that will be queried or used for uniqueness.
2. **Validation**: add a Zod schema to `src/lib/validate.ts` (creation and, if the route supports updates, a separate `update*Schema` with fields made optional). Use `isValidObjectId` for any raw ID coming from the client before querying Mongoose.
3. **Route handler**: create `src/app/api/<path>/route.ts`. Wrap handlers in `withErrorHandler` from `src/lib/api-utils.ts`. Use `successResponse`/`errorResponse` for all responses - never return raw `NextResponse.json` in a new route unless matching an existing route's established pattern. Call `dbConnect()` (from `src/lib/mongodb.ts`) before any DB access.
4. **Public vs admin-gated**: if this route backs a page under `/awards/`, `/vote/`, `/spot/`, or `/register/`, remember the frontend `PasswordGate` (`src/components/PasswordGate.tsx`) already treats those as public - the route itself has no auth, so add rate limiting (`checkRateLimit` in `api-utils.ts`) for anything mutating or user-facing without OTP/session auth.
5. Do not add tests unless asked - this repo has no test runner configured.

After scaffolding, run `npm run lint` and fix any issues before finishing.
