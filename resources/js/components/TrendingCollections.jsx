import React, { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Layers, ArrowRight, Image as ImageIcon } from 'lucide-react';

export default function TrendingCollections() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const res = await fetch('/api/collections?active=true');
                if (res.ok) {
                    const data = await res.json();
                    setCollections((data.collections || []).slice(0, 6));
                }
            } catch (error) {
                console.error('Failed to load trending collections:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCollections();
    }, []);

    if (loading) {
        return (
            <section className="my-12">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-7 w-48 bg-foreground/10 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-foreground/10 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-44 rounded-2xl bg-card-bg border border-card-border animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    if (collections.length === 0) return null;

    return (
        <section className="my-12 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-foreground">
                            Curated Collections
                        </h2>
                        <p className="text-xs text-muted-text">
                            Themed transparent PNG packs &amp; curated asset bundles
                        </p>
                    </div>
                </div>
                <Link
                    href="/collections"
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                >
                    View all packs
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((col) => {
                    const previewImages = col.images && col.images.length > 0
                        ? col.images.slice(0, 3)
                        : [];

                    return (
                        <Link
                            key={col.id}
                            href={`/collections/${col.slug}`}
                            className="group relative flex flex-col rounded-2xl bg-card-bg border border-card-border hover:border-blue-500/40 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-blue-500/10"
                        >
                            {/* Collage / Preview Banner */}
                            <div className="relative h-36 bg-slate-900/40 dark:bg-black/40 border-b border-card-border p-3 flex items-center justify-center gap-2 overflow-hidden">
                                <div
                                    className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{
                                        backgroundImage: "url('/assets/checkerboard-dark.png')",
                                        backgroundSize: '16px 16px',
                                    }}
                                />

                                {previewImages.length > 0 ? (
                                    <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                                        {previewImages.map((img, idx) => (
                                            <div
                                                key={img.id || idx}
                                                className="flex-1 h-full rounded-xl bg-white/5 dark:bg-black/30 border border-white/10 p-2 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105"
                                            >
                                                <img
                                                    src={img.previewPath || img.filePath}
                                                    alt={img.title || col.name}
                                                    loading="lazy"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : col.coverImagePath ? (
                                    <img
                                        src={col.coverImagePath}
                                        alt={col.name}
                                        loading="lazy"
                                        className="relative z-10 max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="relative z-10 flex flex-col items-center text-foreground/30">
                                        <ImageIcon className="w-8 h-8 mb-1" />
                                        <span className="text-xs font-medium">Empty Pack</span>
                                    </div>
                                )}

                                <span className="absolute top-2.5 right-2.5 z-20 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur-md border border-white/15">
                                    {col.imageCount ?? col._count?.images ?? 0} PNGs
                                </span>
                            </div>

                            {/* Metadata */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">
                                        {col.name}
                                    </h3>
                                    {col.description && (
                                        <p className="text-xs text-muted-text line-clamp-2 mt-1">
                                            {col.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-card-border text-xs font-semibold text-blue-500">
                                    <span>Browse Collection</span>
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

