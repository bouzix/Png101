import React from 'react';
import { Link } from '@inertiajs/react';

const ImageCard = ({ image, priority = false }) => {
    const isLight = image.luminance === 'light';
    const checkerboardUrl = isLight
        ? "url('/assets/checkerboard-dark.png')"
        : "url('/assets/checkerboard-light.png')";

    return (
        <Link
            href={`/images/${image.slug || image.id}`}
            className={`image-card-glow group relative block w-full overflow-hidden rounded-xl border border-card-border shadow-md aspect-square ${isLight ? 'contrast-stage-dark' : ''}`}
            style={{
                backgroundImage: checkerboardUrl,
                backgroundSize: '20px 20px',
                backgroundRepeat: 'repeat',
            }}
        >
            {/* Image Thumbnail */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                    src={image.previewPath || image.path || image.filePath}
                    alt={image.altText || image.name || image.title}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
            </div>

            {/* Subtle Hover Overlay for Dimensions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 pointer-events-none">
                <p className="text-white text-xs font-medium truncate">{image.name || image.title}</p>
                {image.width && image.height && (
                    <span className="text-[10px] text-slate-300 font-mono">
                        {image.width} x {image.height}
                    </span>
                )}
            </div>
        </Link>
    );
};

export default ImageCard;
