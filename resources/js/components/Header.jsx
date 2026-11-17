import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, ArrowRight, Wand2, Sparkles, FileText } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { BrandLogo } from './BrandMark';

const Header = ({
    initialQuery = '',
    siteName = '',
    showOnScrollOnly = false
}) => {
    const { props } = usePage();
    const resolvedSiteName = siteName || props?.websiteInfo?.websiteName || 'Png101';
    const [query, setQuery] = useState(initialQuery);
    const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

    useEffect(() => {
        if (!showOnScrollOnly) return;

        const handleScroll = () => {
            const heroEl = document.getElementById('home-hero');
            const threshold = heroEl
                ? Math.max(heroEl.offsetTop + heroEl.offsetHeight - 140, 240)
                : 280;
            setIsScrolledPastHero(window.scrollY > threshold);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showOnScrollOnly]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            router.visit(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const containerClasses = showOnScrollOnly
        ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out transform ${isScrolledPastHero
            ? 'translate-y-0 opacity-100 shadow-xl'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`
        : 'sticky top-0 z-40 w-full';

    return (
        <header
            className={`site-header hidden md:block ${containerClasses} backdrop-blur-xl transition-colors duration-200`}
        >
            <div className="w-full px-6 sm:px-10 md:px-16 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-6">
                {/* Brand / Logo */}
                <Link
                    href="/"
                    data-testid="header-brand-link"
                    className="flex items-center group shrink-0"
                    title={`Go to ${resolvedSiteName} Homepage`}
                >
                    <BrandLogo websiteInfo={props?.websiteInfo} siteName={resolvedSiteName} size="header" />
                </Link>

                {/* Sleek Redesigned Search Input */}
                <div className="flex-1 max-w-xl mx-1 sm:mx-4">
                    <form onSubmit={handleSearch} className="relative group/search">
                        <div className="header-search-box relative flex items-center w-full rounded-full transition-all duration-200 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/25">
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
                    {props?.editorNav?.showInPublicNav && (
                        <Link
                            href="/image-editor"
                            className="header-nav-link inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 hover:bg-blue-500/20"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{props.editorNav.navLabel || 'Editor'}</span>
                        </Link>
                    )}

                    {/* Desktop-Only Super Menu Dropdown for Bonus Tools */}
                    {props?.bonusToolsNav?.showInPublicNav && Array.isArray(props?.bonusToolsNav?.megaMenuGenres) && props.bonusToolsNav.megaMenuGenres.length > 0 && (
                        <div className="hidden lg:block relative group/tools">
                            <Link
                                href="/tools"
                                className="header-nav-link inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border border-transparent group-hover/tools:border-blue-500/25 group-hover/tools:bg-blue-500/10 text-foreground/85 group-hover/tools:text-blue-500"
                            >
                                <span>Tools</span>
                                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover/tools:rotate-180" />
                            </Link>

                            {/* Hover Bridge + Mega Dropdown Panel */}
                            <div className="absolute right-0 top-full pt-3 w-[min(980px,92vw)] opacity-0 invisible translate-y-1.5 pointer-events-none group-hover/tools:opacity-100 group-hover/tools:visible group-hover/tools:translate-y-0 group-hover/tools:pointer-events-auto group-focus-within/tools:opacity-100 group-focus-within/tools:visible group-focus-within/tools:translate-y-0 group-focus-within/tools:pointer-events-auto transition-all duration-200 z-50">
                                <div className="bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-foreground">
                                    {/* Mega-Menu Header */}
                                    <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/50">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/25">
                                                <Wand2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground">
                                                    Creative &amp; Conversion Tools
                                                </div>
                                                <div className="text-[11px] text-foreground/55">
                                                    100% browser-based · Zero server uploads
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            href="/tools"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-sm transition-colors"
                                        >
                                            <span>All Tools</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>

                                    {/* Genre Columns */}
                                    <div className="p-5 grid grid-cols-12 gap-5">
                                        {props.bonusToolsNav.megaMenuGenres.map((genre, idx) => {
                                            const totalGenres = props.bonusToolsNav.megaMenuGenres.length;
                                            let colClass = 'col-span-12';
                                            if (totalGenres === 2) {
                                                colClass = idx === 0
                                                    ? 'col-span-7 pr-4 border-r border-slate-200/70 dark:border-slate-800/70'
                                                    : 'col-span-5';
                                            } else if (totalGenres >= 3) {
                                                const isLast = idx === totalGenres - 1;
                                                const divider = isLast ? '' : 'pr-4 border-r border-slate-200/70 dark:border-slate-800/70';
                                                colClass = `${idx === 0 ? 'col-span-5' : idx === 1 ? 'col-span-4' : 'col-span-3'} ${divider}`;
                                            }

                                            return (
                                                <div
                                                    key={genre.id}
                                                    className={`${colClass} space-y-3`}
                                                >
                                                    <div>
                                                        <Link
                                                            href={genre.href || '/tools'}
                                                            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            <span>{genre.title}</span>
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    </div>

                                                    <div
                                                        className={`grid gap-1.5 ${
                                                            genre.tools.length > 5 ? 'grid-cols-2' : 'grid-cols-1'
                                                        }`}
                                                    >
                                                        {genre.tools.map((tool) => (
                                                            <Link
                                                                key={tool.slug}
                                                                href={tool.href}
                                                                className="group/item flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold text-foreground group-hover/item:text-blue-500 truncate">
                                                                        {tool.shortTitle || tool.title}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-foreground/45">
                                                                        {tool.fromFormat} &rarr; {tool.toFormat}
                                                                    </div>
                                                                </div>
                                                                <ArrowRight className="w-3 h-3 text-foreground/30 group-hover/item:text-blue-500 group-hover/item:translate-x-0.5 transition-all shrink-0" />
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Expandable Genres Footer Roadmap Strip */}
                                    <div className="px-5 py-2.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-[11px] text-foreground/55">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-foreground/40" />
                                            <span>
                                                Expanding suites: Document Tools (PDF &harr; Docs), Vector &amp; Social Canvas Studio
                                            </span>
                                        </div>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">
                                            <Sparkles className="w-3 h-3" />
                                            Modular
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <ThemeToggle className="theme-toggle-btn" />
                </div>
            </div>
        </header>
    );
};

export default Header;
