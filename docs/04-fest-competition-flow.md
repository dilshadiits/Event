# Competitions / Fest Flow

This is the full lifecycle for running a multi-program competitive fest - team houses, solo/team programs, expert judges, blind chest-number judging, live championship standings, and auto-generated certificates. Think college arts fest, tech fest, inter-house competition day.

Read [`01-roles-and-access.md`](./01-roles-and-access.md) first if you haven't - this doc assumes you know the four roles (Super Admin, Event Admin, Judge, Student).

The lifecycle has three phases: **Setup** (before the event) → **Live** (judging day) → **Results** (after judging, ongoing until the fest wraps).

---

## Phase 1 - Setup (Super Admin / Event Admin)

### 1.1 Get logged in
- If this is the very first use of the system, bootstrap the first Super Admin account (a one-time API call gated by the `BOOTSTRAP_SECRET` env var - see [`01-roles-and-access.md`](./01-roles-and-access.md)).
- Sign in at `/admin/competitions/login`.

### 1.2 Create the Fest
- `/admin/competitions/new` - name, description, start/end dates.
- This is the top-level container everything else (teams, participants, programs) belongs to. A Super Admin can run multiple Fests; an Event Admin only sees the ones they're scoped to.
- (Optional, but recommended before results day) Configure the **points scheme** - how many championship points 1st/2nd/3rd place are worth (default `1st=10, 2nd=7, 3rd=5`), and whether team-type programs should award extra via a **team points multiplier**. These live on the Fest and get used automatically once results start publishing.

### 1.3 (Super Admin only) Delegate access
- If someone else is running this fest day-to-day, create them an **Event Admin** account (`POST /api/users`, role `event-admin`, scoped via `festIds` to this fest). They'll get the same admin screens but only for their assigned fest(s).

