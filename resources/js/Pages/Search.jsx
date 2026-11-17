import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';
import { slugify } from '@/lib/utils';
import { useIsDesktopXl } from '@/hooks/useIsDesktopXl';

export default function Search({
    query = '',
    initialImages,
    initialTotal,
    initialHasMore,
    websiteInfo = {},
}) {
    const siteName = websiteInfo?.websiteName || 'Png101';
    const isDesktopXl = useIsDesktopXl();
    const batchSize = isDesktopXl ? 28 : 24;
    const initialSkeletonCount = isDesktopXl ? 14 : 12;
    const loadMoreSkeletonCount = isDesktopXl ? 7 : 6;
    const batchSizeRef = useRef(batchSize);
    batchSizeRef.current = batchSize;

    const [images, setImages] = useState(initialImages || []);
    const [total, setTotal] = useState(typeof initialTotal === 'number' ? initialTotal : null);
    const [loadingInitial, setLoadingInitial] = useState(!initialImages);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore !== undefined ? initialHasMore : true);

    const offsetRef = useRef(initialImages ? initialImages.length : 0);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(initialHasMore !== undefined ? initialHasMore : true);
    const sentinelRef = useRef(null);

    const fetchBatch = useCallback(
        async (isInitial) => {
            if (loadingRef.current) return;
            if (!isInitial && !hasMoreRef.current) return;

            loadingRef.current = true;

            if (isInitial) {
                setLoadingInitial(true);
            } else {
                setLoadingMore(true);
                await new Promise((resolve) => setTimeout(resolve, 450));
            }

            try {
                const currentOffset = isInitial ? 0 : offsetRef.current;
                const res = await fetch(
                    `/api/images?status=published&paginated=1&limit=${batchSizeRef.current}&offset=${currentOffset}&q=${encodeURIComponent(
                        query
                    )}`
                );
                const data = await res.json();
                const newBatch = Array.isArray(data.images) ? data.images : [];
                const nextHasMore = Boolean(data.hasMore) && newBatch.length > 0;

                setTotal(typeof data.total === 'number' ? data.total : null);
                setHasMore(nextHasMore);
                hasMoreRef.current = nextHasMore;

                if (isInitial) {
                    setImages(newBatch);
                    offsetRef.current = newBatch.length;
                } else {
                    setImages((prev) => {
                        const existingIds = new Set(prev.map((img) => img.id));
                        const uniqueNew = newBatch.filter((img) => !existingIds.has(img.id));
                        return [...prev, ...uniqueNew];
                    });
                    offsetRef.current = currentOffset + newBatch.length;
                }
            } catch (error) {
                console.error('Failed to load search results:', error);
                setHasMore(false);
                hasMoreRef.current = false;
            } finally {
                setLoadingInitial(false);
                setLoadingMore(false);
                loadingRef.current = false;
            }
        },
        [query]
    );

    useEffect(() => {
        if (!initialImages) {
            offsetRef.current = 0;
            hasMoreRef.current = true;
            setHasMore(true);
            fetchBatch(true);
        }
    }, [initialImages, fetchBatch]);

    useEffect(() => {
        if (loadingInitial || !hasMore) return;

        const sentinel = sentinelRef.current;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first && first.isIntersecting && hasMoreRef.current && !loadingRef.current) {
                    fetchBatch(false);
                }
            },
            { rootMargin: '250px' }
        );

        if (sentinel) {
            observer.observe(sentinel);
        }

        const handleScroll = () => {
            if (!hasMoreRef.current || loadingRef.current) return;
            if (sentinelRef.current) {
                const rect = sentinelRef.current.getBoundingClientRect();
                if (rect.top <= window.innerHeight + 250) {
                    fetchBatch(false);
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, [loadingInitial, hasMore, images.length, fetchBatch]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Head title={query ? `Search "${query}" - ${siteName}` : `Search PNG Images - ${siteName}`} />
            <Header initialQuery={query || ''} siteName={siteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-8">
                <div>
                    {/* Header info */}
                    <div className="text-center mb-10">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
                            Search Results for <span className="text-primary-glow">&quot;{query}&quot;</span>
                        </h1>
                        {total !== null && (
                            <p className="text-foreground/50 text-sm">
                                Showing {images.length} of {total} {total === 1 ? 'image' : 'images'}
                            </p>
                        )}
                    </div>

                    {loadingInitial ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                            {Array.from({ length: initialSkeletonCount }).map((_, i) => (
                                <ImageCard key={`search-skel-${i}`} />
                            ))}
                        </div>
                    ) : images.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                                {images.map((image) => (
                                    <Link
                                        key={image.id}
                                        href={`/images/${image.id}-${slugify(image.name || image.filename || '')}`}
                                    >
                                        <ImageCard
                                            src={image.thumbPath || image.path}
                                            luminance={image.luminance}
                                            contrastBgDark={image.contrastBgDark}
                                            contrastBgLight={image.contrastBgLight}
                                        />
                                    </Link>
                                ))}
                            </div>

                            {loadingMore && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6 mt-6">
                                    {Array.from({ length: loadMoreSkeletonCount }).map((_, i) => (
                                        <ImageCard key={`search-more-skel-${i}`} />
                                    ))}
                                </div>
                            )}

                            <div
                                ref={sentinelRef}
                                className="py-14 flex flex-col items-center justify-center min-h-[100px]"
                            >
                                {loadingMore ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-4 border-primary-glow/20 border-t-primary-glow animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                                        <span className="text-foreground/60 text-xs font-semibold tracking-wider uppercase">
                                            Loading next {batchSize} images...
                                        </span>
                                    </div>
                                ) : hasMore ? (
                                    <div className="w-8 h-8 rounded-full border-3 border-primary-glow/20 border-t-primary-glow/60 animate-spin" />
                                ) : (
                                    <p className="text-foreground/40 text-xs uppercase tracking-widest">
                                        You&apos;ve reached the end of search results ({images.length}{' '}
                                        {images.length === 1 ? 'image' : 'images'})
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-foreground/50">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-16 h-16 mb-4 opacity-40 text-foreground"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                />
                            </svg>
                            <p className="text-lg font-semibold text-foreground">
                                No images found for &quot;{query}&quot;
                            </p>
                            <p className="text-sm mt-2 text-foreground/60">
                                Try searching with different keywords or check spelling.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
