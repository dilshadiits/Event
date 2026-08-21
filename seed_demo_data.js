// One-off demo data seeder — drives the real API (not direct DB writes) so every
// record goes through actual validation, chest-shuffling, and scoring logic.
// Run with: node seed_demo_data.js   (dev server must be running on :4000)

const BASE = 'http://localhost:4000';

class Session {
  constructor() { this.cookies = new Map(); }
  _capture(res) {
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.raw ? res.headers.raw()['set-cookie'] : []);
    const list = setCookie || [];
    for (const c of list) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx);
      const value = pair.slice(idx + 1);
      this.cookies.set(name, value);
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async fetch(path, opts = {}) {
    const headers = { ...(opts.headers || {}), Cookie: this.header() };
    const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' });
    this._capture(res);
    return res;
  }
  async json(path, opts = {}) {
    const res = await this.fetch(path, opts);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!res.ok && res.status !== 307) {
      console.error(`  ! ${opts.method || 'GET'} ${path} -> ${res.status}`, body);
    }
    return { status: res.status, body };
  }
  async postJSON(path, data) {
    return this.json(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  }
  async putJSON(path, data) {
    return this.json(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  }
}

async function signInAdmin(session, email, password) {
  const csrfRes = await session.json('/api/auth/csrf');
  const csrfToken = csrfRes.body.csrfToken;
  const res = await session.fetch('/api/auth/callback/admin-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password, csrfToken, json: 'true' }),
  });
  return res.status;
}

async function signUp(name, email, password) {
  const s = new Session();
  const r = await s.postJSON('/api/auth/signup', { name, email, password });
  if (r.status !== 201) { console.error('signup failed', email, r.body); return null; }
  await signInAdmin(s, email, password);
  return s;
}

