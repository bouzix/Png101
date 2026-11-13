import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@inertiajs/react';

export default function RelatedImages({ imageId, initialImages = [], initialHasMore = true }) {
    const [images, setImages] = useState(initialImages);
    const [loading, setLoading] = useState(initialImages.length === 0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [offset, setOffset] = useState(initialImages.length);
    const [isExpanded, setIsExpanded] = useState(false);
    const hasFetchedRef = useRef(false);

    const LIMIT = 4;

    const fetchRelated = useCallback(async (currentOffset, isInitial = false) => {
        if (!imageId) return;

        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const res = await fetch(`/api/images/related?imageId=${imageId}&limit=${LIMIT}&offset=${currentOffset}`);
            if (!res.ok) throw new Error('Failed to fetch related images');
            const data = await res.json();

            if (isInitial) {
                setImages(data.images || []);
            } else {
                setImages(prev => {
                    const existingIds = new Set(prev.map(img => img.id));
                    const uniqueNew = (data.images || []).filter(img => !existingIds.has(img.id));
                    return [...prev, ...uniqueNew];
                });
            }

            setHasMore(data.hasMore);
            setOffset(currentOffset + (data.images?.length || 0));
        } catch (error) {
            console.error('Error loading related images:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [imageId]);

    useEffect(() => {
        if (initialImages.length === 0 && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchRelated(0, true);
        }
    }, [imageId, initialImages.length, fetchRelated]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            setIsExpanded(true);
            fetchRelated(offset, false);
        }
    };

    const handleShowLess = () => {
        setIsExpanded(false);
    };

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto mt-16 mb-12">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-7 w-48 bg-foreground/10 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="aspect-square rounded-2xl bg-card-bg border border-card-border animate-pulse flex items-center justify-center p-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-foreground/5"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (images.length === 0) {
        return null;
    }

    const displayedImages = isExpanded ? images : images.slice(0, 4);

    return (
        <section className="w-full max-w-7xl mx-auto mt-16 mb-12 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                        Related PNGs
                    </h2>
                </div>
                <span className="text-xs font-medium text-muted-text uppercase tracking-wider">
                    Discover Similar Assets
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {displayedImages.map((img) => {
                    const isLight = img.luminance === 'light';
                    const checkerboardUrl = isLight
                        ? "url('/assets/checkerboard-dark.png')"
                        : "url('/assets/checkerboard-light.png')";

                    return (
                        <Link
                            key={img.id}
                            href={`/images/${img.slug || img.id}`}
                            className={`image-card-glow group relative block w-full overflow-hidden rounded-xl border border-card-border shadow-md aspect-square ${isLight ? 'contrast-stage-dark' : ''}`}
                            style={{
                                backgroundImage: checkerboardUrl,
                                backgroundSize: '20px 20px',
                                backgroundRepeat: 'repeat',
                            }}
                        >
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                <img
                                    src={img.previewPath || img.path || img.filePath}
                                    alt={img.altText || img.name || img.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>

                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 pointer-events-none">
                                <p className="text-white text-xs font-medium truncate">{img.name || img.title}</p>
                                {img.width && img.height && (
                                    <span className="text-[10px] text-slate-300 font-mono">
                                        {img.width} x {img.height}
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div className="mt-10 flex items-center justify-center gap-4">
                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl font-bold text-sm text-foreground bg-card-bg border border-card-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {loadingMore ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Loading Related Assets...</span>
                            </>
                        ) : (
                            <>
                                <span>Load More Related PNGs</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500 transition-transform group-hover:translate-y-0.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </>
                        )}
                    </button>
                )}

                {isExpanded && images.length > 4 && (
                    <button
                        onClick={handleShowLess}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-muted-text hover:text-foreground bg-foreground/5 hover:bg-foreground/10 border border-card-border transition-all cursor-pointer"
                    >
                        <span>Show Less</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                    </button>
                )}
            </div>
        </section>
    );
}
