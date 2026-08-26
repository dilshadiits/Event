'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Check, Gavel, Shuffle, Plus, Trash2, QrCode, CheckCircle2, ExternalLink, ScanLine, Upload, Image as ImageIcon, ClipboardList, ChevronDown, RefreshCw } from 'lucide-react';
import CriteriaBuilder, { Criterion } from '@/components/CriteriaBuilder';
import QRCodeModal from '@/components/QRCodeModal';
import EntryScorePanel from '@/components/EntryScorePanel';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';

interface Judge {
    id: string;
    name: string;
    email?: string;
}

interface ProgramDetail {
    id: string;
    name: string;
    type: 'solo' | 'team';
    mode: string;
    status: string;
    criteria: Criterion[];
    judgePanel: Judge[];
    posterUrl?: string;
}

interface Entry {
    id: string;
    participantId?: string;
    teamId?: string;
    name: string;
    chestNumber?: string;
    checkedIn: boolean;
    disqualified: boolean;
    rank?: number;
}

interface Candidate {
    id: string;
    name: string;
}

export default function ProgramDetailPage({ params }: { params: Promise<{ festId: string; programId: string }> }) {
    const { festId, programId } = use(params);
    const { data: session } = useSession();
    const canScoreAsAdmin = session?.user?.role === 'super-admin' || session?.user?.role === 'product-admin';
    const [program, setProgram] = useState<ProgramDetail | null>(null);
    const [availableJudges, setAvailableJudges] = useState<Judge[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingCriteria, setSavingCriteria] = useState(false);
    const [savingPanel, setSavingPanel] = useState(false);
    const [criteriaMessage, setCriteriaMessage] = useState('');
    const [panelMessage, setPanelMessage] = useState('');
    const [posterUrl, setPosterUrl] = useState('');
    const [uploadingPoster, setUploadingPoster] = useState(false);
    const [posterMessage, setPosterMessage] = useState('');
    const [festName, setFestName] = useState('');

    const [entries, setEntries] = useState<Entry[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
    const [addingEntries, setAddingEntries] = useState(false);
    const [entriesMessage, setEntriesMessage] = useState('');
    const [shuffling, setShuffling] = useState(false);
    const [shuffleMessage, setShuffleMessage] = useState('');
    const [chestCardEntry, setChestCardEntry] = useState<Entry | null>(null);
    const [expandedScoreEntryId, setExpandedScoreEntryId] = useState<string | null>(null);
    const [closingJudging, setClosingJudging] = useState(false);
    const [closeJudgingMessage, setCloseJudgingMessage] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [publishMessage, setPublishMessage] = useState('');
    const [report, setReport] = useState<{ totalEntries: number; checkedIn: number; noShows: number } | null>(null);

    const fetchProgram = useCallback(async () => {
        try {
            const [progRes, judgeRes] = await Promise.all([
                fetch(`/api/programs/${programId}`),
                fetch(`/api/users?role=judge&festId=${festId}`),
            ]);
            const progData = await progRes.json();
            const judgeData = await judgeRes.json();
            if (progData?.id) {
                setProgram(progData);
                setCriteria(progData.criteria || []);
                setSelectedJudgeIds((progData.judgePanel || []).map((j: Judge) => j.id));
                setPosterUrl(progData.posterUrl || '');

                const [entriesRes, candidatesRes, reportRes] = await Promise.all([
                    fetch(`/api/programs/${programId}/entries`),
                    fetch(progData.type === 'team'
                        ? `/api/teams?festId=${festId}`
                        : `/api/participants?festId=${festId}`),
                    fetch(`/api/programs/${programId}/report`),
                ]);
                const entriesData = await entriesRes.json();
                const candidatesData = await candidatesRes.json();
                const reportData = await reportRes.json();
                const entryList: Entry[] = Array.isArray(entriesData) ? entriesData : [];
                setEntries(entryList);
                if (reportData?.totalEntries !== undefined) setReport(reportData);

                const enteredIds = new Set(entryList.map(e => e.participantId || e.teamId));
                if (Array.isArray(candidatesData)) {
                    setCandidates(candidatesData.filter((c: Candidate) => !enteredIds.has(c.id)));
                }
            }
            if (Array.isArray(judgeData)) setAvailableJudges(judgeData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [festId, programId]);

    useEffect(() => { fetchProgram(); }, [fetchProgram]);
    useEffect(() => {
        fetch(`/api/fests/${festId}`).then(res => res.json()).then(data => setFestName(data?.name || ''));
    }, [festId]);

    const toggleCandidate = (id: string) => {
        setSelectedCandidateIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const addEntries = async () => {
        if (!program) return;
        setAddingEntries(true);
        setEntriesMessage('');
        const body = program.type === 'team'
            ? { teamIds: selectedCandidateIds }
            : { participantIds: selectedCandidateIds };
        const res = await fetch(`/api/programs/${programId}/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            setSelectedCandidateIds([]);
            fetchProgram();
        } else {
            setEntriesMessage(data.error || 'Failed to add entries');
        }
        setAddingEntries(false);
    };

    const removeEntry = async (entryId: string) => {
        if (!confirm('Remove this entry from the program?')) return;
        const res = await fetch(`/api/programs/${programId}/entries/${entryId}`, { method: 'DELETE' });
        if (res.ok) fetchProgram();
        else {
            const data = await res.json();
            alert(data.error || 'Failed to remove entry');
        }
    };

    const shuffleChestNumbers = async (force = false) => {
        setShuffling(true);
        setShuffleMessage('');
        const res = await fetch(`/api/programs/${programId}/shuffle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force }),
        });
        const data = await res.json();
        if (res.ok) {
            setShuffleMessage(`Shuffled chest numbers for ${data.count} entries.`);
            fetchProgram();
        } else if (res.status === 409 && !force) {
            if (confirm(data.error + '\n\nRe-shuffle anyway?')) {
                await shuffleChestNumbers(true);
                return;
            }
        } else {
            setShuffleMessage(data.error || 'Failed to shuffle chest numbers');
        }
        setShuffling(false);
    };

    const closeJudging = async () => {
        if (!confirm('Close judging for this program? Judges will no longer be able to submit or edit scores.')) return;
        setClosingJudging(true);
        setCloseJudgingMessage('');
        const res = await fetch(`/api/programs/${programId}/close-judging`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) fetchProgram();
        else setCloseJudgingMessage(data.error || 'Failed to close judging');
        setClosingJudging(false);
    };

    const publishResults = async (isUpdate = false) => {
        const confirmMessage = isUpdate
            ? 'Recompute ranks for this program? Use this after correcting a judge\'s score - it updates the public results, standings, and certificates to match.'
            : 'Publish results for this program? This computes final ranks and makes them visible on the public results page (if the fest has public results enabled).';
        if (!confirm(confirmMessage)) return;
        setPublishing(true);
        setPublishMessage('');
        const res = await fetch(`/api/programs/${programId}/publish-results`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) fetchProgram();
        else setPublishMessage(data.error || 'Failed to publish results');
        setPublishing(false);
    };

    const saveCriteria = async () => {
        setSavingCriteria(true);
        setCriteriaMessage('');
        const res = await fetch(`/api/programs/${programId}/criteria`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ criteria: criteria.filter(c => c.label.trim()) }),
        });
        const data = await res.json();
        setCriteriaMessage(res.ok ? 'Criteria saved.' : (data.error || 'Failed to save criteria'));
        setSavingCriteria(false);
    };

    const toggleJudge = (id: string) => {
        setSelectedJudgeIds(prev => prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]);
    };

    const savePanel = async () => {
        setSavingPanel(true);
        setPanelMessage('');
        const res = await fetch(`/api/programs/${programId}/panel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ judgePanel: selectedJudgeIds }),
        });
        const data = await res.json();
        setPanelMessage(res.ok ? 'Judge panel updated.' : (data.error || 'Failed to update panel'));
        setSavingPanel(false);
    };

    const uploadPoster = async (file: File) => {
        setUploadingPoster(true);
        setPosterMessage('');
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
            setPosterMessage(uploadData.error || 'Failed to upload poster');
            setUploadingPoster(false);
            return;
        }
        const saveRes = await fetch(`/api/programs/${programId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ posterUrl: uploadData.url }),
        });
        if (saveRes.ok) {
            setPosterUrl(uploadData.url);
        } else {
            setPosterMessage('Uploaded, but failed to save to the program.');
        }
        setUploadingPoster(false);
    };

    const removePoster = async () => {
        if (!confirm('Remove the poster for this program?')) return;
        const res = await fetch(`/api/programs/${programId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ posterUrl: '' }),
        });
        if (res.ok) setPosterUrl('');
    };

    if (loading || !program) {
        return (
            <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
                <AdminBreadcrumbs items={[
                    { label: 'Competitions', href: '/admin/competitions' },
                    { label: festName || 'Fest', href: `/admin/competitions/${festId}` },
                    { label: 'Programs', href: `/admin/competitions/${festId}/programs` },
                    { label: program.name },
                ]} />
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/competitions/${festId}/programs`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{program.name}</h1>
                        <p className="text-sm text-muted-foreground capitalize">{program.type} &middot; {program.mode} &middot; {program.status.replace(/-/g, ' ')}</p>
                    </div>
                </div>
                {canScoreAsAdmin && (program.status === 'chest-numbers-shuffled' || program.status === 'in-progress') && (
                    <Link
                        href={`/judge/programs/${programId}/score`}
                        className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-cyan-500/30"
                    >
                        <Gavel className="w-4 h-4" />
                        Score as Admin
                    </Link>
                )}
                {(program.status === 'chest-numbers-shuffled' || program.status === 'in-progress') && (
                    <button
                        onClick={closeJudging}
                        disabled={closingJudging}
                        className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-red-500/30"
                    >
                        {closingJudging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Close Judging
                    </button>
                )}
                {program.status === 'judging-closed' && (
                    <button
                        onClick={() => publishResults(false)}
                        disabled={publishing}
                        className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/40 disabled:opacity-50 text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-green-500/30"
                    >
                        {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Publish Results
                    </button>
                )}
                {program.status === 'results-published' && (
                    <>
                        <button
                            onClick={() => publishResults(true)}
                            disabled={publishing}
                            title="Recompute ranks - use after correcting a judge's score"
                            className="flex items-center gap-2 bg-muted/50 hover:bg-muted disabled:opacity-50 text-muted-foreground hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-border"
                        >
                            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Update Results
                        </button>
                        <Link
                            href={`/results/${festId}/programs/${programId}`}
                            target="_blank"
                            className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-green-500/30"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View Public Result
                        </Link>
                    </>
                )}
            </div>
            </div>
            {closeJudgingMessage && <p className="text-sm text-red-400">{closeJudgingMessage}</p>}
            {publishMessage && <p className="text-sm text-green-400">{publishMessage}</p>}

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-cyan-400" /> Poster
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-full sm:w-40 aspect-3/4 rounded-lg overflow-hidden bg-muted/30 border border-border shrink-0">
                        {posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={posterUrl} alt="Program poster" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Shown as the event&apos;s cover image on the student schedule and public results.
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <label className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-cyan-500/30 cursor-pointer">
                                {uploadingPoster ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {posterUrl ? 'Change Poster' : 'Upload Poster'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingPoster}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadPoster(file);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            {posterUrl && (
                                <button
                                    onClick={removePoster}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-red-400 px-3 py-2 rounded-lg text-sm transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remove
                                </button>
                            )}
                        </div>
                        {posterMessage && <p className="text-sm text-red-400">{posterMessage}</p>}
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Judging Criteria</h2>
                <CriteriaBuilder criteria={criteria} onChange={setCriteria} />
                {criteriaMessage && <p className="text-sm text-pink-400">{criteriaMessage}</p>}
                <button
                    onClick={saveCriteria}
                    disabled={savingCriteria || criteria.filter(c => c.label.trim()).length === 0}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    {savingCriteria ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Criteria
                </button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-orange-400" /> Judge Panel
                </h2>
                {availableJudges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No judge accounts yet. Add judges from the <Link href={`/admin/competitions/${festId}/judges`} className="text-orange-400 hover:underline">Judges &amp; Admins</Link> page first.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {availableJudges.map(j => {
                            const selected = selectedJudgeIds.includes(j.id);
                            return (
                                <button
                                    key={j.id}
                                    type="button"
                                    onClick={() => toggleJudge(j.id)}
                                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${selected
                                        ? 'bg-orange-600 text-white border-orange-600'
                                        : 'bg-muted/50 text-muted-foreground border-border hover:border-orange-500/50'
                                        }`}
                                >
                                    {j.name}
                                </button>
                            );
                        })}
                    </div>
                )}
                {panelMessage && <p className="text-sm text-orange-400">{panelMessage}</p>}
                <button
                    onClick={savePanel}
                    disabled={savingPanel}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    {savingPanel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Panel
                </button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg font-bold text-white">Entries ({entries.length})</h2>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/admin/competitions/${festId}/programs/${programId}/scan`}
                            className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-purple-500/30"
                        >
                            <ScanLine className="w-4 h-4" />
                            Scan Check-in
                        </Link>
                        <button
                            onClick={() => shuffleChestNumbers(false)}
                            disabled={shuffling || entries.length === 0}
                            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 disabled:opacity-50 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-blue-500/30"
                        >
                            {shuffling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                            Shuffle Chest Numbers
                        </button>
                    </div>
                </div>
                {report && report.totalEntries > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-center">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-lg font-bold text-white">{report.totalEntries}</div>
                        </div>
                        <div className="bg-green-900/20 border border-green-900/50 rounded-lg px-3 py-2 text-center">
                            <div className="text-xs text-green-400">Checked In</div>
                            <div className="text-lg font-bold text-green-400">{report.checkedIn}</div>
                        </div>
                        <div className="bg-orange-900/20 border border-orange-900/50 rounded-lg px-3 py-2 text-center">
                            <div className="text-xs text-orange-400">No-shows</div>
                            <div className="text-lg font-bold text-orange-400">{report.noShows}</div>
                        </div>
                    </div>
                )}
                {shuffleMessage && <p className="text-sm text-blue-400">{shuffleMessage}</p>}

                {candidates.length > 0 && (
                    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            Add {program.type === 'team' ? 'teams' : 'participants'} to this program
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {candidates.map(c => {
                                const selected = selectedCandidateIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => toggleCandidate(c.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${selected
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-muted/50 text-muted-foreground border-border hover:border-blue-500/50'
                                            }`}
                                    >
                                        {c.name}
                                    </button>
                                );
                            })}
                        </div>
                        {entriesMessage && <p className="text-sm text-red-400">{entriesMessage}</p>}
                        <button
                            onClick={addEntries}
                            disabled={selectedCandidateIds.length === 0 || addingEntries}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            {addingEntries ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add {selectedCandidateIds.length > 0 ? `(${selectedCandidateIds.length})` : ''}
                        </button>
                    </div>
                )}

                {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                    <div className="divide-y divide-border/50">
                        {[...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map(entry => {
                            const scoresOpen = expandedScoreEntryId === entry.id;
                            return (
                                <div key={entry.id}>
                                    <div className="py-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                                {entry.chestNumber || '-'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white flex items-center gap-2">
                                                    {entry.name}
                                                    {entry.rank && (
                                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                                            Rank #{entry.rank}
                                                        </span>
                                                    )}
                                                </div>
                                                {entry.checkedIn && (
                                                    <span className="flex items-center gap-1 text-xs text-green-400">
                                                        <CheckCircle2 className="w-3 h-3" /> Checked in
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {entry.chestNumber && (
                                                <button
                                                    onClick={() => setExpandedScoreEntryId(scoresOpen ? null : entry.id)}
                                                    className={`p-2 rounded-lg transition-all flex items-center gap-1 ${scoresOpen ? 'text-cyan-400 bg-cyan-500/10' : 'text-muted-foreground hover:text-white hover:bg-white/10'}`}
                                                    title="View / edit judge scores"
                                                >
                                                    <ClipboardList className="w-5 h-5" />
                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${scoresOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                            {entry.chestNumber && (
                                                <button
                                                    onClick={() => setChestCardEntry(entry)}
                                                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                    title="View chest card QR"
                                                >
                                                    <QrCode className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => removeEntry(entry.id)}
                                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    {scoresOpen && (
                                        <EntryScorePanel programId={programId} entryId={entry.id} onChanged={fetchProgram} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <QRCodeModal
                isOpen={!!chestCardEntry}
                onClose={() => setChestCardEntry(null)}
                value={chestCardEntry?.id || ''}
                name={chestCardEntry?.chestNumber ? `Chest #${chestCardEntry.chestNumber}` : ''}
                eventName={program.name}
                showName={false}
                downloadLabel="Chest_Card"
            />
        </main>
    );
}
