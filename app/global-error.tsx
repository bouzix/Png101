'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md mx-auto text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-2xl font-bold">
                        500
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">System Runtime Error</h1>
                        <p className="text-sm text-slate-400">
                            The application encountered a critical runtime error. Please try refreshing or return to the main homepage.
                        </p>
                    </div>

                    <div className="flex justify-center gap-3 pt-2">
                        <button
                            onClick={() => reset()}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer"
                        >
                            Try Again
                        </button>
                        <a
                            href="/"
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors"
                        >
                            Homepage
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}