async function seedOrganization(config) {
  console.log(`\n=== Seeding: ${config.orgName} ===`);

  // 1. Super Admin signs up + creates the org
  const admin = await signUp(config.adminName, config.adminEmail, config.adminPassword);
  if (!admin) return;
  const orgRes = await admin.postJSON('/api/organizations', { name: config.orgName });
  console.log(`  org created: ${orgRes.body.name} (${orgRes.body.slug})`);
  // re-sign-in so the session JWT picks up the fresh organizationId
  const admin2 = new Session();
  await signInAdmin(admin2, config.adminEmail, config.adminPassword);

  // 2. Event Admin account
  const eaRes = await admin2.postJSON('/api/users', {
    name: config.eventAdminName, email: config.eventAdminEmail, password: config.eventAdminPassword, role: 'event-admin', festIds: [],
  });
  console.log(`  event admin: ${eaRes.body.name}`);

  // 3. Judge accounts
  const judgeIds = [];
  for (const j of config.judges) {
    const r = await admin2.postJSON('/api/users', { name: j.name, email: j.email, password: j.password, role: 'judge' });
    judgeIds.push(r.body.id);
    console.log(`  judge: ${j.name}`);
  }

  // 4. Fest
  const festRes = await admin2.postJSON('/api/fests', { name: config.festName, description: config.festDescription, startDate: config.startDate, endDate: config.endDate });
  const festId = festRes.body.id;
  console.log(`  fest: ${festRes.body.name} (${festId})`);

  await admin2.putJSON(`/api/fests/${festId}`, { pointsScheme: { '1': 10, '2': 7, '3': 5 }, teamPointsMultiplier: 1.5 });

  // 5. Teams
  const teamIds = {};
  for (const t of config.teams) {
    const r = await admin2.postJSON('/api/teams', { festId, name: t.name, code: t.code, color: t.color });
    teamIds[t.name] = r.body.id;
    console.log(`  team: ${t.name}`);
  }

  // 6. Participants
  const participantIds = {};
  let phoneCounter = 9800000000;
  for (const p of config.participants) {
    phoneCounter += 1;
    const r = await admin2.postJSON('/api/participants', {
      festId, teamId: teamIds[p.team], name: p.name, phone: String(phoneCounter), email: `${p.name.toLowerCase().replace(/\s+/g, '.')}@student.example`,
    });
    participantIds[p.name] = r.body.id;
  }
  console.log(`  ${config.participants.length} participants added across ${config.teams.length} teams`);

  // Provision a handful of student logins
  const provisionNames = config.participants.slice(0, 4).map(p => p.name);
  for (const name of provisionNames) {
    const id = participantIds[name];
    await admin2.postJSON(`/api/participants/${id}/provision-login`, {});
  }
  console.log(`  student logins enabled for: ${provisionNames.join(', ')}`);

  // 7. Programs
  const programResults = [];
  for (const prog of config.programs) {
    const criteria = prog.criteria.map((c, i) => ({ id: `c${i + 1}`, label: c.label, maxScore: c.maxScore, weight: c.weight || 1 }));
    const progRes = await admin2.postJSON('/api/programs', {
      festId, name: prog.name, type: prog.type, mode: prog.mode, venue: prog.venue,
      scheduledAt: prog.scheduledAt, criteria,
    });
    const programId = progRes.body.id;
    console.log(`  program: ${prog.name} (${prog.type}/${prog.mode})`);

    // Enroll entries
    if (prog.type === 'team') {
      const teamIdList = Object.values(teamIds);
      await admin2.postJSON(`/api/programs/${programId}/entries`, { teamIds: teamIdList });
    } else {
      const entrants = prog.entrants.map(n => participantIds[n]).filter(Boolean);
      await admin2.postJSON(`/api/programs/${programId}/entries`, { participantIds: entrants });
    }

    // Shuffle chest numbers
    await admin2.postJSON(`/api/programs/${programId}/shuffle`, {});

    // Assign judge panel (rotate through available judges)
    const panelJudges = prog.judgeIndexes.map(i => judgeIds[i]).filter(Boolean);
    await admin2.putJSON(`/api/programs/${programId}/panel`, { judgePanel: panelJudges });

    programResults.push({ programId, criteria, judgeEmails: prog.judgeIndexes.map(i => config.judges[i]) , shouldPublish: prog.shouldPublish });
  }

  // 8. Judges score the programs flagged for publishing
  for (const pr of programResults) {
    if (!pr.shouldPublish) continue;

    const judgeSession = new Session();
    await signInAdmin(judgeSession, pr.judgeEmails[0].email, pr.judgeEmails[0].password);

    const worklist = await judgeSession.json(`/api/programs/${pr.programId}/judge/entries`);
    const entries = worklist.body.entries || [];
    for (const entry of entries) {
      const scores = {};
      for (const c of pr.criteria) {
        scores[c.id] = Math.floor(Math.random() * (c.maxScore - c.maxScore * 0.4)) + Math.ceil(c.maxScore * 0.4);
      }
      await judgeSession.postJSON(`/api/programs/${pr.programId}/scores`, { entryId: entry.entryId, criteriaScores: scores });
    }
    console.log(`  scored ${entries.length} entries for a program`);

    await admin2.postJSON(`/api/programs/${pr.programId}/close-judging`, {});
    const pub = await admin2.postJSON(`/api/programs/${pr.programId}/publish-results`, {});
    console.log(`  published results: ranked=${pub.body.ranked}`);
  }

  // 9. Make results public
  await admin2.putJSON(`/api/fests/${festId}`, { resultsArePublic: true });
  console.log(`  fest results are now public at /results/${festId}`);

  console.log(`  --- credentials ---`);
  console.log(`  Super Admin: ${config.adminEmail} / ${config.adminPassword}`);
  console.log(`  Event Admin: ${config.eventAdminEmail} / ${config.eventAdminPassword}`);
  for (const j of config.judges) console.log(`  Judge: ${j.email} / ${j.password}`);
  console.log(`  Fest URL (once signed in): /admin/competitions/${festId}`);
  console.log(`  Public results: /results/${festId}`);

  return { festId, orgName: config.orgName };
}

