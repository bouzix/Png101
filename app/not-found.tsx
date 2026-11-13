import React from 'react';
import Link from 'next/link';
import { getErrorPagesConfig } from '@/lib/error-pages';
import { getWebsiteInfo } from '@/lib/website-info';
import Header from './components/Header';
import { Search, Home, ArrowRight, Layers, Compass } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NotFound() {
    const [config, websiteInfo] = await Promise.all([
        getErrorPagesConfig(),
        getWebsiteInfo(),
    ]);

    const p404 = config.p404;

    return (
        <div className="min-h-screen bg-background flex flex-col justify-between">
            <Header siteName={websiteInfo.websiteName} showOnScrollOnly={false} />

            <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
                <div className="w-full max-w-2xl mx-auto text-center space-y-8">
                    {/* Illustration / Custom Image */}
                    <div className="relative mx-auto w-64 h-52 sm:w-80 sm:h-64 flex items-center justify-center">
                        <div
                            className="w-full h-full rounded-3xl border border-card-border/80 bg-card-bg/60 backdrop-blur-md p-4 flex items-center justify-center overflow-hidden shadow-2xl relative group"
                            style={{
                                backgroundImage:
                                    'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                backgroundSize: '14px 14px',
                                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                            }}
                        >
                            <img
                                src={p404.imagePath || '/assets/errors/404.svg'}
                                alt={p404.imageAlt || '404 Page Not Found'}
                                className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-lg transform group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    </div>

                    {/* Badge & Titles */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span>{p404.subtitle || '404 - Not Found'}</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
                            {p404.title || 'Lost in Transparency?'}
                        </h1>

                        <p className="text-sm sm:text-base text-foreground/60 max-w-lg mx-auto leading-relaxed">
                            {p404.message ||
                                "The transparent PNG, collection, or page you were looking for doesn't exist, has been moved, or faded away."}
                        </p>
                    </div>

                    {/* Integrated Search Bar on 404 */}
                    {p404.showSearchBar !== false && (
                        <div className="max-w-md mx-auto">
                            <form action="/search" method="GET" className="relative flex items-center">
                                <input
                                    type="text"
                                    name="q"
                                    placeholder="Search 10,000+ transparent PNGs & clipart..."
                                    className="w-full pl-11 pr-24 py-3 rounded-xl bg-card-bg border border-card-border text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-md transition-all"
                                />
                                <Search className="w-5 h-5 text-foreground/40 absolute left-3.5 pointer-events-none" />
                                <button
                                    type="submit"
                                    className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                                >
                                    Search
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Suggested Tag Keywords */}
                    {p404.showSuggestedTags !== false && p404.suggestedTags && p404.suggestedTags.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-foreground/40 font-medium">Popular transparent searches:</p>
                            <div className="flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto">
                                {p404.suggestedTags.map((tag, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/search?q=${encodeURIComponent(tag)}`}
                                        className="px-2.5 py-1 rounded-lg bg-tag-bg hover:bg-blue-600 hover:text-white text-tag-text text-xs border border-tag-border transition-colors"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Link
                            href={p404.primaryButtonLink || '/'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
                        >
                            <Home className="w-4 h-4" />
                            <span>{p404.primaryButtonText || 'Back to Home'}</span>
                        </Link>

                        {p404.secondaryButtonText && (
                            <Link
                                href={p404.secondaryButtonLink || '/collections'}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card-bg hover:bg-foreground/5 border border-card-border text-foreground font-semibold text-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                            >
                                <Layers className="w-4 h-4 text-blue-500" />
                                <span>{p404.secondaryButtonText}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

