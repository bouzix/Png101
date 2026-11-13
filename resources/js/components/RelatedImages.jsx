import React, { useState, useEffect, useRef, useCallback } from 'react';
import ImageCard from './ImageCard';
import { Link } from '@inertiajs/react';
import { slugify } from '@/lib/utils';
import { useIsDesktopXl } from '@/hooks/useIsDesktopXl';

const RelatedImages = ({ images: initialImages = [], currentId, totalCount }) => {
    const isDesktopXl = useIsDesktopXl();
    const initialLimit = isDesktopXl ? 14 : 12;
    const batchSize = isDesktopXl ? 28 : 24;
    const loadMoreSkeletonCount = isDesktopXl ? 7 : 6;
    const batchSizeRef = useRef(batchSize);
    batchSizeRef.current = batchSize;

    const initialFiltered = initialImages.filter((img) => img.id !== currentId).slice(0, initialLimit);

    const [displayedImages, setDisplayedImages] = useState(initialFiltered);
    const [total, setTotal] = useState(
        typeof totalCount === 'number' ? totalCount : initialFiltered.length
    );
    const [expanded, setExpanded] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(
        typeof totalCount === 'number' ? totalCount > initialFiltered.length : false
    );

    const offsetRef = useRef(initialFiltered.length);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(
        typeof totalCount === 'number' ? totalCount > initialFiltered.length : false
    );
    const sentinelRef = useRef(null);

    useEffect(() => {
        const filtered = initialImages.filter((img) => img.id !== currentId).slice(0, initialLimit);
        const nextTotal = typeof totalCount === 'number' ? totalCount : filtered.length;
        const nextHasMore = nextTotal > filtered.length;

        setDisplayedImages(filtered);
        setTotal(nextTotal);
        setExpanded(false);
        setLoadingMore(false);
        setHasMore(nextHasMore);
        offsetRef.current = filtered.length;
        loadingRef.current = false;
        hasMoreRef.current = nextHasMore;
    }, [currentId, initialImages, totalCount]);

    useEffect(() => {
        if (expanded) return;
        const filtered = initialImages.filter((img) => img.id !== currentId).slice(0, initialLimit);
        const nextTotal = typeof totalCount === 'number' ? totalCount : filtered.length;
        const nextHasMore = nextTotal > filtered.length;

        setDisplayedImages(filtered);
        setHasMore(nextHasMore);
        offsetRef.current = filtered.length;
        hasMoreRef.current = nextHasMore;
    }, [initialLimit, expanded, currentId, initialImages, totalCount]);

    const fetchBatch = useCallback(
        async (isFirstExpand) => {
            if (loadingRef.current || !hasMoreRef.current) return;

            loadingRef.current = true;
            setLoadingMore(true);

            if (!isFirstExpand) {
                await new Promise((resolve) => setTimeout(resolve, 450));
            }

            try {
                const requestOffset = isFirstExpand ? 0 : offsetRef.current;
                const res = await fetch(
                    `/api/images/related?id=${encodeURIComponent(currentId)}&limit=${batchSizeRef.current}&offset=${requestOffset}`
                );
                const data = await res.json();
                const newBatch = Array.isArray(data.images) ? data.images : [];
                const nextHasMore = Boolean(data.hasMore) && newBatch.length > 0;

                if (typeof data.total === 'number') {
                    setTotal(data.total);
                }

                setHasMore(nextHasMore);
                hasMoreRef.current = nextHasMore;

                if (isFirstExpand) {
                    setDisplayedImages(newBatch);
                    offsetRef.current = newBatch.length;
                } else {
                    setDisplayedImages((prev) => {
                        const existingIds = new Set(prev.map((img) => img.id));
                        const uniqueNew = newBatch.filter((img) => !existingIds.has(img.id));
                        return [...prev, ...uniqueNew];
                    });
                    offsetRef.current = requestOffset + newBatch.length;
                }
            } catch (error) {
                console.error('Failed to load more related images:', error);
                setHasMore(false);
                hasMoreRef.current = false;
            } finally {
                setLoadingMore(false);
                loadingRef.current = false;
            }
        },
        [currentId]
    );

    const handleLoadMoreClick = () => {
        setExpanded(true);
        fetchBatch(true);
    };

    useEffect(() => {
        if (!expanded || !hasMore) return;

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
    }, [expanded, hasMore, displayedImages.length, fetchBatch]);

    if (displayedImages.length === 0) {
        return null;
    }

    return (
        <div className="mt-16">
            <div
                className="w-full py-3.5 px-6 rounded-2xl mb-8 border shadow-sm text-center flex items-center justify-center gap-2"
                style={{
                    backgroundColor: 'var(--related-heading-bg)',
                    borderColor: 'var(--related-heading-border)',
                }}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-primary-glow inline-block" />
                <h3
                    className="font-bold tracking-widest text-xs md:text-sm uppercase"
                    style={{ color: 'var(--related-heading-text)' }}
                >
                    Related PNG Images
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-glow inline-block" />
            </div>

            {expanded && (
                <p className="text-center text-foreground/50 text-sm mb-8">
                    Showing {displayedImages.length} of {total} related PNG {total === 1 ? 'image' : 'images'}
                </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                {displayedImages.map((image) => (
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

            {!expanded && hasMore && (
                <div className="mt-12 flex justify-center">
                    <button
                        type="button"
                        onClick={handleLoadMoreClick}
                        className="more-btn-glow inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-card-bg hover:bg-primary-glow text-foreground hover:text-white font-bold text-sm tracking-wide transition-all duration-300 group cursor-pointer"
                    >
                        <span>More</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                            />
                        </svg>
                    </button>
                </div>
            )}

            {expanded && (
                <>
                    {loadingMore && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6 mt-6">
                            {Array.from({ length: loadMoreSkeletonCount }).map((_, i) => (
                                <ImageCard key={`rel-more-skel-${i}`} />
                            ))}
                        </div>
                    )}

                    <div ref={sentinelRef} className="py-14 flex flex-col items-center justify-center min-h-[100px]">
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
                                You&apos;ve reached the end of related images ({displayedImages.length} images)
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default RelatedImages;