const ORG_A = {
  orgName: 'Ridgewood Institute of Technology',
  adminName: 'Meera Krishnan',
  adminEmail: 'meera@ridgewood.edu',
  adminPassword: 'ridgewood123',
  eventAdminName: 'Arjun Nair',
  eventAdminEmail: 'arjun@ridgewood.edu',
  eventAdminPassword: 'ridgewood123',
  judges: [
    { name: 'Dr. Kavya Menon', email: 'kavya.menon@ridgewood.edu', password: 'judgepass123' },
    { name: 'Prof. Sanjay Iyer', email: 'sanjay.iyer@ridgewood.edu', password: 'judgepass123' },
  ],
  festName: 'TechFest Ridgewood 2026',
  festDescription: 'Annual inter-department cultural and technical fest',
  startDate: '2026-09-12',
  endDate: '2026-09-14',
  teams: [
    { name: 'Team Phoenix', code: 'PHX', color: '#ef4444' },
    { name: 'Team Titan', code: 'TTN', color: '#3b82f6' },
    { name: 'Team Vortex', code: 'VTX', color: '#a855f7' },
    { name: 'Team Nova', code: 'NVA', color: '#eab308' },
  ],
  participants: [
    { name: 'Aditya Sharma', team: 'Team Phoenix' }, { name: 'Divya Reddy', team: 'Team Phoenix' },
    { name: 'Karthik Pillai', team: 'Team Phoenix' }, { name: 'Ananya Rao', team: 'Team Phoenix' },
    { name: 'Rohan Kapoor', team: 'Team Titan' }, { name: 'Sneha Iyer', team: 'Team Titan' },
    { name: 'Vikram Singh', team: 'Team Titan' }, { name: 'Pooja Menon', team: 'Team Titan' },
    { name: 'Nikhil Joshi', team: 'Team Vortex' }, { name: 'Meenakshi Pillai', team: 'Team Vortex' },
    { name: 'Arjun Verma', team: 'Team Vortex' }, { name: 'Lakshmi Nair', team: 'Team Vortex' },
    { name: 'Siddharth Rao', team: 'Team Nova' }, { name: 'Priyanka Das', team: 'Team Nova' },
    { name: 'Varun Chandran', team: 'Team Nova' }, { name: 'Ishita Bose', team: 'Team Nova' },
  ],
  programs: [
    {
      name: 'Solo Singing', type: 'solo', mode: 'stage', venue: 'Main Auditorium', scheduledAt: '2026-09-12T10:00:00',
      criteria: [{ label: 'Voice Quality', maxScore: 10 }, { label: 'Stage Presence', maxScore: 10 }, { label: 'Song Selection', maxScore: 5 }],
      entrants: ['Aditya Sharma', 'Rohan Kapoor', 'Nikhil Joshi', 'Siddharth Rao', 'Divya Reddy', 'Sneha Iyer'],
      judgeIndexes: [0, 1], shouldPublish: true,
    },
    {
      name: 'Group Dance', type: 'team', mode: 'stage', venue: 'Main Auditorium', scheduledAt: '2026-09-12T15:00:00',
      criteria: [{ label: 'Choreography', maxScore: 10 }, { label: 'Synchronization', maxScore: 10 }, { label: 'Costume & Presentation', maxScore: 5 }],
      judgeIndexes: [0, 1], shouldPublish: true,
    },
    {
      name: 'Quiz Competition', type: 'team', mode: 'off-stage', venue: 'Seminar Hall B', scheduledAt: '2026-09-13T11:00:00',
      criteria: [{ label: 'Accuracy', maxScore: 10 }, { label: 'Speed', maxScore: 5 }],
      judgeIndexes: [1], shouldPublish: false,
    },
    {
      name: 'Poster Making', type: 'solo', mode: 'off-stage', venue: 'Art Room', scheduledAt: '2026-09-13T14:00:00',
      criteria: [{ label: 'Creativity', maxScore: 10 }, { label: 'Relevance to Theme', maxScore: 10 }, { label: 'Neatness', maxScore: 5 }],
      entrants: ['Karthik Pillai', 'Vikram Singh', 'Arjun Verma', 'Varun Chandran'],
      judgeIndexes: [0], shouldPublish: false,
    },
  ],
};

