import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Layers, ArrowRight, FolderHeart } from 'lucide-react';
import CollectionCarouselSlider, {
    DEFAULT_TRENDING_SLIDER_CONFIG,
} from '@/components/collections/CollectionCarouselSlider';

export default function TrendingCollections() {
    const { props } = usePage();
    const sliderConfig = {
        ...DEFAULT_TRENDING_SLIDER_CONFIG,
        ...(props?.trendingSliderConfig || {}),
    };

    const maxItems = Math.max(2, Number(sliderConfig.maxTotalItems) || 12);
    const hasInitialCollections = Array.isArray(props?.trendingCollections);

    const [collections, setCollections] = useState(() =>
        hasInitialCollections ? props.trendingCollections.slice(0, maxItems) : []
    );
    const [loading, setLoading] = useState(!hasInitialCollections);

    useEffect(() => {
        if (hasInitialCollections) {
            setCollections(props.trendingCollections.slice(0, maxItems));
            setLoading(false);
            return;
        }

        fetch(`/api/collections?sort=trending&days=7&limit=${maxItems}`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setCollections(data.slice(0, maxItems));
                } else {
                    fetch(`/api/collections?limit=${maxItems}`)
                        .then((r) => r.json())
                        .then((d) => {
                            if (Array.isArray(d)) {
                                setCollections(d.slice(0, maxItems));
                            }
                        })
                        .catch(() => {});
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [hasInitialCollections, maxItems, props?.trendingCollections]);

    if (sliderConfig.enabled === false) {
        return null;
    }

    if (!loading && collections.length > 0) {
        return (
            <section>
                <CollectionCarouselSlider
                    collections={collections}
                    sliderConfig={sliderConfig}
                    variant="trending"
                />
            </section>
        );
    }

    const skelCount = Math.max(1, Math.min(6, Number(sliderConfig.cardsDesktop) || 4));

    return (
        <section className="space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-card-border">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                            Trending Collections
                        </h2>
                        <p className="text-xs text-foreground/50 mt-0.5">
                            Top transparent PNG packs and curated bundles trending this week
                        </p>
                    </div>
                </div>

                <Link
                    href="/collections"
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                >
                    <span>Browse all collections</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            {loading ? (
                <div className="flex flex-nowrap gap-6 overflow-hidden">
                    {Array.from({ length: skelCount }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: `calc((100% - ${(skelCount - 1) * 24}px) / ${skelCount})`,
                            }}
                            className="shrink-0 flex flex-col animate-pulse"
                        >
                            <div className="aspect-square w-full rounded-2xl border border-card-border bg-card-bg p-3 grid grid-cols-2 grid-rows-2 gap-2">
                                <div className="rounded-xl bg-foreground/10" />
                                <div className="rounded-xl bg-foreground/10" />
                                <div className="rounded-xl bg-foreground/10" />
                                <div className="rounded-xl bg-foreground/10" />
                            </div>
                            <div className="mt-2.5 px-1 flex items-center justify-between gap-2">
                                <div className="h-4 w-2/3 bg-foreground/10 rounded" />
                                <div className="h-4 w-4 bg-foreground/10 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-card-border bg-card-bg/50 backdrop-blur-sm p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-primary-glow/5 to-transparent pointer-events-none" />

                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                        <Layers className="w-7 h-7" />
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">
                        No Trending Collections This Week
                    </h3>

                    <p className="text-xs sm:text-sm text-foreground/60 max-w-md mx-auto mb-6 leading-relaxed">
                        Curated collections and themed transparent PNG packs will appear here as they gain views and downloads across the platform.
                    </p>

                    <Link
                        href="/collections"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all hover:gap-2.5 cursor-pointer"
                    >
                        <FolderHeart className="w-4 h-4" />
                        <span>Browse Collections Directory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}
        </section>
    );
}
