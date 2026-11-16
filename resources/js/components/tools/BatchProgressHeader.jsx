import React from 'react';
import { FileArchive, Pause, Play, Square, Trash2 } from 'lucide-react';
import BatchViewToggle from '@/components/tools/BatchViewToggle';
import IosBrandProgressBar from '@/components/tools/IosBrandProgressBar';

/**
 * Shared header for batch result cards: title/counts, overall iOS-style brand progress bar,
 * List/Grid switcher, Pause/Resume & Stop controls, ZIP download action, and Clear button.
 */
export default function BatchProgressHeader({
    title,
    overallProgress = 0,
    isProcessing = false,
    isPaused = false,
    progressLabel = null,
    viewMode,
    onViewModeChange,
    showDownloadZip = false,
    canDownloadZip = false,
    zipping = false,
    zipLabel = 'Download All (.zip)',
    onDownloadZip,
    onPauseToggle,
    onStop,
    onClear,
}) {
    const clampedPct = Math.max(0, Math.min(100, Math.round(overallProgress)));
    const isComplete = !isProcessing && !isPaused && clampedPct >= 100;
    const renderZipButton = showDownloadZip || canDownloadZip;
    const isZipDisabled = zipping || !canDownloadZip;

    return (
        <div className="px-5 pt-4 pb-3 border-b border-card-border space-y-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-foreground">{title}</span>
                    <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            isComplete
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : isPaused
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-blue-500/15 text-blue-500'
                        }`}
                    >
                        {isPaused ? 'Paused' : `${clampedPct}%`}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <BatchViewToggle viewMode={viewMode} onChange={onViewModeChange} />
                    {isProcessing && onPauseToggle && (
                        <button
                            type="button"
                            onClick={onPauseToggle}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                                isPaused
                                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                    : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-500'
                            }`}
                        >
                            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                            <span>{isPaused ? 'Resume' : 'Pause'}</span>
                        </button>
                    )}
                    {isProcessing && onStop && (
                        <button
                            type="button"
                            onClick={onStop}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold cursor-pointer transition-colors"
                        >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                        </button>
                    )}
                    {renderZipButton && (
                        <button
                            type="button"
                            onClick={onDownloadZip}
                            disabled={isZipDisabled}
                            title={!canDownloadZip ? 'Available once all files finish processing' : undefined}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-blue-600"
                        >
                            <FileArchive className="w-4 h-4" />
                            <span>{zipping ? 'Packaging ZIP...' : zipLabel}</span>
                        </button>
                    )}
                    {onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-card-border bg-background hover:text-rose-500 text-xs font-semibold text-foreground/70 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Overall Brand iOS 7 Progress Bar with Skewed Soft Reflection */}
            <div className="space-y-0.5">
                <IosBrandProgressBar progress={clampedPct} size="md" withShadow />
                {progressLabel && (
                    <div className="flex items-center justify-between text-[11px] font-medium text-foreground/55">
                        <span>{progressLabel}</span>
                        <span className="font-mono">{clampedPct}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}
