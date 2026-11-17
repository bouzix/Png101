import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from '@inertiajs/react';
import {
    Layers,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    ArrowRight,
    Star,
} from 'lucide-react';

export const DEFAULT_SLIDER_CONFIG = {
    enabled: true,
    cardsDesktop: 8,
    stepDesktop: 1,
    cardsLaptop: 6,
    stepLaptop: 1,
    cardsTablet: 4,
    stepTablet: 1,
    cardsSmallTablet: 3,
    stepSmallTablet: 1,
    cardsMobile: 2,
    stepMobile: 1,
    maxTotalItems: 24,
    autoScroll: true,
    autoScrollIntervalMs: 3500,
    autoScrollStepCards: 1,
    pauseOnHover: true,
    loop: true,
    showArrows: true,
    showHeaderArrows: false,
    showEdgeFade: true,
    arrowSize: 28,
    arrowIconSize: 14,
    arrowOffsetX: 0,
    arrowOffsetY: 0,
    arrowShape: 'circle',
    arrowBgColor: '',
    arrowIconColor: '',
    arrowBorderColor: '',
    showProgressDots: true,
};

export const DEFAULT_TRENDING_SLIDER_CONFIG = {
    ...DEFAULT_SLIDER_CONFIG,
    id: 'trending_collections',
    name: 'Trending Collections',
    location: 'Homepage (/)',
    cardsDesktop: 4,
    stepDesktop: 1,
    cardsLaptop: 3,
    stepLaptop: 1,
    cardsTablet: 2,
    stepTablet: 1,
    cardsSmallTablet: 2,
    stepSmallTablet: 1,
    cardsMobile: 1,
    stepMobile: 1,
    maxTotalItems: 12,
    autoScrollIntervalMs: 4000,
    arrowSize: 32,
    arrowIconSize: 16,
};

export const DEFAULT_PART_OF_COLLECTIONS_SLIDER_CONFIG = {
    ...DEFAULT_SLIDER_CONFIG,
    id: 'part_of_collections',
    name: 'Part of Collections',
    location: 'Image Detail Sidebar (/images/{slug})',
    cardsDesktop: 1,
    stepDesktop: 1,
    cardsLaptop: 1,
    stepLaptop: 1,
    cardsTablet: 1,
    stepTablet: 1,
    cardsSmallTablet: 1,
    stepSmallTablet: 1,
    cardsMobile: 1,
    stepMobile: 1,
    maxTotalItems: 12,
    autoScrollIntervalMs: 4000,
    showEdgeFade: false,
    arrowSize: 28,
    arrowIconSize: 14,
};

export const DEFAULT_FEATURED_COLLECTIONS_SLIDER_CONFIG = {
    ...DEFAULT_SLIDER_CONFIG,
    id: 'featured_collections',
    name: 'Featured Collections',
    location: 'Collections Page (/collections)',
    cardsDesktop: 4,
    stepDesktop: 1,
    cardsLaptop: 3,
    stepLaptop: 1,
    cardsTablet: 2,
    stepTablet: 1,
    cardsSmallTablet: 2,
    stepSmallTablet: 1,
    cardsMobile: 1,
    stepMobile: 1,
    maxTotalItems: 12,
    autoScrollIntervalMs: 4000,
    arrowSize: 32,
    arrowIconSize: 16,
};

