import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import ImageCard from '@/components/ImageCard';

export default function Search({
    initialQuery = '',
    initialCategory = '',
    initialSort = 'newest',
    initialImages = [],
    initialTotal = 0,
    categories = [],
}) {
    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState(initialCategory);
    const [sort, setSort] = useState(initialSort);
    const [images, setImages] = useState(initialImages);
    const [total, setTotal] = useState(initialTotal);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialImages.length < initialTotal);

    const LIMIT = 24;

    const fetchImages = useCallback(async (q, cat, s, pageNum, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (cat) params.set('category', cat);
            if (s) params.set('sort', s);
            params.set('page', String(pageNum));
            params.set('limit', String(LIMIT));

            const res = await fetch(`/api/images?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const fetched = data.images || [];
                const totalCount = data.total ?? fetched.length;

                if (append) {
                    setImages(prev => {
                        const existing = new Set(prev.map(i => i.id));
                        return [...prev, ...fetched.filter(i => !existing.has(i.id))];
                    });
                } else {
                    setImages(fetched);
                }

                setTotal(totalCount);
                setHasMore(pageNum * LIMIT < totalCount);
            }
        } catch (err) {
            console.error('Failed to search images:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setQuery(initialQuery);
        setCategory(initialCategory);
        setSort(initialSort);
        setImages(initialImages);
        setTotal(initialTotal);
        setPage(1);
        setHasMore(initialImages.length < initialTotal);
    }, [initialQuery, initialCategory, initialSort, initialImages, initialTotal]);

    const updateUrlAndFetch = (newQ, newCat, newSort) => {
        const params = new URLSearchParams();
        if (newQ.trim()) params.set('q', newQ.trim());
        if (newCat) params.set('category', newCat);
        if (newSort && newSort !== 'newest') params.set('sort', newSort);

        const qs = params.toString();
        router.visit(`/search${qs ? `?${qs}` : ''}`, {
            preserveState: true,
            replace: true,
            only: [],
        });

        setPage(1);
        fetchImages(newQ.trim(), newCat, newSort, 1, false);
    };

    const handleSearch = (newQuery) => {
        setQuery(newQuery);
        updateUrlAndFetch(newQuery, category, sort);
    };

    const handleCategoryChange = (newCat) => {
        const nextCat = category === newCat ? '' : newCat;
        setCategory(nextCat);
        updateUrlAndFetch(query, nextCat, sort);
    };

    const handleSortChange = (newSort) => {
        setSort(newSort);
        updateUrlAndFetch(query, category, newSort);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchImages(query, category, sort, nextPage, true);
    };

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            <Head title={query ? `Search: ${query} - Free PNGs` : 'Search Transparent PNGs'} />
            <Header />

            <div className="relative pt-10 pb-8 border-b border-card-border">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                            {query ? (
                                <>Results for &ldquo;<span className="text-blue-500">{query}</span>&rdquo;</>
                            ) : category ? (
                                <>Category: <span className="text-blue-500 capitalize">{category}</span></>
                            ) : (
                                'Explore All Transparent PNGs'
                            )}
                        </h1>
                        <p className="text-sm text-muted-text">
                            {total} {total === 1 ? 'asset' : 'assets'} found
                        </p>
                    </div>

                    <SearchBar initialValue={query} onSearch={handleSearch} />

                    {/* Filter & Sort Controls */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                                onClick={() => handleCategoryChange('')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                    !category
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                        : 'bg-tag-bg text-tag-text border border-tag-border hover:bg-tag-bg-hover'
                                }`}
                            >
                                All
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryChange(cat.slug)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                        category === cat.slug
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                            : 'bg-tag-bg text-tag-text border border-tag-border hover:bg-tag-bg-hover'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-text font-medium">Sort by:</span>
                            <select
                                value={sort}
                                onChange={(e) => handleSortChange(e.target.value)}
                                className="bg-input-bg border border-input-border rounded-lg px-3 py-1.5 text-xs font-medium text-input-text focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-foreground/5 animate-pulse border border-card-border" />
                        ))}
                    </div>
                ) : images.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                            {images.map((img, idx) => (
                                <ImageCard key={img.id} image={img} priority={idx < 4} />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="more-btn-glow px-8 py-3 rounded-full text-sm font-bold text-white cursor-pointer disabled:opacity-50"
                                >
                                    {loadingMore ? 'Loading More...' : 'Load More PNGs'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-24 space-y-4">
                        <div className="text-5xl">🔍</div>
                        <h2 className="text-xl font-bold text-foreground">No matching PNGs found</h2>
                        <p className="text-sm text-muted-text max-w-md mx-auto">
                            Try adjusting your search keywords or clearing your category filters.
                        </p>
                        <Link
                            href="/"
                            className="inline-block mt-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}

