'use client';

import React, { useState, useEffect } from 'react';
import { Search, Check, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageItem {
    id: string;
    filename: string;
    path: string;
    name?: string | null;
    tags?: string[];
    luminance?: string | null;
    contrastBgDark?: string | null;
    contrastBgLight?: string | null;
}

interface AssetPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    initialSelectedIds?: string[];
    title?: string;
}

export default function AssetPickerModal({
    isOpen,
    onClose,
    onConfirm,
    initialSelectedIds = [],
    title = 'Select Graphics from Catalog',
}: AssetPickerModalProps) {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(initialSelectedIds);
            fetchImages();
        }
    }, [isOpen]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/images?status=published');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setImages(data);
                }
            }
        } catch (e) {
            console.error('Failed to load images:', e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredImages = images.filter((img) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        if (img.name?.toLowerCase().includes(q)) return true;
        if (img.filename.toLowerCase().includes(q)) return true;
        if (Array.isArray(img.tags) && img.tags.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
    });

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllVisible = () => {
        const visibleIds = filteredImages.map((img) => img.id);
        const allSelected = visibleIds.every((id) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header (Analytics Style) */}
                <div className="p-6 border-b border-card-border bg-card-header-bg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">{title}</h3>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                {selectedIds.length} graphic{selectedIds.length === 1 ? '' : 's'} selected
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

                {/* Toolbar */}
                <div className="p-4 border-b border-card-border bg-card-bg flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter by title, tag, or filename..."
                            className="w-full bg-input-bg border border-input-border rounded-xl pl-10 pr-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary-glow"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="text-xs font-bold px-3.5 py-2 rounded-xl border border-card-border hover:border-primary-glow/50 bg-card-bg hover:bg-white/5 text-foreground transition-all cursor-pointer shadow-sm"
                    >
                        Toggle Select Visible ({filteredImages.length})
                    </button>
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-foreground/50">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-glow" />
                            <span className="text-xs font-medium">Loading catalog assets...</span>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-foreground/50">
                            <ImageIcon className="w-10 h-10 mb-2 text-foreground/30" />
                            <p className="text-sm font-bold text-foreground">No graphics match this filter</p>
                            <p className="text-xs text-foreground/60 mt-1">Try another search term</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {filteredImages.map((img) => {
                                const isSelected = selectedIds.includes(img.id);
                                return (
                                    <div
                                        key={img.id}
                                        onClick={() => toggleSelect(img.id)}
                                        className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-primary-glow ring-2 ring-primary-glow/30 bg-primary-glow/10 shadow-lg'
                                                : 'border-card-border hover:border-primary-glow/50 bg-card-bg'
                                        }`}
                                    >
                                        <div
                                            className="w-full h-full p-2 flex items-center justify-center relative"
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
                                                className="max-w-full max-h-full object-contain pointer-events-none transition-transform group-hover:scale-105"
                                            />
                                        </div>

                                        {/* Selection Checkbox Pill */}
                                        <div
                                            className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                                isSelected
                                                    ? 'bg-primary-glow text-white shadow-md'
                                                    : 'bg-black/50 text-transparent border border-white/40 group-hover:bg-black/70'
                                            }`}
                                        >
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>

                                        {/* Hover Overlay Title */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[10px] text-white truncate font-medium">
                                                {img.name || img.filename}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer (Analytics Style) */}
                <div className="p-4 border-t border-card-border flex items-center justify-between bg-card-header-bg">
                    <span className="text-xs font-semibold text-foreground/60">
                        {selectedIds.length} selected
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold rounded-xl border border-card-border hover:bg-white/5 text-foreground transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm(selectedIds);
                                onClose();
                            }}
                            className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Confirm Selection ({selectedIds.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
