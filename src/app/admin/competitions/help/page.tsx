'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, BookOpen, Rocket, UserSquare2, ListChecks, Gavel,
    ClipboardCheck, ShieldCheck, Trophy, QrCode, GraduationCap, KeyRound, ChevronDown,
} from 'lucide-react';

interface Section {
    id: string;
    icon: React.ElementType;
    title: string;
    accent: string;
    content: React.ReactNode;
}

const SECTIONS: Section[] = [
    {
        id: 'overview',
        icon: Rocket,
        title: 'How it all fits together',
        accent: 'bg-indigo-500/20 text-indigo-400',
        content: (
            <div className="space-y-3 text-sm text-muted-foreground">
                <p>Every competition lives inside a <strong className="text-white">Fest</strong> — a fest owns Teams, Participants, and Programs. The pipeline for running one is always the same order:</p>
                <ol className="space-y-1.5 list-decimal list-inside marker:text-indigo-400 marker:font-bold">
                    <li>Create the <strong className="text-white">Fest</strong> and its <strong className="text-white">Teams</strong></li>
                    <li>Register <strong className="text-white">Participants</strong> and assign them to teams</li>
                    <li>Create <strong className="text-white">Programs</strong> (the actual competition items) with judging criteria</li>
                    <li>Add entries to each program and assign a <strong className="text-white">Judge Panel</strong></li>
                    <li>Shuffle <strong className="text-white">chest numbers</strong> so judging is blind</li>
                    <li>Judges (or admins) <strong className="text-white">score</strong> each entry</li>
                    <li><strong className="text-white">Close judging</strong>, then <strong className="text-white">publish results</strong></li>
                    <li>Turn on <strong className="text-white">public standings</strong> and share the QR code</li>
                </ol>
            </div>
        ),
    },
    {
        id: 'fest',
        icon: Trophy,
        title: '1. Setting up a Fest',
        accent: 'bg-yellow-500/20 text-yellow-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>From <strong className="text-white">Competitions → New Fest</strong> (super-admin), set the name, dates, and a <strong className="text-white">points scheme</strong> — how many fest points rank 1/2/3 are worth (default 10/7/5). A <strong className="text-white">team points multiplier</strong> can boost team-type programs relative to solo ones.</p>
                <p>Add <strong className="text-white">Teams</strong> next (Fest dashboard → Teams) — name, code, and a color. That color is used everywhere teams show up: standings bars, student badges, the public results page.</p>
            </div>
        ),
    },
    {
        id: 'participants',
        icon: UserSquare2,
        title: '2. Registering participants',
        accent: 'bg-purple-500/20 text-purple-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>Add participants one at a time, or bulk-import an Excel sheet (columns: <code className="text-white">Name</code> and <code className="text-white">Phone</code> required, <code className="text-white">Team</code>/<code className="text-white">Email</code> optional). Phone is required because it becomes the student&apos;s default login password — rows without one are skipped.</p>
                <p><strong className="text-white">A phone number alone doesn&apos;t give a student a login.</strong> On the Participants page, use <strong className="text-white">Enable Login</strong> on a participant with a phone number to create their student account. This generates a <strong className="text-white">username</strong> from their first name (e.g. &quot;Adithyan Dileep&quot; → <code className="text-white">Adithyan</code>, with a number appended if that username is already taken), and sets their <strong className="text-white">phone number as the default password</strong>. Both appear on screen once — share them with the student.</p>
                <p>If a student forgets their password, use <strong className="text-white">Reset Password</strong> next to their name to set it back to their phone number. Students can change it themselves afterwards from their own Settings page.</p>
            </div>
        ),
    },
    {
        id: 'programs',
        icon: ListChecks,
        title: '3. Creating programs',
        accent: 'bg-pink-500/20 text-pink-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>A Program is one competition item (e.g. &quot;Classical Dance Solo&quot;) — pick <strong className="text-white">solo or team</strong>, <strong className="text-white">stage or off-stage</strong>, and define its <strong className="text-white">judging criteria</strong>: each criterion has a label, a max score, and a weight (higher weight counts for more of the total).</p>
                <p>On the program&apos;s detail page you can also upload a <strong className="text-white">poster image</strong> — it shows up as the cover image on the student&apos;s schedule and on the public results page.</p>
                <p>Add entries (participants or teams) from the same page, then use <strong className="text-white">Shuffle Chest Numbers</strong> once entries are final — this randomly assigns each entry a chest number and hides names from judges.</p>
            </div>
        ),
    },
    {
        id: 'judges',
        icon: Gavel,
        title: '4. Assigning judges',
        accent: 'bg-orange-500/20 text-orange-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>Create judge accounts from <strong className="text-white">Judges &amp; Admins</strong> (event-admins can only create judges; super-admin can create judges and event-admins too). Judges sign in at <code className="text-white">/login</code> with email + password.</p>
                <p>On each program&apos;s detail page, pick which judges sit on that program&apos;s <strong className="text-white">Judge Panel</strong> — a judge only sees programs they&apos;re assigned to.</p>
            </div>
        ),
    },
    {
        id: 'scoring',
        icon: ClipboardCheck,
        title: '5. How scoring works',
        accent: 'bg-cyan-500/20 text-cyan-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>Judging is <strong className="text-white">blind</strong>: a judge&apos;s worklist shows chest numbers only, never names. For each entry, the judge enters a mark per criterion (0 up to that criterion&apos;s max). The entry&apos;s total for that judge is <code className="text-white">Σ(score × criterion weight)</code>.</p>
                <p>If more than one judge scores the same entry, their totals are <strong className="text-white">averaged</strong> (not summed) into the entry&apos;s final score — that average is what gets ranked.</p>
                <p>A program&apos;s status moves on its own as this happens: <span className="text-white">scheduled → chest-numbers-shuffled → in-progress</span> (as soon as the first score comes in).</p>
            </div>
        ),
    },
    {
        id: 'admin-scoring',
        icon: ShieldCheck,
        title: '6. Admin scoring & corrections',
        accent: 'bg-green-500/20 text-green-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-white">Super-admin can score any program directly</strong>, even if it has zero judges assigned — use the <strong className="text-white">&quot;Score as Admin&quot;</strong> button on the program detail page, which opens the same scoring screen a judge uses.</p>
                <p>Any admin (event-admin included) can also <strong className="text-white">review and correct</strong> what a specific judge entered: on the program page, click the clipboard icon next to an entry to expand every judge&apos;s individual marks per criterion, and edit any of them inline. Event-admins can only correct an <em>existing</em> judge&apos;s score this way, not add a brand-new one of their own — that stays super-admin only.</p>
            </div>
        ),
    },
    {
        id: 'publish',
        icon: Trophy,
        title: '7. Closing judging & results',
        accent: 'bg-red-500/20 text-red-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>Once every entry is scored, hit <strong className="text-white">Close Judging</strong> — judges (and admins) can no longer submit or edit scores for that program.</p>
                <p>Then <strong className="text-white">Publish Results</strong> — this computes final ranks (standard competition ranking: ties share a rank, e.g. 1, 2, 2, 4) and converts them into fest points per the points scheme, added to each team&apos;s total. Only published programs count toward the <em>official</em> public standings.</p>
            </div>
        ),
    },
    {
        id: 'public',
        icon: QrCode,
        title: '8. Public standings & QR sharing',
        accent: 'bg-blue-500/20 text-blue-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>On the fest&apos;s <strong className="text-white">Standings</strong> page, toggle <strong className="text-white">Results are Public</strong> to open the live standings page to anyone with the link — no login required. It auto-refreshes every few seconds and shows a top-3 podium plus the full team ranking.</p>
                <p>Use <strong className="text-white">Copy Public Link</strong> or <strong className="text-white">Show QR</strong> to get a scannable code for the venue screen, program booklet, or social posts — the QR can be generated any time, even before results are made public.</p>
            </div>
        ),
    },
    {
        id: 'students',
        icon: GraduationCap,
        title: '9. The student portal',
        accent: 'bg-teal-500/20 text-teal-400',
        content: (
            <div className="space-y-2 text-sm text-muted-foreground">
                <p>Once a participant has a provisioned login, they sign in at <code className="text-white">/login</code> (student tab) with their <strong className="text-white">username and password</strong> (default password is their phone number). Their home page shows every program they&apos;re entered in as a poster card — live status, chest number, venue/time, and check-in state — and a separate Results tab once ranks are published.</p>
                <p>From the <strong className="text-white">Settings</strong> icon on their home page, a student can change their own password at any time.</p>
            </div>
        ),
    },
    {
        id: 'roles',
        icon: KeyRound,
        title: 'Roles at a glance',
        accent: 'bg-violet-500/20 text-violet-400',
        content: (
            <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-120">
                    <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-2 pr-3 font-medium">Role</th>
                            <th className="py-2 font-medium">Can do</th>
                        </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 text-white font-medium whitespace-nowrap">Super Admin</td>
                            <td className="py-2">Everything within their own organization — every fest, all management pages, and can score any program directly.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 text-white font-medium whitespace-nowrap">Event Admin</td>
                            <td className="py-2">Full management of the fests assigned to them (teams/participants/programs/judges/standings); can create judge accounts and correct existing judge scores, but can&apos;t score as a judge themselves.</td>
                        </tr>
                        <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 text-white font-medium whitespace-nowrap">Judge</td>
                            <td className="py-2">Scores entries only for programs they&apos;re assigned to, via a blind (chest-number-only) worklist.</td>
                        </tr>
                        <tr>
                            <td className="py-2 pr-3 text-white font-medium whitespace-nowrap">Student</td>
                            <td className="py-2">Views their own schedule, check-in status, and published results.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        ),
    },
];

export default function HelpPage() {
    const [openId, setOpenId] = useState<string | null>('overview');

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/competitions" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Help &amp; Tutorial</h1>
                        <p className="text-sm text-muted-foreground">Running an event from setup to public results</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2.5">
                {SECTIONS.map(section => {
                    const isOpen = openId === section.id;
                    const Icon = section.icon;
                    return (
                        <div key={section.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setOpenId(isOpen ? null : section.id)}
                                className="w-full flex items-center justify-between gap-3 p-4 text-left"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section.accent}`}>
                                        <Icon className="w-4.5 h-4.5" />
                                    </div>
                                    <span className="font-bold text-white text-sm sm:text-base truncate">{section.title}</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                                <div className="px-4 pb-5 pt-1 border-t border-border/50">
                                    {section.content}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
