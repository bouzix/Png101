import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Wraps any wide admin table with horizontal scroll detection, card-background
 * edge fades, and floating left/right scroll buttons when columns overflow.
 */
export default function ResponsiveTableWrapper({
    children,
    className = '',
    scrollStep = 200,
    fadeFromClass = 'from-card-bg via-card-bg/80',
}) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }, []);

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateScrollState);
            return () => window.removeEventListener('resize', updateScrollState);
        }
        const observer = new ResizeObserver(() => {
            updateScrollState();
        });
        observer.observe(el);
        if (el.firstElementChild) {
            observer.observe(el.firstElementChild);
        }
        window.addEventListener('resize', updateScrollState);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateScrollState);
        };
    }, [children, updateScrollState]);

    return (
        <div className={`relative ${className}`}>
            {/* Left Natural Edge Fade + Scroll Button */}
            <div
                aria-hidden="true"
                data-testid="table-scroll-left-glow"
                className={`pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14 bg-gradient-to-r ${fadeFromClass} to-transparent z-10 transition-opacity duration-200 ${
                    canScrollLeft ? 'opacity-100' : 'opacity-0'
                }`}
            />
            {canScrollLeft && (
                <button
                    type="button"
                    onClick={() =>
                        scrollRef.current?.scrollBy({
                            left: -scrollStep,
                            behavior: 'smooth',
                        })
                    }
                    aria-label="Scroll table left"
                    title="Scroll left"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-card-bg/95 border border-primary-glow/40 text-primary-glow shadow-lg backdrop-blur-md flex items-center justify-center hover:bg-primary-glow hover:text-white transition-all cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            )}

            {/* Right Natural Edge Fade + Scroll Button */}
            <div
                aria-hidden="true"
                data-testid="table-scroll-right-glow"
                className={`pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14 bg-gradient-to-l ${fadeFromClass} to-transparent z-10 transition-opacity duration-200 ${
                    canScrollRight ? 'opacity-100' : 'opacity-0'
                }`}
            />
            {canScrollRight && (
                <button
                    type="button"
                    onClick={() =>
                        scrollRef.current?.scrollBy({
                            left: scrollStep,
                            behavior: 'smooth',
                        })
                    }
                    aria-label="Scroll table right"
                    title="Scroll right to see more columns"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-card-bg/95 border border-primary-glow/40 text-primary-glow shadow-lg backdrop-blur-md flex items-center justify-center hover:bg-primary-glow hover:text-white transition-all cursor-pointer"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}

            <div
                ref={scrollRef}
                onScroll={updateScrollState}
                className="overflow-x-auto"
            >
                {children}
            </div>
        </div>
    );
}
