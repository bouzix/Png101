import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';
import { ArrowLeft, Layers, Search, Sparkles } from 'lucide-react';

export default function CollectionShow({ collection, images = [] }) {
    const [searchFilter, setSearchFilter] = useState('');
    const [sortBy, setSortBy] = useState('order');

    const filteredImages = useMemo(() => {
        let list = [...images];
        if (searchFilter.trim()) {
            const q = searchFilter.toLowerCase();
            list = list.filter(
                (img) =>
                    (img.title && img.title.toLowerCase().includes(q)) ||
                    (Array.isArray(img.tags) && img.tags.some((t) => t.toLowerCase().includes(q)))
            );
        }
        if (sortBy === 'newest') {
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'title') {
            list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        }
        return list;
    }, [images, searchFilter, sortBy]);

    if (!collection) {
        return null;
    }

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            <Head title={`${collection.name} - PNG Collection`} />
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
                {/* Back Link */}
                <Link
                    href="/collections"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-muted-text hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    All Collections
                </Link>

                {/* Hero Banner */}
                <div className="relative rounded-3xl bg-card-bg border border-card-border p-6 md:p-10 mb-10 overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 blur-[90px] rounded-full pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-wider">
                                <Layers className="w-3.5 h-3.5" />
                                Curated Collection
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                                {collection.name}
                            </h1>
                            {collection.description && (
                                <p className="text-sm md:text-base text-muted-text leading-relaxed">
                                    {collection.description}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-foreground/5 border border-card-border">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                    {images.length} Transparent PNGs
                                </span>
                                {collection.tags && collection.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {collection.tags.slice(0, 6).map((tag, idx) => (
                                            <Link
                                                key={idx}
                                                href={`/search?q=${encodeURIComponent(tag)}`}
                                                className="text-xs px-2.5 py-0.5 rounded-md bg-tag-bg text-tag-text border border-tag-border hover:bg-tag-bg-hover transition-colors"
                                            >
                                                #{tag}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {collection.coverImagePath && (
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-foreground/5 border border-card-border p-3 flex items-center justify-center shrink-0">
                                <img
                                    src={collection.coverImagePath}
                                    alt={collection.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter / Sort Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Filter within this collection..."
                            className="w-full bg-input-bg border border-input-border rounded-xl pl-10 pr-4 py-2 text-sm text-input-text focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-text">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-input-bg border border-input-border rounded-lg px-3 py-1.5 text-xs font-medium text-input-text focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value="order">Curated Order</option>
                            <option value="newest">Newest First</option>
                            <option value="title">Title (A-Z)</option>
                        </select>
                    </div>
                </div>

                {/* Images Grid */}
                {filteredImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                        {filteredImages.map((img, idx) => (
                            <ImageCard key={img.id} image={img} priority={idx < 8} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-muted-text">
                        No images match your filter in this collection.
                    </div>
                )}
            </div>
        </main>
    );
}

