import React from 'react';

/**
 * Crisp iOS-7-inspired rainbow progress bar adapted to Png101 brand colors
 * (2x height: 8px header / 6px list rows), animated waiting stripe when pending,
 * and optional skewed ambient reflection underneath.
 */
export default function IosBrandProgressBar({
    progress = 0,
    isPending = false,
    isError = false,
    size = 'sm',
    withShadow = false,
}) {
    const widthPct = isError ? 100 : Math.max(0, Math.min(100, Math.round(progress)));
    const sizeClass =
        size === 'lg'
            ? 'brand-ios-progress--lg'
            : size === 'md'
              ? 'brand-ios-progress--md'
              : 'brand-ios-progress--sm';

    return (
        <div className={withShadow ? 'pb-3.5 overflow-hidden' : ''}>
            <div
                className={`brand-ios-progress ${sizeClass} ${
                    isPending && !isError && widthPct === 0 ? 'brand-ios-progress--pending' : ''
                }`}
            >
                <div
                    className={`brand-ios-progress__bar ${isError ? 'brand-ios-progress__bar--error' : ''}`}
                    style={{ width: `${widthPct}%` }}
                >
                    {withShadow && widthPct > 0 && (
                        <div aria-hidden="true" className="brand-ios-progress__shadow" />
                    )}
                </div>
            </div>
        </div>
    );
}
