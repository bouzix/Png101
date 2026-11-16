import React, { useEffect, useRef, useState } from 'react';

export const EDITOR_PANEL_TRANSITION =
    'transition-[opacity,translate,scale,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]';

/**
 * Coordinates smooth enter/exit transitions matching EditorFloatingToolbar & EditorLayersPanel.
 * Waits two animation frames on open so initial off-scale transform paints cleanly,
 * and delays unmounting by `exitDurationMs` (default 295ms) on close.
 */
export function useAnimatedPresence(open, exitDurationMs = 295) {
    const [rendered, setRendered] = useState(Boolean(open));
    const [visible, setVisible] = useState(false);
    const exitTimerRef = useRef(null);

    useEffect(() => {
        if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
        }

        if (open) {
            setRendered(true);
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => {
                    setVisible(true);
                });
            });
            return () => {
                cancelAnimationFrame(raf1);
                if (raf2) cancelAnimationFrame(raf2);
            };
        }

        setVisible(false);
        exitTimerRef.current = setTimeout(() => {
            setRendered(false);
        }, exitDurationMs);

        return () => {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };
    }, [open, exitDurationMs]);

    return { rendered, visible };
}

/**
 * Animated container for dropdown menus, popovers, and context menus inside ImageEditor.
 */
export const AnimatedPopover = React.forwardRef(function AnimatedPopover({
    open,
    children,
    className = '',
    originClass = 'origin-top-left',
    openClass = 'opacity-100 translate-y-0 scale-100 pointer-events-auto',
    closedClass = 'opacity-0 -translate-y-2 scale-75 pointer-events-none',
    exitDurationMs = 295,
    ...rest
}, ref) {
    const { rendered, visible } = useAnimatedPresence(open, exitDurationMs);

    if (!rendered) {
        return null;
    }

    return React.createElement(
        'div',
        {
            ...rest,
            ref,
            'data-visible': visible ? 'true' : 'false',
            className: `${originClass} ${EDITOR_PANEL_TRANSITION} ${
                visible ? openClass : closedClass
            } ${className}`,
        },
        children
    );
});
