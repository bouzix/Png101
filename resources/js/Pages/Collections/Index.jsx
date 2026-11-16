import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import Pagination from '@/components/ui/Pagination';
import { Layers, ArrowRight, Star, Search, X } from 'lucide-react';

function CollectionCard({ collection, isHero = false }) {
    const hasCustomSquareCard = Boolean(collection.trendingCardImagePath);
    return (
        <Link
            href={`/collections/${collection.slug}`}
            className="group flex flex-col"
        >
            {/* 1:1 Square Visual Collage Stage Card */}
            <div
                className={`relative aspect-square w-full rounded-2xl border bg-card-bg overflow-hidden ${
                    hasCustomSquareCard ? 'p-0' : 'p-3'
                } shadow-sm group-hover:shadow-xl group-hover:border-primary-glow/50 group-hover:shadow-primary-glow/10 transition-all duration-300 group-hover:-translate-y-1 ${
                    isHero
                        ? 'border-amber-500/30 ring-1 ring-amber-500/15'
                        : 'border-card-border'
                }`}
                style={{
                    backgroundImage:
                        'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                }}
            >
                {hasCustomSquareCard ? (
                    <img
                        src={collection.trendingCardImagePath}
                        alt={collection.name}
                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                    />
                ) : collection.previewImages && collection.previewImages.length > 0 ? (
                    <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-2">
                        {collection.previewImages.slice(0, 4).map((img, idx) => (
                            <div
                                key={img.id || idx}
                                className="relative h-full w-full rounded-lg bg-card-bg/80 backdrop-blur-sm border border-card-border/80 p-2 flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={img.thumbPath || img.path}
                                    alt=""
                                    loading="lazy"
                                    className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        ))}
                    </div>
                ) : collection.coverImagePath ? (
                    <div className="h-full w-full flex items-center justify-center p-3">
                        <img
                            src={collection.coverImagePath}
                            alt={collection.name}
                            className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                        <Layers className="w-8 h-8 mb-1" />
                        <span className="text-xs">Collection</span>
                    </div>
                )}

                {collection.isFeatured && (
                    <div className="absolute top-3 left-3">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-md">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>Featured</span>
                        </span>
                    </div>
                )}

                <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-lg bg-card-bg/90 border border-card-border backdrop-blur-md text-foreground text-xs font-bold shadow-md">
                        {collection.imageCount} PNG{collection.imageCount === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            {/* Title & Arrow Below the Card */}
            <div className="mt-2.5 px-1 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary-glow transition-colors truncate">
                    {collection.name}
                </h3>
                <ArrowRight className="w-4 h-4 shrink-0 text-foreground/55 group-hover:text-primary-glow transform group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    );
}

const COLS_BASE = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
};
const COLS_SM = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
};
const COLS_MD = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
};
const COLS_LG = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
};

const ITEMS_PER_PAGE = 24;

