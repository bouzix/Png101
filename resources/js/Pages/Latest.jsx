import React, { useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';

export default function Latest({ initialImages = [], initialTotal = 0 }) {
    const [images, setImages] = useState(initialImages);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialImages.length < initialTotal);

    const LIMIT = 24;

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;

        try {
            const res = await fetch(`/api/images?sort=newest&page=${nextPage}&limit=${LIMIT}`);
            if (res.ok) {
                const data = await res.json();
                const fetched = data.images || [];
                const total = data.total ?? 0;

                setImages(prev => {
                    const existing = new Set(prev.map(i => i.id));
                    return [...prev, ...fetched.filter(i => !existing.has(i.id))];
                });
                setPage(nextPage);
                setHasMore(nextPage * LIMIT < total);
            }
        } catch (err) {
            console.error('Failed to load more latest images:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, page]);

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            <Head title="Latest Transparent PNGs" />
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-card-border">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-wider mb-3">
                            Fresh Uploads
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                            Latest Transparent PNGs
                        </h1>
                        <p className="text-sm text-muted-text mt-1">
                            The newest high-resolution cut-out assets added to our library ({initialTotal} total)
                        </p>
                    </div>

                    <Link
                        href="/search"
                        className="text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                    >
                        Search & Filter All &rarr;
                    </Link>
                </div>

                {images.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                            {images.map((img, idx) => (
                                <ImageCard key={img.id} image={img} priority={idx < 8} />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="more-btn-glow px-8 py-3 rounded-full text-sm font-bold text-white cursor-pointer disabled:opacity-50"
                                >
                                    {loadingMore ? 'Loading More...' : 'Load More Latest PNGs'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-24 text-muted-text">
                        No PNG images uploaded yet.
                    </div>
                )}
            </div>
        </main>
    );
}

