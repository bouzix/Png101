'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ImageCard from '../../components/ImageCard';
import { slugify } from '@/lib/utils';
import {
    Layers,
    Share2,
    Check,
    Tag,
    ChevronRight,
    ArrowLeft,
    Sparkles,
    Calendar,
    Eye,
    Star,
} from 'lucide-react';
import { toast } from 'sonner';

interface ImageItem {
    id: string;
    name?: string | null;
    filename: string;
    path: string;
    luminance?: string | null;
    contrastBgDark?: string | null;
    contrastBgLight?: string | null;
    isPinned?: boolean;
}

interface CollectionDetailProps {
    collection: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        coverImagePath: string | null;
        tagRules: string[] | null;
        ruleMatchMode: string;
        type: string;
        viewsCount: number;
        createdAt: string;
    };
    initialImages: ImageItem[];
    total: number;
    relatedCollections: {
        id: string;
        name: string;
        slug: string;
        coverImagePath: string | null;
        imageCount: number;
    }[];
}

export default function CollectionDetailClient({
    collection,
    initialImages,
    total,
    relatedCollections,
}: CollectionDetailProps) {
    const [images] = useState<ImageItem[]>(initialImages);
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Collection URL copied to clipboard!');
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div className="space-y-10 pb-16">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs text-foreground/50">
                <Link href="/" className="hover:text-foreground transition-colors">
                    Home
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/collections" className="hover:text-foreground transition-colors">
                    Collections
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground/90 font-semibold truncate max-w-xs">
                    {collection.name}
                </span>
            </nav>

            {/* Collection Hero Banner Card (GlassCard Style) */}
            <div className="relative rounded-2xl border border-card-border bg-card-bg p-6 sm:p-10 shadow-xl overflow-hidden">
                {/* Subtle Glows */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary-glow/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            href="/collections"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground py-1 px-3 rounded-lg border border-card-border hover:bg-white/5 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>All Collections</span>
                        </Link>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            <Layers className="w-3 h-3" />
                            <span>Curated Pack</span>
                        </span>

                        <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-card-header-bg border border-card-border text-foreground/80">
                            {total} Transparent PNG{total === 1 ? '' : 's'}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight">
                        {collection.name}
                    </h1>

                    {collection.description && (
                        <p className="text-sm sm:text-base text-foreground/70 leading-relaxed max-w-2xl">
                            {collection.description}
                        </p>
                    )}

                    {/* Associated Theme Tags */}
                    {Array.isArray(collection.tagRules) && collection.tagRules.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-foreground/50 mr-1 flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-primary-glow" /> Themes:
                            </span>
                            {collection.tagRules.map((t) => (
                                <Link
                                    key={t}
                                    href={`/search?q=${encodeURIComponent(t)}`}
                                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-tag-bg hover:bg-tag-bg-hover text-tag-text border border-tag-border transition-colors"
                                >
                                    #{t}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className="pt-3 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleShare}
                            className="px-4 py-2 rounded-xl bg-card-bg hover:bg-white/5 border border-card-border hover:border-primary-glow/50 text-foreground text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Link Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-3.5 h-3.5 text-primary-glow" />
                                    <span>Share Collection</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Graphics Grid Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-card-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-6 rounded-full bg-primary-glow shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                Graphics in this Pack ({total})
                            </h2>
                            <p className="text-xs text-foreground/50 mt-0.5">
                                Click any graphic for dimensions, high-res previews, and instant download
                            </p>
                        </div>
                    </div>
                </div>

                {images.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-card-border rounded-xl p-8 bg-card-bg shadow-xl">
                        <Layers className="w-10 h-10 mx-auto mb-2 text-foreground/30" />
                        <p className="text-sm font-bold text-foreground">No graphics in this collection currently</p>
                        <p className="text-xs text-foreground/60 mt-1">Check back soon as assets are added.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {images.map((img) => (
                            <Link
                                key={img.id}
                                href={`/images/${img.id}-${slugify(img.name || img.filename || '')}`}
                                className="group block"
                            >
                                <ImageCard
                                    src={img.path}
                                    luminance={img.luminance}
                                    contrastBgDark={img.contrastBgDark}
                                    contrastBgLight={img.contrastBgLight}
                                />
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* More Collections Recommendation */}
            {relatedCollections.length > 0 && (
                <section className="space-y-6 pt-10 border-t border-card-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span>More Collections You May Like</span>
                            </h3>
                            <p className="text-xs text-foreground/50 mt-0.5">
                                Browse more cohesive transparent graphic kits
                            </p>
                        </div>

                        <Link
                            href="/collections"
                            className="text-xs font-bold text-primary-glow hover:underline flex items-center gap-1"
                        >
                            <span>Browse All</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {relatedCollections.map((rel) => (
                            <Link
                                key={rel.id}
                                href={`/collections/${rel.slug}`}
                                className="group rounded-xl border border-card-border bg-card-bg p-4 hover:border-primary-glow/50 hover:shadow-xl transition-all flex items-center gap-4"
                            >
                                <div
                                    className="w-16 h-16 rounded-lg bg-foreground/[0.03] border border-card-border p-2 flex items-center justify-center shrink-0 overflow-hidden"
                                    style={{
                                        backgroundImage:
                                            'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                        backgroundSize: '10px 10px',
                                        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                                    }}
                                >
                                    {rel.coverImagePath ? (
                                        <img
                                            src={rel.coverImagePath}
                                            alt={rel.name}
                                            className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <Layers className="w-6 h-6 text-foreground/30" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary-glow transition-colors truncate">
                                        {rel.name}
                                    </h4>
                                    <span className="text-xs text-foreground/50 mt-0.5 block">
                                        {rel.imageCount} PNG{rel.imageCount === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-foreground/40 group-hover:text-primary-glow group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
