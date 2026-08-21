import Link from 'next/link';
import { Black_Ops_One } from 'next/font/google';
import {
    ArrowRight, Users, EyeOff, Activity, Globe2, Award, GraduationCap,
    Building2, ListChecks, Gavel, PartyPopper, QrCode, Vote, ShieldCheck, Lock,
} from 'lucide-react';

// Wordmark-only logo — no icon. Black Ops One has no true italic in Google Fonts,
// so the slant is a browser-synthesized (faux) italic — applied as an inline
// style on the element below, since next/font's own generated class already sets
// font-style: normal at the same specificity as a Tailwind `italic` class would.
const logoFont = Black_Ops_One({ weight: '400', subsets: ['latin'], display: 'swap' });

const judgingFeatures = [
    {
        icon: Users,
        color: 'indigo',
        title: 'Teams & Rosters',
        body: 'Build team rosters by hand or bulk-import from Excel. Organize solo and team programs, stage and off-stage, all under one fest.',
    },
    {
        icon: EyeOff,
        color: 'orange',
        title: 'Blind Judging',
        body: 'Chest numbers are freshly shuffled for every program. Judges never see a name — only a number and a score sheet.',
    },
    {
        icon: Activity,
        color: 'purple',
        title: 'Live Standings',
        body: 'Championship points update in real time as judges submit scores, so you can watch the leaderboard shift before anything is even published.',
    },
    {
        icon: Globe2,
        color: 'blue',
        title: 'Instant Public Results',
        body: 'Flip one switch and your leaderboard and program results go live — no login required for anyone to see them.',
    },
    {
        icon: Award,
        color: 'yellow',
        title: 'Auto Certificates & Posters',
        body: 'Upload a template once. Personalized certificates and a results poster generate themselves from the final scores.',
    },
    {
        icon: GraduationCap,
        color: 'cyan',
        title: 'Student Portal',
        body: 'Participants sign in with just a phone number to see their own schedule, chest number, and results — nothing to remember, nothing to install.',
    },
];

const steps = [
    { n: '01', title: 'Create your organization', body: 'Sign up and name your organization in under a minute. It’s yours alone.' },
    { n: '02', title: 'Build your fest', body: 'Add teams, import your roster, and set up programs with their own judging criteria.' },
    { n: '03', title: 'Judge live', body: 'Judges score from their own phone, blind by chest number, while standings update as they go.' },
    { n: '04', title: 'Publish & celebrate', body: 'Close judging, publish results, and hand out certificates the app generates for you.' },
];

const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

