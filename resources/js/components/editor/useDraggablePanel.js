import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'png101_editor_panel_offsets_v1';

function readStoredOffsets() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeStoredOffsets(nextMap) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
    } catch {
        // ignore quota/private mode errors
    }
}

function getSavedOffset(panelKey) {
    const all = readStoredOffsets();
    const entry = all[panelKey];
    if (entry && Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
        return { x: Math.round(entry.x), y: Math.round(entry.y) };
    }
    return { x: 0, y: 0 };
}

function savePanelOffset(panelKey, offset) {
    const all = readStoredOffsets();
    all[panelKey] = { x: Math.round(offset.x), y: Math.round(offset.y) };
    writeStoredOffsets(all);
}

/**
 * Shared drag-to-move controller for floating editor panels (Layers, Draw, Background, etc.).
 * Persists custom offsets per panel key across close/reopen and reloads.
 */
export function useDraggablePanel(panelKey, extraOffset = { x: 0, y: 0 }) {
    const panelRef = useRef(null);
    const [state, setState] = useState(() => ({
        key: panelKey,
        offset: getSavedOffset(panelKey),
    }));
    const [isDragging, setIsDragging] = useState(false);

    // Resolve synchronously on panelKey change so switching left-rail tabs never flashes the prior tab's offset.
    const offset = state.key === panelKey ? state.offset : getSavedOffset(panelKey);

    const dragRef = useRef(null);
    const keyRef = useRef(panelKey);
    keyRef.current = panelKey;

    const offsetRef = useRef(offset);
    offsetRef.current = offset;
    const extraOffsetRef = useRef(extraOffset);
    extraOffsetRef.current = extraOffset || { x: 0, y: 0 };

    useEffect(() => {
        setState({ key: panelKey, offset: getSavedOffset(panelKey) });
        setIsDragging(false);
        dragRef.current = null;
    }, [panelKey]);

    useEffect(() => {
        if (!isDragging) return undefined;

        const handlePointerMove = (e) => {
            const st = dragRef.current;
            if (!st) return;

            const dx = e.clientX - st.startX;
            const dy = e.clientY - st.startY;
            const nextX = Math.max(st.minX, Math.min(st.maxX, st.origX + dx));
            const nextY = Math.max(st.minY, Math.min(st.maxY, st.origY + dy));

            const clamped = { x: Math.round(nextX), y: Math.round(nextY) };
            offsetRef.current = clamped;
            setState({ key: keyRef.current, offset: clamped });
        };

        const finishDrag = () => {
            if (!dragRef.current) return;
            dragRef.current = null;
            setIsDragging(false);
            savePanelOffset(keyRef.current, offsetRef.current);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', finishDrag);
        window.addEventListener('pointercancel', finishDrag);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
        };
    }, [isDragging]);

    const handleDragPointerDown = useCallback((e) => {
        e.stopPropagation();
        if (e.button !== 0 || e.target.closest('button, input, select, a')) return;
        const el = panelRef.current;
        if (!el) return;

        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cur = offsetRef.current;
        const ext = extraOffsetRef.current || { x: 0, y: 0 };
        const visualX = cur.x + (ext.x || 0);
        const visualY = cur.y + (ext.y || 0);
        const baseLeft = rect.left - visualX;
        const baseTop = rect.top - visualY;

        // Walk from parentElement so a panel whose root has overflow-hidden doesn't clamp against itself.
        const clipEl = el.parentElement?.closest('.overflow-hidden') ?? null;
        const clipRect = clipEl ? clipEl.getBoundingClientRect() : null;

        const minScreenLeft = Math.max(8, clipRect ? clipRect.left + 8 : 8);
        const maxScreenLeft = Math.max(
            minScreenLeft,
            Math.min(
                window.innerWidth - rect.width - 8,
                clipRect ? clipRect.right - rect.width - 8 : window.innerWidth - rect.width - 8
            )
        );
        const minScreenTop = Math.max(60, clipRect ? clipRect.top + 8 : 60);
        const maxScreenTop = Math.max(
            minScreenTop,
            Math.min(
                window.innerHeight - rect.height - 8,
                clipRect ? clipRect.bottom - rect.height - 8 : window.innerHeight - rect.height - 8
            )
        );

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: visualX,
            origY: visualY,
            minX: minScreenLeft - baseLeft,
            maxX: maxScreenLeft - baseLeft,
            minY: minScreenTop - baseTop,
            maxY: maxScreenTop - baseTop,
        };
        const synced = { x: Math.round(visualX), y: Math.round(visualY) };
        offsetRef.current = synced;
        setState({ key: keyRef.current, offset: synced });
        setIsDragging(true);
    }, []);

    const resetPosition = useCallback((e) => {
        e?.stopPropagation?.();
        const zero = { x: 0, y: 0 };
        offsetRef.current = zero;
        setState({ key: keyRef.current, offset: zero });
        savePanelOffset(keyRef.current, zero);
    }, []);

    return {
        panelRef,
        offset,
        isDragging,
        hasMoved: offset.x !== 0 || offset.y !== 0,
        handleDragPointerDown,
        resetPosition,
    };
}


