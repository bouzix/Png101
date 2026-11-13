import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function NotFound({ config = {} }) {
    const title = config.title || 'Page Not Found';
    const message = config.message || "Oops! The transparent PNG or page you're looking for seems to have vanished into thin air.";
    const buttonText = config.buttonText || 'Back to Homepage';
    const buttonUrl = config.buttonUrl || '/';

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
            <Head title={`404 - ${title}`} />

            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-md w-full text-center space-y-6 bg-card-bg border border-card-border rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="text-7xl font-black tracking-tighter bg-gradient-to-br from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    404
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                    <p className="text-sm text-muted-text leading-relaxed">{message}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                        href={buttonUrl}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-600/20"
                    >
                        {buttonText}
                    </Link>
                    <Link
                        href="/search"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground font-semibold text-sm transition-colors"
                    >
                        Search PNGs
                    </Link>
                </div>
            </div>
        </div>
    );
}

