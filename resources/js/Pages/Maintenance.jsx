import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import ThemeToggle from '@/components/ThemeToggle';
import { Wrench, Clock, RotateCw } from 'lucide-react';

function ReloadButton({ label = 'Refresh Status' }) {
    const [isReloading, setIsReloading] = useState(false);

    const handleReload = () => {
        setIsReloading(true);
        window.location.href = '/';
    };

    return (
        <button
            type="button"
            onClick={handleReload}
            disabled={isReloading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-75 text-white font-semibold text-sm shadow-lg shadow-amber-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
        >
            <RotateCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            <span>{isReloading ? 'Checking Status...' : label}</span>
        </button>
    );
}

export default function Maintenance({ config = {}, websiteInfo = {} }) {
    const m = config || {};
    const siteName = websiteInfo?.websiteName || 'Png101';

    return (
        <div className="min-h-screen bg-background flex flex-col justify-between">
            <Head title={`Maintenance - ${siteName}`} />
            <header className="w-full border-b border-card-border/60 bg-card-bg/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-foreground font-black tracking-tight text-lg">
                    {siteName}
                </span>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-lg mx-auto text-center space-y-8">
                    <div className="relative mx-auto w-64 h-52 sm:w-72 sm:h-60 flex items-center justify-center">
                        <div
                            className="w-full h-full rounded-3xl border border-amber-500/20 bg-card-bg/60 backdrop-blur-md p-4 flex items-center justify-center overflow-hidden shadow-2xl relative"
                            style={{
                                backgroundImage:
                                    'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                                backgroundSize: '14px 14px',
                                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                            }}
                        >
                            <img
                                src={m.imagePath || '/assets/errors/503.svg'}
                                alt={m.imageAlt || '503 Maintenance'}
                                className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider">
                            <Wrench className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                            <span>{m.subtitle || '503 - Maintenance Mode'}</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                            {m.title || 'Polishing Pixels & Upgrading Systems'}
                        </h1>

                        <p className="text-sm sm:text-base text-foreground/60 max-w-md mx-auto leading-relaxed">
                            {m.message ||
                                'We are performing scheduled maintenance and performance optimizations. Everything will be back online shortly!'}
                        </p>

                        {m.estimatedEndTime && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-bg border border-card-border text-xs text-foreground/70">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Estimated completion: <strong>{m.estimatedEndTime}</strong></span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center pt-2">
                        <ReloadButton label={m.primaryButtonText || 'Refresh Status'} />
                    </div>
                </div>
            </main>
        </div>
    );
}
