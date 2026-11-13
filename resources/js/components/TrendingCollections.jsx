import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { Layers, ArrowRight, FolderHeart } from 'lucide-react';

export default function TrendingCollections() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/collections?sort=trending&days=7&limit=3')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setCollections(data.slice(0, 3));
                } else {
                    fetch('/api/collections?limit=3')
                        .then((r) => r.json())
                        .then((d) => {
                            if (Array.isArray(d)) {
                                setCollections(d.slice(0, 3));
                            }
                        })
                        .catch(() => {});
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <section className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-card-border">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                            Trending Collections
                        </h2>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            Top transparent PNG packs and curated bundles trending this week
                        </p>
                    </div>
                </div>

                <Link
                    href="/collections"
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                >
                    <span>Browse all collections</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-card-border bg-card-bg overflow-hidden animate-pulse"
                        >
                            <div className="h-44 bg-foreground/5 border-b border-card-border p-3 grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-foreground/10" />
                                <div className="rounded-xl bg-foreground/10" />
                                <div className="rounded-xl bg-foreground/10" />
                                <div className="rounded-xl bg-foreground/10" />
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="h-4 w-3/4 bg-foreground/10 rounded" />
                                <div className="h-3 w-full bg-foreground/5 rounded" />
                                <div className="h-3 w-1/2 bg-foreground/5 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {collections.map((col) => (
                        <Link
                            key={col.id}
                            href={`/collections/${col.slug}`}
                            className="group rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all duration-300 flex flex-col hover:-translate-y-1"
                        >
                            <div
                                className="relative h-44 w-full bg-foreground/[0.02] border-b border-card-border overflow-hidden p-3"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                    backgroundSize: '12px 12px',
                                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                                }}
                            >
                                {col.previewImages && col.previewImages.length > 0 ? (
                                    <div className="h-full w-full grid grid-cols-2 gap-2">
                                        {col.previewImages.slice(0, 4).map((img, idx) => (
                                            <div
                                                key={img.id || idx}
                                                className="relative h-full w-full rounded-xl bg-card-bg/70 backdrop-blur-sm border border-card-border/60 p-2 flex items-center justify-center overflow-hidden"
                                            >
                                                <img
                                                    src={img.path}
                                                    alt=""
                                                    className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : col.coverImagePath ? (
                                    <div className="h-full w-full flex items-center justify-center p-3">
                                        <img
                                            src={col.coverImagePath}
                                            alt={col.name}
                                            className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                                        <Layers className="w-8 h-8 mb-1" />
                                        <span className="text-[11px]">Collection</span>
                                    </div>
                                )}

                                <div className="absolute bottom-3 right-3">
                                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold shadow-md">
                                        {col.imageCount} PNG{col.imageCount === 1 ? '' : 's'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors line-clamp-1">
                                        {col.name}
                                    </h3>
                                    {col.description && (
                                        <p className="text-xs text-foreground/60 mt-1 line-clamp-2 leading-relaxed">
                                            {col.description}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2 flex items-center justify-between text-xs font-semibold text-blue-500">
                                    <span>Explore Pack</span>
                                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-card-border bg-card-bg/50 backdrop-blur-sm p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-primary-glow/5 to-transparent pointer-events-none" />

                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                        <Layers className="w-7 h-7" />
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">
                        No Trending Collections This Week
                    </h3>

                    <p className="text-xs sm:text-sm text-foreground/60 max-w-md mx-auto mb-6 leading-relaxed">
                        Curated collections and themed transparent PNG packs will appear here as they gain views and downloads across the platform.
                    </p>

                    <Link
                        href="/collections"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all hover:gap-2.5 cursor-pointer"
                    >
                        <FolderHeart className="w-4 h-4" />
                        <span>Browse Collections Directory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}
        </section>
    );
}
