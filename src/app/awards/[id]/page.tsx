/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trophy, Award, Trash2, Eye, EyeOff, Users, Vote, Link as LinkIcon, Check, Loader2, Image as ImageIcon, Settings, Crown, Medal, BarChart3, Radio, Edit2, X, ChevronUp, ChevronDown, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Category {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    showResults: boolean;
}

interface Nominee {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string | null;
    categoryName: string;
    position: number;
}

interface Recipient {
    id: string;
    name: string;
    additionalName?: string;
    category?: string;
    followerCount: number;
    token: string;
    status: string;
}

const FOLLOWER_CATEGORIES = [
    '5k to 10k',
    '10k to 100k',
    '100k to 500k',
    '500k to 1m',
    '1m plus',
    'Guest'
];

interface VoteResult {
    categoryId: string;
    categoryName: string;
    showResults: boolean;
    totalVotes: number;
    leaderboard: {
        nomineeId: string;
        nomineeName: string;
        voteCount?: number;
    }[];
}

export default function AwardEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [categories, setCategories] = useState<Category[]>([]);
    const [nominees, setNominees] = useState<Nominee[]>([]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    // Recipients
    const [uploadingRecipients, setUploadingRecipients] = useState(false);
    const [recipientFile, setRecipientFile] = useState<File | null>(null);
    const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
    const [editRecipientName, setEditRecipientName] = useState('');
    const [editRecipientAdditionalName, setEditRecipientAdditionalName] = useState('');
    const [editRecipientCategory, setEditRecipientCategory] = useState('');
    const [editRecipientFollowerCount, setEditRecipientFollowerCount] = useState(0);
    const [savingRecipient, setSavingRecipient] = useState(false);
    const [loading, setLoading] = useState(true);

    // Category form
    const [newCatName, setNewCatName] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [creatingCat, setCreatingCat] = useState(false);

    // Category edit modal
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editCatName, setEditCatName] = useState('');
    const [editCatDesc, setEditCatDesc] = useState('');
    const [savingCategory, setSavingCategory] = useState(false);

    // Nominee form
    const [newNomineeName, setNewNomineeName] = useState('');
    const [newNomineeDesc, setNewNomineeDesc] = useState('');
    const [newNomineeImage, setNewNomineeImage] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [creatingNominee, setCreatingNominee] = useState(false);

    // Nominee edit modal
    const [editingNominee, setEditingNominee] = useState<Nominee | null>(null);
    const [editNomineeName, setEditNomineeName] = useState('');
    const [editNomineeDesc, setEditNomineeDesc] = useState('');
    const [editNomineeImage, setEditNomineeImage] = useState('');
    const [editNomineeCategory, setEditNomineeCategory] = useState('');
    const [savingNominee, setSavingNominee] = useState(false);

    // Event settings
    const [headerImage, setHeaderImage] = useState('');
    const [newSponsorImage, setNewSponsorImage] = useState('');
    const [sponsorImages, setSponsorImages] = useState<string[]>([]);
    const [digitalMediaSponsorIndex, setDigitalMediaSponsorIndex] = useState(-1);
    const [savingSettings, setSavingSettings] = useState(false);

    const [copied, setCopied] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);
    const [bulkUpdating, setBulkUpdating] = useState<string | null>(null);



    // Live results
    const [results, setResults] = useState<VoteResult[]>([]);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [catRes, nomRes, eventRes, recipientsDataRes] = await Promise.all([
                fetch(`/api/categories?eventId=${id}`),
                fetch(`/api/nominees?awardEventId=${id}`),
                fetch(`/api/awards/${id}`),
                fetch(`/api/awards/${id}/recipients`)
            ]);

            const catData = await catRes.json();
            const nomData = await nomRes.json();
            const eventDataRes = await eventRes.json();
            const recipientsRes = await recipientsDataRes.json();

            if (Array.isArray(catData)) setCategories(catData);
            if (Array.isArray(nomData)) setNominees(nomData);
            if (Array.isArray(recipientsRes)) setRecipients(recipientsRes);
            if (eventDataRes && !eventDataRes.error) {
                setHeaderImage(eventDataRes.headerImage || '');
                setSponsorImages(eventDataRes.sponsorImages || []);
                setDigitalMediaSponsorIndex(eventDataRes.digitalMediaSponsorIndex ?? -1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch live results
    const fetchResults = useCallback(async () => {
        try {
            const res = await fetch(`/api/award-votes?awardEventId=${id}&admin=true`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setResults(data);
                setLastRefresh(new Date());
            }
        } catch (err) {
            console.error('Error fetching results:', err);
        }
    }, [id]);

    // Auto-refresh results every 5 seconds
    useEffect(() => {
        fetchResults();
        const interval = setInterval(fetchResults, 5000);
        return () => clearInterval(interval);
    }, [fetchResults]);

    const copyVotingLink = () => {
        const url = `${window.location.origin}/awards/${id}/vote`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Category CRUD
    const createCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim() || creatingCat) return;

        setCreatingCat(true);
        try {
            await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: id, name: newCatName, description: newCatDesc })
            });
            setNewCatName('');
            setNewCatDesc('');
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setCreatingCat(false);
        }
    };

    const toggleCategoryActive = async (cat: Category) => {
        setUpdating(cat.id);
        try {
            await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cat.id, isActive: !cat.isActive })
            });
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(null);
        }
    };

    const toggleCategoryResults = async (cat: Category) => {
        setUpdating(cat.id);
        try {
            await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: cat.id, showResults: !cat.showResults })
            });
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(null);
        }
    };

    // Bulk actions for all categories
    const bulkUpdateCategories = async (action: 'publishAll' | 'hideAll' | 'stopAll' | 'startAll') => {
        setBulkUpdating(action);
        try {
            await fetch('/api/categories', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: id, action })
            });
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setBulkUpdating(null);
        }
    };

    const deleteCategory = async (catId: string) => {
        if (!confirm('Delete this category?')) return;
        try {
            await fetch(`/api/categories?id=${catId}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    // Open edit modal for category
    const openEditCategory = (cat: Category) => {
        setEditingCategory(cat);
        setEditCatName(cat.name);
        setEditCatDesc(cat.description || '');
    };

    // Save edited category
    const saveEditedCategory = async () => {
        if (!editingCategory || !editCatName.trim() || savingCategory) return;

        setSavingCategory(true);
        try {
            const res = await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingCategory.id,
                    name: editCatName,
                    description: editCatDesc
                })
            });

            if (res.ok) {
                setEditingCategory(null);
                fetchData();
            } else {
                const data = await res.json();
                console.error('Failed to update category:', data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSavingCategory(false);
        }
    };

    // Nominee CRUD
    const createNominee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNomineeName.trim() || creatingNominee) return;

        setCreatingNominee(true);
        try {
            await fetch('/api/nominees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    awardEventId: id,
                    categoryId: selectedCategory || undefined,
                    name: newNomineeName,
                    description: newNomineeDesc,
                    imageUrl: newNomineeImage
                })
            });
            setNewNomineeName('');
            setNewNomineeDesc('');
            setNewNomineeImage('');
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setCreatingNominee(false);
        }
    };

    const deleteNominee = async (nomineeId: string) => {
        if (!confirm('Delete this nominee?')) return;
        try {
            await fetch(`/api/nominees?id=${nomineeId}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    // Open edit modal for nominee
    const openEditNominee = (nominee: Nominee) => {
        setEditingNominee(nominee);
        setEditNomineeName(nominee.name);
        setEditNomineeDesc(nominee.description || '');
        setEditNomineeImage(nominee.imageUrl || '');
        setEditNomineeCategory(nominee.categoryId || '');
    };

    // Save edited nominee
    const saveEditedNominee = async () => {
        if (!editingNominee || !editNomineeName.trim() || savingNominee) return;

        setSavingNominee(true);
        try {
            const res = await fetch('/api/nominees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingNominee.id,
                    name: editNomineeName,
                    description: editNomineeDesc,
                    imageUrl: editNomineeImage,
                    categoryId: editNomineeCategory || null
                })
            });

            if (res.ok) {
                setEditingNominee(null);
                fetchData();
            } else {
                const data = await res.json();
                console.error('Failed to update nominee:', data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSavingNominee(false);
        }
    };

    // Move nominee up or down within category
    const moveNominee = async (nominee: Nominee, direction: 'up' | 'down') => {
        const categoryNominees = nominees
            .filter(n => n.categoryId === nominee.categoryId)
            .sort((a, b) => a.position - b.position);

        const currentIndex = categoryNominees.findIndex(n => n.id === nominee.id);
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (swapIndex < 0 || swapIndex >= categoryNominees.length) return;

        const swapNominee = categoryNominees[swapIndex];

        // Use the array indices as the new positions to ensure the swap works
        // even when nominees have the same position value
        try {
            await fetch('/api/nominees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    positions: [
                        { id: nominee.id, position: swapIndex },
                        { id: swapNominee.id, position: currentIndex }
                    ]
                })
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    // Group nominees by category
    const getNomineesByCategory = () => {
        const grouped: { [key: string]: { categoryName: string; nominees: Nominee[] } } = {};

        // First add "All Categories" group
        const uncategorized = nominees.filter(n => !n.categoryId);
        if (uncategorized.length > 0) {
            grouped['uncategorized'] = { categoryName: 'All Categories', nominees: uncategorized.sort((a, b) => a.position - b.position) };
        }

        // Then add each category
        categories.forEach(cat => {
            const catNominees = nominees.filter(n => n.categoryId === cat.id);
            if (catNominees.length > 0) {
                grouped[cat.id] = { categoryName: cat.name, nominees: catNominees.sort((a, b) => a.position - b.position) };
            }
        });

        return grouped;
    };

    // Event settings
    const saveEventSettings = async () => {
        setSavingSettings(true);
        try {
            await fetch(`/api/awards/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headerImage,
                    sponsorImages,
                    digitalMediaSponsorIndex
                })
            });
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setSavingSettings(false);
        }
    };

    // Download winners as PDF
    const downloadWinnersPDF = () => {
        if (results.length === 0) return;

        setGeneratingPdf(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Title
            doc.setFontSize(20);
            doc.setTextColor(128, 0, 128); // Purple
            doc.text('Award Winners', pageWidth / 2, 20, { align: 'center' });

            // Subtitle with date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 28, { align: 'center' });

            let yPosition = 40;

            results.forEach((result, index) => {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Category header
                doc.setFontSize(14);
                doc.setTextColor(75, 0, 130);
                doc.text(`${index + 1}. ${result.categoryName}`, 14, yPosition);

                // Total votes
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`Total Votes: ${result.totalVotes}`, pageWidth - 14, yPosition, { align: 'right' });

                yPosition += 6;

                // Winner info
                if (result.leaderboard.length > 0) {
                    const tableData = result.leaderboard.slice(0, 5).map((entry, idx) => [
                        idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`,
                        entry.nomineeName,
                        entry.voteCount?.toString() || '0'
                    ]);

                    autoTable(doc, {
                        startY: yPosition,
                        head: [['Rank', 'Nominee', 'Votes']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { fillColor: [128, 0, 128], textColor: 255, fontSize: 9 },
                        bodyStyles: { fontSize: 9 },
                        columnStyles: {
                            0: { cellWidth: 15, halign: 'center' },
                            1: { cellWidth: 'auto' },
                            2: { cellWidth: 25, halign: 'center' }
                        },
                        margin: { left: 14, right: 14 }
                    });

                    // Get final Y position after table
                    yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
                } else {
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.text('No votes in this category', 14, yPosition + 5);
                    yPosition += 20;
                }
            });

            // Save the PDF
            doc.save(`Award_Winners_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const addSponsorImage = () => {
        if (newSponsorImage.trim() && sponsorImages.length < 10) {
            setSponsorImages([...sponsorImages, newSponsorImage.trim()]);
            setNewSponsorImage('');
        }
    };

    const removeSponsorImage = (index: number) => {
        setSponsorImages(sponsorImages.filter((_, i) => i !== index));
        // Adjust digitalMediaSponsorIndex if needed
        if (index === digitalMediaSponsorIndex) {
            setDigitalMediaSponsorIndex(-1); // Reset if removed sponsor was the digital media sponsor
        } else if (index < digitalMediaSponsorIndex) {
            setDigitalMediaSponsorIndex(digitalMediaSponsorIndex - 1); // Adjust index
        }
    };

    const handleRecipientFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientFile) return;

        setUploadingRecipients(true);
        const formData = new FormData();
        formData.append('file', recipientFile);

        try {
            const res = await fetch(`/api/awards/${id}/recipients`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setRecipientFile(null);
                // Reset file input if possible, or reload recipients
                const recipientsData = await fetch(`/api/awards/${id}/recipients`).then(r => r.json());
                if (Array.isArray(recipientsData)) setRecipients(recipientsData);
                alert('Recipients uploaded successfully');
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Upload failed');
        } finally {
            setUploadingRecipients(false);
        }
    };

    const openEditRecipient = (recipient: Recipient) => {
        setEditingRecipient(recipient);
        setEditRecipientName(recipient.name);
        setEditRecipientAdditionalName(recipient.additionalName || '');
        setEditRecipientCategory(recipient.category || '');
        setEditRecipientFollowerCount(recipient.followerCount);
    };

    const saveEditedRecipient = async () => {
        if (!editingRecipient || !editRecipientName.trim() || savingRecipient) return;

        setSavingRecipient(true);
        try {
            const res = await fetch(`/api/awards/${id}/recipients`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: editingRecipient.id,
                    name: editRecipientName,
                    additionalName: editRecipientAdditionalName,
                    category: editRecipientCategory,
                    followerCount: editRecipientFollowerCount
                })
            });

            if (res.ok) {
                setEditingRecipient(null);
                fetchData();
            } else {
                const data = await res.json();
                console.error('Failed to update recipient:', data.error);
                alert(`Failed to update: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update recipient');
        } finally {
            setSavingRecipient(false);
        }
    };



    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </main>
        );
    }

    return (
        <main className="min-h-screen p-3 sm:p-4 md:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Link href="/awards" className="p-2 hover:bg-muted rounded-lg transition-colors -ml-2">
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                            Award Management
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">Manage categories and nominees</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={copyVotingLink}
                        className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-4 py-2 rounded-lg transition-all border border-purple-500/30"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Voting Link'}
                    </button>
                    <Link
                        href={`/awards/${id}/vote`}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Vote className="w-4 h-4" />
                        Open Voting Page
                    </Link>
                </div>
            </header>

            {/* Event Settings - Images */}
            <section className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-purple-400" />
                    <h2 className="font-bold text-white">Event Branding</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Header Image */}
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Header/Banner Image URL
                        </label>
                        <input
                            type="url"
                            value={headerImage}
                            onChange={(e) => setHeaderImage(e.target.value)}
                            placeholder="https://example.com/banner.jpg"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        {headerImage && (
                            <img src={headerImage} alt="Header preview" className="w-full h-20 object-cover rounded-lg border border-border" />
                        )}
                    </div>

                    {/* Sponsor Images */}
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Sponsor Logo URLs ({sponsorImages.length}/10)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={newSponsorImage}
                                onChange={(e) => setNewSponsorImage(e.target.value)}
                                placeholder="Sponsor logo URL"
                                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={addSponsorImage}
                                disabled={!newSponsorImage.trim() || sponsorImages.length >= 10}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        {sponsorImages.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {sponsorImages.map((url, i) => (
                                    <div key={i} className="relative group">
                                        <img src={url} alt={`Sponsor ${i + 1}`} className="w-12 h-12 object-contain rounded border border-border bg-white/10" />
                                        <button
                                            type="button"
                                            onClick={() => removeSponsorImage(i)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Digital Media Sponsor Selector */}
                    {sponsorImages.length > 0 && (
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-muted-foreground flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Digital Media Sponsor (displays next to Main Sponsor)
                            </label>
                            <select
                                value={digitalMediaSponsorIndex}
                                onChange={(e) => setDigitalMediaSponsorIndex(parseInt(e.target.value))}
                                className="w-full md:w-auto bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value={-1}>None Selected</option>
                                {sponsorImages.map((url, i) => (
                                    <option key={i} value={i}>
                                        Sponsor {i + 1} {i === 0 ? '(Main Sponsor)' : ''}
                                    </option>
                                ))}
                            </select>
                            {digitalMediaSponsorIndex >= 0 && digitalMediaSponsorIndex < sponsorImages.length && (
                                <div className="flex items-center gap-2 text-xs text-cyan-400">
                                    <img
                                        src={sponsorImages[digitalMediaSponsorIndex]}
                                        alt="Digital Media Sponsor Preview"
                                        className="w-10 h-10 object-contain rounded border border-cyan-500/30 bg-white/10"
                                    />
                                    <span>Selected as Digital Media Sponsor</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={saveEventSettings}
                    disabled={savingSettings}
                    className="mt-4 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Branding
                </button>
            </section>

            {/* Recipient Management Section */}
            <section className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <h2 className="font-bold text-white">Award Recipients & Tokens</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-sm text-muted-foreground block">
                            Upload Excel (Columns: &quot;Name&quot;, &quot;Follower Count&quot;, &quot;Ticket Number&quot;)
                        </label>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => setRecipientFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-purple-50, file:text-purple-700
                                hover:file:bg-purple-100"
                        />
                    </div>
                    <button
                        onClick={handleRecipientFileUpload}
                        disabled={!recipientFile || uploadingRecipients}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all h-10"
                    >
                        {uploadingRecipients ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload & Generate Tickets'}
                    </button>
                </div>



                {recipients.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-200 uppercase bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Name</th>
                                    <th className="px-4 py-3">Followers</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Token</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipients.map((recipient) => (
                                    <tr key={recipient.id} className="bg-card border-b border-border hover:bg-muted/10">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{recipient.name}</div>
                                            {recipient.additionalName && (
                                                <div className="text-xs text-muted-foreground">{recipient.additionalName}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{recipient.followerCount.toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            {recipient.category ? (
                                                <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20">
                                                    {recipient.category}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-purple-400">{recipient.token}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${recipient.status === 'generated' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                {recipient.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => openEditRecipient(recipient)}
                                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Edit Recipient Modal */}
            {editingRecipient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border w-full max-w-md rounded-xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Edit Recipient</h3>
                            <button onClick={() => setEditingRecipient(null)} className="text-muted-foreground hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <input
                                    type="text"
                                    value={editRecipientName}
                                    onChange={(e) => setEditRecipientName(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Additional Name</label>
                                <input
                                    type="text"
                                    value={editRecipientAdditionalName}
                                    onChange={(e) => setEditRecipientAdditionalName(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="e.g. Spouse, Partner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Category</label>
                                <select
                                    value={editRecipientCategory}
                                    onChange={(e) => setEditRecipientCategory(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="">Select Category</option>
                                    {FOLLOWER_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Follower Count</label>
                                <input
                                    type="number"
                                    value={editRecipientFollowerCount}
                                    onChange={(e) => setEditRecipientFollowerCount(Number(e.target.value))}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={saveEditedRecipient}
                                disabled={savingRecipient || !editRecipientName.trim()}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {savingRecipient ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Categories Section */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-4 border-b border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-purple-400" />
                                Award Categories
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => bulkUpdateCategories('stopAll')}
                                    disabled={bulkUpdating !== null || categories.length === 0}
                                    className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    {bulkUpdating === 'stopAll' ? <Loader2 className="w-3 h-3 animate-spin" /> : <EyeOff className="w-3 h-3" />}
                                    Stop All Voting
                                </button>
                                <button
                                    onClick={() => bulkUpdateCategories('publishAll')}
                                    disabled={bulkUpdating !== null || categories.length === 0}
                                    className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    {bulkUpdating === 'publishAll' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                    Publish All Results
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Add Category Form */}
                    <form onSubmit={createCategory} className="p-4 border-b border-border/50 space-y-3">
                        <input
                            type="text"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            placeholder="Category name (e.g., Best Influencer)"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCatDesc}
                                onChange={(e) => setNewCatDesc(e.target.value)}
                                placeholder="Description (optional)"
                                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newCatName.trim() || creatingCat}
                                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            >
                                {creatingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add
                            </button>
                        </div>
                    </form>

                    {/* Categories List */}
                    {categories.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                            No categories yet. Add one above.
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
                            {categories.map((cat) => (
                                <div key={cat.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                                    <div className="flex-1">
                                        <span className="font-medium text-white">{cat.name}</span>
                                        {cat.description && (
                                            <p className="text-xs text-muted-foreground">{cat.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => toggleCategoryActive(cat)}
                                        disabled={updating === cat.id}
                                        className={`text-xs px-2 py-1 rounded border ${cat.isActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                                    >
                                        {cat.isActive ? 'Open' : 'Closed'}
                                    </button>
                                    <button
                                        onClick={() => toggleCategoryResults(cat)}
                                        disabled={updating === cat.id}
                                        className={`p-1.5 rounded border ${cat.showResults ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-muted/50 text-muted-foreground border-border'}`}
                                        title={cat.showResults ? 'Results visible' : 'Results hidden'}
                                    >
                                        {cat.showResults ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => openEditCategory(cat)}
                                        className="p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 rounded"
                                        title="Edit category"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => deleteCategory(cat.id)}
                                        className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Nominees Section */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-4 border-b border-border">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-yellow-400" />
                            Nominees
                        </h2>
                    </div>

                    {/* Add Nominee Form */}
                    <form onSubmit={createNominee} className="p-4 border-b border-border/50 space-y-3">
                        <input
                            type="text"
                            value={newNomineeName}
                            onChange={(e) => setNewNomineeName(e.target.value)}
                            placeholder="Nominee name"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                        />
                        <input
                            type="url"
                            value={newNomineeImage}
                            onChange={(e) => setNewNomineeImage(e.target.value)}
                            placeholder="Nominee image URL (optional)"
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                disabled={!newNomineeName.trim() || creatingNominee}
                                className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            >
                                {creatingNominee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add
                            </button>
                        </div>
                    </form>

                    {/* Nominees List - Grouped by Category */}
                    {nominees.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                            No nominees yet. Add one above.
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto">
                            {Object.entries(getNomineesByCategory()).map(([categoryId, { categoryName, nominees: catNominees }]) => (
                                <div key={categoryId} className="border-b border-border/50 last:border-b-0">
                                    {/* Category Header */}
                                    <div className="px-4 py-2 bg-muted/30 border-b border-border/30">
                                        <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">
                                            {categoryName} ({catNominees.length})
                                        </span>
                                    </div>
                                    {/* Nominees in Category */}
                                    <div className="divide-y divide-border/30">
                                        {catNominees.map((nominee, index) => (
                                            <div key={nominee.id} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 hover:bg-muted/30">
                                                {/* Position Controls */}
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => moveNominee(nominee, 'up')}
                                                        disabled={index === 0}
                                                        className="p-0.5 text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Move up"
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveNominee(nominee, 'down')}
                                                        disabled={index === catNominees.length - 1}
                                                        className="p-0.5 text-muted-foreground hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Move down"
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {/* Position Badge */}
                                                <span className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">
                                                    {index + 1}
                                                </span>
                                                {/* Nominee Avatar */}
                                                {nominee.imageUrl ? (
                                                    <img src={nominee.imageUrl} alt={nominee.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                                                        {nominee.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                {/* Nominee Info */}
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium text-white text-sm truncate block">{nominee.name}</span>
                                                </div>
                                                {/* Actions */}
                                                <button
                                                    onClick={() => openEditNominee(nominee)}
                                                    className="p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 rounded"
                                                    title="Edit nominee"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => deleteNominee(nominee.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded"
                                                    title="Delete nominee"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Live Poll Results */}
            <section className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-green-400" />
                            Live Poll Results
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/30">
                                <Radio className="w-3 h-3 animate-pulse" />
                                Live
                            </span>
                            {lastRefresh && (
                                <span className="text-xs text-muted-foreground">
                                    Updated {lastRefresh.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={downloadWinnersPDF}
                                disabled={generatingPdf || results.length === 0}
                                className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                {generatingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {generatingPdf ? 'Generating...' : 'Download PDF'}
                            </button>
                        </div>
                    </div>
                </div>

                {results.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                        No votes yet. Results will appear here as votes come in.
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {results.map((result) => {
                            const maxVotes = result.leaderboard.length > 0
                                ? Math.max(...result.leaderboard.map(l => l.voteCount || 0))
                                : 0;

                            return (
                                <div key={result.categoryId} className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Award className="w-4 h-4 text-purple-400" />
                                            <span className="font-medium text-white">{result.categoryName}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {result.totalVotes} vote{result.totalVotes !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {result.leaderboard.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No votes in this category yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {result.leaderboard.slice(0, 5).map((entry, idx) => {
                                                const percentage = maxVotes > 0 && entry.voteCount
                                                    ? (entry.voteCount / maxVotes) * 100
                                                    : 0;

                                                return (
                                                    <div key={entry.nomineeId} className="flex items-center gap-3">
                                                        <div className="w-5 flex justify-center">
                                                            {idx === 0 ? <Crown className="w-4 h-4 text-yellow-400" /> :
                                                                idx === 1 ? <Medal className="w-4 h-4 text-gray-300" /> :
                                                                    idx === 2 ? <Medal className="w-4 h-4 text-amber-600" /> :
                                                                        <span className="text-xs text-muted-foreground">{idx + 1}</span>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-sm font-medium text-white">{entry.nomineeName}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {entry.voteCount || 0} votes
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{categories.length}</div>
                    <div className="text-xs text-muted-foreground">Categories</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{nominees.length}</div>
                    <div className="text-xs text-muted-foreground">Nominees</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{categories.filter(c => c.isActive).length}</div>
                    <div className="text-xs text-muted-foreground">Open for Voting</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{categories.filter(c => c.showResults).length}</div>
                    <div className="text-xs text-muted-foreground">Results Public</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">{results.reduce((sum, r) => sum + r.totalVotes, 0)}</div>
                    <div className="text-xs text-muted-foreground">Total Votes</div>
                </div>
            </div>

            {/* Edit Nominee Modal */}
            {editingNominee && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setEditingNominee(null)}
                            className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-white rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-yellow-400" />
                            Edit Nominee
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={editNomineeName}
                                    onChange={(e) => setEditNomineeName(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                                    placeholder="Nominee name"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Description</label>
                                <textarea
                                    value={editNomineeDesc}
                                    onChange={(e) => setEditNomineeDesc(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="Brief description (optional)"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Image URL</label>
                                <input
                                    type="url"
                                    value={editNomineeImage}
                                    onChange={(e) => setEditNomineeImage(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                                    placeholder="https://example.com/image.jpg (optional)"
                                />
                                {editNomineeImage && (
                                    <img src={editNomineeImage} alt="Preview" className="mt-2 w-16 h-16 object-cover rounded-lg border border-border" />
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Category</label>
                                <select
                                    value={editNomineeCategory}
                                    onChange={(e) => setEditNomineeCategory(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setEditingNominee(null)}
                                    className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEditedNominee}
                                    disabled={!editNomineeName.trim() || savingNominee}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    {savingNominee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setEditingCategory(null)}
                            className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-white rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-purple-400" />
                            Edit Category
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={editCatName}
                                    onChange={(e) => setEditCatName(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Category name"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Description</label>
                                <textarea
                                    value={editCatDesc}
                                    onChange={(e) => setEditCatDesc(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="Brief description (optional)"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setEditingCategory(null)}
                                    className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEditedCategory}
                                    disabled={!editCatName.trim() || savingCategory}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
