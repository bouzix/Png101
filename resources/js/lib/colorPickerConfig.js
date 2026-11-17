import React, { createContext, useContext, useEffect, useState } from 'react';

export const DEFAULT_COLOR_PICKER_CONFIG = {
    defaultColor: '#3b82f6',
    defaultGradientType: 'linear',
    defaultGradientAngle: 135,
    defaultGradientFrom: '#3b82f6',
    defaultGradientTo: '#9333ea',
};

const GlobalColorPickerDefaultsContext = createContext(DEFAULT_COLOR_PICKER_CONFIG);

/**
 * Normalize a 3- or 6-digit hex color to lowercase #rrggbb.
 * Returns null if the string is not a valid hex color.
 */
export function normalizeHexColor(input) {
    if (typeof input !== 'string') return null;
    const cleaned = input.trim();
    const match6 = cleaned.match(/^#([0-9a-fA-F]{6})$/);
    if (match6) return `#${match6[1].toLowerCase()}`;
    const match3 = cleaned.match(/^#([0-9a-fA-F]{3})$/);
    if (match3) {
        const [r, g, b] = match3[1].toLowerCase().split('');
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return null;
}

/**
 * Parse hex or rgb/rgba color strings into lowercase #rrggbb for equality checks.
 */
export function parseHexOrRgbColor(input, fallback = DEFAULT_COLOR_PICKER_CONFIG.defaultColor) {
    const hex = normalizeHexColor(input);
    if (hex) return hex;
    if (typeof input === 'string') {
        const rgb = input.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
        if (rgb) {
            const toHex = (n) => Math.max(0, Math.min(255, Number(n) || 0)).toString(16).padStart(2, '0');
            return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
        }
    }
    return normalizeHexColor(fallback) || DEFAULT_COLOR_PICKER_CONFIG.defaultColor;
}

/**
 * Sanitize partial color picker defaults config merged with factory defaults.
 */
export function sanitizeColorPickerDefaults(raw) {
    let source = raw;
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source);
        } catch {
            source = {};
        }
    }
    if (!source || typeof source !== 'object') {
        source = {};
    }
    const angleNum = Number(source.defaultGradientAngle);
    return {
        defaultColor: normalizeHexColor(source.defaultColor) || DEFAULT_COLOR_PICKER_CONFIG.defaultColor,
        defaultGradientType: source.defaultGradientType === 'radial' ? 'radial' : 'linear',
        defaultGradientAngle: Number.isFinite(angleNum) ? ((Math.round(angleNum) % 360) + 360) % 360 : DEFAULT_COLOR_PICKER_CONFIG.defaultGradientAngle,
        defaultGradientFrom: normalizeHexColor(source.defaultGradientFrom) || DEFAULT_COLOR_PICKER_CONFIG.defaultGradientFrom,
        defaultGradientTo: normalizeHexColor(source.defaultGradientTo) || DEFAULT_COLOR_PICKER_CONFIG.defaultGradientTo,
    };
}

/**
 * Broadcast updated global color picker defaults to RootApp context without reloading.
 */
export function broadcastColorPickerDefaults(next) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('png101:color-picker-defaults', {
            detail: sanitizeColorPickerDefaults(next),
        })
    );
}

export function GlobalColorPickerDefaultsProvider({ value, children }) {
    const normalized = sanitizeColorPickerDefaults(value);
    return React.createElement(
        GlobalColorPickerDefaultsContext.Provider,
        { value: normalized },
        children
    );
}

/**
 * Hook returning globally configured color picker defaults safely anywhere in the tree.
 */
export function useGlobalColorPickerDefaults() {
    return useContext(GlobalColorPickerDefaultsContext);
}

/**
 * Hook returning true when viewport width is smaller than 1024px (tablet & phone).
 */
export function useSmallColorPickerViewport() {
    const [isSmall, setIsSmall] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const update = () => setIsSmall(window.innerWidth < 1024);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return isSmall;
}
