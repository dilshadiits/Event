# Awards & Voting Flow

This is **audience voting** — a popularity contest where anyone with the link picks a favorite per category. It is *not* the same thing as the Competitions module's judge scoring (see [`04-fest-competition-flow.md`](./04-fest-competition-flow.md)) — no chest numbers, no blind judging, no teams. If you want expert judges scoring performances, you want that doc instead.

Admin screens here are behind the shared admin password. Voters authenticate with Google sign-in.

## 1. Set up the ceremony (Admin)

1. At `/awards`, create an **Award Ceremony** (`AwardEvent`) — name, description, header banner image, up to 10 sponsor logos (one can be flagged as the "Digital Media Sponsor" for special placement).
2. Open the ceremony (`/awards/[id]`) and create **Categories** (e.g. "Best Newcomer") — each can be toggled active/inactive and has its own "show results" flag.
3. Add **Nominees** to each category — name, photo, short description. Nominees can be reordered within a category.
4. Optionally upload an entry-pass-style template if you're issuing physical passes tied to this ceremony too.

## 2. Voting opens (Public)

- Share the voting link: `/awards/[id]/vote`.
- Voters sign in with **Google OAuth** — this is just an identity check to prevent duplicate votes, not an admin login.
- The UI presents one category at a time (swipe/step through), each showing its nominees; the voter picks one and moves to the next category.
- One vote per Google account per category — a repeat attempt is rejected.
- The admin's own Google account gets a **20x vote weight** automatically if they vote (useful for tie-breaking or admin-endorsed picks) and bypasses the duplicate-vote check.
- If a category has **"show results"** turned on, voters see a live leaderboard for that category as they vote.

There's also a **separate, older parallel flow** at `/vote/[eventId]`, which votes for `Attendee` records (people who registered for an *Event*, not `Nominee` records) using phone-number identity instead of Google sign-in. It still works but is a legacy path — new ceremonies should use the `/awards/[id]/vote` flow above.

## 3. Running the ceremony (Admin)

- The admin ceremony page polls live results every 5 seconds — vote counts, ranking, top-3 crown/medal treatment.
- Bulk actions: publish/hide results, or stop/start voting, across all categories at once.
- Export a **PDF of winners** once you're ready to announce.

That's the loop: create ceremony → add categories & nominees → share the vote link → watch live results → export/announce winners.
