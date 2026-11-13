'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCw, Home, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ErrorPagesSettings } from '@/lib/error-pages';

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [config, setConfig] = useState<ErrorPagesSettings['p500'] | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        console.error('App Runtime Error:', error);
        // Fetch custom 500 config if available
        fetch('/api/admin/error-pages')
            .then((r) => r.json())
            .then((data) => {
                if (data && data.p500) {
                    setConfig(data.p500);
                }
            })
            .catch(() => {});
    }, [error]);

    const title = config?.title || 'Something Glitched in the Pixels';
    const subtitle = config?.subtitle || '500 - Internal Server Error';
    const message =
        config?.message ||
        'Our servers hit an unexpected bump while rendering this page. Our technical team has been notified.';
    const imagePath = config?.imagePath || '/assets/errors/500.svg';
    const imageAlt = config?.imageAlt || '500 Server Error';

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-xl mx-auto text-center space-y-8">
                {/* 500 Graphic */}
                <div className="relative mx-auto w-64 h-52 sm:w-72 sm:h-60 flex items-center justify-center">
                    <div
                        className="w-full h-full rounded-3xl border border-red-500/20 bg-card-bg/60 backdrop-blur-md p-4 flex items-center justify-center overflow-hidden shadow-2xl relative"
                        style={{
                            backgroundImage:
                                'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                            backgroundSize: '14px 14px',
                            backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                        }}
                    >
                        <img
                            src={imagePath}
                            alt={imageAlt}
                            className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-lg"
                        />
                    </div>
                </div>

                {/* Badge & Text */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{subtitle}</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                        {title}
                    </h1>

                    <p className="text-sm sm:text-base text-foreground/60 max-w-md mx-auto leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                        <RotateCw className="w-4 h-4" />
                        <span>{config?.primaryButtonText || 'Try Again'}</span>
                    </button>

                    <Link
                        href={config?.secondaryButtonLink || '/'}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card-bg hover:bg-foreground/5 border border-card-border text-foreground font-semibold text-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                        <Home className="w-4 h-4 text-blue-500" />
                        <span>{config?.secondaryButtonText || 'Return to Homepage'}</span>
                    </Link>
                </div>

                {/* Technical Error Digest (Expandable for debugging) */}
                {error?.digest && (
                    <div className="pt-4 text-left max-w-md mx-auto">
                        <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-xs text-foreground/40 hover:text-foreground/70 inline-flex items-center gap-1 mx-auto cursor-pointer"
                        >
                            <span>Error Reference ID: {error.digest}</span>
                            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {showDetails && (
                            <div className="mt-2 p-3 rounded-lg bg-card-bg border border-card-border text-xs text-foreground/60 font-mono break-all">
                                {error.message || 'An unexpected runtime error occurred.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

