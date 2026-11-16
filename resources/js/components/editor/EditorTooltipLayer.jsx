import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const SHORTCUT_RE = /^(.+?)\s+\((Ctrl\+[^)]+|Shift\+[^)]+|Alt\+[^)]+|Del|Backspace|Space|[A-Z])\)$/;

function parseTooltipContent(raw) {
    const text = String(raw || '').trim();
    const match = text.match(SHORTCUT_RE);
    if (!match) {
        return { label: text, shortcut: null };
    }
    return { label: match[1], shortcut: match[2] };
}

export default function EditorTooltipLayer() {
    const tipRef = useRef(null);
    const activeTargetRef = useRef(null);

    const [state, setState] = useState(null); // { text, targetRect, side }
    const [pos, setPos] = useState(null); // { left, top }
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const hide = () => {
            activeTargetRef.current = null;
            setState(null);
            setPos(null);
            setShown(false);
        };

        const resolveScopeTarget = (node) => {
            if (!node || typeof node.closest !== 'function') return null;
            const scoped = node.closest('[data-editor-root="true"], [role="dialog"][aria-label="Custom color picker"]');
            if (!scoped) return null;
            const trigger = node.closest('[data-tooltip], [title]');
            if (!trigger || !scoped.contains(trigger)) return null;
            if (trigger.disabled || trigger.getAttribute('aria-disabled') === 'true') return null;

            // Ensure no native browser tooltip can ever appear inside the editor
            if (trigger.hasAttribute('title')) {
                const nativeTitle = trigger.getAttribute('title');
                trigger.removeAttribute('title');
                if (nativeTitle && !trigger.hasAttribute('data-tooltip')) {
                    trigger.setAttribute('data-tooltip', nativeTitle);
                }
            }

            const text = trigger.getAttribute('data-tooltip');
            if (!text || !text.trim()) return null;
            return { trigger, text: text.trim() };
        };

        const showFor = (node) => {
            const resolved = resolveScopeTarget(node);
            if (!resolved) {
                if (activeTargetRef.current) hide();
                return;
            }
            const { trigger, text } = resolved;
            if (activeTargetRef.current === trigger) return;
            activeTargetRef.current = trigger;
            setShown(false);
            setPos(null);
            setState({
                text,
                targetRect: trigger.getBoundingClientRect(),
                side: trigger.getAttribute('data-tooltip-side') || 'auto',
            });
        };

        let lastPointerDownAt = 0;
        const handlePointerDown = () => {
            lastPointerDownAt = Date.now();
            hide();
        };
        const handleMouseOver = (e) => showFor(e.target);
        const handleFocusIn = (e) => {
            if (Date.now() - lastPointerDownAt < 300) return;
            showFor(e.target);
        };

        const handleMouseOut = (e) => {
            const cur = activeTargetRef.current;
            if (!cur) return;
            if (!e.relatedTarget || !cur.contains(e.relatedTarget)) {
                hide();
            }
        };

        const handleFocusOut = () => {
            setTimeout(() => {
                const cur = activeTargetRef.current;
                if (!cur || !cur.isConnected) {
                    hide();
                    return;
                }
                if (document.activeElement !== cur && !cur.matches(':hover')) {
                    hide();
                }
            }, 0);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') hide();
        };

        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('mouseout', handleMouseOut, true);
        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('focusout', handleFocusOut, true);
        document.addEventListener('pointerdown', handlePointerDown, true);
        document.addEventListener('scroll', hide, true);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver, true);
            document.removeEventListener('mouseout', handleMouseOut, true);
            document.removeEventListener('focusin', handleFocusIn, true);
            document.removeEventListener('focusout', handleFocusOut, true);
            document.removeEventListener('pointerdown', handlePointerDown, true);
            document.removeEventListener('scroll', hide, true);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    useLayoutEffect(() => {
        if (!state || !tipRef.current) return;
        const { targetRect, side } = state;
        const tipRect = tipRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const gap = 8;
        const pad = 8;

        let resolvedSide = side;
        if (resolvedSide === 'auto') {
            resolvedSide = targetRect.top < 110 ? 'bottom' : 'top';
        }

        let top;
        let left;

        if (resolvedSide === 'left') {
            left = targetRect.left - tipRect.width - gap;
            top = targetRect.top + targetRect.height / 2 - tipRect.height / 2;
        } else if (resolvedSide === 'right') {
            left = targetRect.right + gap;
            top = targetRect.top + targetRect.height / 2 - tipRect.height / 2;
        } else if (resolvedSide === 'bottom') {
            top = targetRect.bottom + gap;
            if (top + tipRect.height > vh - pad) {
                top = targetRect.top - tipRect.height - gap;
            }
            left = targetRect.left + targetRect.width / 2 - tipRect.width / 2;
        } else {
            top = targetRect.top - tipRect.height - gap;
            if (top < pad) {
                top = targetRect.bottom + gap;
            }
            left = targetRect.left + targetRect.width / 2 - tipRect.width / 2;
        }

        left = Math.max(pad, Math.min(vw - tipRect.width - pad, left));
        top = Math.max(pad, Math.min(vh - tipRect.height - pad, top));

        setPos({ left: Math.round(left), top: Math.round(top) });
        const raf = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(raf);
    }, [state]);

    if (!state) return null;

    const { label, shortcut } = parseTooltipContent(state.text);

    return (
        <div
            ref={tipRef}
            role="tooltip"
            data-testid="editor-global-tooltip"
            style={
                pos
                    ? { left: `${pos.left}px`, top: `${pos.top}px` }
                    : { left: '-9999px', top: '-9999px' }
            }
            className={`fixed z-[150] pointer-events-none whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-semibold shadow-xl border border-white/10 dark:border-slate-200 transition-[opacity,transform] duration-150 ease-out ${
                shown && pos ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
        >
            <span>{label}</span>
            {shortcut && (
                <kbd className="px-1 py-0.5 rounded bg-white/15 dark:bg-slate-900/10 text-[9px] font-mono leading-none">
                    {shortcut}
                </kbd>
            )}
        </div>
    );
}