export default function MarketingLandingPage() {
    return (
        <main className="min-h-screen">
            {/* Ambient background texture */}
            <div
                aria-hidden
                className="fixed inset-0 -z-10 opacity-[0.15] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, hsl(213 31% 91% / 0.4) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            {/* Nav */}
            <header className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8 flex items-center justify-between relative z-10">
                <span
                    className={`${logoFont.className} text-white text-4xl tracking-wide`}
                    style={{ fontStyle: 'italic' }} // next/font bakes font-style: normal into its own
                    // class at equal specificity to Tailwind's `italic`, so the class alone loses the
                    // cascade — an inline style is the reliable way to force the slant.
                >
                    Podium
                </span>
                <nav className="flex items-center gap-2 sm:gap-3">
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-white transition-colors px-2">
                        Sign in
                    </Link>
                    <Link
                        href="/get-started"
                        className="flex items-center gap-1.5 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                    >
                        Get Started
                    </Link>
                </nav>
            </header>

            {/* Hero */}
            <section className="relative max-w-5xl mx-auto px-4 md:px-8 pt-20 md:pt-28 pb-20 md:pb-28 text-center">
                <div
                    aria-hidden
                    className="absolute -top-20 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-gradient-to-br from-indigo-600/25 via-purple-600/20 to-transparent rounded-full blur-3xl -z-10"
                />
                <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Every organization&apos;s data is fully separate
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white text-balance leading-[1.05]">
                    Run your fest,<br />
                    <span className="text-gradient">judged fairly, published instantly.</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-6 max-w-2xl mx-auto text-balance">
                    Teams, blind chest-number judging, live championship standings, and auto-generated
                    certificates — set up and run entirely by your own organization.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
                    <Link
                        href="/get-started"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-7 py-3.5 rounded-full font-bold transition-all shadow-lg hover:shadow-indigo-500/20"
                    >
                        Get Started <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="#judging"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card border border-border hover:border-indigo-500/50 text-white px-7 py-3.5 rounded-full font-bold transition-all"
                    >
                        See what&apos;s included
                    </Link>
                </div>
            </section>

            {/* Three products at a glance */}
            <section className="max-w-5xl mx-auto px-4 md:px-8 pb-20 md:pb-28">
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="bg-card border border-border rounded-2xl p-5">
                        <div className="w-10 h-10 bg-indigo-500/15 text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                            <ListChecks className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white">Competitions & Judging</h3>
                        <p className="text-sm text-muted-foreground mt-1">The flagship tool — teams, blind judging, live results.</p>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5">
                        <div className="w-10 h-10 bg-blue-500/15 text-blue-400 rounded-xl flex items-center justify-center mb-4">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white">Attendance & Check-in</h3>
                        <p className="text-sm text-muted-foreground mt-1">Registration, QR entry passes, and gate scanning.</p>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5">
                        <div className="w-10 h-10 bg-pink-500/15 text-pink-400 rounded-xl flex items-center justify-center mb-4">
                            <Vote className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white">Award Voting</h3>
                        <p className="text-sm text-muted-foreground mt-1">Audience-voted ceremonies with live leaderboards.</p>
                    </div>
                </div>
            </section>

            {/* Flagship feature deep-dive */}
            <section id="judging" className="max-w-6xl mx-auto px-4 md:px-8 pb-20 md:pb-28 scroll-mt-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-xs font-bold tracking-wider uppercase text-indigo-400">Competitions & Judging</span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mt-3 text-balance">
                        Everything a fair, well-run fest needs
                    </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {judgingFeatures.map((f) => (
                        <div key={f.title} className="bg-card border border-border rounded-2xl p-5 hover:border-white/20 transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${colorMap[f.color]}`}>
                                <f.icon className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white mb-1.5">{f.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="max-w-5xl mx-auto px-4 md:px-8 pb-20 md:pb-28">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-xs font-bold tracking-wider uppercase text-purple-400">How it works</span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mt-3 text-balance">
                        From sign-up to standings, four steps
                    </h2>
                </div>
                <div className="grid gap-px bg-border rounded-2xl overflow-hidden border border-border sm:grid-cols-2 lg:grid-cols-4">
                    {steps.map((s) => (
                        <div key={s.n} className="bg-card p-6">
                            <span className="font-mono text-sm font-bold text-indigo-400">{s.n}</span>
                            <h3 className="font-bold text-white mt-3 mb-1.5">{s.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Isolation / trust callout */}
            <section className="max-w-5xl mx-auto px-4 md:px-8 pb-20 md:pb-28">
                <div className="bg-card border border-border rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="w-14 h-14 shrink-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                        <Lock className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Your organization, your data</h3>
                        <p className="text-muted-foreground mt-1.5 leading-relaxed">
                            Every organization on Event is completely walled off from every other one — teams, judges,
                            scores, and results in your organization are never visible to anyone outside it. A Product
                            Admin can help across organizations when you need support, but no other organization ever can.
                        </p>
                    </div>
                </div>
            </section>

            {/* Also included */}
            <section className="max-w-5xl mx-auto px-4 md:px-8 pb-20 md:pb-28">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-xs font-bold tracking-wider uppercase text-blue-400">Also included</span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mt-3 text-balance">
                        Two more tools, no extra sign-up
                    </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link href="/events" className="group bg-card border border-border rounded-2xl p-6 hover:border-blue-500/40 transition-all">
                        <div className="w-10 h-10 bg-blue-500/15 text-blue-400 rounded-xl flex items-center justify-center mb-4">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white mb-1.5">Attendance &amp; Check-in</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Dynamic registration forms, QR entry passes, gate scanning, and spot registration for walk-ins.
                        </p>
                        <span className="inline-flex items-center gap-1 text-sm text-blue-400 mt-3 group-hover:gap-2 transition-all">
                            Open Attendance tools <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>
                    <Link href="/awards" className="group bg-card border border-border rounded-2xl p-6 hover:border-pink-500/40 transition-all">
                        <div className="w-10 h-10 bg-pink-500/15 text-pink-400 rounded-xl flex items-center justify-center mb-4">
                            <PartyPopper className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white mb-1.5">Award Voting</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Audience-voted award ceremonies with Google sign-in, one vote per category, and a live leaderboard.
                        </p>
                        <span className="inline-flex items-center gap-1 text-sm text-pink-400 mt-3 group-hover:gap-2 transition-all">
                            Open Award Voting <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-4xl mx-auto px-4 md:px-8 pb-20 md:pb-28 text-center">
                <div className="relative bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-transparent border border-indigo-500/20 rounded-3xl p-10 md:p-14">
                    <Gavel className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white text-balance">
                        Ready to run your fest?
                    </h2>
                    <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                        Create your organization and start building your first program today.
                    </p>
                    <Link
                        href="/get-started"
                        className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-7 py-3.5 rounded-full font-bold transition-colors mt-7"
                    >
                        Get Started <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="max-w-6xl mx-auto px-4 md:px-8 pb-10">
                <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>&copy; {new Date().getFullYear()} Podium</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <Link href="/get-started" className="hover:text-white transition-colors">Get Started</Link>
                        <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
                        <Link href="/events" className="hover:text-white transition-colors">Attendance</Link>
                        <Link href="/awards" className="hover:text-white transition-colors">Awards</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
