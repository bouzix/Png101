import React from 'react';
import { AlertTriangle, Download, Image as ImageIcon } from 'lucide-react';

/**
 * Compact square AssetCard-style tile for batch Grid view (zero title/text clutter),
 * wrapped in a 2x (6px) full-perimeter brand rainbow conic border progress frame
 * and a desaturated diagonal-sheen + pulsing queued animation while waiting.
 */
export default function BatchAssetGridCard({
    previewUrl,
    status = 'pending',
    progress = 0,
    downloadUrl = null,
    downloadFilename = null,
    onDownloadClick = null,
    badgeText = null,
    badgeTone = 'neutral',
    badgePlacement = 'top-left',
    badgeAlwaysVisible = false,
    bottomBadgeText = null,
    bottomBadgeTone = 'neutral',
    footer = null,
}) {
    const clampedPct = status === 'done' ? 100 : Math.max(0, Math.min(100, Math.round(progress)));
    const isPending = status === 'pending';
    const isStopped = status === 'stopped';
    const isActive = status === 'converting' || status === 'processing';
    const isError = status === 'error';
    const isDone = status === 'done';
    const deg = isError ? 360 : clampedPct * 3.6;

    const getToneClass = (tone) =>
        tone === 'danger'
            ? 'bg-rose-500/90 text-white'
            : tone === 'success'
                ? 'bg-emerald-500/90 text-white'
                : tone === 'warning'
                    ? 'bg-amber-500/90 text-white'
                    : tone === 'info'
                        ? 'bg-blue-600/95 text-white'
                        : 'bg-slate-900/75 text-white';

    const badgeClasses = getToneClass(badgeTone);
    const bottomBadgeClasses = getToneClass(bottomBadgeTone);

    const ringBackground = isError
        ? 'linear-gradient(135deg, #f43f5e, #e11d48)'
        : isStopped
            ? 'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(100,116,139,0.35))'
        : isPending
            ? 'repeating-conic-gradient(from 0deg, rgba(148,163,184,0.28) 0deg 15deg, rgba(59,130,246,0.22) 15deg 30deg)'
            : `conic-gradient(from 0deg, transparent 0deg var(--card-deg), var(--card-border) var(--card-deg) 360deg), conic-gradient(from 0deg, #10b981, #06b6d4, #3b82f6, #6366f1, #8b5cf6, #ec4899, #10b981)`;

    const ringTile = (
        <div
            className={`batch-perimeter-ring relative aspect-square rounded-[16px] p-[6px] ${
                isPending ? 'batch-waiting-ring' : ''
            } ${isActive ? 'shadow-[0_0_20px_rgba(59,130,246,0.35)]' : ''} ${
                isDone ? 'batch-perimeter-ring--done' : ''
            }`}
            style={{
                '--card-deg': `${deg}deg`,
                backgroundImage: ringBackground,
            }}
        >
            <div className="group relative w-full h-full rounded-[10px] bg-card-bg overflow-hidden">
                {/* Transparency Pattern Reveal on Hover (matches homepage ImageCard) */}
                {!isPending && (
                    <>
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"
                            style={{
                                backgroundImage: 'url(/needed/transparency_pattern.jpg)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        />
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-10 pointer-events-none" />
                    </>
                )}

                {/* Waiting / Queued Diagonal Frosted Sheen Animation */}
                {isPending && (
                    <div aria-hidden="true" className="absolute inset-0 z-20 pointer-events-none overflow-hidden bg-slate-950/15 dark:bg-slate-950/35">
                        <div className="batch-waiting-sheen absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 dark:via-blue-300/15 to-transparent" />
                    </div>
                )}

                {/* Compact Artwork Frame */}
                <div
                    className={`relative z-10 w-full h-full flex items-center justify-center ${
                        badgePlacement === 'top-center' ? 'pt-9 pb-3 px-3' : 'p-2.5'
                    }`}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt=""
                            className={`max-w-full max-h-full object-contain transform transition-all duration-300 ${
                                isPending || isStopped
                                    ? 'grayscale opacity-40 scale-95'
                                    : isActive
                                        ? 'opacity-70'
                                        : 'opacity-100 group-hover:scale-105'
                            }`}
                        />
                    ) : (
                        <ImageIcon className={`w-6 h-6 ${isPending ? 'text-foreground/25' : 'text-foreground/35'}`} />
                    )}
                </div>

                {/* Queued 3-Dot Bouncing Wave Overlay */}
                {isPending && (
                    <div className="absolute inset-x-0 bottom-1.5 z-30 flex items-center justify-center pointer-events-none">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/85 backdrop-blur-md border border-card-border shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="text-[9px] font-semibold text-foreground/65 tracking-wide ml-0.5">
                                Waiting
                            </span>
                        </div>
                    </div>
                )}

                {/* Stopped Overlay Pill */}
                {isStopped && (
                    <div className="absolute inset-x-0 bottom-1.5 z-30 flex items-center justify-center pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-background/90 border border-card-border text-[9px] font-semibold text-foreground/60">
                            Stopped
                        </span>
                    </div>
                )}

                {/* Active Percentage Overlay Badge */}
                {isActive && (
                    <div className="absolute top-1.5 left-1.5 z-30 px-1.5 py-0.5 rounded-full bg-blue-600/95 text-white font-mono text-[9px] font-bold shadow-sm">
                        {clampedPct}%
                    </div>
                )}

                {/* Minimal Status Pill when Complete */}
                {!isActive && !isPending && badgeText && (
                    badgePlacement === 'top-center' ? (
                        <div className="absolute top-2 inset-x-2 z-30 flex justify-center pointer-events-none">
                            <span
                                title={badgeText}
                                className={`max-w-full whitespace-nowrap truncate px-2.5 py-1 rounded-full font-mono text-[11px] sm:text-xs font-bold leading-none shadow-md ring-1 ring-white/15 transition-opacity ${badgeClasses} ${
                                    badgeAlwaysVisible || badgeTone === 'danger'
                                        ? 'opacity-100'
                                        : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
                                }`}
                            >
                                {badgeText}
                            </span>
                        </div>
                    ) : (
                        <div
                            className={`absolute top-1.5 left-1.5 z-30 px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold shadow-sm transition-opacity ${badgeClasses} ${
                                badgeAlwaysVisible || badgeTone === 'danger'
                                    ? 'opacity-100'
                                    : 'opacity-85 sm:opacity-0 sm:group-hover:opacity-100'
                            }`}
                        >
                            {badgeText}
                        </div>
                    )
                )}

                {/* Optional Bottom-Left Pill (e.g. % savings on Compressor grid cards) */}
                {!isActive && !isPending && bottomBadgeText && (
                    <div
                        className={`absolute bottom-2 left-2 z-30 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold shadow-sm transition-opacity pointer-events-none ${bottomBadgeClasses} opacity-90 sm:opacity-0 sm:group-hover:opacity-100`}
                    >
                        {bottomBadgeText}
                    </div>
                )}

                {/* Error Icon Badge */}
                {isError && (
                    <div className="absolute inset-0 z-30 bg-rose-500/15 flex items-center justify-center pointer-events-none">
                        <div className="p-1.5 rounded-full bg-rose-600 text-white shadow-md">
                            <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                    </div>
                )}

                {/* Floating Compact Download Action */}
                {isDone && (downloadUrl || onDownloadClick) && (
                    onDownloadClick ? (
                        <button
                            type="button"
                            onClick={onDownloadClick}
                            title={downloadFilename ? `Download ${downloadFilename}` : 'Download'}
                            className="absolute bottom-1.5 right-1.5 z-30 w-7 h-7 rounded-lg bg-blue-600/95 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <a
                            href={downloadUrl}
                            download={downloadFilename || true}
                            title={downloadFilename ? `Download ${downloadFilename}` : 'Download'}
                            className="absolute bottom-1.5 right-1.5 z-30 w-7 h-7 rounded-lg bg-blue-600/95 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </a>
                    )
                )}
            </div>
        </div>
    );

    if (footer) {
        return (
            <div className="rounded-[18px] bg-card-bg border border-card-border p-2 flex flex-col gap-2 shadow-sm hover:border-blue-500/40 transition-colors">
                {ringTile}
                <div className="px-0.5 pb-0.5">{footer}</div>
            </div>
        );
    }

    return ringTile;
}
