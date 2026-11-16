import React from 'react';
import { Check, RefreshCw, Sliders } from 'lucide-react';
import StudioSelect from '../ui/StudioSelect';

export const SVG_SCALE_PRESETS = [1, 2, 3, 4, 8];
export const SVG_PIXEL_PRESETS = [64, 128, 256, 512, 1024, 2048];

export function clampSvgDim(value, fallback = 512) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.max(1, Math.min(8192, n));
}

/**
 * Compute initial target pixel dimensions for an SVG given global settings.
 */
export function computeSvgTargetDims(srcWidth, srcHeight, {
    sizeMode = 'scale',
    scale = 2,
    targetWidth = 512,
    globalWidth = 512,
    globalHeight = 512,
} = {}) {
    const sw = Math.max(1, srcWidth || 512);
    const sh = Math.max(1, srcHeight || 512);

    if (sizeMode === 'width') {
        const w = clampSvgDim(targetWidth, 512);
        const h = clampSvgDim(Math.round((sh / sw) * w), w);
        return { width: w, height: h };
    }

    if (sizeMode === 'custom') {
        return {
            width: clampSvgDim(globalWidth, 512),
            height: clampSvgDim(globalHeight, 512),
        };
    }

    const mult = Math.max(0.25, Math.min(32, Number(scale) || 1));
    return {
        width: clampSvgDim(Math.round(sw * mult), sw),
        height: clampSvgDim(Math.round(sh * mult), sh),
    };
}

/**
 * Branded px input with +/-10px steppers matching ImageDetails Resize PNG card.
 */
export function LockedPixelInput({
    value,
    onChange,
    onStep,
    onKeyDown,
    placeholder,
    ariaLabel,
    disabled = false,
    compact = false,
}) {
    return (
        <div
            className={`relative flex-1 min-w-0 flex items-center bg-input-bg border border-input-border rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors ${
                disabled ? 'opacity-50' : ''
            }`}
        >
            <input
                type="number"
                min={1}
                max={8192}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label={ariaLabel}
                placeholder={placeholder}
                className={`w-full bg-transparent font-mono text-input-text focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                    compact ? 'py-1.5 pl-2 pr-9 text-xs' : 'py-1.5 pl-2.5 pr-11 text-xs'
                }`}
            />
            <span
                className={`text-[10px] text-slate-500 font-mono pointer-events-none select-none ${
                    compact ? 'hidden sm:inline absolute right-5' : 'absolute right-6'
                }`}
            >
                px
            </span>
            <div className="absolute right-0.5 flex flex-col items-center justify-center">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onStep(10)}
                    className="p-0.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={`Increase ${placeholder} (+10px)`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                        <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                    </svg>
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onStep(-10)}
                    className="p-0.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={`Decrease ${placeholder} (-10px)`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/**
 * Lock / unlock aspect ratio button matching ImageDetails Resize PNG card.
 */
export function AspectLockButton({ isLocked, onToggle, disabled = false, compact = false }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            className={`${
                compact ? 'p-1.5' : 'p-2'
            } rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isLocked
                    ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-300 bg-background border border-card-border'
            }`}
            title={isLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
            aria-label={isLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
        >
            {isLocked ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}>
                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}>
                    <path d="M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 0 1-1.5 0V6.75a3.75 3.75 0 1 0-7.5 0v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3h9v-3c0-2.9 2.35-5.25 5.25-5.25Z" />
                </svg>
            )}
        </button>
    );
}

/**
 * Global SVG output size toolbar rendered above the queue on SVG -> PNG.
 */
