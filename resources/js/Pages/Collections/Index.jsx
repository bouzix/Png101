import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import { Layers, ArrowRight, Image as ImageIcon } from 'lucide-react';

export default function CollectionsIndex({ collections = [] }) {
    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            <Head title="Curated PNG Collections" />
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-wider mb-4">
                        <Layers className="w-3.5 h-3.5" />
                        Curated Packs
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                        PNG Asset Collections
                    </h1>
                    <p className="text-muted-text text-sm md:text-base">
                        Browse hand-picked and AI-curated packs of transparent PNGs organized by theme, style, and creative workflow.
                    </p>
                </div>

                {/* Grid */}
                {collections.length > 0 ? (
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
                                    <div className="relative h-44 bg-slate-900/40 dark:bg-black/40 border-b border-card-border p-3 flex items-center justify-center gap-2 overflow-hidden">
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

                                        <span className="absolute top-3 right-3 z-20 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur-md border border-white/15">
                                            {col.imageCount ?? 0} PNGs
                                        </span>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">
                                                {col.name}
                                            </h2>
                                            {col.description && (
                                                <p className="text-xs text-muted-text line-clamp-2 mt-1.5">
                                                    {col.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-card-border text-xs font-semibold text-blue-500">
                                            <span>Open Collection</span>
                                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-24 text-muted-text">
                        No collections available yet.
                    </div>
                )}
            </div>
        </main>
    );
}

