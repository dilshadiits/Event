import Link from 'next/link';
import { Trophy, Building2, KeyRound, Gavel, GraduationCap, ArrowRight, QrCode } from 'lucide-react';

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-white text-lg">Event</span>
                </div>
                <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                >
                    Sign in
                </Link>
            </header>

            {/* Hero */}
            <section className="max-w-4xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-12 md:pb-16 text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white text-balance">
                    Run your fest, <span className="text-gradient">start to finish.</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto text-balance">
                    Teams, blind judging, live standings, and results — for your own organization,
                    fully separate from everyone else running fests here.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                    <Link
                        href="/signup"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-indigo-500/20"
                    >
                        <Building2 className="w-5 h-5" />
                        Create your organization
                    </Link>
                    <Link
                        href="/login"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card border border-border hover:border-indigo-500/50 text-white px-6 py-3 rounded-full font-bold transition-all"
                    >
                        I already have an account
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Role entry points */}
            <section className="max-w-5xl mx-auto px-4 md:px-8 pb-16 md:pb-20">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href="/signup"
                        className="group bg-card border border-border rounded-2xl p-5 hover:border-indigo-500/50 transition-all"
                    >
                        <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white mb-1">New here</h3>
                        <p className="text-sm text-muted-foreground">Create your organization and start setting up a fest.</p>
                        <span className="inline-flex items-center gap-1 text-sm text-indigo-400 mt-3 group-hover:gap-2 transition-all">
                            Get started <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>

                    <Link
                        href="/login"
                        className="group bg-card border border-border rounded-2xl p-5 hover:border-purple-500/50 transition-all"
                    >
                        <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-4">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white mb-1">Have an organization</h3>
                        <p className="text-sm text-muted-foreground">Super Admin or Event Admin — sign in to manage your fests.</p>
                        <span className="inline-flex items-center gap-1 text-sm text-purple-400 mt-3 group-hover:gap-2 transition-all">
                            Sign in <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>

                    <Link
                        href="/login?mode=admin"
                        className="group bg-card border border-border rounded-2xl p-5 hover:border-orange-500/50 transition-all"
                    >
                        <div className="w-10 h-10 bg-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center mb-4">
                            <Gavel className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white mb-1">Judging a program</h3>
                        <p className="text-sm text-muted-foreground">Sign in to score your assigned programs, blind by chest number.</p>
                        <span className="inline-flex items-center gap-1 text-sm text-orange-400 mt-3 group-hover:gap-2 transition-all">
                            Judge sign in <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>

                    <Link
                        href="/login?mode=student"
                        className="group bg-card border border-border rounded-2xl p-5 hover:border-cyan-500/50 transition-all"
                    >
                        <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center mb-4">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-white mb-1">Taking part</h3>
                        <p className="text-sm text-muted-foreground">Check your schedule, chest number, and results with just your phone.</p>
                        <span className="inline-flex items-center gap-1 text-sm text-cyan-400 mt-3 group-hover:gap-2 transition-all">
                            Student sign in <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>
                </div>
            </section>

            {/* Footer — classic tools, kept discoverable but low-emphasis */}
            <footer className="max-w-6xl mx-auto px-4 md:px-8 pb-10">
                <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>&copy; {new Date().getFullYear()} Event</span>
                    <div className="flex items-center gap-4">
                        <Link href="/events" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5" /> Attendance tools
                        </Link>
                        <Link href="/awards" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" /> Award voting
                        </Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