export default function CollectionsIndex({
    collections = [],
    websiteInfo = {},
    gridColumns = { mobile: 1, smallTablet: 2, tablet: 3, desktop: 6 },
}) {
    const siteName = websiteInfo?.websiteName || 'Png101';
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const listSectionRef = useRef(null);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const isSearching = normalizedQuery.length > 0;

    const filteredCollections = useMemo(() => {
        if (!isSearching) return collections;
        return collections.filter((col) => {
            const nameMatch = String(col.name || '').toLowerCase().includes(normalizedQuery);
            const descMatch = String(col.description || '').toLowerCase().includes(normalizedQuery);
            const slugMatch = String(col.slug || '').toLowerCase().includes(normalizedQuery);
            const tagsList = Array.isArray(col.tags)
                ? col.tags
                : Array.isArray(col.rules?.tags)
                ? col.rules.tags
                : [];
            const tagMatch = tagsList.some((t) => String(t).toLowerCase().includes(normalizedQuery));
            return nameMatch || descMatch || slugMatch || tagMatch;
        });
    }, [collections, isSearching, normalizedQuery]);

    const featuredCollections = useMemo(
        () => (isSearching ? [] : filteredCollections.filter((c) => c.isFeatured)),
        [filteredCollections, isSearching]
    );

    const listSourceCollections = useMemo(() => {
        if (isSearching) return filteredCollections;
        return featuredCollections.length > 0
            ? filteredCollections.filter((c) => !c.isFeatured)
            : filteredCollections;
    }, [filteredCollections, featuredCollections.length, isSearching]);

    const totalPages = Math.max(1, Math.ceil(listSourceCollections.length / ITEMS_PER_PAGE));

    useEffect(() => {
        setCurrentPage(1);
    }, [normalizedQuery]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedCollections = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return listSourceCollections.slice(start, start + ITEMS_PER_PAGE);
    }, [listSourceCollections, currentPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        if (listSectionRef.current) {
            listSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const gridClassName = `grid ${COLS_BASE[gridColumns?.mobile] || 'grid-cols-1'} ${
        COLS_SM[gridColumns?.smallTablet] || 'sm:grid-cols-2'
    } ${COLS_MD[gridColumns?.tablet] || 'md:grid-cols-3'} ${
        COLS_LG[gridColumns?.desktop] || 'lg:grid-cols-6'
    } gap-6`;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <Head title={`Curated PNG Collections & Clipart Packs - ${siteName}`} />
            <Header siteName={siteName} />

            <main className="flex-1 w-full px-6 sm:px-10 md:px-16 py-8 sm:py-12 space-y-12">
                {/* Hero Header Banner */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-glow/10 border border-primary-glow/20 text-primary-glow text-xs font-bold tracking-wide">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Curated Design Packs</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                        Themed PNG Collections
                    </h1>

                    <p className="text-sm sm:text-base text-foreground/60 leading-relaxed max-w-2xl mx-auto">
                        Explore handpicked packs and automated tag collections of premium transparent PNG graphics. Browse holiday clipart, matching icon kits, and aesthetic designs.
                    </p>

                    {/* Dedicated Collections Search Bar */}
                    <div className="pt-2 max-w-xl mx-auto">
                        <div className="relative flex items-center rounded-2xl bg-card-bg border border-card-border shadow-sm focus-within:border-primary-glow/60 focus-within:ring-2 focus-within:ring-primary-glow/15 transition-all">
                            <Search className="w-4 h-4 text-foreground/45 ml-4 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search collections by name, theme, or tags..."
                                aria-label="Search collections"
                                className="w-full h-11 px-3 bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                    className="mr-2 p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/5 cursor-pointer transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Featured Collections Section */}
                {featuredCollections.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-card-border">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                                Featured Collections
                            </h2>
                        </div>

                        <div className={gridClassName}>
                            {featuredCollections.map((col) => (
                                <CollectionCard key={col.id} collection={col} isHero={true} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Collections Section */}
                <section ref={listSectionRef} className="space-y-6 scroll-mt-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-card-border">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-5 rounded-full bg-primary-glow shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                                {isSearching
                                    ? `Search Results (${listSourceCollections.length})`
                                    : `All Collections (${listSourceCollections.length})`}
                            </h2>
                        </div>
                        {totalPages > 1 && (
                            <span className="text-xs font-medium text-foreground/55">
                                Page {currentPage} of {totalPages}
                            </span>
                        )}
                    </div>

                    {collections.length === 0 ? (
                        <div className="py-24 text-center border border-dashed border-card-border rounded-xl p-8 bg-card-bg shadow-xl">
                            <Layers className="w-12 h-12 mx-auto mb-3 text-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No collections published yet</h3>
                            <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto">
                                Check back soon as fresh seasonal collections and graphic kits are added.
                            </p>
                        </div>
                    ) : listSourceCollections.length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-card-border rounded-xl p-8 bg-card-bg">
                            <Search className="w-10 h-10 mx-auto mb-3 text-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No matching collections found</h3>
                            <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto">
                                Try another keyword or clear your search to browse all collections.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={gridClassName}>
                                {paginatedCollections.map((col) => (
                                    <CollectionCard
                                        key={col.id}
                                        collection={col}
                                        isHero={Boolean(col.isFeatured)}
                                    />
                                ))}
                            </div>

                            {listSourceCollections.length > 0 && (
                                <div className="pt-4 border-t border-card-border">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={listSourceCollections.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={handlePageChange}
                                        itemLabel="collection"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
