'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
    initialQuery?: string;
    siteName?: string;
    showOnScrollOnly?: boolean;
}

const Header = ({
    initialQuery = '',
    siteName = 'PNG Finder',
    showOnScrollOnly = false
}: HeaderProps) => {
    const [query, setQuery] = useState(initialQuery);
    const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!showOnScrollOnly) return;

        const handleScroll = () => {
            const heroEl = document.getElementById('home-hero');
            // When user scrolls past hero threshold (~260-320px), reveal the sticky bar
            const threshold = heroEl
                ? Math.max(heroEl.offsetTop + heroEl.offsetHeight - 140, 240)
                : 280;
            setIsScrolledPastHero(window.scrollY > threshold);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showOnScrollOnly]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    // Determine container classes based on showOnScrollOnly
    const containerClasses = showOnScrollOnly
        ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out transform ${
              isScrolledPastHero
                  ? 'translate-y-0 opacity-100 shadow-xl'
                  : '-translate-y-full opacity-0 pointer-events-none'
          }`
        : 'sticky top-0 z-40 w-full';

    return (
        <header
            className={`site-header ${containerClasses} backdrop-blur-xl transition-colors duration-200`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
                {/* Brand / Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
                    title={`Go to ${siteName} Homepage`}
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_22px_rgba(59,130,246,0.7)] group-hover:scale-105 transition-all duration-300">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5 text-white"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                            />
                        </svg>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="header-brand-title font-extrabold text-base sm:text-lg tracking-tight group-hover:text-blue-500 transition-colors">
                            {siteName}
                        </span>
                        <span className="hidden lg:inline-flex text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            PNG
                        </span>
                    </div>
                </Link>

                {/* Sleek Redesigned Search Input */}
                <div className="flex-1 max-w-xl mx-1 sm:mx-4">
                    <form onSubmit={handleSearch} className="relative group/search">
                        <div className="header-search-box relative flex items-center w-full rounded-full transition-all duration-200 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/25">
                            {/* Search Icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4 ml-3.5 text-foreground/40 group-focus-within/search:text-blue-500 transition-colors shrink-0"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                />
                            </svg>

                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search high-res PNG images..."
                                className="w-full bg-transparent py-2 pl-2.5 pr-14 text-xs sm:text-sm focus:outline-none"
                            />

                            {/* Clear Button */}
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-10 p-1 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                                    title="Clear search"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="w-3.5 h-3.5"
                                    >
                                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                    </svg>
                                </button>
                            )}

                            {/* Submit Arrow Button */}
                            <button
                                type="submit"
                                className="mr-1.5 p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                                title="Search"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                    className="w-3.5 h-3.5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                    />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Side: Quick Links + Integrated Theme Toggle */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Link
                        href="/collections"
                        className="header-nav-link inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-blue-500/20 text-foreground/80 hover:text-blue-500"
                    >
                        Collections
                    </Link>
                    <Link
                        href="/latest"
                        className="header-nav-link hidden md:inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-blue-500/20"
                    >
                        Latest
                    </Link>
                    <Link
                        href="/tags"
                        className="header-nav-link hidden lg:inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-blue-500/20"
                    >
                        Tags
                    </Link>

                    {/* Integrated Dark/Light Mode Toggle */}
                    <ThemeToggle className="theme-toggle-btn" />
                </div>
            </div>
        </header>
    );
};

export default Header;

