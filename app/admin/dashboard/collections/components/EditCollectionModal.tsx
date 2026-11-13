'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Star,
    Trash2,
    Plus,
    Loader2,
    Pin,
    Eye,
    Tag,
    Image as ImageIcon,
    ExternalLink,
    Layers,
    Check,
} from 'lucide-react';
import { toast } from 'sonner';
import AssetPickerModal from './AssetPickerModal';
import Link from 'next/link';

interface CollectionData {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    tagRules: string[] | null;
    ruleMatchMode: string;
    isFeatured: boolean;
    status: string;
    coverImageId: string | null;
    coverImagePath: string | null;
    viewsCount?: number;
}

interface EditCollectionModalProps {
    isOpen: boolean;
    collectionId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditCollectionModal({
    isOpen,
    collectionId,
    onClose,
    onSuccess,
}: EditCollectionModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [collection, setCollection] = useState<CollectionData | null>(null);
    const [images, setImages] = useState<any[]>([]);
    const [totalImages, setTotalImages] = useState(0);

    // Form fields
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('published');
    const [isFeatured, setIsFeatured] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [ruleMatchMode, setRuleMatchMode] = useState('any');

    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);

    useEffect(() => {
        if (isOpen && collectionId) {
            fetchCollectionDetail();
        }
    }, [isOpen, collectionId]);

