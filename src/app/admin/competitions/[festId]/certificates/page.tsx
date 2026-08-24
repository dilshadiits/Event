'use client';
import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Download, Trash2, Award, ImageIcon } from 'lucide-react';
import { loadImage, compositeOverlays, downloadCanvasAsPng, type Overlay } from '@/lib/certificateGen';

interface ProgramOption {
    id: string;
    name: string;
    resultsPublished: boolean;
}

interface ResultEntry {
    entryId: string;
    name: string;
    rank: number;
    chestNumber?: string;
}

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export default function CertificatesPage({ params }: { params: Promise<{ festId: string }> }) {
    const { festId } = use(params);
    const [festName, setFestName] = useState('');
    const [certificateTemplate, setCertificateTemplate] = useState('');
    const [posterTemplate, setPosterTemplate] = useState('');
    const [programs, setPrograms] = useState<ProgramOption[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [results, setResults] = useState<ResultEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingCert, setUploadingCert] = useState(false);
    const [uploadingPoster, setUploadingPoster] = useState(false);
    const [savingTemplates, setSavingTemplates] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
    const [posterGenerating, setPosterGenerating] = useState(false);
    const [message, setMessage] = useState('');

    const fetchFest = useCallback(async () => {
        try {
            const [festRes, programsRes] = await Promise.all([
                fetch(`/api/fests/${festId}`),
                fetch(`/api/programs?festId=${festId}`),
            ]);
            const festData = await festRes.json();
            const programsData = await programsRes.json();
            if (festData?.id) {
                setFestName(festData.name);
                setCertificateTemplate(festData.certificateTemplate || '');
                setPosterTemplate(festData.posterTemplate || '');
            }
            if (Array.isArray(programsData)) {
                setPrograms(programsData.filter((p: ProgramOption) => p.resultsPublished));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [festId]);

    useEffect(() => { fetchFest(); }, [fetchFest]);

    useEffect(() => {
        if (!selectedProgramId) { setResults([]); return; }
        (async () => {
            const res = await fetch(`/api/programs/${selectedProgramId}/results-export`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.entries)) setResults(data.entries);
        })();
    }, [selectedProgramId]);

    const uploadTemplate = async (file: File, kind: 'certificate' | 'poster') => {
        const setUploading = kind === 'certificate' ? setUploadingCert : setUploadingPoster;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                if (kind === 'certificate') setCertificateTemplate(data.url);
                else setPosterTemplate(data.url);
            } else {
                setMessage('Upload failed');
            }
        } finally {
            setUploading(false);
        }
    };

    const saveTemplates = async () => {
        setSavingTemplates(true);
        setMessage('');
        const res = await fetch(`/api/fests/${festId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificateTemplate, posterTemplate }),
        });
        setMessage(res.ok ? 'Templates saved.' : 'Failed to save templates.');
        setSavingTemplates(false);
    };

    const selectedProgram = programs.find(p => p.id === selectedProgramId);

    const generateCertificates = async () => {
        if (!certificateTemplate || results.length === 0 || !selectedProgram) return;
        setGenerating(true);
        setGenProgress({ current: 0, total: results.length });
        try {
            const template = await loadImage(certificateTemplate);
            for (let i = 0; i < results.length; i++) {
                const entry = results[i];
                setGenProgress({ current: i + 1, total: results.length });

                const overlays: Overlay[] = [
                    {
                        type: 'text', text: selectedProgram.name,
                        x: template.width / 2, y: template.height * 0.42,
                        font: `bold ${Math.floor(template.width * 0.035)}px Arial`, color: '#000000', align: 'center',
                    },
                    {
                        type: 'text', text: entry.name,
                        x: template.width / 2, y: template.height * 0.55,
                        font: `bold ${Math.floor(template.width * 0.05)}px Arial`, color: '#000000', align: 'center',
                    },
                    {
                        type: 'text', text: `${ordinal(entry.rank)} Place`,
                        x: template.width / 2, y: template.height * 0.65,
                        font: `${Math.floor(template.width * 0.03)}px Arial`, color: '#000000', align: 'center',
                    },
                    {
                        type: 'text', text: festName,
                        x: template.width / 2, y: template.height * 0.88,
                        font: `${Math.floor(template.width * 0.02)}px Arial`, color: '#333333', align: 'center',
                    },
                ];

                const canvas = document.createElement('canvas');
                compositeOverlays(canvas, template, overlays);
                downloadCanvasAsPng(canvas, `${entry.name.replace(/\s+/g, '_')}_${selectedProgram.name.replace(/\s+/g, '_')}_Certificate.png`);

                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (err) {
            console.error(err);
            setMessage('Failed to generate certificates - check the template image URL.');
        } finally {
            setGenerating(false);
            setGenProgress({ current: 0, total: 0 });
        }
    };

    const generatePoster = async () => {
        if (!posterTemplate || results.length === 0 || !selectedProgram) return;
        setPosterGenerating(true);
        try {
            const template = await loadImage(posterTemplate);
            const top = results.slice(0, 3);

            const overlays: Overlay[] = [
                {
                    type: 'text', text: selectedProgram.name,
                    x: template.width / 2, y: template.height * 0.35,
                    font: `bold ${Math.floor(template.width * 0.04)}px Arial`, color: '#000000', align: 'center',
                },
                ...top.map((entry, idx): Overlay => ({
                    type: 'text',
                    text: `${ordinal(entry.rank)} - ${entry.name}`,
                    x: template.width / 2,
                    y: template.height * (0.48 + idx * 0.08),
                    font: `${Math.floor(template.width * 0.028)}px Arial`,
                    color: '#000000',
                    align: 'center',
                })),
                {
                    type: 'text', text: festName,
                    x: template.width / 2, y: template.height * 0.9,
                    font: `${Math.floor(template.width * 0.02)}px Arial`, color: '#333333', align: 'center',
                },
            ];

            const canvas = document.createElement('canvas');
            compositeOverlays(canvas, template, overlays);
            downloadCanvasAsPng(canvas, `${selectedProgram.name.replace(/\s+/g, '_')}_Results_Poster.png`);
        } catch (err) {
            console.error(err);
            setMessage('Failed to generate poster - check the template image URL.');
        } finally {
            setPosterGenerating(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/admin/competitions/${festId}`} className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Certificates &amp; Posters</h1>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">Templates</h2>
                <p className="text-xs text-muted-foreground">
                    Upload a certificate template (per participant) and a results poster template (per program, top 3). Text is composited onto fixed positions - center-focused layouts work best.
                </p>

                {[
                    { label: 'Certificate Template', value: certificateTemplate, set: setCertificateTemplate, uploading: uploadingCert, kind: 'certificate' as const },
                    { label: 'Poster Template', value: posterTemplate, set: setPosterTemplate, uploading: uploadingPoster, kind: 'poster' as const },
                ].map(t => (
                    <div key={t.kind}>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">{t.label}</label>
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0], t.kind)}
                                className="hidden"
                                id={`${t.kind}Upload`}
                                disabled={t.uploading}
                            />
                            <label
                                htmlFor={`${t.kind}Upload`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors ${t.uploading ? 'bg-muted text-muted-foreground' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'}`}
                            >
                                {t.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                Upload Image
                            </label>
                            {t.value && (
                                <button onClick={() => t.set('')} className="p-2 text-muted-foreground hover:text-red-400 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {t.value && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={t.value} alt={t.label} className="h-32 object-contain rounded border border-border" />
                        )}
                    </div>
                ))}

                <button
                    onClick={saveTemplates}
                    disabled={savingTemplates}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    {savingTemplates ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Templates'}
                </button>
                {message && <p className="text-sm text-purple-400">{message}</p>}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" /> Generate
                </h2>

                {programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No programs have published results yet.</p>
                ) : (
                    <>
                        <select
                            value={selectedProgramId}
                            onChange={(e) => setSelectedProgramId(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="" className="bg-black">Select a program...</option>
                            {programs.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name}</option>)}
                        </select>

                        {selectedProgramId && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={generateCertificates}
                                    disabled={!certificateTemplate || results.length === 0 || generating}
                                    className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/40 disabled:opacity-50 text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-green-500/30"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {genProgress.current}/{genProgress.total}
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Generate All Certificates ({results.length})
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={generatePoster}
                                    disabled={!posterTemplate || results.length === 0 || posterGenerating}
                                    className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/40 disabled:opacity-50 text-yellow-400 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-yellow-500/30"
                                >
                                    {posterGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Download Poster
                                </button>
                            </div>
                        )}
                        {!certificateTemplate && selectedProgramId && (
                            <p className="text-xs text-muted-foreground">Upload a certificate template above to enable certificate generation.</p>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