/**
 * Ephemeral viewport-clamped drag offset hook for popovers, dropdowns, and modals.
 * Resets back to anchor position whenever the panel opens so closed exit fades stay in place.
 */
export function usePopoverDrag({
    open = true,
    suspended = false,
    sessionKey = undefined,
    panelRef: externalRef = null,
    resetOnOpen = true,
} = {}) {
    const internalRef = useRef(null);
    const panelRef = externalRef || internalRef;
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const offsetRef = useRef(offset);
    offsetRef.current = offset;
    const prevOpenRef = useRef(open);
    const prevSessionRef = useRef(sessionKey);
    const pendingResetRef = useRef(false);

    useEffect(() => {
        if (sessionKey !== undefined && sessionKey !== prevSessionRef.current) {
            prevSessionRef.current = sessionKey;
            pendingResetRef.current = true;
        }
    }, [sessionKey]);

    useEffect(() => {
        const wasOpen = prevOpenRef.current;
        prevOpenRef.current = open;
        if (!open && !suspended) {
            // Defer offset reset until the next open so exit fade-out stays at the dragged position
            pendingResetRef.current = true;
            setIsDragging(false);
            return;
        }
        if (open && !wasOpen && !suspended && (resetOnOpen || pendingResetRef.current)) {
            pendingResetRef.current = false;
            setOffset({ x: 0, y: 0 });
            setIsDragging(false);
        }
    }, [open, suspended, resetOnOpen]);

    const handleDragStart = useCallback((e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, input, select, textarea, a, [data-no-drag="true"]')) return;

        e.preventDefault();
        e.stopPropagation();

        const el = panelRef.current;
        const startOffset = offsetRef.current;
        const startX = e.clientX;
        const startY = e.clientY;

        let minDx = -Infinity;
        let maxDx = Infinity;
        let minDy = -Infinity;
        let maxDy = Infinity;

        if (el && typeof window !== 'undefined') {
            const rect = el.getBoundingClientRect();
            const margin = 8;
            const baseLeft = rect.left - startOffset.x;
            const baseTop = rect.top - startOffset.y;
            minDx = margin - baseLeft;
            maxDx = Math.max(minDx, window.innerWidth - margin - rect.width - baseLeft);
            minDy = margin - baseTop;
            maxDy = Math.max(minDy, window.innerHeight - margin - rect.height - baseTop);
        }

        setIsDragging(true);
        const prevCursor = document.body.style.cursor;
        const prevUserSelect = document.body.style.userSelect;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        const onMove = (moveEvt) => {
            const nextX = Math.min(maxDx, Math.max(minDx, startOffset.x + (moveEvt.clientX - startX)));
            const nextY = Math.min(maxDy, Math.max(minDy, startOffset.y + (moveEvt.clientY - startY)));
            setOffset({ x: Math.round(nextX), y: Math.round(nextY) });
        };

        const onUp = () => {
            setIsDragging(false);
            document.body.style.cursor = prevCursor;
            document.body.style.userSelect = prevUserSelect;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }, [panelRef]);

    return {
        panelRef,
        offset,
        isDragging,
        handleDragStart,
    };
}