const ORG_B = {
  orgName: 'Silverline Arts College',
  adminName: 'Priya Varghese',
  adminEmail: 'priya@silverline.edu',
  adminPassword: 'silverline123',
  eventAdminName: 'Rahul Thomas',
  eventAdminEmail: 'rahul@silverline.edu',
  eventAdminPassword: 'silverline123',
  judges: [
    { name: 'Dr. Anitha Pillai', email: 'anitha.pillai@silverline.edu', password: 'judgepass123' },
    { name: 'Prof. Vishnu Das', email: 'vishnu.das@silverline.edu', password: 'judgepass123' },
  ],
  festName: 'Silverline Cultural Fest 2026',
  festDescription: 'College-wide arts and culture championship',
  startDate: '2026-10-03',
  endDate: '2026-10-05',
  teams: [
    { name: 'Crimson', code: 'CRM', color: '#dc2626' },
    { name: 'Azure', code: 'AZR', color: '#2563eb' },
    { name: 'Emerald', code: 'EMR', color: '#16a34a' },
    { name: 'Golden', code: 'GLD', color: '#ca8a04' },
  ],
  participants: [
    { name: 'Fathima Rasheed', team: 'Crimson' }, { name: 'Jerin Jacob', team: 'Crimson' },
    { name: 'Devika Suresh', team: 'Crimson' }, { name: 'Alan Mathew', team: 'Crimson' },
    { name: 'Nandana Krishnan', team: 'Azure' }, { name: 'Basil Roy', team: 'Azure' },
    { name: 'Gayathri Unni', team: 'Azure' }, { name: 'Midhun Raj', team: 'Azure' },
    { name: 'Anjali Warrier', team: 'Emerald' }, { name: 'Christo Abraham', team: 'Emerald' },
    { name: 'Sruthi Balan', team: 'Emerald' }, { name: 'Nihal Ahammed', team: 'Emerald' },
    { name: 'Athira Vijayan', team: 'Golden' }, { name: 'Deepak Pillai', team: 'Golden' },
    { name: 'Kripa Thomas', team: 'Golden' }, { name: 'Sam George', team: 'Golden' },
  ],
  programs: [
    {
      name: 'Classical Dance', type: 'solo', mode: 'stage', venue: 'Open Air Theatre', scheduledAt: '2026-10-03T10:00:00',
      criteria: [{ label: 'Technique', maxScore: 10 }, { label: 'Expression', maxScore: 10 }, { label: 'Costume', maxScore: 5 }],
      entrants: ['Fathima Rasheed', 'Nandana Krishnan', 'Anjali Warrier', 'Athira Vijayan', 'Devika Suresh', 'Gayathri Unni'],
      judgeIndexes: [0, 1], shouldPublish: true,
    },
    {
      name: 'Debate', type: 'solo', mode: 'stage', venue: 'Seminar Hall A', scheduledAt: '2026-10-03T14:00:00',
      criteria: [{ label: 'Argument Quality', maxScore: 10 }, { label: 'Rebuttal', maxScore: 10 }, { label: 'Delivery', maxScore: 5 }],
      entrants: ['Jerin Jacob', 'Basil Roy', 'Christo Abraham', 'Deepak Pillai'],
      judgeIndexes: [0, 1], shouldPublish: true,
    },
    {
      name: 'Short Film', type: 'team', mode: 'off-stage', venue: 'Submitted Online', scheduledAt: '2026-10-04T09:00:00',
      criteria: [{ label: 'Storyline', maxScore: 10 }, { label: 'Cinematography', maxScore: 10 }, { label: 'Editing', maxScore: 5 }],
      judgeIndexes: [1], shouldPublish: false,
    },
    {
      name: 'Mime', type: 'team', mode: 'stage', venue: 'Open Air Theatre', scheduledAt: '2026-10-04T16:00:00',
      criteria: [{ label: 'Expression', maxScore: 10 }, { label: 'Creativity', maxScore: 10 }],
      judgeIndexes: [0], shouldPublish: false,
    },
  ],
};

(async () => {
  const resultA = await seedOrganization(ORG_A);
  const resultB = await seedOrganization(ORG_B);

  console.log('\n=== DONE ===');
  console.log(JSON.stringify({ resultA, resultB }, null, 2));
})();