export function SvgGlobalSizeBar({
    sizeMode,
    onSizeModeChange,
    scale,
    onScaleChange,
    targetWidth,
    onTargetWidthChange,
    globalWidth,
    globalHeight,
    globalLocked,
    onGlobalDimensionChange,
    onGlobalPresetSquare,
    onGlobalToggleLock,
    fitMode,
    onFitModeChange,
    queueCount = 0,
    processing = false,
    onApplyToAll,
}) {
    const modes = [
        { id: 'scale', label: 'Scale (×)' },
        { id: 'width', label: 'Target Width' },
        { id: 'custom', label: 'Exact Size (W × H)' },
    ];

    const stepGlobal = (axis, delta) => {
        const cur = Number(axis === 'width' ? globalWidth : globalHeight) || 512;
        onGlobalDimensionChange(axis, String(clampSvgDim(cur + delta, 1)));
    };

    return (
        <div className="bg-card-bg border border-card-border rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-card-border">
                <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    <div>
                        <div className="text-sm font-bold text-foreground">
                            Global Output Dimensions
                        </div>
                        <p className="text-[11px] text-foreground/55">
                            Set a default size for new uploads or apply across the entire batch. Customize individual cards below anytime.
                        </p>
                    </div>
                </div>

                {queueCount > 0 && (
                    <button
                        type="button"
                        onClick={onApplyToAll}
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                        <span>Apply to All ({queueCount})</span>
                    </button>
                )}
            </div>

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                {/* Sizing Mode Switcher */}
                <div className="inline-flex flex-wrap p-1 rounded-xl bg-background border border-card-border gap-1 self-start shrink-0">
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onSizeModeChange(m.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                sizeMode === m.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-foreground/65 hover:text-foreground'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Mode-Specific Controls */}
                {sizeMode === 'scale' && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-foreground/60 font-semibold mr-1">Multiplier:</span>
                        {SVG_SCALE_PRESETS.map((mult) => (
                            <button
                                key={mult}
                                type="button"
                                onClick={() => onScaleChange(mult)}
                                className={`px-2.5 py-1.5 rounded-lg border font-mono font-bold transition-colors cursor-pointer ${
                                    Number(scale) === mult
                                        ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                        : 'border-card-border bg-background text-foreground/70 hover:border-blue-500/40'
                                }`}
                            >
                                {mult}×
                            </button>
                        ))}
                        <div className="inline-flex items-center gap-1 ml-1">
                            <input
                                type="number"
                                min={0.5}
                                max={16}
                                step={0.5}
                                value={scale}
                                onChange={(e) => onScaleChange(e.target.value)}
                                aria-label="Custom scale multiplier"
                                className="w-16 bg-input-bg border border-input-border rounded-lg px-2 py-1.5 font-mono text-xs text-input-text text-center focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-foreground/50 font-mono">×</span>
                        </div>
                    </div>
                )}

                {sizeMode === 'width' && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-foreground/60 font-semibold mr-1">Width (auto height):</span>
                        {SVG_PIXEL_PRESETS.map((px) => (
                            <button
                                key={px}
                                type="button"
                                onClick={() => onTargetWidthChange(px)}
                                className={`px-2.5 py-1.5 rounded-lg border font-mono font-bold transition-colors cursor-pointer ${
                                    Number(targetWidth) === px
                                        ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                        : 'border-card-border bg-background text-foreground/70 hover:border-blue-500/40'
                                }`}
                            >
                                {px}px
                            </button>
                        ))}
                        <div className="w-32">
                            <LockedPixelInput
                                value={targetWidth}
                                onChange={onTargetWidthChange}
                                onStep={(delta) => onTargetWidthChange(clampSvgDim((Number(targetWidth) || 512) + delta, 1))}
                                placeholder="Width"
                                ariaLabel="Global target width in pixels"
                            />
                        </div>
                    </div>
                )}

                {sizeMode === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {SVG_PIXEL_PRESETS.map((px) => (
                                <button
                                    key={px}
                                    type="button"
                                    onClick={() => onGlobalPresetSquare(px)}
                                    className={`px-2 py-1 rounded-lg border font-mono font-bold transition-colors cursor-pointer ${
                                        Number(globalWidth) === px && Number(globalHeight) === px
                                            ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                            : 'border-card-border bg-background text-foreground/70 hover:border-blue-500/40'
                                    }`}
                                >
                                    {px}²
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-[260px]">
                            <LockedPixelInput
                                value={globalWidth}
                                onChange={(val) => onGlobalDimensionChange('width', val)}
                                onStep={(delta) => stepGlobal('width', delta)}
                                placeholder="Width"
                                ariaLabel="Global output width"
                            />
                            <AspectLockButton
                                isLocked={globalLocked}
                                onToggle={onGlobalToggleLock}
                            />
                            <LockedPixelInput
                                value={globalHeight}
                                onChange={(val) => onGlobalDimensionChange('height', val)}
                                onStep={(delta) => stepGlobal('height', delta)}
                                placeholder="Height"
                                ariaLabel="Global output height"
                            />
                        </div>

                        <StudioSelect
                            value={fitMode}
                            onChange={(e) => onFitModeChange(e.target.value)}
                            aria-label="SVG fit mode"
                        >
                            <option value="contain">Fit: Contain</option>
                            <option value="cover">Fit: Cover</option>
                            <option value="stretch">Fit: Stretch</option>
                        </StudioSelect>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Per-card Resize-PNG style dimension editor shared between Grid view and List view.
 */
export function SvgCardDimensionEditor({
    variant = 'list',
    filename = '',
    sourceWidth = null,
    sourceHeight = null,
    draftWidth,
    draftHeight,
    appliedWidth = null,
    appliedHeight = null,
    aspectLocked = true,
    isCustomSize = false,
    isBusy = false,
    onDraftChange,
    onToggleLock,
    onApply,
}) {
    const parsedW = parseInt(draftWidth, 10);
    const parsedH = parseInt(draftHeight, 10);
    const isValid =
        Number.isFinite(parsedW) &&
        parsedW >= 1 &&
        parsedW <= 8192 &&
        Number.isFinite(parsedH) &&
        parsedH >= 1 &&
        parsedH <= 8192;
    const isDirty = isValid && (parsedW !== appliedWidth || parsedH !== appliedHeight);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && isValid && !isBusy) {
            e.preventDefault();
            onApply();
        }
    };

    const stepAxis = (axis, delta) => {
        const fallback = axis === 'width' ? (sourceWidth || 512) : (sourceHeight || 512);
        const cur = parseInt(axis === 'width' ? draftWidth : draftHeight, 10) || fallback;
        onDraftChange(axis, String(clampSvgDim(cur + delta, 1)));
    };

    const isGrid = variant === 'grid';

    if (isGrid) {
        return (
            <div className="space-y-2 pt-0.5">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-semibold text-foreground truncate" title={filename}>
                        {filename}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {isCustomSize && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 font-bold text-[9px]">
                                Custom
                            </span>
                        )}
                        {sourceWidth && sourceHeight && (
                            <span className="text-[9px] font-mono text-foreground/45">
                                SVG {sourceWidth}×{sourceHeight}
                            </span>
                        )}
                    </div>
                </div>

                {/* Locked Width / Lock / Height row matching ImageDetails Resize PNG */}
                <div className="flex items-center gap-1.5">
                    <LockedPixelInput
                        compact
                        value={draftWidth}
                        disabled={isBusy}
                        onChange={(val) => onDraftChange('width', val)}
                        onStep={(delta) => stepAxis('width', delta)}
                        onKeyDown={handleKeyDown}
                        placeholder="Width"
                        ariaLabel={`Output width for ${filename}`}
                    />
                    <AspectLockButton
                        compact
                        disabled={isBusy}
                        isLocked={aspectLocked}
                        onToggle={onToggleLock}
                    />
                    <LockedPixelInput
                        compact
                        value={draftHeight}
                        disabled={isBusy}
                        onChange={(val) => onDraftChange('height', val)}
                        onStep={(delta) => stepAxis('height', delta)}
                        onKeyDown={handleKeyDown}
                        placeholder="Height"
                        ariaLabel={`Output height for ${filename}`}
                    />
                </div>

                <button
                    type="button"
                    onClick={onApply}
                    disabled={!isValid || isBusy}
                    className={`w-full py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        isDirty
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                            : 'bg-background border border-card-border text-foreground/65 hover:text-foreground hover:border-blue-500/40'
                    }`}
                >
                    {isBusy ? (
                        <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Rendering...</span>
                        </>
                    ) : isDirty ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Resize to {parsedW}×{parsedH}</span>
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-3 h-3" />
                            <span>{appliedWidth && appliedHeight ? `PNG ${appliedWidth}×${appliedHeight}` : 'Apply Size'}</span>
                        </>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {isCustomSize && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 font-bold text-[10px]">
                    Custom
                </span>
            )}
            <div className="flex items-center gap-1.5 w-[248px]">
                <LockedPixelInput
                    value={draftWidth}
                    disabled={isBusy}
                    onChange={(val) => onDraftChange('width', val)}
                    onStep={(delta) => stepAxis('width', delta)}
                    onKeyDown={handleKeyDown}
                    placeholder="Width"
                    ariaLabel={`Output width for ${filename}`}
                />
                <AspectLockButton
                    compact
                    disabled={isBusy}
                    isLocked={aspectLocked}
                    onToggle={onToggleLock}
                />
                <LockedPixelInput
                    value={draftHeight}
                    disabled={isBusy}
                    onChange={(val) => onDraftChange('height', val)}
                    onStep={(delta) => stepAxis('height', delta)}
                    onKeyDown={handleKeyDown}
                    placeholder="Height"
                    ariaLabel={`Output height for ${filename}`}
                />
            </div>
            <button
                type="button"
                onClick={onApply}
                disabled={!isValid || isBusy}
                title={isDirty ? 'Apply new PNG size' : 'Re-render at this size'}
                aria-label={`Apply dimensions for ${filename}`}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    isDirty
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                        : 'border border-card-border bg-background text-foreground/65 hover:text-foreground hover:border-blue-500/40'
                }`}
            >
                {isBusy ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                ) : isDirty ? (
                    <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply</span>
                    </>
                ) : (
                    <RefreshCw className="w-3 h-3" />
                )}
            </button>
        </div>
    );
}
