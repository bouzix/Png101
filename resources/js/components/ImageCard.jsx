import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const ImageCard = ({ src, image, luminance, contrastBgDark, contrastBgLight }) => {
    const resolvedSrc = src ?? image?.path;
    const resolvedAlt = image?.altText || image?.name || 'PNG Image';
    const resolvedLuminance = luminance ?? image?.luminance;
    const resolvedContrastBgDark = contrastBgDark ?? image?.contrastBgDark;
    const resolvedContrastBgLight = contrastBgLight ?? image?.contrastBgLight;

    const imgRef = useRef(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
        const el = imgRef.current;
        if (resolvedSrc && el && el.complete && el.naturalWidth > 0) {
            setImgLoaded(true);
        } else {
            setImgLoaded(false);
        }
    }, [resolvedSrc]);

    if (!resolvedSrc) {
        return (
            <div
                aria-hidden="true"
                className="skeleton-shimmer relative aspect-square rounded-xl bg-card-bg border border-card-border overflow-hidden pointer-events-none select-none"
            />
        );
    }

    const showDarkStage = resolvedLuminance === 'dark' && resolvedContrastBgDark !== 'none';
    const showLightStage = resolvedLuminance === 'light' && resolvedContrastBgLight !== 'none';
    const showShimmer = !imgLoaded && !imgError;

    return (
        <div className="image-card-glow group relative aspect-square rounded-xl bg-card-bg transition-all duration-300 cursor-pointer overflow-hidden">
            {/* Contrast Background Stage for Theme-Clashing PNGs (Zero shadow on image) */}
            {showDarkStage && (
                <div
                    className="contrast-stage-dark absolute inset-0 z-0 pointer-events-none transition-colors"
                    style={resolvedContrastBgDark ? { backgroundColor: resolvedContrastBgDark } : undefined}
                />
            )}
            {showLightStage && (
                <div
                    className="contrast-stage-light absolute inset-0 z-0 pointer-events-none transition-colors"
                    style={resolvedContrastBgLight ? { backgroundColor: resolvedContrastBgLight } : undefined}
                />
            )}

            {/* Shimmer Overlay While Image Downloads */}
            {showShimmer && (
                <div
                    aria-hidden="true"
                    className="skeleton-shimmer absolute inset-0 z-30 bg-card-bg pointer-events-none"
                />
            )}

            {/* Transparency Pattern Background (Fade in on hover) */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none"
                style={{
                    backgroundImage: 'url(/needed/transparency_pattern.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            ></div>

            {/* Glow Effect (Overlay on top of pattern) */}
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-10 pointer-events-none"></div>

            <div className="flex items-center justify-center h-full w-full p-8 relative z-20">
                {imgError ? (
                    <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] border border-card-border flex items-center justify-center text-foreground/25">
                        <ImageIcon className="w-6 h-6" />
                    </div>
                ) : (
                    <img
                        ref={imgRef}
                        src={resolvedSrc}
                        alt={resolvedAlt}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => setImgLoaded(true)}
                        onError={() => setImgError(true)}
                        className={`w-full h-full object-contain transform group-hover:scale-110 transition-all duration-300 ${
                            imgLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                )}
            </div>
        </div>
    );
};

export default ImageCard;