### 1.4 Build the roster
- `/admin/competitions/[festId]/teams` - create Teams (houses/colors/departments - whatever the competing groups are called). Each gets a name, short code, and a color used throughout the UI.
- `/admin/competitions/[festId]/participants` - add Participants one at a time, or **bulk import via Excel** (columns: Name, Team, Email, Phone). Assign each to a Team (or leave unassigned for a fest that's individual-only).

### 1.5 Create Judge accounts
- `/admin/competitions/[festId]/judges` - create a login (email + password) for each judge. These accounts only ever see the programs they're later assigned to, and never see participant names.

### 1.6 Define the Programs
For each competition item (a program):
- `/admin/competitions/[festId]/programs/new` - name, **type** (`solo` or `team`), **mode** (`stage` or `off-stage`), venue, scheduled time.
- Use the **Criteria Builder** to define how it's judged: a list of criteria, each with a label (e.g. "Voice", "Stage Presence"), a max score, and a weight (higher weight = counts for more of the total).
- On the program's detail page, assign its **Judge Panel** - pick which of your judge accounts will score this program.

### 1.7 Enroll entries
- Still on the program detail page: pick which Participants (for a `solo` program) or Teams (for a `team` program) are actually competing in it. Each one becomes an "entry."

### 1.8 Shuffle chest numbers
- Click **Shuffle Chest Numbers**. This randomly assigns a fresh, unique code to every entry *for this program specifically* - a participant competing in five programs gets five different chest numbers, one per program, so a judge scoring several items in a row can't start recognizing "chest #12 is always the strong one."
- This is what judges will see instead of names. It's also what gets printed on physical chest cards (view/download the QR for any entry - the card intentionally never prints the real name either).
- Re-shuffling after scores already exist requires an explicit confirmation (it doesn't erase scores, but it does change which chest number a judge saw mid-way, so the system makes you confirm on purpose).

### 1.9 (Optional) Enable student logins
- On the Participants page, click **Enable Login** next to anyone with a phone number on file. This provisions their student-portal account. There's no self-service sign-up - this button is the only way a student ever gets access.

At this point the fest is fully configured: teams exist, the roster is in, programs are defined with criteria and judge panels, entries have chest numbers. You're ready for judging day.

---

## Phase 2 - Live (Judging Day)

### 2.1 Check-in at the program
- Staff open the program's dedicated scanner at `/admin/competitions/[festId]/programs/[id]/scan` and scan each participant's/team's chest-card QR as they arrive for *that specific program*. (This is separate from - and doesn't touch - the general attendance QR system in [`02-attendance-flow.md`](./02-attendance-flow.md).)
- The program detail page shows a live total/checked-in/no-show count, plus a per-team breakdown, so you know who's actually shown up before judging starts.

### 2.2 Judges score
- Judges sign in at `/judge/login` and land on `/judge`, which lists every program they're assigned to across every fest, with a running "X/Y scored" progress count.
- Opening a program (`/judge/programs/[id]/score`) shows a grid of **chest numbers only**. Tapping one opens the scoring panel for that entry: one input per criterion (a one-tap number grid for small scales like 0–10, a +/- stepper for larger ones), with a live running total.
- Submitting a score can be revised any time before judging closes for that program - resubmitting just updates the same score, it doesn't create a duplicate.
- At no point does the judge's screen or the API responses behind it include a participant or team name.

### 2.3 Admin watches it happen live
- `/admin/competitions/[festId]/standings` polls every 5 seconds and shows the **championship leaderboard updating in real time** - even for programs that haven't officially published results yet. Those contribute a "(preview)" label so it's clear the numbers aren't locked in yet, just a live projection based on scores entered so far.

### 2.4 Close judging
- Once every judge has finished a program, the admin clicks **Close Judging** on that program's page. This locks out any further score submissions or edits - judging for that item is officially over.

### 2.5 Publish results
- With judging closed, the admin clicks **Publish Results**. This computes final ranks (highest average score wins; ties share a rank - e.g. two entries tied for 2nd both show "2nd", and the next entry is "4th", not "3rd" - there's no hidden tiebreaker) and locks them in permanently on that program.
- Once published, that program's points count for real (not preview) in the championship standings, and its individual result becomes eligible for the public results page.

Repeat 2.1–2.5 for every program across the day.

---

## Phase 3 - Results (After Judging)

### 3.1 Go public
- On the Standings page, flip **"Results are Public."** This single fest-wide switch is the gate for every public-facing results page - nothing is visible externally until this is on, no matter how many programs have individually published.

### 3.2 What the public sees
- `/results/[festId]` - no login needed. Live championship standings (same crown/medal top-3 treatment as the awards voting page), updating as more programs publish.
- `/results/[festId]/programs/[programId]` - the individual ranked result for one program, names now visible (judging is over, blindness no longer applies).

### 3.3 What students see
- Students log in at `/student/login` (phone + OTP) any time, and can always see their own schedule, chest numbers, and check-in status. Once a program they're in gets published, their rank shows up on `/student/results` too.

### 3.4 Certificates & posters
- `/admin/competitions/[festId]/certificates` - upload one certificate template image (used for every participant's personal certificate) and one poster template (used for the "top 3" announcement per program).
- Pick a program with published results:
  - **Generate All Certificates** - downloads one personalized PNG per ranked entry, with their name, the program name, and their placement (e.g. "1st Place") composited onto the template.
  - **Download Poster** - one image listing the top 3 for that program, for printing or social media.
- This reuses the same image-compositing approach as the entry-pass QR tickets in the Attendance feature - just with different text overlaid.

---

## The whole thing, compressed

```
Super/Event Admin:  Create Fest → Teams → Participants → Judges → Programs (+criteria, +panel)
                     → Enroll entries → Shuffle chest numbers → (enable student logins)
                            ↓
Event day:           Check-in scan → Judges score (blind, by chest number) →
                     Admin watches live preview standings → Close Judging → Publish Results
                            ↓
After:               Flip "Results Public" → public standings & per-program pages go live →
                     students see their own results → Admin generates certificates & posters
```
