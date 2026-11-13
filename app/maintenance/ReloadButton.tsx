'use client';

import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';

export default function ReloadButton({ label = 'Refresh Status' }: { label?: string }) {
    const [isReloading, setIsReloading] = useState(false);

    const handleReload = () => {
        setIsReloading(true);
        // Force full document navigation to '/' to re-evaluate maintenance status
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

