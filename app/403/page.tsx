import React from 'react';
import Link from 'next/link';
import { getErrorPagesConfig } from '@/lib/error-pages';
import { getWebsiteInfo } from '@/lib/website-info';
import Header from '../components/Header';
import { ShieldAlert, Home, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ForbiddenPage() {
    const [config, websiteInfo] = await Promise.all([
        getErrorPagesConfig(),
        getWebsiteInfo(),
    ]);

    const p403 = config.p403;

    return (
        <div className="min-h-screen bg-background flex flex-col justify-between">
            <Header siteName={websiteInfo.websiteName} showOnScrollOnly={false} />

            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-lg mx-auto text-center space-y-8">
                    {/* 403 Shield Illustration */}
                    <div className="relative mx-auto w-64 h-52 sm:w-72 sm:h-60 flex items-center justify-center">
                        <div
                            className="w-full h-full rounded-3xl border border-purple-500/20 bg-card-bg/60 backdrop-blur-md p-4 flex items-center justify-center overflow-hidden shadow-2xl relative"
                            style={{
                                backgroundImage:
                                    'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                backgroundSize: '14px 14px',
                                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                            }}
                        >
                            <img
                                src={p403.imagePath || '/assets/errors/403.svg'}
                                alt={p403.imageAlt || '403 Forbidden Access'}
                                className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-bold uppercase tracking-wider">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{p403.subtitle || '403 - Access Forbidden'}</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                            {p403.title || 'Access Restricted'}
                        </h1>

                        <p className="text-sm sm:text-base text-foreground/60 max-w-md mx-auto leading-relaxed">
                            {p403.message ||
                                "You don't have authorization or sufficient permissions to access this page."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Link
                            href={p403.primaryButtonLink || '/'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
                        >
                            <Home className="w-4 h-4" />
                            <span>{p403.primaryButtonText || 'Back to Homepage'}</span>
                        </Link>

                        {p403.secondaryButtonText && (
                            <Link
                                href={p403.secondaryButtonLink || '/collections'}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card-bg hover:bg-foreground/5 border border-card-border text-foreground font-semibold text-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                <span>{p403.secondaryButtonText}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

