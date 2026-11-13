'use client';

import React from 'react';

interface AssetCardProps {
    file: File | null;
    previewUrl: string;
    hasMetadata: boolean;
    isSelected: boolean;
    onEdit: () => void;
    onToggleSelect: () => void;
    luminance?: string | null;
    contrastBgDark?: string | null;
    contrastBgLight?: string | null;
}

const AssetCard = ({
    file,
    previewUrl,
    hasMetadata,
    isSelected,
    onEdit,
    onToggleSelect,
    luminance,
    contrastBgDark,
    contrastBgLight
}: AssetCardProps) => {
    const showDarkStage = luminance === 'dark' && contrastBgDark !== 'none';
    const showLightStage = luminance === 'light' && contrastBgLight !== 'none';
    // Determine border color based on state
    let borderColorClass = isSelected
        ? 'border-red-400 ring-2 ring-primary-glow shadow-[0_0_15px_rgba(59,130,246,0.35)]'
        : 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,1)]'; // Default Red (No Metadata)
    let glowColorClass = 'group-hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]';

    if (hasMetadata) {
        if (isSelected) {
            borderColorClass = 'border-green-500 ring-2 ring-green-500/40 shadow-[0_0_0_1px_rgba(34,197,94,1)]'; // Green (Ready & Selected)
            glowColorClass = 'group-hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]';
        } else {
            borderColorClass = 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,1)]'; // Blue (Ready but Not Selected)
            glowColorClass = 'group-hover:animate-[pulse-blue-glow_2s_ease-in-out_infinite]';
        }
    }

    const handleCardClick = () => {
        onToggleSelect();
    };

    return (
        <div
            onClick={handleCardClick}
            className={`group relative aspect-square bg-card-bg rounded-xl border-2 ${borderColorClass} ${glowColorClass} transition-all duration-300 overflow-hidden cursor-pointer`}
        >
            {/* Edit Button (Top Left) */}
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="absolute top-2 left-2 z-20 bg-primary-glow text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-glow/80"
                title="Edit Metadata"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
            </button>

            {/* Select Checkbox (Top Right) */}
            <div className={`absolute top-2 right-2 z-20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-gray-300 text-primary-glow focus:ring-primary-glow cursor-pointer"
                />
            </div>

            {/* Contrast Background Stage for Theme-Clashing PNGs (Zero shadow on image) */}
            {showDarkStage && (
                <div
                    className="contrast-stage-dark absolute inset-0 z-0 pointer-events-none transition-colors"
                    style={contrastBgDark ? { backgroundColor: contrastBgDark } : undefined}
                />
            )}
            {showLightStage && (
                <div
                    className="contrast-stage-light absolute inset-0 z-0 pointer-events-none transition-colors"
                    style={contrastBgLight ? { backgroundColor: contrastBgLight } : undefined}
                />
            )}

            {/* Image Preview */}
            <div className="w-full h-full p-4 flex items-center justify-center relative z-10">
                <img src={previewUrl} alt={file?.name || 'Image'} className="max-w-full max-h-full object-contain" />
            </div>
        </div>
    );
};

export default AssetCard;
