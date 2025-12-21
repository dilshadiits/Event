'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, EyeOff, Award, Loader2 } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    showResults: boolean;
}

interface AwardCategoryManagerProps {
    eventId: string;
}

export default function AwardCategoryManager({ eventId }: AwardCategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDesc, setNewCategoryDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`/api/categories?eventId=${eventId}`);
            const data = await res.json();
            if (Array.isArray(data)) setCategories(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const createCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || creating) return;

        setCreating(true);
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    name: newCategoryName,
                    description: newCategoryDesc
                })
            });

            if (res.ok) {
                setNewCategoryName('');
                setNewCategoryDesc('');
                fetchCategories();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const toggleResults = async (category: Category) => {
        setUpdating(category.id);
        try {
            await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: category.id,
                    showResults: !category.showResults
                })
            });
            fetchCategories();
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(null);
        }
    };

    const toggleActive = async (category: Category) => {
        setUpdating(category.id);
        try {
            await fetch('/api/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: category.id,
                    isActive: !category.isActive
                })
            });
            fetchCategories();
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(null);
        }
    };

    const deleteCategory = async (id: string) => {
        if (!confirm('Delete this category? All votes for this category will be lost.')) return;

        try {
            await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
            fetchCategories();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 animate-pulse">
                    <Award className="w-5 h-5 text-purple-500" />
                    <span className="text-muted-foreground">Loading categories...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-4 border-b border-border">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Award Categories
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Manage voting categories for this event</p>
            </div>

            {/* Add New Category */}
            <form onSubmit={createCategory} className="p-4 border-b border-border/50 space-y-3">
                <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name (e.g., Best Influencer)"
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCategoryDesc}
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newCategoryName.trim() || creating}
                        className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                    </button>
                </div>
            </form>

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                    No categories yet. Add one above to start collecting votes.
                </div>
            ) : (
                <div className="divide-y divide-border/50">
                    {categories.map((category) => (
                        <div key={category.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/30 transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{category.name}</span>
                                    {!category.isActive && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                            Closed
                                        </span>
                                    )}
                                </div>
                                {category.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Toggle Voting */}
                                <button
                                    onClick={() => toggleActive(category)}
                                    disabled={updating === category.id}
                                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${category.isActive
                                            ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                        }`}
                                >
                                    {category.isActive ? 'Open' : 'Closed'}
                                </button>

                                {/* Toggle Results */}
                                <button
                                    onClick={() => toggleResults(category)}
                                    disabled={updating === category.id}
                                    className={`p-2 rounded-lg border transition-all ${category.showResults
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                            : 'bg-muted/50 text-muted-foreground border-border'
                                        }`}
                                    title={category.showResults ? 'Results visible' : 'Results hidden'}
                                >
                                    {updating === category.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : category.showResults ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => deleteCategory(category.id)}
                                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Delete category"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
