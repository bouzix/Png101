'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ImageCard from '../components/ImageCard';
import { slugify } from '@/lib/utils';

interface ImageItem {
    id: string;
    name?: string | null;
    filename?: string;
    path: string;
    luminance?: string | null;
    contrastBgDark?: string | null;
    contrastBgLight?: string | null;
}

const BATCH_SIZE = 30;

export default function LatestImagesClient() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const offsetRef = useRef(0);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const fetchBatch = useCallback(async (isInitial: boolean) => {
        if (loadingRef.current) return;
        if (!isInitial && !hasMoreRef.current) return;

        loadingRef.current = true;

        if (isInitial) {
            setLoadingInitial(true);
        } else {
            setLoadingMore(true);
            // Small visual delay so the circular loader is clearly visible when scrolling down
            await new Promise((resolve) => setTimeout(resolve, 450));
        }

        try {
            const currentOffset = isInitial ? 0 : offsetRef.current;
            const res = await fetch(
                `/api/images?status=published&paginated=1&limit=${BATCH_SIZE}&offset=${currentOffset}`
            );
            const data = await res.json();
            const newBatch: ImageItem[] = Array.isArray(data.images) ? data.images : [];
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
            console.error('Failed to load latest images:', error);
            setHasMore(false);
            hasMoreRef.current = false;
        } finally {
            setLoadingInitial(false);
            setLoadingMore(false);
            loadingRef.current = false;
        }
    }, []);

    // Initial load of 30 images
    useEffect(() => {
        fetchBatch(true);
    }, [fetchBatch]);

    // IntersectionObserver + scroll listener to lazy-load next 30 images on scroll
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
        <div>
            {total !== null && (
                <p className="text-center text-foreground/50 text-sm mb-10">
                    Showing {images.length} of {total} latest PNG {total === 1 ? 'image' : 'images'}
                </p>
            )}

            {loadingInitial ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <ImageCard key={`init-skel-${i}`} />
                    ))}
                </div>
            ) : images.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {images.map((img) => (
                            <Link
                                key={img.id}
                                href={`/images/${img.id}-${slugify(img.name || img.filename || '')}`}
                            >
                                <ImageCard
                                    src={img.path}
                                    luminance={img.luminance}
                                    contrastBgDark={img.contrastBgDark}
                                    contrastBgLight={img.contrastBgLight}
                                />
                            </Link>
                        ))}
                    </div>

                    {/* Infinite Scroll Sentinel & Circular Loader */}
                    <div ref={sentinelRef} className="py-14 flex flex-col items-center justify-center min-h-[100px]">
                        {loadingMore ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 rounded-full border-4 border-primary-glow/20 border-t-primary-glow animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                                <span className="text-foreground/60 text-xs font-semibold tracking-wider uppercase">
                                    Loading next 30 images...
                                </span>
                            </div>
                        ) : hasMore ? (
                            <div className="w-8 h-8 rounded-full border-3 border-primary-glow/20 border-t-primary-glow/60 animate-spin" />
                        ) : (
                            <p className="text-foreground/40 text-xs uppercase tracking-widest">
                                You&apos;ve reached the end of the catalog ({images.length} images)
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 text-foreground/50">
                    No published images found.
                </div>
            )}
        </div>
    );
}
