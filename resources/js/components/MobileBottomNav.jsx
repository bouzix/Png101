import React, { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { Home, Clock, Search, Layers, Sun, Moon, X, ArrowRight } from 'lucide-react';

export default function MobileBottomNav({ currentPath = '/' }) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDark, setIsDark] = useState(true);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const updateThemeState = () => {
            setIsDark(!document.documentElement.classList.contains('light'));
        };
        updateThemeState();

        const observer = new MutationObserver(updateThemeState);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        window.addEventListener('theme-change', updateThemeState);
        window.addEventListener('storage', updateThemeState);

        return () => {
            observer.disconnect();
            window.removeEventListener('theme-change', updateThemeState);
            window.removeEventListener('storage', updateThemeState);
        };
    }, []);

    useEffect(() => {
        setSearchOpen(false);
    }, [currentPath]);

    useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [searchOpen]);

    const toggleTheme = () => {
        const willBeDark = document.documentElement.classList.contains('light');
        if (willBeDark) {
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
            try {
                localStorage.setItem('theme', 'dark');
            } catch (e) {}
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
            try {
                localStorage.setItem('theme', 'light');
            } catch (e) {}
        }
        setIsDark(willBeDark);
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { isDark: willBeDark } }));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        setSearchOpen(false);
        router.visit(`/search?q=${encodeURIComponent(trimmed)}`);
    };

    const cleanPath = (currentPath || '/').split('?')[0];
    if (cleanPath.startsWith('/image-editor')) {
        return null;
    }
    let activeIndex = -1;
    if (searchOpen || cleanPath.startsWith('/search')) {
        activeIndex = 2;
    } else if (cleanPath === '/' || cleanPath === '') {
        activeIndex = 0;
    } else if (cleanPath.startsWith('/latest')) {
        activeIndex = 1;
    } else if (cleanPath.startsWith('/collections')) {
        activeIndex = 3;
    }

    return (
        <div className="md:hidden">
            {/* Quick Mobile Search Popup above the Pill */}
            {searchOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
                        onClick={() => setSearchOpen(false)}
                    />
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(350px,calc(100vw-24px))]">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex items-center gap-2 p-2 rounded-2xl bg-card-bg/95 border border-primary-glow/35 shadow-2xl backdrop-blur-xl"
                        >
                            <Search className="w-4 h-4 ml-2 text-primary-glow shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search transparent PNGs..."
                                className="flex-1 min-w-0 bg-transparent py-2 text-sm text-foreground placeholder:text-foreground/45 focus:outline-none"
                            />
                            {searchQuery ? (
                                <button
                                    type="submit"
                                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0"
                                    aria-label="Run search"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(false)}
                                    className="p-2 rounded-xl text-foreground/50 hover:text-foreground transition-colors shrink-0"
                                    aria-label="Close search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </form>
                    </div>
                </>
            )}

            {/* Floating Pill Navigation */}
            <nav
                aria-label="Mobile Navigation"
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 mobile-pill-nav"
            >
                <ul>
                    <li className={`list ${activeIndex === 0 ? 'active' : ''}`}>
                        <Link href="/" aria-label="Home" onClick={() => setSearchOpen(false)}>
                            <span className="icon">
                                <Home className="w-5 h-5" />
                            </span>
                            <span className="title">Home</span>
                        </Link>
                    </li>

                    <li className={`list ${activeIndex === 1 ? 'active' : ''}`}>
                        <Link href="/latest" aria-label="Latest" onClick={() => setSearchOpen(false)}>
                            <span className="icon">
                                <Clock className="w-5 h-5" />
                            </span>
                            <span className="title">Latest</span>
                        </Link>
                    </li>

                    <li className={`list ${activeIndex === 2 ? 'active' : ''}`}>
                        <button
                            type="button"
                            onClick={() => setSearchOpen((prev) => !prev)}
                            aria-label="Search PNGs"
                            aria-expanded={searchOpen}
                        >
                            <span className="icon">
                                <Search className="w-5 h-5" />
                            </span>
                            <span className="title">Search</span>
                        </button>
                    </li>

                    <li className={`list ${activeIndex === 3 ? 'active' : ''}`}>
                        <Link href="/collections" aria-label="Collections" onClick={() => setSearchOpen(false)}>
                            <span className="icon">
                                <Layers className="w-5 h-5" />
                            </span>
                            <span className="title">Collections</span>
                        </Link>
                    </li>

                    <li className="list">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <span className="icon">
                                {isDark ? (
                                    <Sun className="w-5 h-5" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </span>
                            <span className="title">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                        </button>
                    </li>

                    <div
                        className="indicator"
                        style={{
                            transform:
                                activeIndex >= 0
                                    ? `translateX(${activeIndex * 100}%)`
                                    : 'translateX(0%) scale(0.75)',
                            opacity: activeIndex >= 0 ? 1 : 0,
                        }}
                    />
                </ul>
            </nav>
        </div>
    );
}

