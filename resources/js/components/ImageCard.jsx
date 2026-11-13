import React from 'react';

const ImageCard = ({ src, image, luminance, contrastBgDark, contrastBgLight }) => {
    const resolvedSrc = src ?? image?.path;
    const resolvedLuminance = luminance ?? image?.luminance;
    const resolvedContrastBgDark = contrastBgDark ?? image?.contrastBgDark;
    const resolvedContrastBgLight = contrastBgLight ?? image?.contrastBgLight;

    const showDarkStage = resolvedLuminance === 'dark' && resolvedContrastBgDark !== 'none';
    const showLightStage = resolvedLuminance === 'light' && resolvedContrastBgLight !== 'none';

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
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-10"></div>

            <div className="flex items-center justify-center h-full w-full p-8 relative z-20">
                {resolvedSrc ? (
                    <img src={resolvedSrc} alt="PNG Image" className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300" />
                ) : (
                    /* Placeholder Icon (WhatsApp style) */
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-green-500 transform group-hover:scale-110 transition-transform duration-300">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.975.537 1.865.82 2.796.82 3.18 0 5.767-2.587 5.767-5.766.001-3.185-2.575-5.77-5.767-5.77zm0 10.09c-.798 0-1.58-.215-2.265-.621l-.163-.096-1.682.441.45-1.638-.106-.169c-.454-.723-.694-1.563-.694-2.44.001-2.384 1.94-4.324 4.323-4.324 2.385 0 4.324 1.94 4.324 4.324 0 2.385-1.939 4.324-4.187 4.523zm2.325-3.388c-.128-.064-.756-.374-.873-.416-.116-.043-.201-.065-.286.063-.085.129-.33.417-.405.502-.074.086-.148.096-.276.032-.128-.064-.54-.199-1.028-.634-.382-.34-.64-.76-.715-.888-.074-.128-.008-.197.056-.261.058-.057.128-.149.192-.224.064-.074.085-.128.128-.214.043-.085.021-.16-.011-.224-.032-.064-.287-.691-.393-.947-.103-.248-.208-.214-.286-.218-.074-.004-.16-.004-.245-.004-.085 0-.223.032-.34.16-.117.129-.448.438-.448 1.068 0 .63.458 1.238.522 1.324.063.086.901 1.375 2.182 1.928.305.132.543.21.729.269.305.097.583.083.803.05.244-.036.756-.309.863-.607.107-.299.107-.555.075-.608-.032-.053-.117-.085-.245-.149z" />
                    </svg>
                )}
            </div>
        </div>
    );
};

export default ImageCard;
