# Attendance & Check-in Flow

This is the original, single-session event feature: registration → QR entry pass → gate check-in. Good for a party, a screening, a launch - one date, one form, no teams or judging involved.

Everything here is behind the **shared admin password** (see [`01-roles-and-access.md`](./01-roles-and-access.md)) - there's no per-admin login for this feature.

## 1. Set up the event (Admin)

1. Open `/` - the app dashboard. If this browser hasn't been unlocked before, you'll see a login form ("Event QR Manager - Enter credentials to continue") instead of the dashboard first; that's `PasswordGate` (see [`01-roles-and-access.md`](./01-roles-and-access.md)), not a page of its own. Enter the shared credentials (`admin`/`super123` by default) and it unlocks - the same browser won't ask again.
2. Create an **Event** - name and date. This becomes the parent record everything else attaches to.
3. Open the event's management page (`/events/[id]`) and, under **Form Settings**, customize the registration form with the **FormBuilder**: toggle system fields on/off (Email, Instagram, YouTube, Category, Meal Preference), mark fields required, and add arbitrary custom fields (text/select/checkbox/email/phone/number).
4. Under **Event Settings**, upload an **Entry Pass Template** image (a JPG/PNG background - the QR code and attendee name get composited onto it later).
5. Optionally generate an **Invite Link** (`/api/invites`) if registration should be gated behind a one-time code rather than open to anyone with the link.

## 2. Registration opens (Public)

- Share the registration link (`Copy Link` button → `/register/[id]`) or the invite-code variant.
- Attendees fill out the dynamic form built in step 3. They can list one guest's name (`guest_names`) - the guest gets their own QR sub-code.
- For walk-ins on the day, staff use **Spot Registration** (`/spot/[id]`) - same form, but meant to be filled in by staff at a table rather than by the attendee remotely.
- Every submission is rate-limited (10/min/IP) and validated server-side regardless of what the client sends.
- On submission, the attendee gets an **entry pass**: their registration ID rendered as a QR code, composited onto the uploaded template with their name printed below it.

## 3. Registration closes (Admin)

- Clicking **Stop Registration** on the event page finalizes **seat numbers**, allocated by a category-priority order (highest-value category gets the lowest seat numbers). This is a one-way action per the confirm dialog - seats are locked in at that point.

## 4. Check-in day (Admin / gate staff)

- Open `/scan?eventId=...` on a phone or tablet at the door. It requests camera access and scans continuously.
- Scanning a valid QR code:
  - Marks the attendee `checked-in` and shows a green "Access Granted" screen with their name and seat number.
  - Scanning it again shows a blue "Already Checked In" screen with the original check-in time (not an error - this is expected when someone re-shows their pass).
  - A guest's QR sub-code checks the guest in separately, independent of whether the main attendee has checked in.
  - An invalid/foreign QR shows a red "Access Denied" screen.

## 5. Running the room (Admin)

Back on the event's admin page (`/events/[id]`), which polls for updates every 5 seconds:
- Search/filter the attendee list, sort by category priority.
- Edit any attendee's details after the fact (`EditAttendeeModal`).
- View or re-download any individual's entry pass (or a guest's) as a QR image.
- **Bulk-generate** every attendee's entry pass as a PNG in one click (throttled to avoid browser download blocking).
- Export the current filtered list as a **PDF** (name, seat, category, guests, phone, status).

That's the whole loop: create event → build form → collect registrations → close registration (locks seats) → scan people in at the door → manage the list live.