export default function CollectionCarouselSlider({
    collections = [],
    sliderConfig: rawSliderConfig = {},
    variant = null, // 'compact' | 'trending' | 'part_of_collections' | 'featured_collections' | null (auto-detected from sliderConfig.id)
    forcedViewport = null, // 'desktop' | 'laptop' | 'tablet' | 'small_tablet' | 'mobile' | null
    isPreview = false,
    hideHeader = false,
}) {
    const isTrendingVariant =
        variant === 'trending' || rawSliderConfig?.id === 'trending_collections';
    const isPartOfCollectionsVariant =
        variant === 'part_of_collections' || rawSliderConfig?.id === 'part_of_collections';
    const isFeaturedVariant =
        variant === 'featured_collections' || rawSliderConfig?.id === 'featured_collections';
    const isSquareShowcaseVariant = isTrendingVariant || isFeaturedVariant;

    const sliderConfig = {
        ...(isTrendingVariant
            ? DEFAULT_TRENDING_SLIDER_CONFIG
            : isPartOfCollectionsVariant
            ? DEFAULT_PART_OF_COLLECTIONS_SLIDER_CONFIG
            : isFeaturedVariant
            ? DEFAULT_FEATURED_COLLECTIONS_SLIDER_CONFIG
            : DEFAULT_SLIDER_CONFIG),
        ...(rawSliderConfig || {}),
    };

    const sliderRef = useRef(null);
    const isDraggingSliderRef = useRef(false);
    const didDragSliderRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartScrollLeftRef = useRef(0);
    const lastClientXRef = useRef(0);
    const lastMoveTimeRef = useRef(0);
    const velocityRef = useRef(0);
    const momentumRafRef = useRef(null);

    const [isSliderDragging, setIsSliderDragging] = useState(false);
    const [isHoveringSlider, setIsHoveringSlider] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [cardsPerRow, setCardsPerRow] = useState(Number(sliderConfig.cardsDesktop) || 8);
    const [stepPerTick, setStepPerTick] = useState(Number(sliderConfig.stepDesktop) || 1);

    const computeBreakpointLayout = useCallback(() => {
        const fallbackStep = Math.max(1, Number(sliderConfig.autoScrollStepCards) || 1);

        if (forcedViewport === 'desktop') {
            const c = Number(sliderConfig.cardsDesktop) || 8;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepDesktop) || fallbackStep)) };
        }
        if (forcedViewport === 'laptop') {
            const c = Number(sliderConfig.cardsLaptop) || 6;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepLaptop) || fallbackStep)) };
        }
        if (forcedViewport === 'tablet') {
            const c = Number(sliderConfig.cardsTablet) || 4;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepTablet) || fallbackStep)) };
        }
        if (forcedViewport === 'small_tablet') {
            const c = Number(sliderConfig.cardsSmallTablet) || 3;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepSmallTablet) || fallbackStep)) };
        }
        if (forcedViewport === 'mobile') {
            const c = Number(sliderConfig.cardsMobile) || 2;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepMobile) || fallbackStep)) };
        }

        if (typeof window === 'undefined') {
            const c = Number(sliderConfig.cardsDesktop) || 8;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepDesktop) || fallbackStep)) };
        }

        const w = window.innerWidth;
        if (w >= 1280) {
            const c = Number(sliderConfig.cardsDesktop) || 8;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepDesktop) || fallbackStep)) };
        }
        if (w >= 1024) {
            const c = Number(sliderConfig.cardsLaptop) || 6;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepLaptop) || fallbackStep)) };
        }
        if (w >= 768) {
            const c = Number(sliderConfig.cardsTablet) || 4;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepTablet) || fallbackStep)) };
        }
        if (w >= 640) {
            const c = Number(sliderConfig.cardsSmallTablet) || 3;
            return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepSmallTablet) || fallbackStep)) };
        }
        const c = Number(sliderConfig.cardsMobile) || 2;
        return { cards: c, step: Math.min(c, Math.max(1, Number(sliderConfig.stepMobile) || fallbackStep)) };
    }, [
        forcedViewport,
        sliderConfig.cardsDesktop,
        sliderConfig.stepDesktop,
        sliderConfig.cardsLaptop,
        sliderConfig.stepLaptop,
        sliderConfig.cardsTablet,
        sliderConfig.stepTablet,
        sliderConfig.cardsSmallTablet,
        sliderConfig.stepSmallTablet,
        sliderConfig.cardsMobile,
        sliderConfig.stepMobile,
        sliderConfig.autoScrollStepCards,
    ]);

    const maxStartIndex = Math.max(0, collections.length - Math.max(1, cardsPerRow));

    const getScrollLeftForCardIndex = useCallback(
        (idx) => {
            const el = sliderRef.current;
            if (!el || !el.children || el.children.length === 0) return 0;
            const safeIdx = Math.max(0, Math.min(maxStartIndex, idx));
            if (safeIdx === 0) return 0;
            const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
            if (safeIdx >= maxStartIndex) return maxScroll;
            const firstOffset = el.children[0]?.offsetLeft || 0;
            const targetChild = el.children[safeIdx];
            if (!targetChild) return maxScroll;
            return Math.min(maxScroll, Math.max(0, targetChild.offsetLeft - firstOffset));
        },
        [maxStartIndex]
    );

    const getNearestCardIndex = useCallback(
        (currentScrollLeft) => {
            const el = sliderRef.current;
            if (!el || maxStartIndex <= 0) return 0;
            const sl = typeof currentScrollLeft === 'number' ? currentScrollLeft : el.scrollLeft;
            let bestIdx = 0;
            let bestDiff = Infinity;
            for (let i = 0; i <= maxStartIndex; i++) {
                const targetPos = getScrollLeftForCardIndex(i);
                const diff = Math.abs(sl - targetPos);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIdx = i;
                }
            }
            return bestIdx;
        },
        [maxStartIndex, getScrollLeftForCardIndex]
    );

    const scrollToCardIndex = useCallback(
        (idx, behavior = 'smooth') => {
            const el = sliderRef.current;
            if (!el) return;
            const safeIdx = Math.max(0, Math.min(maxStartIndex, idx));
            const targetLeft = getScrollLeftForCardIndex(safeIdx);
            el.scrollTo({ left: targetLeft, behavior });
        },
        [maxStartIndex, getScrollLeftForCardIndex]
    );

    const updateSliderBounds = useCallback(() => {
        const el = sliderRef.current;
        if (!el) return;
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft < maxScroll - 2);
        setScrollProgress(maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollLeft / maxScroll)) : 0);
    }, []);

    useEffect(() => {
        const syncLayout = () => {
            const { cards, step } = computeBreakpointLayout();
            setCardsPerRow(cards);
            setStepPerTick(step);
            requestAnimationFrame(() => {
                updateSliderBounds();
            });
        };
        syncLayout();
        window.addEventListener('resize', syncLayout, { passive: true });
        return () => {
            window.removeEventListener('resize', syncLayout);
            if (momentumRafRef.current) {
                cancelAnimationFrame(momentumRafRef.current);
            }
        };
    }, [computeBreakpointLayout, updateSliderBounds, collections.length]);

    // Auto-scroll on timer with exact card-index snapping
    useEffect(() => {
        if (
            !sliderConfig.enabled ||
            !sliderConfig.autoScroll ||
            collections.length <= cardsPerRow ||
            isSliderDragging ||
            (sliderConfig.pauseOnHover && isHoveringSlider)
        ) {
            return undefined;
        }

        const intervalMs = Math.max(1000, Number(sliderConfig.autoScrollIntervalMs) || 3500);
        const stepCards = Math.max(1, Number(stepPerTick) || 1);

        const timer = setInterval(() => {
            const el = sliderRef.current;
            if (!el || isDraggingSliderRef.current || maxStartIndex <= 0) return;

            const currentIdx = getNearestCardIndex(el.scrollLeft);
            if (currentIdx >= maxStartIndex) {
                if (sliderConfig.loop) {
                    scrollToCardIndex(0, 'smooth');
                }
            } else {
                const nextIdx = Math.min(maxStartIndex, currentIdx + stepCards);
                scrollToCardIndex(nextIdx, 'smooth');
            }
        }, intervalMs);

        return () => clearInterval(timer);
    }, [
        sliderConfig.enabled,
        sliderConfig.autoScroll,
        sliderConfig.autoScrollIntervalMs,
        sliderConfig.pauseOnHover,
        sliderConfig.loop,
        collections.length,
        cardsPerRow,
        stepPerTick,
        maxStartIndex,
        isSliderDragging,
        isHoveringSlider,
        getNearestCardIndex,
        scrollToCardIndex,
    ]);

    const handleSliderMouseDown = (e) => {
        if (e.button !== 0 || !sliderRef.current) return;
        if (momentumRafRef.current) {
            cancelAnimationFrame(momentumRafRef.current);
            momentumRafRef.current = null;
        }
        isDraggingSliderRef.current = true;
        didDragSliderRef.current = false;
        dragStartXRef.current = e.clientX;
        lastClientXRef.current = e.clientX;
        lastMoveTimeRef.current = performance.now();
        velocityRef.current = 0;
        dragStartScrollLeftRef.current = sliderRef.current.scrollLeft;

        const handleMouseMove = (moveEvent) => {
            if (!isDraggingSliderRef.current || !sliderRef.current) return;
            const totalDx = moveEvent.clientX - dragStartXRef.current;
            if (!didDragSliderRef.current && Math.abs(totalDx) > 5) {
                didDragSliderRef.current = true;
                setIsSliderDragging(true);
            }
            if (didDragSliderRef.current) {
                const now = performance.now();
                const dt = Math.max(1, now - lastMoveTimeRef.current);
                const stepDx = moveEvent.clientX - lastClientXRef.current;
                velocityRef.current = (stepDx / dt) * 16;
                lastClientXRef.current = moveEvent.clientX;
                lastMoveTimeRef.current = now;
                sliderRef.current.scrollLeft = dragStartScrollLeftRef.current - totalDx;
                updateSliderBounds();
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            isDraggingSliderRef.current = false;
            setIsSliderDragging(false);

            if (didDragSliderRef.current) {
                const glideAndSnap = () => {
                    if (!sliderRef.current) return;
                    if (Math.abs(velocityRef.current) < 1.2) {
                        velocityRef.current = 0;
                        const snapIdx = getNearestCardIndex(sliderRef.current.scrollLeft);
                        scrollToCardIndex(snapIdx, 'smooth');
                        updateSliderBounds();
                        return;
                    }
                    sliderRef.current.scrollLeft -= velocityRef.current;
                    velocityRef.current *= 0.92;
                    updateSliderBounds();
                    momentumRafRef.current = requestAnimationFrame(glideAndSnap);
                };
                momentumRafRef.current = requestAnimationFrame(glideAndSnap);
                setTimeout(() => {
                    didDragSliderRef.current = false;
                }, 40);
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseup', handleMouseUp);
    };

    const scrollSliderByStep = (direction) => {
        const el = sliderRef.current;
        if (!el || maxStartIndex <= 0) return;
        if (momentumRafRef.current) {
            cancelAnimationFrame(momentumRafRef.current);
            momentumRafRef.current = null;
        }
        const currentIdx = getNearestCardIndex(el.scrollLeft);
        const step = Math.max(1, Number(stepPerTick) || 1);
        if (direction > 0 && currentIdx >= maxStartIndex && sliderConfig.loop) {
            scrollToCardIndex(0, 'smooth');
            return;
        }
        const nextIdx = Math.max(0, Math.min(maxStartIndex, currentIdx + direction * step));
        scrollToCardIndex(nextIdx, 'smooth');
    };

    if (sliderConfig.enabled === false || collections.length === 0) {
        return null;
    }

    const arrowSize = Math.max(20, Math.min(56, Number(sliderConfig.arrowSize) || 28));
    const arrowIconSize = Math.max(10, Math.min(32, Number(sliderConfig.arrowIconSize) || 14));
    const arrowOffsetX = Number(sliderConfig.arrowOffsetX) || 0;
    const arrowOffsetY = Number(sliderConfig.arrowOffsetY) || 0;
    const arrowRadiusClass =
        sliderConfig.arrowShape === 'square'
            ? 'rounded-md'
            : sliderConfig.arrowShape === 'rounded'
            ? 'rounded-xl'
            : 'rounded-full';

    const customArrowStyle = {
        width: `${arrowSize}px`,
        height: `${arrowSize}px`,
        ...(sliderConfig.arrowBgColor ? { backgroundColor: sliderConfig.arrowBgColor } : {}),
        ...(sliderConfig.arrowIconColor ? { color: sliderConfig.arrowIconColor } : {}),
        ...(sliderConfig.arrowBorderColor ? { borderColor: sliderConfig.arrowBorderColor } : {}),
    };

    const gapPx = isSquareShowcaseVariant ? (cardsPerRow >= 5 ? 16 : 24) : 12;

    return (
        <div
            onMouseEnter={() => setIsHoveringSlider(true)}
            onMouseLeave={() => setIsHoveringSlider(false)}
            onTouchStart={() => setIsHoveringSlider(true)}
            onTouchEnd={() => setIsHoveringSlider(false)}
            className={isSquareShowcaseVariant ? 'space-y-4 sm:space-y-6' : 'space-y-4'}
        >
            <style>{`
                .collections-slider-track::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
            `}</style>

            {!hideHeader && (isTrendingVariant ? (
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-card-border">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                Trending Collections
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        {sliderConfig.showHeaderArrows && (canScrollLeft || canScrollRight) && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => scrollSliderByStep(-1)}
                                    disabled={!canScrollLeft}
                                    aria-label="Slide left"
                                    className="w-7 h-7 rounded-lg border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollSliderByStep(1)}
                                    disabled={!canScrollRight && !sliderConfig.loop}
                                    aria-label="Slide right"
                                    className="w-7 h-7 rounded-lg border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {!isPreview && (
                            <Link
                                href="/collections"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                            >
                                <span>Browse all collections</span>
                                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        )}
                    </div>
                </div>
            ) : isFeaturedVariant ? (
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-card-border">
                    <div className="flex items-center gap-2.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                            Featured Collections
                        </h2>
                    </div>
                    {sliderConfig.showHeaderArrows && (canScrollLeft || canScrollRight || sliderConfig.loop) && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => scrollSliderByStep(-1)}
                                disabled={!canScrollLeft}
                                aria-label="Slide left"
                                className="w-7 h-7 rounded-lg border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollSliderByStep(1)}
                                disabled={!canScrollRight && !sliderConfig.loop}
                                aria-label="Slide right"
                                className="w-7 h-7 rounded-lg border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            ) : isPartOfCollectionsVariant ? (
                <div className="flex items-center justify-between gap-2 pb-1">
                    <span className="text-sm font-bold text-foreground">
                        Part of Collections
                    </span>
                    <div className="flex items-center gap-2">
                        {sliderConfig.showHeaderArrows && (canScrollLeft || canScrollRight || sliderConfig.loop) && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => scrollSliderByStep(-1)}
                                    disabled={!canScrollLeft}
                                    aria-label="Slide left"
                                    className="w-6 h-6 rounded-md border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollSliderByStep(1)}
                                    disabled={!canScrollRight && !sliderConfig.loop}
                                    aria-label="Slide right"
                                    className="w-6 h-6 rounded-md border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                            {collections.length}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            <span>More Collections You May Like</span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-3">
                        {sliderConfig.showHeaderArrows && (canScrollLeft || canScrollRight) && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => scrollSliderByStep(-1)}
                                    disabled={!canScrollLeft}
                                    aria-label="Slide left"
                                    className="w-7 h-7 rounded-lg border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollSliderByStep(1)}
                                    disabled={!canScrollRight && !sliderConfig.loop}
                                    aria-label="Slide right"
                                    className="w-7 h-7 rounded-lg border border-card-border bg-card-bg hover:border-primary-glow/50 text-foreground/80 hover:text-primary-glow disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {!isPreview && (
                            <Link
                                href="/collections"
                                className="text-xs font-bold text-primary-glow hover:underline flex items-center gap-1"
                            >
                                <span>Browse All</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            {/* Slider Viewport with Edge-Centered Chevron Buttons */}
            <div className="relative group/slider">
                {/* Left Edge Fade */}
                {sliderConfig.showEdgeFade !== false && canScrollLeft && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background/90 to-transparent z-20" />
                )}

                {/* Left Edge-Centered Chevron Button */}
                {sliderConfig.showArrows !== false && (canScrollLeft || isPreview) && (
                    <button
                        type="button"
                        onClick={() => scrollSliderByStep(-1)}
                        disabled={!canScrollLeft}
                        aria-label="Previous collections"
                        style={{
                            ...customArrowStyle,
                            left: `${arrowOffsetX}px`,
                            top: `calc(50% + ${arrowOffsetY}px)`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute z-30 ${arrowRadiusClass} bg-card-bg/95 backdrop-blur-md border border-card-border hover:border-primary-glow text-foreground hover:text-primary-glow shadow-lg flex items-center justify-center transition-all hover:scale-105 disabled:opacity-35 disabled:pointer-events-none cursor-pointer`}
                    >
                        <ChevronLeft
                            style={{
                                width: `${arrowIconSize}px`,
                                height: `${arrowIconSize}px`,
                            }}
                        />
                    </button>
                )}

                {/* Right Edge Fade */}
                {sliderConfig.showEdgeFade !== false && canScrollRight && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/90 to-transparent z-20" />
                )}

                {/* Right Edge-Centered Chevron Button */}
                {sliderConfig.showArrows !== false &&
                    (canScrollRight || (sliderConfig.loop && collections.length > cardsPerRow) || isPreview) && (
                        <button
                            type="button"
                            onClick={() => scrollSliderByStep(1)}
                            disabled={!canScrollRight && !sliderConfig.loop}
                            aria-label="Next collections"
                            style={{
                                ...customArrowStyle,
                                right: `${arrowOffsetX}px`,
                                top: `calc(50% + ${arrowOffsetY}px)`,
                                transform: 'translate(50%, -50%)',
                            }}
                            className={`absolute z-30 ${arrowRadiusClass} bg-card-bg/95 backdrop-blur-md border border-card-border hover:border-primary-glow text-foreground hover:text-primary-glow shadow-lg flex items-center justify-center transition-all hover:scale-105 disabled:opacity-35 disabled:pointer-events-none cursor-pointer`}
                        >
                            <ChevronRight
                                style={{
                                    width: `${arrowIconSize}px`,
                                    height: `${arrowIconSize}px`,
                                }}
                            />
                        </button>
                    )}

                <div
                    ref={sliderRef}
                    onMouseDown={handleSliderMouseDown}
                    onScroll={updateSliderBounds}
                    style={{
                        gap: `${gapPx}px`,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                    className={`collections-slider-track flex flex-nowrap overflow-x-auto py-1 select-none ${
                        isSliderDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                >
                    {collections.map((rel) => {
                        const isCompact = cardsPerRow >= 6;
                        const CardTag = isPreview ? 'div' : Link;
                        const cardProps = isPreview
                            ? {}
                            : {
                                  href: `/collections/${rel.slug}`,
                                  draggable: false,
                                  onClick: (e) => {
                                      if (didDragSliderRef.current) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                      }
                                  },
                              };

                        const cardWidthStyle = `calc((100% - ${
                            (Math.max(1, cardsPerRow) - 1) * gapPx
                        }px) / ${Math.max(1, cardsPerRow)})`;

                        if (isSquareShowcaseVariant) {
                            const hasCustomSquareCard = Boolean(rel.trendingCardImagePath);
                            return (
                                <CardTag
                                    key={rel.id}
                                    {...cardProps}
                                    style={{
                                        width: cardWidthStyle,
                                    }}
                                    className={`group shrink-0 flex flex-col ${
                                        isSliderDragging ? 'pointer-events-none' : ''
                                    }`}
                                >
                                    {/* 1:1 Square Visual Card Box */}
                                    <div
                                        className={`relative aspect-square w-full ${
                                            hasCustomSquareCard
                                                ? 'p-0'
                                                : cardsPerRow >= 6
                                                ? 'p-2'
                                                : cardsPerRow === 5
                                                ? 'p-2.5'
                                                : 'p-3'
                                        } rounded-2xl border bg-card-bg overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 ${
                                            isFeaturedVariant
                                                ? 'border-amber-500/30 ring-1 ring-amber-500/15 group-hover:border-primary-glow/50'
                                                : 'border-card-border group-hover:border-blue-500/40'
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
                                                src={rel.trendingCardImagePath}
                                                alt={rel.name}
                                                draggable={false}
                                                className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : rel.previewImages && rel.previewImages.length > 0 ? (
                                            <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-2">
                                                {rel.previewImages.slice(0, 4).map((img, idx) => (
                                                    <div
                                                        key={img.id || idx}
                                                        className="relative h-full w-full rounded-xl bg-card-bg/70 backdrop-blur-sm border border-card-border/60 p-2 flex items-center justify-center overflow-hidden"
                                                    >
                                                        <img
                                                            src={img.thumbPath || img.path}
                                                            alt=""
                                                            draggable={false}
                                                            className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : rel.coverImagePath ? (
                                            <div className="h-full w-full flex items-center justify-center p-3">
                                                <img
                                                    src={rel.coverImagePath}
                                                    alt={rel.name}
                                                    draggable={false}
                                                    className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                                                <Layers className="w-8 h-8 mb-1" />
                                                <span className="text-[11px]">Collection</span>
                                            </div>
                                        )}

                                        {isFeaturedVariant && (
                                            <div className="absolute top-3 left-3 z-10">
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-md">
                                                    <Star className="w-2.5 h-2.5 fill-current" />
                                                    <span>Featured</span>
                                                </span>
                                            </div>
                                        )}

                                        <div className="absolute bottom-3 right-3 z-10">
                                            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold shadow-md">
                                                {rel.imageCount} PNG{rel.imageCount === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title & Arrow Below the Card */}
                                    <div className="mt-2.5 px-1 flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">
                                            {rel.name}
                                        </h3>
                                        <ArrowRight className="w-4 h-4 shrink-0 text-foreground/55 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </CardTag>
                            );
                        }

                        return (
                            <CardTag
                                key={rel.id}
                                {...cardProps}
                                style={{
                                    width: cardWidthStyle,
                                    ...(rel.cardBgColor ? { backgroundColor: rel.cardBgColor } : {}),
                                }}
                                className={`group relative ${
                                    isCompact ? 'h-[78px] p-2.5 gap-2.5' : 'h-[92px] p-3.5 gap-3.5'
                                } shrink-0 rounded-xl border border-card-border bg-card-bg hover:border-primary-glow/50 hover:shadow-xl transition-all flex items-center overflow-hidden ${
                                    isSliderDragging ? 'pointer-events-none' : ''
                                }`}
                            >
                                {/* Optional Right-Side Custom Card Cover Image (always pinned to right at fixed size) */}
                                {rel.cardBgImagePath && (
                                    <div className="absolute inset-y-0 right-0 pointer-events-none select-none flex items-center justify-end">
                                        <img
                                            src={rel.cardBgImagePath}
                                            alt=""
                                            draggable={false}
                                            className="h-full w-auto max-w-none object-contain object-right shrink-0"
                                        />
                                    </div>
                                )}

                                {/* Zero-padding square thumbnail so custom thumbnails fill the box edge-to-edge */}
                                <div
                                    className={`relative z-10 ${
                                        isCompact ? 'w-12 h-12' : 'w-14 h-14'
                                    } rounded-lg bg-card-bg/80 backdrop-blur-sm border border-card-border p-0 flex items-center justify-center shrink-0 overflow-hidden`}
                                    style={{
                                        backgroundImage:
                                            'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                        backgroundSize: '10px 10px',
                                        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                                    }}
                                >
                                    {rel.coverImagePath ? (
                                        <img
                                            src={rel.coverImagePath}
                                            alt={rel.name}
                                            draggable={false}
                                            className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <Layers className="w-5 h-5 text-foreground/30" />
                                    )}
                                </div>
                                <div className="relative z-10 flex-1 min-w-0">
                                    <h4
                                        style={
                                            rel.cardTextColor ? { color: rel.cardTextColor } : undefined
                                        }
                                        className={`${
                                            isCompact ? 'text-xs' : 'text-sm'
                                        } font-bold text-foreground group-hover:text-primary-glow transition-colors truncate`}
                                    >
                                        {rel.name}
                                    </h4>
                                    <span
                                        style={
                                            rel.cardTextColor
                                                ? { color: rel.cardTextColor, opacity: 0.72 }
                                                : undefined
                                        }
                                        className="text-[11px] text-foreground/50 mt-0.5 block truncate"
                                    >
                                        {rel.imageCount} PNG{rel.imageCount === 1 ? '' : 's'}
                                    </span>
                                </div>
                            </CardTag>
                        );
                    })}
                </div>
            </div>

            {/* Interactive Progress Track & Pagination Dots */}
            {sliderConfig.showProgressDots !== false && collections.length > cardsPerRow && (
                <div className="flex items-center justify-center gap-2 pt-1">
                    {Array.from({
                        length: Math.max(
                            2,
                            Math.min(
                                10,
                                Math.ceil(collections.length / Math.max(1, Math.floor(cardsPerRow / 2)))
                            )
                        ),
                    }).map((_, dotIdx, arr) => {
                        const targetRatio = arr.length > 1 ? dotIdx / (arr.length - 1) : 0;
                        const isActive =
                            Math.abs(scrollProgress - targetRatio) <=
                            0.55 / Math.max(1, arr.length - 1);
                        return (
                            <button
                                key={dotIdx}
                                type="button"
                                aria-label={`Jump to slide segment ${dotIdx + 1}`}
                                onClick={() => {
                                    const targetCardIdx = Math.round(maxStartIndex * targetRatio);
                                    scrollToCardIndex(targetCardIdx, 'smooth');
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                    isActive
                                        ? 'w-7 bg-primary-glow'
                                        : 'w-2 bg-foreground/20 hover:bg-foreground/40'
                                }`}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
