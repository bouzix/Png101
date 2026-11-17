import React from 'react';

/**
 * Default blue gradient shield icon (or custom uploaded Website Icon when configured).
 */
export function BrandIcon({
    iconUrl = '',
    alt = 'Png101 icon',
    sizeClass = 'w-9 h-9',
    roundedClass = 'rounded-xl',
    svgClass = 'w-5 h-5',
    className = '',
}) {
    if (iconUrl) {
        return (
            <div
                data-testid="brand-icon-custom"
                className={`${sizeClass} ${roundedClass} flex items-center justify-center overflow-hidden shrink-0 ${className}`}
            >
                <img
                    src={iconUrl}
                    alt={alt}
                    className="w-full h-full object-contain"
                />
            </div>
        );
    }

    return (
        <div
            data-testid="brand-icon-default"
            className={`${sizeClass} ${roundedClass} bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] shrink-0 ${className}`}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`${svgClass} text-white`}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
            </svg>
        </div>
    );
}

/**
 * Sticky-menu brand lockup (or custom uploaded Website Logo image when configured).
 */
export function BrandLogo({
    websiteInfo = {},
    siteName = '',
    size = 'header',
    asHeading = false,
    className = '',
}) {
    const resolvedName = siteName || websiteInfo?.websiteName || 'Png101';
    const logoUrl = websiteInfo?.logoUrl || '';
    const iconUrl = websiteInfo?.iconUrl || '';

    if (logoUrl) {
        const imgClass =
            size === 'hero'
                ? 'h-12 sm:h-14 w-auto max-w-[280px] sm:max-w-[380px] object-contain'
                : size === 'footer'
                ? 'h-8 w-auto max-w-[220px] object-contain'
                : 'h-9 w-auto max-w-[240px] object-contain';

        return (
            <div data-testid="brand-logo-custom" className={`inline-flex items-center ${className}`}>
                {asHeading && <h1 className="sr-only">{resolvedName}</h1>}
                <img src={logoUrl} alt={resolvedName} className={imgClass} />
            </div>
        );
    }

    const iconProps =
        size === 'hero'
            ? { sizeClass: 'w-11 h-11 sm:w-12 sm:h-12', svgClass: 'w-6 h-6' }
            : size === 'footer'
            ? { sizeClass: 'w-8 h-8', svgClass: 'w-4 h-4' }
            : { sizeClass: 'w-9 h-9', svgClass: 'w-5 h-5' };

    const titleClass =
        size === 'hero'
            ? 'text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'
            : size === 'footer'
            ? 'font-extrabold text-base tracking-tight text-foreground group-hover:text-blue-500 transition-colors'
            : 'header-brand-title font-extrabold text-base sm:text-lg tracking-tight group-hover:text-blue-500 transition-colors';

    const iconHoverClass =
        size === 'header' || size === 'footer'
            ? 'group-hover:shadow-[0_0_22px_rgba(59,130,246,0.7)] group-hover:scale-105 transition-all duration-300'
            : '';

    const TitleTag = asHeading ? 'h1' : 'span';

    return (
        <div
            data-testid="brand-logo-default"
            className={`inline-flex items-center ${size === 'hero' ? 'gap-3 sm:gap-3.5' : 'gap-2.5 sm:gap-3'} ${className}`}
        >
            <BrandIcon
                iconUrl={iconUrl}
                alt={`${resolvedName} icon`}
                sizeClass={iconProps.sizeClass}
                svgClass={iconProps.svgClass}
                className={iconHoverClass}
            />
            <TitleTag className={titleClass}>{resolvedName}</TitleTag>
        </div>
    );
}