    const fetchCollectionDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/collections/${collectionId}?admin=1&limit=60`);
            if (res.ok) {
                const data = await res.json();
                setCollection(data.collection);
                setImages(data.images || []);
                setTotalImages(data.total || 0);

                setName(data.collection.name);
                setSlug(data.collection.slug);
                setDescription(data.collection.description || '');
                setStatus(data.collection.status);
                setIsFeatured(Boolean(data.collection.isFeatured));
                setTags(Array.isArray(data.collection.tagRules) ? data.collection.tagRules : []);
                setRuleMatchMode(data.collection.ruleMatchMode || 'any');
            } else {
                toast.error('Failed to load collection details');
                onClose();
            }
        } catch (e) {
            console.error('Error fetching collection:', e);
            toast.error('Error loading collection');
            onClose();
        } finally {
            setLoading(false);
        }
    };

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

    const handleSaveGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collectionId) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/collections/${collectionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    slug: slug.trim(),
                    description: description.trim() || null,
                    status,
                    isFeatured,
                    tagRules: tags,
                    ruleMatchMode,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update collection');
            }

            toast.success('Collection updated successfully');
            onSuccess();
            fetchCollectionDetail();
        } catch (e: any) {
            toast.error(e.message || 'Failed to update collection');
        } finally {
            setSaving(false);
        }
    };

    const handleSetCover = async (imageId: string) => {
        if (!collectionId) return;
        try {
            const res = await fetch(`/api/collections/${collectionId}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_cover', imageId }),
            });
            if (res.ok) {
                toast.success('Cover image updated');
                fetchCollectionDetail();
            }
        } catch (e) {
            toast.error('Failed to set cover image');
        }
    };

    const handleTogglePin = async (image: any) => {
        if (!collectionId) return;
        const newPinned = !image.isPinned;
        try {
            const res = await fetch(`/api/collections/${collectionId}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    imageId: image.id,
                    isPinned: newPinned,
                }),
            });
            if (res.ok) {
                toast.success(newPinned ? 'Image pinned to top' : 'Image unpinned');
                fetchCollectionDetail();
            }
        } catch (e) {
            toast.error('Failed to toggle pin');
        }
    };

    const handleRemoveImage = async (imageId: string) => {
        if (!collectionId) return;
        try {
            const res = await fetch(`/api/collections/${collectionId}/images?imageId=${imageId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                toast.success('Image removed from collection');
                fetchCollectionDetail();
            }
        } catch (e) {
            toast.error('Failed to remove image');
        }
    };

    const handleAddImages = async (newImageIds: string[]) => {
        if (!collectionId || newImageIds.length === 0) return;
        try {
            const res = await fetch(`/api/collections/${collectionId}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', imageIds: newImageIds }),
            });
            if (res.ok) {
                toast.success(`Added ${newImageIds.length} images to collection`);
                fetchCollectionDetail();
            }
        } catch (e) {
            toast.error('Failed to add images');
        }
    };

    if (!isOpen || !collectionId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header (Analytics Header Style) */}
                <div className="p-6 border-b border-card-border bg-card-header-bg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-foreground">
                                    {collection?.name || 'Edit Collection'}
                                </h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-glow/10 text-primary-glow border border-primary-glow/30">
                                    {collection?.type}
                                </span>
                            </div>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                {totalImages} image{totalImages === 1 ? '' : 's'} in collection · {collection?.viewsCount || 0} views
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {collection?.slug && (
                            <Link
                                href={`/collections/${collection.slug}`}
                                target="_blank"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card-bg hover:bg-white/5 border border-card-border hover:border-primary-glow/50 text-foreground text-xs font-semibold transition-all shadow-sm"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-primary-glow" />
                                <span>Public View</span>
                            </Link>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Layout */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Collection Form Card */}
                    <form
                        onSubmit={handleSaveGeneral}
                        className="lg:col-span-5 space-y-4 p-5 rounded-xl border border-card-border bg-card-header-bg/30 h-fit shadow-lg"
                    >
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary-glow border-b border-card-border pb-2 flex items-center gap-2">
                            <span>Collection Settings</span>
                        </h4>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                URL Slug
                            </label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                required
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary-glow transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                                >
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="editFeatured"
                                    checked={isFeatured}
                                    onChange={(e) => setIsFeatured(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-card-border focus:ring-primary-glow"
                                />
                                <label htmlFor="editFeatured" className="text-xs font-semibold text-foreground cursor-pointer">
                                    Featured Pack
                                </label>
                            </div>
                        </div>

                        {/* If Smart Collection: Show & Edit Tags */}
                        {collection?.type === 'smart_dynamic' && (
                            <div className="pt-3 border-t border-card-border space-y-2">
                                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                                    Smart Tag Rules
                                </label>
                                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-input-bg border border-input-border rounded-xl focus-within:border-primary-glow">
                                    {tags.map((t) => (
                                        <span
                                            key={t}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-tag-bg text-tag-text border border-tag-border text-xs font-semibold"
                                        >
                                            #{t}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(t)}
                                                className="text-foreground/50 hover:text-red-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                addTag(tagInput);
                                            }
                                        }}
                                        placeholder="Add tag..."
                                        className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                        >
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save Changes</span>
                        </button>
                    </form>

                    {/* Right Column: Manage Images Grid */}
                    <div className="lg:col-span-7 flex flex-col space-y-4">
                        <div className="p-4 rounded-xl border border-card-border bg-card-bg flex items-center justify-between shadow-md">
                            <div>
                                <h4 className="text-sm font-bold text-foreground">
                                    Collection Assets ({totalImages})
                                </h4>
                                <p className="text-xs text-foreground/60 mt-0.5">
                                    Hover to star cover, pin to top, or remove
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAssetPickerOpen(true)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Graphics</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-2 text-foreground/50 bg-card-bg border border-card-border rounded-xl">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-glow" />
                                <span className="text-xs font-medium">Loading collection assets...</span>
                            </div>
                        ) : images.length === 0 ? (
                            <div className="py-20 text-center text-foreground/50 border border-dashed border-card-border rounded-xl p-8 bg-card-bg">
                                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-foreground/30" />
                                <p className="text-sm font-bold text-foreground">No graphics in this collection yet</p>
                                <p className="text-xs text-foreground/60 mt-1">
                                    {collection?.type === 'smart_dynamic'
                                        ? 'No published images currently match the specified tags'
                                        : 'Click "Add Graphics" above to populate this collection'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[58vh] overflow-y-auto p-1">
                                {images.map((img) => {
                                    const isCover = collection?.coverImagePath === img.path;
                                    const isPinned = Boolean(img.isPinned);

                                    return (
                                        <div
                                            key={img.id}
                                            className={`group relative aspect-square rounded-xl overflow-hidden border bg-card-bg transition-all flex flex-col ${
                                                isCover
                                                    ? 'border-amber-500/80 ring-2 ring-amber-500/30'
                                                    : isPinned
                                                    ? 'border-primary-glow ring-2 ring-primary-glow/20'
                                                    : 'border-card-border hover:border-primary-glow/50'
                                            }`}
                                        >
                                            <div
                                                className="w-full h-full p-2.5 flex items-center justify-center relative"
                                                style={{
                                                    backgroundImage:
                                                        'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                                    backgroundSize: '10px 10px',
                                                    backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                                                }}
                                            >
                                                <img
                                                    src={img.path}
                                                    alt={img.name || img.filename}
                                                    className="max-w-full max-h-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                                                />
                                            </div>

                                            {/* Top badges */}
                                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
                                                {isCover && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold shadow-md">
                                                        COVER
                                                    </span>
                                                )}
                                                {isPinned && (
                                                    <span className="p-1 rounded-md bg-primary-glow text-white shadow-md" title="Pinned to top">
                                                        <Pin className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                            </div>

                                            {/* Hover Action Strip */}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/85 backdrop-blur-sm p-1.5 flex items-center justify-around opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetCover(img.id)}
                                                    className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer ${
                                                        isCover ? 'text-amber-400' : 'text-white/70 hover:text-amber-400'
                                                    }`}
                                                    title={isCover ? 'Current Cover' : 'Set as Cover Image'}
                                                >
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePin(img)}
                                                    className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer ${
                                                        isPinned ? 'text-primary-glow' : 'text-white/70 hover:text-primary-glow'
                                                    }`}
                                                    title={isPinned ? 'Unpin from top' : 'Pin to top of collection'}
                                                >
                                                    <Pin className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(img.id)}
                                                    className="p-1.5 rounded-lg hover:bg-white/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                                    title="Remove from collection"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Asset Picker Modal */}
            <AssetPickerModal
                isOpen={isAssetPickerOpen}
                onClose={() => setIsAssetPickerOpen(false)}
                onConfirm={handleAddImages}
                title="Add Graphics to this Collection"
            />
        </div>
    );
}
