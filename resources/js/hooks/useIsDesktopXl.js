import { useState, useEffect } from 'react';

/**
 * Tracks whether the viewport matches Tailwind's `xl:` breakpoint (>= 1280px),
 * where public image grids display 7 columns per row instead of 6/4/3/2.
 */
export function useIsDesktopXl() {
    const [isDesktopXl, setIsDesktopXl] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 1280px)').matches : true
    );

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const mql = window.matchMedia('(min-width: 1280px)');
        const onChange = (e) => setIsDesktopXl(e.matches);
        setIsDesktopXl(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return isDesktopXl;
}

