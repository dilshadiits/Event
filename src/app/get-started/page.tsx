import Link from 'next/link';
import { Trophy, Building2, KeyRound, Gavel, GraduationCap, ArrowRight, ArrowLeft, QrCode } from 'lucide-react';

export default function GetStartedPage() {
    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to home
                </Link>
                <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                >
                    Sign in
                </Link>
            </header>

            {/* Intro */}
            <section className="max-w-3xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-10 md:pb-12 text-center">
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-5">
                    <Trophy className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white text-balance">
                    How would you like to continue?
                </h1>
                <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto text-balance">
                    Every organization&apos;s data is fully separate — pick the option that matches you.
                </p>
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
