'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Tag,
    Hand,
    Plus,
    X,
    Check,
    Loader2,
    Eye,
    Layers,
    ChevronRight,
    HelpCircle,
    SlidersHorizontal,
    CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import AssetPickerModal from './AssetPickerModal';

interface CreateCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCollectionModal({
    isOpen,
    onClose,
    onSuccess,
}: CreateCollectionModalProps) {
    const [mode, setMode] = useState<'smart' | 'manual' | 'ai'>('smart');
    const [loading, setLoading] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'published' | 'draft'>('published');
    const [isFeatured, setIsFeatured] = useState(false);

    // Smart mode fields
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [ruleMatchMode, setRuleMatchMode] = useState<'any' | 'all'>('any');
    const [smartType, setSmartType] = useState<'smart_dynamic' | 'smart_snapshot'>('smart_dynamic');
    const [previewMatchCount, setPreviewMatchCount] = useState<number | null>(null);
    const [previewSampleImages, setPreviewSampleImages] = useState<any[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Manual mode fields
    const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);

    // AI mode fields
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);

    // Available popular tags for quick clicking
    const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
            fetchPopularTags();
        }
    }, [isOpen]);

    const resetForm = () => {
        setName('');
        setSlug('');
        setDescription('');
        setStatus('published');
        setIsFeatured(false);
        setTags([]);
        setTagInput('');
        setRuleMatchMode('any');
        setSmartType('smart_dynamic');
        setPreviewMatchCount(null);
        setPreviewSampleImages([]);
        setSelectedImageIds([]);
        setAiPrompt('');
    };

    const fetchPopularTags = async () => {
        try {
            const res = await fetch('/api/images?status=published');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const counts = new Map<string, number>();
                    data.forEach((img: any) => {
                        if (Array.isArray(img.tags)) {
                            img.tags.forEach((t: string) => {
                                if (typeof t === 'string' && t.trim()) {
                                    const clean = t.trim().toLowerCase();
                                    counts.set(clean, (counts.get(clean) || 0) + 1);
                                }
                            });
                        }
                    });
                    const sorted = Array.from(counts.entries())
                        .map(([tag, count]) => ({ tag, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 12);
                    setPopularTags(sorted);
                }
            }
        } catch (e) {
            console.error('Failed to load popular tags:', e);
        }
    };

    const handleNameChange = (val: string) => {
        setName(val);
        const derived = val
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setSlug(derived);
    };

    // Debounced matching preview
    useEffect(() => {
        if (tags.length === 0) {
            setPreviewMatchCount(null);
            setPreviewSampleImages([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoadingPreview(true);
            try {
                const res = await fetch('/api/collections/preview-tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tags, mode: ruleMatchMode }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setPreviewMatchCount(data.count);
                    setPreviewSampleImages(data.sampleImages || []);
                }
            } catch (e) {
                console.error('Failed to preview tag matches:', e);
            } finally {
                setLoadingPreview(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [tags, ruleMatchMode]);

    const addTag = (raw: string) => {
        const clean = raw.trim().toLowerCase();
        if (clean && !tags.includes(clean)) {
            setTags((prev) => [...prev, clean]);
        }
        setTagInput('');
    };

    const removeTag = (t: string) => {
        setTags((prev) => prev.filter((item) => item !== t));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        }
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
            toast.error('Please enter a topic or concept for the AI');
            return;
        }

        setAiGenerating(true);
        try {
            const res = await fetch('/api/collections/generate-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate collection with AI');
            }

            setName(data.name);
            setSlug(data.slug);
            setDescription(data.description);
            setTags(data.tags || []);
            setRuleMatchMode('any');
            setPreviewMatchCount(data.matchCount);
            setPreviewSampleImages(data.sampleImages || []);
            setMode('smart');
            toast.success('Collection drafted by Gemini AI!');
        } catch (e: any) {
            toast.error(e.message || 'AI generation failed');
        } finally {
            setAiGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Collection name is required');
            return;
        }

        if (mode === 'smart' && tags.length === 0) {
            toast.error('Please add at least one tag for the smart collection rule');
            return;
        }

        if (mode === 'manual' && selectedImageIds.length === 0) {
            toast.error('Please select at least one image for manual collections');
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                name: name.trim(),
                slug: slug.trim() || undefined,
                description: description.trim() || null,
                status,
                isFeatured,
            };

            if (mode === 'smart') {
                payload.type = smartType;
                payload.tagRules = tags;
                payload.ruleMatchMode = ruleMatchMode;
            } else {
                payload.type = 'manual';
                payload.imageIds = selectedImageIds;
            }

            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create collection');
            }

            toast.success(`Collection "${data.name}" created successfully!`);
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Failed to create collection');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 border-b border-card-border bg-card-header-bg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Create New Collection</h3>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Bundle transparent PNGs by holiday, aesthetic, or automated tag rules.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Selector Tabs (Analytics Filter Bar Style) */}
                <div className="px-6 py-3 border-b border-card-border bg-card-bg/50">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-card-header-bg border border-card-border rounded-xl text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setMode('smart')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                                mode === 'smart'
                                    ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                    : 'text-foreground/60 hover:text-foreground'
                            }`}
                        >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Smart Tag Rules</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                                mode === 'manual'
                                    ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                    : 'text-foreground/60 hover:text-foreground'
                            }`}
                        >
                            <Hand className="w-3.5 h-3.5" />
                            <span>Manual Curated</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('ai')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                                mode === 'ai'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                    : 'text-foreground/60 hover:text-foreground'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Assistant</span>
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* AI Prompt Section */}
                    {mode === 'ai' && (
                        <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-3 shadow-lg">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Sparkles className="w-4 h-4" />
                                <h4 className="text-xs font-bold uppercase tracking-wider">
                                    Gemini AI Collection Curator
                                </h4>
                            </div>
                            <p className="text-xs text-foreground/70 leading-relaxed">
                                Enter a theme or holiday (e.g. <em>&ldquo;Christmas winter clipart, bells and snowflakes&rdquo;</em>). Gemini will craft the title, SEO description, and resolve all matching tags in your catalog.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g. Christmas, winter holidays, santa, snow..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerateWithAi();
                                        }
                                    }}
                                    className="flex-1 bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-purple-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleGenerateWithAi}
                                    disabled={aiGenerating}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {aiGenerating ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Curating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Generate</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Basic Info Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                Collection Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g. Christmas Clipart Pack"
                                required
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="christmas-clipart-pack"
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary-glow transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                                >
                                    <option value="published">Published (Visible on site)</option>
                                    <option value="draft">Draft (Admin only)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Short engaging description for search engines and visitors..."
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow resize-none"
                            />
                        </div>
                    </div>

                    {/* Mode Specific: Smart Tag Rules */}
                    {mode === 'smart' && (
                        <div className="p-5 rounded-xl border border-primary-glow/20 bg-primary-glow/5 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-primary-glow flex items-center gap-1.5">
                                    <Tag className="w-4 h-4" />
                                    <span>Included Tags for Auto-Matching</span>
                                </label>
                                <span className="text-[11px] text-foreground/50">Press Enter or comma to add</span>
                            </div>

                            {/* Tags Input Box with Chips */}
                            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-input-bg border border-input-border rounded-xl min-h-[48px] focus-within:border-primary-glow">
                                {tags.map((t) => (
                                    <span
                                        key={t}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-tag-bg text-tag-text border border-tag-border text-xs font-semibold"
                                    >
                                        #{t}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(t)}
                                            className="text-foreground/50 hover:text-red-400 cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={() => tagInput.trim() && addTag(tagInput)}
                                    placeholder={tags.length === 0 ? "Type tag e.g. 'christmas'..." : "Add tag..."}
                                    className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground focus:outline-none py-1"
                                />
                            </div>

                            {/* Popular Tags Suggestion Chips */}
                            {popularTags.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/50">
                                        Frequent Library Tags:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {popularTags.map(({ tag, count }) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => addTag(tag)}
                                                className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                                    tags.includes(tag)
                                                        ? 'bg-primary-glow text-white border-primary-glow'
                                                        : 'bg-card-bg border-card-border text-foreground/70 hover:text-foreground hover:border-primary-glow/50'
                                                }`}
                                            >
                                                +{tag} <span className="text-[10px] opacity-60">({count})</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rules & Sync Behavior */}
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-primary-glow/10">
                                <div>
                                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                        Match Logic
                                    </label>
                                    <select
                                        value={ruleMatchMode}
                                        onChange={(e) => setRuleMatchMode(e.target.value as any)}
                                        className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-glow"
                                    >
                                        <option value="any">Match ANY tag (broadest, OR)</option>
                                        <option value="all">Match ALL tags (strict, AND)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                        Sync Behavior
                                    </label>
                                    <select
                                        value={smartType}
                                        onChange={(e) => setSmartType(e.target.value as any)}
                                        className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-glow"
                                    >
                                        <option value="smart_dynamic">Live Dynamic (auto-includes new uploads)</option>
                                        <option value="smart_snapshot">Snapshot (one-time freeze)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Live Matching Preview Widget */}
                            <div className="p-3.5 rounded-xl bg-card-bg border border-card-border flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <Eye className="w-4 h-4 text-primary-glow" />
                                    <span className="text-xs font-semibold text-foreground">
                                        {loadingPreview ? (
                                            'Calculating matching graphics...'
                                        ) : previewMatchCount !== null ? (
                                            <>
                                                Matches{' '}
                                                <strong className="text-primary-glow font-bold text-sm">
                                                    {previewMatchCount}
                                                </strong>{' '}
                                                published graphics in catalog
                                            </>
                                        ) : (
                                            'Add tags above to preview live match count'
                                        )}
                                    </span>
                                </div>

                                {previewSampleImages.length > 0 && (
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {previewSampleImages.slice(0, 4).map((img, i) => (
                                            <img
                                                key={img.id || i}
                                                src={img.path}
                                                alt=""
                                                className="inline-block h-7 w-7 rounded-full ring-2 ring-card-bg object-contain bg-foreground/5 p-0.5"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mode Specific: Manual Curated */}
                    {mode === 'manual' && (
                        <div className="p-5 rounded-xl border border-card-border bg-card-header-bg/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Hand-Pick Images
                                    </h4>
                                    <p className="text-xs text-foreground/60 mt-0.5">
                                        {selectedImageIds.length} images selected from library
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAssetPickerOpen(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Browse Library</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Featured Pack Checkbox */}
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="isFeatured"
                            checked={isFeatured}
                            onChange={(e) => setIsFeatured(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-card-border focus:ring-primary-glow"
                        />
                        <label htmlFor="isFeatured" className="text-xs font-semibold text-foreground cursor-pointer">
                            Feature this collection on the homepage and top banner
                        </label>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-card-border flex items-center justify-between bg-card-header-bg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-card-border hover:bg-white/5 text-foreground transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Create Collection</span>
                    </button>
                </div>
            </div>

            {/* Asset Picker Modal */}
            <AssetPickerModal
                isOpen={isAssetPickerOpen}
                onClose={() => setIsAssetPickerOpen(false)}
                initialSelectedIds={selectedImageIds}
                onConfirm={(ids) => setSelectedImageIds(ids)}
            />
        </div>
    );
}
