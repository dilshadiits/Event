# Worked Example: "Founders' Day 2026"

A single concrete story, walking through every step in order, across every role, using the Competitions/Fest feature (the most involved one — see [`04-fest-competition-flow.md`](./04-fest-competition-flow.md) for the reference version of this same flow). Names and data are made up; the steps and screens are real.

---

**Two weeks before the event**

Priya is the event coordinator. Someone already gave her the shared admin password for the app, and the very first Super Admin account was bootstrapped for her: `priya@college.edu`.

1. She signs in at `/admin/competitions/login`.
2. She creates a Fest: **"Founders' Day 2026"**, Feb 20–21.
3. She's not running this alone — she creates an Event Admin account for her colleague Rahul, scoped to just this fest, so he can help without being able to touch any *other* fest that might exist later.
4. Together they build the roster at `/admin/competitions/.../teams`: four house teams — **Red, Blue, Green, Gold**.
5. They import 120 students from an Excel sheet (Name, Team, Email, Phone columns) at `/admin/competitions/.../participants`.
6. They create five programs: *Solo Singing* (solo, stage), *Group Dance* (team, stage), *Quiz* (team, off-stage), *Debate* (solo, stage), *Poster Making* (solo, off-stage). Each gets its own judging criteria — Solo Singing gets "Voice" (max 10, weight 1) and "Stage Presence" (max 10, weight 2).
7. They create four judge accounts — one external judge per stage program, and the college's quiz master for Quiz.
8. For each program, they pick which students/teams are entered and click **Shuffle Chest Numbers**. Solo Singing has 24 entries; each gets a random two-digit code. A student who's *also* entered in Debate gets a *different* code there — nobody can pattern-match "chest #12" across two different judging rooms.
9. For the 40-ish students who gave a phone number, Rahul clicks **Enable Login** next to each on the Participants page, so they can check their own schedule later.

---

**Morning of the event**

10. At the Solo Singing venue, a volunteer opens `/admin/competitions/.../programs/.../scan` on a tablet and scans each singer's printed chest card as they check in backstage. The program page shows "18/24 checked in" live.
11. Meanwhile, a student named Ananya opens `/student/login`, enters her phone number, gets a 6-digit code by SMS, and signs in. She sees: *Solo Singing — Chest #47 — 10:30 AM, Auditorium* and *Debate — Chest #12 — 2:00 PM, Seminar Hall*. No results yet, since nothing's been judged.
12. The two hired judges for Solo Singing sign in at `/judge/login`. Each sees the program on their `/judge` list with "0/24 scored." Neither of them ever sees a single student's name — only "Chest #47," "Chest #03," and so on, alongside the two criteria they're scoring.
13. As each singer performs, a judge taps that chest number, scores Voice and Stage Presence, hits submit. The running "X/24 scored" ticks up for both of them independently.
14. Priya, watching `/admin/competitions/.../standings` on her laptop between programs, sees Red and Gold pulling ahead in a **live preview** — clearly marked as a preview, since nothing's published yet.

---

**Early afternoon**

15. Solo Singing finishes. Priya clicks **Close Judging** on that program — the two judges' apps immediately stop accepting new scores.
16. She clicks **Publish Results**. The system averages each singer's two judge scores, ranks them (nobody tied this time), and locks it in. First place: chest #47 — which, now that judging's over, the results screen finally reveals was Ananya.
17. Ananya's own `/student/results` page now shows *Solo Singing — Rank #1* — she finds out from her own phone, same as anyone would from a results board.
18. This repeats for Group Dance, Quiz, and Poster Making over the course of the day, each following the same close → publish rhythm. Debate is still ongoing.

---

**End of day, results announcement**

19. With every program published, Priya goes to the Standings page and flips **"Results are Public."**
20. She posts the link `college.edu/results/<festId>` in the group chat. Anyone — parents, students, no login required — opens it and sees the live house standings: Red 142, Gold 138, Blue 95, Green 80, crown icon next to Red.
21. Someone clicks through to the Solo Singing program specifically and sees the full ranked list with real names, now that it's official.
22. Priya uploads a certificate template (a nice bordered design with blank space for a name) and a poster template to the Certificates page. For each of the five programs, she clicks **Generate All Certificates** — a personalized PNG downloads for every placed student, their name and rank composited right onto the template — and **Download Poster** once, getting a single "Top 3" graphic per program to print and pin on the notice board.

---

That's the entire lifecycle, one story: setup (roster, programs, criteria, judges, chest numbers) → live judging day (check-in, blind scoring, live preview standings) → publish (per program) → go public (fest-wide) → certificates. Every step above maps to a numbered step in [`04-fest-competition-flow.md`](./04-fest-competition-flow.md) if you want the generic, role-by-role reference version instead of this narrative.
