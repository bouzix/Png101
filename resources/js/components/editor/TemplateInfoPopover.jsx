import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedPopover } from './useAnimatedPresence';

const INITIAL_TEMPLATE_KEYWORDS = 3;

export default function TemplateInfoPopover({
    openMenu = null,
    onClose,
    testId = 'template-info-popover',
}) {
    const panelRef = useRef(null);
    const lastMenuRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const [expandedKeywords, setExpandedKeywords] = useState(false);

    if (openMenu?.tpl) {
        lastMenuRef.current = openMenu;
    }

    useEffect(() => {
        setExpandedKeywords(false);
    }, [openMenu?.tpl?.id]);

    useEffect(() => {
        if (!openMenu) return undefined;
        const onPointerDown = (e) => {
            const target = e.target;
            if (
                !panelRef.current?.contains(target) &&
                !target.closest?.('[data-template-more-btn="true"]')
            ) {
                onCloseRef.current?.();
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation?.();
                onCloseRef.current?.();
            }
        };
        const onScrollOrWheel = (e) => {
            if (!panelRef.current?.contains(e.target)) {
                onCloseRef.current?.();
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('scroll', onScrollOrWheel, true);
        document.addEventListener('wheel', onScrollOrWheel, { capture: true, passive: true });
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('scroll', onScrollOrWheel, true);
            document.removeEventListener('wheel', onScrollOrWheel, true);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [openMenu]);

    if (typeof document === 'undefined' || !lastMenuRef.current?.tpl) {
        return null;
    }

    const { tpl, top, left } = openMenu || lastMenuRef.current;
    const popW = 228;
    const clampedLeft = Math.max(10, Math.min(window.innerWidth - popW - 10, left - popW + 24));
    const clampedTop = Math.max(10, Math.min(window.innerHeight - 220, top));
    const allKeywords = Array.isArray(tpl.tags)
        ? tpl.tags.filter((t) => typeof t === 'string' && t.trim())
        : [];
    const hasMoreKeywords = allKeywords.length > INITIAL_TEMPLATE_KEYWORDS;
    const visibleKeywords = expandedKeywords ? allKeywords : allKeywords.slice(0, INITIAL_TEMPLATE_KEYWORDS);

    return createPortal(
        <AnimatedPopover
            ref={panelRef}
            open={Boolean(openMenu?.tpl)}
            originClass="origin-top-right"
            data-testid={testId}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ top: `${clampedTop}px`, left: `${clampedLeft}px`, width: `${popW}px` }}
            className="fixed z-[125] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-3 text-xs text-slate-800 dark:text-slate-100 select-none"
        >
            <div
                data-testid="template-info-title"
                className="text-xs font-bold text-slate-900 dark:text-white leading-snug"
            >
                {tpl.title}
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

            {allKeywords.length === 0 ? (
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    No keywords attached.
                </div>
            ) : (
                <div>
                    <div
                        data-testid="template-info-keywords"
                        className="flex flex-wrap gap-1.5"
                    >
                        {visibleKeywords.map((kw, idx) => (
                            <span
                                key={`${kw}-${idx}`}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                            >
                                {kw}
                            </span>
                        ))}
                    </div>
                    {hasMoreKeywords && (
                        <button
                            type="button"
                            data-testid="template-info-more-keywords"
                            onClick={() => setExpandedKeywords((v) => !v)}
                            className="mt-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block"
                        >
                            {expandedKeywords ? 'Show Less' : 'Show More Keywords'}
                        </button>
                    )}
                </div>
            )}
        </AnimatedPopover>,
        document.body
    );
}
