'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import StudentProgramCard, { StudentProgram } from '@/components/StudentProgramCard';

export default function StudentResultsPage() {
    const [results, setResults] = useState<StudentProgram[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/student/programs');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setResults(
                        data
                            .filter((p: StudentProgram) => p.rank !== undefined && p.rank !== null)
                            .sort((a: StudentProgram, b: StudentProgram) => (a.rank ?? 999) - (b.rank ?? 999))
                    );
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(250,204,21,0.14),transparent),radial-gradient(ellipse_100%_50%_at_100%_100%,rgba(168,85,247,0.1),transparent)]">
            <main className="max-w-lg mx-auto p-4 pb-10 space-y-6">
                <div className="flex items-center gap-3 pt-2">
                    <Link href="/student" className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">My Results</h1>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" /> Loading...
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-card/60 border border-white/10 rounded-2xl p-12 text-center text-muted-foreground">
                        No results published for you yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.map(p => (
                            <StudentProgramCard key={p.entryId} program={p} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
