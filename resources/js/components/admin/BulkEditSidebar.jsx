import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
    Loader2,
    Wand2,
    Sun,
    Moon,
    Grid,
    AlertTriangle,
    Palette,
    X,
    Plus,
    Check,
    Minimize2,
    Maximize2,
    Pencil,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Clock,
    ChevronsDownUp,
    ChevronsUpDown,
    Trash2,
    Eraser,
    Lightbulb,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import StudioSelect from '../ui/StudioSelect';
import { useUploadManager } from './UploadManager';

const BulkEditContext = createContext(null);

const STORAGE_KEY = 'png101_bulk_edit_session_v1';

const FIXED_DARK_PRESETS = [
    { name: 'Slate 50', color: '#f8fafc' },
    { name: 'Slate 100', color: '#f1f5f9' },
    { name: 'Slate 200', color: '#e2e8f0' },
    { name: 'Slate 300', color: '#cbd5e1' },
];

const FIXED_LIGHT_PRESETS = [
    { name: 'Slate 300', color: '#cbd5e1' },
    { name: 'Slate 600', color: '#475569' },
    { name: 'Slate 900', color: '#0f172a' },
    { name: 'Slate 950', color: '#020617' },
];

const MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
    { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro' },
];

const INITIAL_SAVE_PROGRESS = {
    active: false,
    completed: 0,
    total: 0,
    succeeded: 0,
    failed: 0,
    currentName: '',
};

export function hasItemMetadata(item) {
    if (!item) return false;
    const hasTitle = typeof item.name === 'string' && item.name.trim().length > 0;
    const hasTags = Array.isArray(item.tags) && item.tags.length > 0;
    return hasTitle && hasTags;
}

function normalizeImageItem(img) {
    const luminance = img.luminance || null;
    const hasExistingMeta =
        (Array.isArray(img.tags) && img.tags.length > 0) ||
        Boolean(img.altText && String(img.altText).trim()) ||
        Boolean(img.description && String(img.description).trim());
    return {
        id: img.id,
        name: img.filename ?? img.name ?? '',
        tags: Array.isArray(img.tags) ? img.tags : [],
        altText: img.altText || '',
        description: img.description || '',
        preview: img.path || img.preview || img.thumbPath || '',
        luminance,
        contrastBgDark: img.contrastBgDark || (luminance === 'dark' ? '#f8fafc' : null),
        contrastBgLight: img.contrastBgLight || (luminance === 'light' ? '#cbd5e1' : null),
        previewMode: img.previewMode || (luminance === 'light' ? 'light' : 'dark'),
        aiHints: Array.isArray(img.aiHints) ? img.aiHints : [],
        aiGenerated: Boolean(img.aiGenerated || hasExistingMeta),
    };
}

let emptyDragCanvas = null;
function getEmptyDragCanvas() {
    if (typeof document === 'undefined') return null;
    if (!emptyDragCanvas) {
        emptyDragCanvas = document.createElement('canvas');
        emptyDragCanvas.width = 1;
        emptyDragCanvas.height = 1;
    }
    return emptyDragCanvas;
}

export function BulkEditProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [formsData, setFormsData] = useState([]);
    const [collapsedCards, setCollapsedCards] = useState({});
    const [tagInputs, setTagInputs] = useState({});
    const [hintInputs, setHintInputs] = useState({});
    const [activeHintPopupId, setActiveHintPopupId] = useState(null);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const [isGenerating, setIsGenerating] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(INITIAL_SAVE_PROGRESS);
    const [activeColorPicker, setActiveColorPicker] = useState(null);
    const [customLightTemplates, setCustomLightTemplates] = useState([]);
    const [customDarkTemplates, setCustomDarkTemplates] = useState([]);
    const [templateNameInput, setTemplateNameInput] = useState({});
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isDraggingCandidates, setIsDraggingCandidates] = useState(false);
    const [draggedCount, setDraggedCount] = useState(0);
    const [draggedItems, setDraggedItems] = useState([]);
    const [exitingIds, setExitingIds] = useState({});
    const [selectedSidebarIds, setSelectedSidebarIds] = useState([]);

    const draggedItemsRef = useRef([]);
    const dragCursorPosRef = useRef({ x: -9999, y: -9999 });
    const dragPreviewElRef = useRef(null);
    const lastSidebarSelectedIdRef = useRef(null);
    const lastSidebarSelectedActionRef = useRef('select');
    const listenersRef = useRef(new Set());
    const hydratedRef = useRef(false);

    // Restore persistent session from sessionStorage on initial mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.isOpen) {
                    if (Array.isArray(parsed.formsData)) {
                        setFormsData(parsed.formsData);
                    }
                    setIsOpen(true);
                    setIsMinimized(Boolean(parsed.isMinimized));
                    if (parsed.collapsedCards && typeof parsed.collapsedCards === 'object') {
                        setCollapsedCards(parsed.collapsedCards);
                    }
                    if (parsed.selectedModel) {
                        setSelectedModel(parsed.selectedModel);
                    }
                }
            }
        } catch {
            // Ignore storage errors
        } finally {
            hydratedRef.current = true;
        }
    }, []);

    // Persist state to sessionStorage so edits survive refreshes and page changes
    useEffect(() => {
        if (!hydratedRef.current || typeof window === 'undefined') return;
        try {
            if (!isOpen) {
                sessionStorage.removeItem(STORAGE_KEY);
            } else {
                sessionStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        isOpen,
                        isMinimized,
                        formsData,
                        collapsedCards,
                        selectedModel,
                    })
                );
            }
        } catch {
            // Ignore storage quota errors
        }
    }, [isOpen, isMinimized, formsData, collapsedCards, selectedModel]);

    // Safety cleanup for drag state & live cursor tracking for custom stacked/single drag preview
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleWindowDragEnd = () => {
            draggedItemsRef.current = [];
            setDraggedItems([]);
            setDraggedCount(0);
            setIsDraggingCandidates(false);
        };
        const updateCursorFromEvent = (e) => {
            if (!draggedItemsRef.current || draggedItemsRef.current.length === 0) return;
            if (typeof e.clientX === 'number' && typeof e.clientY === 'number' && (e.clientX > 0 || e.clientY > 0)) {
                dragCursorPosRef.current = { x: e.clientX, y: e.clientY };
            }
        };
        const handleWindowDragOver = (e) => {
            if (!draggedItemsRef.current || draggedItemsRef.current.length === 0) return;
            // Allow smooth dragging across the viewport without OS "not-allowed" cursor
            e.preventDefault();
            updateCursorFromEvent(e);
        };
        const handleWindowDrag = (e) => {
            updateCursorFromEvent(e);
        };
        window.addEventListener('dragend', handleWindowDragEnd);
        window.addEventListener('drop', handleWindowDragEnd);
        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('drag', handleWindowDrag);
        return () => {
            window.removeEventListener('dragend', handleWindowDragEnd);
            window.removeEventListener('drop', handleWindowDragEnd);
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drag', handleWindowDrag);
        };
    }, []);

    const subscribe = useCallback((listener) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    const notifySaved = useCallback((updates, results) => {
        listenersRef.current.forEach((listener) => {
            if (typeof listener === 'function') {
                listener(updates, results);
            } else if (typeof listener?.onSaved === 'function') {
                listener.onSaved(updates, results);
            }
        });
    }, []);

    const addItemsToBulkEdit = useCallback(
        (images = [], { maximize = true, silent = false } = {}) => {
            if (!Array.isArray(images) || images.length === 0) return;

            let addedCount = 0;
            let totalAfter = 0;
            let hadExisting = false;

            setExitingIds((prev) => {
                const next = { ...prev };
                images.forEach((img) => {
                    if (img?.id) delete next[img.id];
                });
                return next;
            });

            setFormsData((prev) => {
                hadExisting = prev.length > 0;
                const existingIds = new Set(prev.map((item) => item.id));
                const incomingMap = new Map(images.filter((i) => i?.id).map((i) => [i.id, i]));

                // Preserve existing items and their in-progress edits, refreshing preview if needed
                const updatedPrev = prev.map((existing) => {
                    const incoming = incomingMap.get(existing.id);
                    if (incoming) {
                        return {
                            ...existing,
                            preview:
                                incoming.path ||
                                incoming.preview ||
                                incoming.thumbPath ||
                                existing.preview,
                        };
                    }
                    return existing;
                });

                const newItems = [];
                const seenNewIds = new Set();
                for (const img of images) {
                    if (!img?.id || existingIds.has(img.id) || seenNewIds.has(img.id)) continue;
                    seenNewIds.add(img.id);
                    newItems.push(normalizeImageItem(img));
                }

                addedCount = newItems.length;
                const merged = [...updatedPrev, ...newItems];
                totalAfter = merged.length;
                return merged;
            });

            setActiveColorPicker(null);
            setIsOpen(true);
            if (maximize) {
                setIsMinimized(false);
            }

            if (!silent) {
                setTimeout(() => {
                    if (addedCount > 0 && (hadExisting || !maximize)) {
                        toast.success(
                            `Added ${addedCount} ${addedCount === 1 ? 'item' : 'items'} to Bulk Editor (${totalAfter} total)`
                        );
                    } else if (addedCount === 0 && images.length > 0 && !maximize) {
                        toast.info('Selected item(s) are already in the Bulk Editor');
                    }
                }, 0);
            }
        },
        []
    );

    const openBulkEdit = useCallback(
        (images = [], options = {}) => {
            addItemsToBulkEdit(images, { maximize: true, ...options });
        },
        [addItemsToBulkEdit]
    );

    const finalizeRemoveIds = useCallback((ids = []) => {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const idSet = new Set(ids);
        setFormsData((prev) => prev.filter((item) => !idSet.has(item.id)));
        setCollapsedCards((prev) => {
            const next = { ...prev };
            ids.forEach((id) => delete next[id]);
            return next;
        });
        setTagInputs((prev) => {
            const next = { ...prev };
            ids.forEach((id) => delete next[id]);
            return next;
        });
        setHintInputs((prev) => {
            const next = { ...prev };
            ids.forEach((id) => delete next[id]);
            return next;
        });
        setSelectedSidebarIds((prev) => prev.filter((id) => !idSet.has(id)));
        setExitingIds((prev) => {
            const next = { ...prev };
            ids.forEach((id) => delete next[id]);
            return next;
        });
        setActiveColorPicker((prev) => (prev && idSet.has(prev.id) ? null : prev));
        setActiveHintPopupId((prev) => (prev && idSet.has(prev) ? null : prev));
    }, []);

    const removeBulkEditItems = useCallback(
        (ids = [], { animate = true } = {}) => {
            if (!Array.isArray(ids) || ids.length === 0) return;
            if (!animate) {
                finalizeRemoveIds(ids);
                return;
            }
            setExitingIds((prev) => {
                const next = { ...prev };
                ids.forEach((id) => {
                    next[id] = true;
                });
                return next;
            });
            setTimeout(() => {
                finalizeRemoveIds(ids);
            }, 300);
        },
        [finalizeRemoveIds]
    );

    const removeBulkEditItem = useCallback(
        (id, options = { animate: true }) => {
            if (!id) return;
            removeBulkEditItems([id], options);
        },
        [removeBulkEditItems]
    );

    const clearBulkEditItems = useCallback(
        ({ animate = true } = {}) => {
            if (!animate || formsData.length === 0) {
                setFormsData([]);
                setCollapsedCards({});
                setTagInputs({});
                setHintInputs({});
                setSelectedSidebarIds([]);
                setExitingIds({});
                setActiveColorPicker(null);
                setActiveHintPopupId(null);
                return;
            }
            const allIds = formsData.map((item) => item.id);
            removeBulkEditItems(allIds, { animate: true });
        },
        [formsData, removeBulkEditItems]
    );

    const toggleSidebarItemSelect = useCallback(
        (id, event) => {
            const isShiftKey = Boolean(event?.shiftKey || event?.nativeEvent?.shiftKey);
            const visibleIds = formsData.map((item) => item.id);

            setSelectedSidebarIds((prev) => {
                const isCurrentlySelected = prev.includes(id);
                const targetSelectedState = !isCurrentlySelected;

                if (isShiftKey && lastSidebarSelectedIdRef.current !== null) {
                    const startIndex = visibleIds.indexOf(lastSidebarSelectedIdRef.current);
                    const endIndex = visibleIds.indexOf(id);

                    if (startIndex !== -1 && endIndex !== -1) {
                        const rangeAction =
                            lastSidebarSelectedActionRef.current === 'unselect'
                                ? false
                                : targetSelectedState;
                        const low = Math.min(startIndex, endIndex);
                        const high = Math.max(startIndex, endIndex);
                        const rangeIds = visibleIds.slice(low, high + 1);
                        const rangeSet = new Set(rangeIds);

                        lastSidebarSelectedIdRef.current = id;
                        lastSidebarSelectedActionRef.current = rangeAction ? 'select' : 'unselect';

                        if (rangeAction) {
                            const merged = new Set([...prev, ...rangeIds]);
                            return Array.from(merged);
                        } else {
                            return prev.filter((existingId) => !rangeSet.has(existingId));
                        }
                    }
                }

                lastSidebarSelectedIdRef.current = id;
                lastSidebarSelectedActionRef.current = targetSelectedState ? 'select' : 'unselect';

                if (targetSelectedState) {
                    return [...prev, id];
                } else {
                    return prev.filter((existingId) => existingId !== id);
                }
            });
        },
        [formsData]
    );

    const toggleSelectAllSidebarItems = useCallback(() => {
        const allIds = formsData.map((item) => item.id);
        setSelectedSidebarIds((prev) => (prev.length === allIds.length ? [] : allIds));
    }, [formsData]);

    const clearSelectedSidebarItems = useCallback(() => {
        if (selectedSidebarIds.length === 0) return;
        const count = selectedSidebarIds.length;
        removeBulkEditItems(selectedSidebarIds, { animate: true });
        toast.success(`Cleared ${count} selected ${count === 1 ? 'item' : 'items'} from Bulk Editor`);
    }, [selectedSidebarIds, removeBulkEditItems]);

    const startDraggingItems = useCallback((items = [], initialEvent = null) => {
        if (!Array.isArray(items) || items.length === 0) return;
        draggedItemsRef.current = items;
        setDraggedItems(items);
        setDraggedCount(items.length);
        if (initialEvent && (initialEvent.clientX > 0 || initialEvent.clientY > 0)) {
            dragCursorPosRef.current = {
                x: initialEvent.clientX,
                y: initialEvent.clientY,
            };
        }
        if (initialEvent?.dataTransfer) {
            const emptyCanvas = getEmptyDragCanvas();
            if (emptyCanvas) {
                try {
                    initialEvent.dataTransfer.setDragImage(emptyCanvas, 0, 0);
                } catch {
                    // Ignore browser dragImage errors
                }
            }
        }
        setIsDraggingCandidates(true);
    }, []);

    const endDraggingItems = useCallback(() => {
        draggedItemsRef.current = [];
        setDraggedItems([]);
        setDraggedCount(0);
        setIsDraggingCandidates(false);
    }, []);

    const closeBulkEdit = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
        setActiveColorPicker(null);
        setSaveProgress(INITIAL_SAVE_PROGRESS);
    }, []);

    const minimizeBulkEdit = useCallback(() => {
        setActiveColorPicker(null);
        setIsMinimized(true);
    }, []);

    const maximizeBulkEdit = useCallback(() => {
        setIsMinimized(false);
    }, []);

    const toggleCardCollapse = useCallback((id) => {
        setCollapsedCards((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);

    const setAllCardsCollapsed = useCallback((collapsed, targetIds = null) => {
        setCollapsedCards((prev) => {
            if (!targetIds) {
                const next = {};
                formsData.forEach((item) => {
                    next[item.id] = collapsed;
                });
                return next;
            }
            const next = { ...prev };
            targetIds.forEach((id) => {
                next[id] = collapsed;
            });
            return next;
        });
    }, [formsData]);

    const saveUpdates = useCallback(
        async (updates) => {
            if (!Array.isArray(updates) || updates.length === 0) return;
            setIsSaving(true);
            setSaveProgress({
                active: true,
                completed: 0,
                total: updates.length,
                succeeded: 0,
                failed: 0,
                currentName: updates[0]?.name || 'Image 1',
            });

            let successCount = 0;
            let failCount = 0;
            const succeededUpdates = [];

            for (let i = 0; i < updates.length; i++) {
                const update = updates[i];
                setSaveProgress((prev) => ({
                    ...prev,
                    currentName: update.name || `Image ${i + 1}`,
                }));

                try {
                    const res = await fetch('/api/images/update', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(update),
                    });

                    if (res.ok) {
                        successCount++;
                        succeededUpdates.push(update);
                    } else {
                        failCount++;
                    }
                } catch {
                    failCount++;
                }

                setSaveProgress((prev) => ({
                    ...prev,
                    completed: i + 1,
                    succeeded: successCount,
                    failed: failCount,
                }));
            }

            if (succeededUpdates.length > 0) {
                notifySaved(succeededUpdates, { successCount, failCount });
            }

            // Brief pause so user clearly sees 100% completion on the progress bar
            await new Promise((resolve) => setTimeout(resolve, 260));

            setIsSaving(false);
            setSaveProgress(INITIAL_SAVE_PROGRESS);

            if (failCount === 0) {
                toast.success(`Successfully updated ${successCount} ${successCount === 1 ? 'image' : 'images'}`);
                closeBulkEdit();
            } else {
                toast.warning(`Updated ${successCount} images. ${failCount} failed.`);
                if (successCount > 0) {
                    const succeededIds = new Set(succeededUpdates.map((u) => u.id));
                    setFormsData((prev) => prev.filter((item) => !succeededIds.has(item.id)));
                }
            }
        },
        [closeBulkEdit, notifySaved]
    );

    return (
        <BulkEditContext.Provider
            value={{
                isOpen,
                isMinimized,
                formsData,
                setFormsData,
                collapsedCards,
                setCollapsedCards,
                toggleCardCollapse,
                setAllCardsCollapsed,
                tagInputs,
                setTagInputs,
                hintInputs,
                setHintInputs,
                activeHintPopupId,
                setActiveHintPopupId,
                selectedModel,
                setSelectedModel,
                isGenerating,
                setIsGenerating,
                isSaving,
                saveProgress,
                activeColorPicker,
                setActiveColorPicker,
                customLightTemplates,
                setCustomLightTemplates,
                customDarkTemplates,
                setCustomDarkTemplates,
                templateNameInput,
                setTemplateNameInput,
                isSavingTemplate,
                setIsSavingTemplate,
                openBulkEdit,
                addItemsToBulkEdit,
                removeBulkEditItem,
                removeBulkEditItems,
                clearBulkEditItems,
                exitingIds,
                selectedSidebarIds,
                setSelectedSidebarIds,
                toggleSidebarItemSelect,
                toggleSelectAllSidebarItems,
                clearSelectedSidebarItems,
                isDraggingCandidates,
                draggedCount,
                draggedItems,
                draggedItemsRef,
                dragCursorPosRef,
                dragPreviewElRef,
                startDraggingItems,
                endDraggingItems,
                closeBulkEdit,
                minimizeBulkEdit,
                maximizeBulkEdit,
                saveUpdates,
                subscribe,
            }}
        >
            {children}
        </BulkEditContext.Provider>
    );
}

export function useBulkEdit() {
    const ctx = useContext(BulkEditContext);
    if (!ctx) {
        throw new Error('useBulkEdit must be used within a BulkEditProvider');
    }
    return ctx;
}

export function GlobalBulkEditSidebar() {
    const ctx = useContext(BulkEditContext);
    const uploadCtx = useUploadManager();

    const {
        isOpen,
        isMinimized,
        formsData,
        setFormsData,
        collapsedCards,
        toggleCardCollapse,
        setAllCardsCollapsed,
        tagInputs,
        setTagInputs,
        hintInputs,
        setHintInputs,
        activeHintPopupId,
        setActiveHintPopupId,
        selectedModel,
        setSelectedModel,
        isGenerating,
        setIsGenerating,
        isSaving,
        saveProgress,
        activeColorPicker,
        setActiveColorPicker,
        customLightTemplates,
        setCustomLightTemplates,
        customDarkTemplates,
        setCustomDarkTemplates,
        templateNameInput,
        setTemplateNameInput,
        isSavingTemplate,
        setIsSavingTemplate,
        addItemsToBulkEdit,
        removeBulkEditItem,
        clearBulkEditItems,
        exitingIds,
        selectedSidebarIds,
        toggleSidebarItemSelect,
        toggleSelectAllSidebarItems,
        clearSelectedSidebarItems,
        isDraggingCandidates,
        draggedCount,
        draggedItems,
        draggedItemsRef,
        dragCursorPosRef,
        dragPreviewElRef,
        endDraggingItems,
        closeBulkEdit,
        minimizeBulkEdit,
        maximizeBulkEdit,
        saveUpdates,
    } = ctx;

    const [isDragOverExpanded, setIsDragOverExpanded] = useState(false);
    const [isDragOverDock, setIsDragOverDock] = useState(false);

    const dragCardBodyRef = useRef(null);
    const dragStackBack1Ref = useRef(null);
    const dragStackBack2Ref = useRef(null);
    const isOverDropZoneRef = useRef(false);
    isOverDropZoneRef.current = Boolean(isDragOverExpanded || isDragOverDock);

    // Real-time spring & pendulum physics loop for the dragged thumbnail/stack
    useEffect(() => {
        if (!isDraggingCandidates || draggedItems.length === 0 || typeof window === 'undefined') {
            return;
        }

        let rafId = null;
        const initX = dragCursorPosRef.current.x > -1000 ? dragCursorPosRef.current.x : window.innerWidth / 2;
        const initY = dragCursorPosRef.current.y > -1000 ? dragCursorPosRef.current.y : window.innerHeight / 2;

        const phys = {
            x: initX,
            y: initY,
            vx: 0,
            vy: 0,
            angle: 0,
            vAngle: 0,
            pitch: 0,
            vPitch: 0,
            scale: 0.82,
            vScale: 0,
        };

        // Anchor offset so the thumbnail hangs slightly below the cursor as if picked up by its top edge
        const ANCHOR_OFFSET_X = -48;
        const ANCHOR_OFFSET_Y = -2;

        const tick = () => {
            const target = dragCursorPosRef.current;
            if (target.x > -1000 && target.y > -1000) {
                const dx = target.x - phys.x;
                const dy = target.y - phys.y;

                // Spring position tracking (snappy under cursor with natural inertia)
                phys.vx = (phys.vx + dx * 0.34) * 0.64;
                phys.vy = (phys.vy + dy * 0.34) * 0.64;
                phys.x += phys.vx;
                phys.y += phys.vy;

                // Pendulum tilt (swings with horizontal velocity and rocks back to rest)
                const baseAngle = draggedItems.length > 1 ? -2 : -3;
                const targetAngle = baseAngle + Math.max(-26, Math.min(26, phys.vx * 1.45));
                phys.vAngle = (phys.vAngle + (targetAngle - phys.angle) * 0.2) * 0.74;
                phys.angle += phys.vAngle;

                // 3D pitch from vertical velocity
                const targetPitch = Math.max(-18, Math.min(18, -phys.vy * 0.9));
                phys.vPitch = (phys.vPitch + (targetPitch - phys.pitch) * 0.22) * 0.72;
                phys.pitch += phys.vPitch;

                // Dynamic lift scale (pops in, boosts slightly with speed or when over drop zone)
                const speed = Math.hypot(phys.vx, phys.vy);
                const baseScale = isOverDropZoneRef.current ? 1.12 : 1.0;
                const targetScale = baseScale + Math.min(0.08, speed * 0.0028);
                phys.vScale = (phys.vScale + (targetScale - phys.scale) * 0.24) * 0.72;
                phys.scale += phys.vScale;

                if (dragPreviewElRef.current) {
                    dragPreviewElRef.current.style.transform = `translate3d(${
                        phys.x + ANCHOR_OFFSET_X
                    }px, ${phys.y + ANCHOR_OFFSET_Y}px, 0)`;
                }

                if (dragCardBodyRef.current) {
                    dragCardBodyRef.current.style.transform = `perspective(500px) scale(${phys.scale.toFixed(
                        3
                    )}) rotateZ(${phys.angle.toFixed(2)}deg) rotateX(${phys.pitch.toFixed(2)}deg)`;
                }

                // Trailing parallax & dynamic fan spread for stacked cards behind the front card
                const trailX = Math.max(-18, Math.min(18, -phys.vx * 0.55));
                const trailY = Math.max(-18, Math.min(18, -phys.vy * 0.55));
                const fanBoost = Math.min(10, speed * 0.35);

                if (dragStackBack1Ref.current) {
                    dragStackBack1Ref.current.style.transform = `translate3d(${(
                        -11 +
                        trailX -
                        fanBoost * 0.4
                    ).toFixed(1)}px, ${(4 + trailY).toFixed(1)}px, 0) rotate(${(
                        -10 -
                        fanBoost * 0.6 -
                        phys.angle * 0.25
                    ).toFixed(2)}deg) scale(0.95)`;
                }

                if (dragStackBack2Ref.current) {
                    dragStackBack2Ref.current.style.transform = `translate3d(${(
                        13 +
                        trailX * 1.6 +
                        fanBoost * 0.5
                    ).toFixed(1)}px, ${(-6 + trailY * 1.6).toFixed(1)}px, 0) rotate(${(
                        12 +
                        fanBoost * 0.8 -
                        phys.angle * 0.4
                    ).toFixed(2)}deg) scale(0.9)`;
                }
            }

            rafId = window.requestAnimationFrame(tick);
        };

        rafId = window.requestAnimationFrame(tick);

        const handlePointerMove = (e) => {
            if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
                dragCursorPosRef.current = { x: e.clientX, y: e.clientY };
                const hitEl = document.elementFromPoint(e.clientX, e.clientY);
                const zone =
                    hitEl?.closest?.('[data-bulk-dropzone]')?.getAttribute('data-bulk-dropzone') ||
                    null;
                setIsDragOverExpanded(zone === 'expanded');
                setIsDragOverDock(zone === 'dock');
            }
        };

        const handlePointerUp = (e) => {
            const items = draggedItemsRef.current || [];
            if (items.length > 0 && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
                const hitEl = document.elementFromPoint(e.clientX, e.clientY);
                const zone =
                    hitEl?.closest?.('[data-bulk-dropzone]')?.getAttribute('data-bulk-dropzone') ||
                    null;
                if (zone === 'expanded') {
                    addItemsToBulkEdit(items, { maximize: true });
                } else if (zone === 'dock') {
                    addItemsToBulkEdit(items, { maximize: !isMinimized });
                }
            }
            setIsDragOverExpanded(false);
            setIsDragOverDock(false);
            endDraggingItems();
        };

        window.addEventListener('mousemove', handlePointerMove, { passive: true });
        window.addEventListener('mouseup', handlePointerUp);

        return () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
        };
    }, [
        isDraggingCandidates,
        draggedItems.length,
        dragCursorPosRef,
        dragPreviewElRef,
        draggedItemsRef,
        addItemsToBulkEdit,
        endDraggingItems,
        isMinimized,
    ]);

    const handleDropItems = useCallback(
        (e, { keepMinimized = false } = {}) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverExpanded(false);
            setIsDragOverDock(false);

            let items = draggedItemsRef.current || [];
            if ((!Array.isArray(items) || items.length === 0) && e.dataTransfer) {
                try {
                    const raw = e.dataTransfer.getData('application/x-png101-bulk-items');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) items = parsed;
                    }
                } catch {
                    // Ignore parse error
                }
            }

            if (Array.isArray(items) && items.length > 0) {
                addItemsToBulkEdit(items, { maximize: !keepMinimized });
            }
            endDraggingItems();
        },
        [addItemsToBulkEdit, draggedItemsRef, endDraggingItems]
    );

    useEffect(() => {
        if (isOpen) {
            fetch('/api/admin/contrast-templates')
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data.lightCustoms)) setCustomLightTemplates(data.lightCustoms);
                    if (Array.isArray(data.darkCustoms)) setCustomDarkTemplates(data.darkCustoms);
                })
                .catch((err) => console.error('Failed to load custom contrast templates:', err));

            fetch('/api/admin/api-keys')
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        const activeKey = data.find((k) => k.isActive);
                        if (activeKey) {
                            if (activeKey.modelVersion === '3.8') {
                                setSelectedModel('gemini-3.8-flash');
                            } else if (activeKey.modelVersion === '3.0') {
                                setSelectedModel('gemini-3.0-pro');
                            } else {
                                setSelectedModel('gemini-2.5-flash');
                            }
                        }
                    }
                })
                .catch((err) => console.error('Failed to detect active API key model:', err));
        }
    }, [isOpen, setCustomDarkTemplates, setCustomLightTemplates, setSelectedModel]);

    const handleAddCustomTemplate = async (type, color, name) => {
        if (!color || color === 'none') return;
        setIsSavingTemplate(true);
        try {
            const res = await fetch('/api/admin/contrast-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, action: 'add', color, name }),
            });
            const result = await res.json();
            if (res.ok) {
                if (type === 'light') setCustomLightTemplates(result.list);
                else setCustomDarkTemplates(result.list);
                toast.success(`Saved "${name && name.trim() ? name.trim() : color.toUpperCase()}" to templates!`);
            } else {
                toast.error(result.error || 'Failed to save template');
            }
        } catch {
            toast.error('Network error saving template');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDeleteCustomTemplate = async (type, color) => {
        try {
            const res = await fetch('/api/admin/contrast-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, action: 'delete', color }),
            });
            const result = await res.json();
            if (res.ok) {
                if (type === 'light') setCustomLightTemplates(result.list);
                else setCustomDarkTemplates(result.list);
                toast.success(`Removed ${color.toUpperCase()} from templates`);
            } else {
                toast.error(result.error || 'Failed to remove template');
            }
        } catch {
            toast.error('Network error removing template');
        }
    };

    const compressImageToBase64 = (url, maxDimension = 800) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx2d = canvas.getContext('2d');
                if (!ctx2d) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx2d.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(compressedDataUrl);
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = url;
        });
    };

    const parseHintTokens = (rawText) => {
        if (!rawText || typeof rawText !== 'string') return [];
        return rawText
            .split(',')
            .map((token) => token.trim().replace(/^['"`]+|['"`]+$/g, '').trim())
            .filter((token) => token.length > 0);
    };

    const commitHintInput = (id, rawOverride = null) => {
        const raw = rawOverride !== null ? rawOverride : hintInputs[id] || '';
        const newHints = parseHintTokens(raw);
        if (newHints.length === 0) return [];

        setFormsData((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const current = Array.isArray(item.aiHints) ? item.aiHints : [];
                    const uniqueNew = newHints.filter(
                        (h) => !current.some((existing) => existing.toLowerCase() === h.toLowerCase())
                    );
                    return {
                        ...item,
                        aiHints: [...current, ...uniqueNew],
                    };
                }
                return item;
            })
        );
        setHintInputs((prev) => ({ ...prev, [id]: '' }));
        return newHints;
    };

    const handleHintKeyDown = (id, e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            commitHintInput(id);
        } else if (e.key === 'Backspace' && !(hintInputs[id] || '').trim()) {
            setFormsData((prev) =>
                prev.map((item) => {
                    if (item.id === id && Array.isArray(item.aiHints) && item.aiHints.length > 0) {
                        return { ...item, aiHints: item.aiHints.slice(0, -1) };
                    }
                    return item;
                })
            );
        }
    };

    const removeHint = (id, hintToRemove) => {
        setFormsData((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const current = Array.isArray(item.aiHints) ? item.aiHints : [];
                    return {
                        ...item,
                        aiHints: current.filter((h) => h !== hintToRemove),
                    };
                }
                return item;
            })
        );
    };

    const handleAutoFill = async (id, previewUrl) => {
        setIsGenerating((prev) => ({ ...prev, [id]: true }));
        try {
            // Collect existing hints + any unsubmitted text currently in the hint input box
            const currentItem = formsData.find((item) => item.id === id);
            const savedHints = Array.isArray(currentItem?.aiHints) ? currentItem.aiHints : [];
            const pendingHints = parseHintTokens(hintInputs[id] || '');
            const effectiveHints = Array.from(new Set([...savedHints, ...pendingHints]));

            if (pendingHints.length > 0) {
                commitHintInput(id);
            }

            const base64 = await compressImageToBase64(previewUrl);

            const res = await fetch('/api/images/generate-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    modelName: selectedModel,
                    hints: effectiveHints,
                }),
            });
            const metadata = await res.json();
            if (!res.ok) {
                throw new Error(metadata.error || 'Failed to generate metadata');
            }

            setFormsData((prev) =>
                prev.map((item) => {
                    if (item.id === id) {
                        return {
                            ...item,
                            aiGenerated: true,
                            aiHints: effectiveHints,
                            name: metadata.title || item.name,
                            altText: metadata.altText || item.altText,
                            description: metadata.description || item.description,
                            tags:
                                Array.isArray(metadata.tags) && metadata.tags.length > 0
                                    ? metadata.tags
                                    : item.tags,
                        };
                    }
                    return item;
                })
            );
            toast.success(
                effectiveHints.length > 0
                    ? `AI Metadata regenerated using ${effectiveHints.length} ${
                          effectiveHints.length === 1 ? 'hint' : 'hints'
                      }!`
                    : 'AI Metadata generated successfully!'
            );
        } catch (error) {
            console.error(error);
            toast.error(error?.message || 'Failed to generate metadata. Check API key or Rate Limits.');
        } finally {
            setIsGenerating((prev) => ({ ...prev, [id]: false }));
        }
    };

    const handleInputChange = (id, field, value) => {
        setFormsData((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    };

    const handleTagInput = (id, value) => {
        setTagInputs((prev) => ({ ...prev, [id]: value }));
    };

    const handleTagKeyDown = (id, e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const input = tagInputs[id] || '';
            const newTag = input.trim();
            if (newTag) {
                setFormsData((prev) =>
                    prev.map((item) => {
                        if (item.id === id && !item.tags.includes(newTag)) {
                            return { ...item, tags: [...item.tags, newTag] };
                        }
                        return item;
                    })
                );
                setTagInputs((prev) => ({ ...prev, [id]: '' }));
            }
        }
    };

    const removeTag = (id, tagToRemove) => {
        setFormsData((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    return { ...item, tags: item.tags.filter((t) => t !== tagToRemove) };
                }
                return item;
            })
        );
    };

    const MAX_TAGS = 30;
    const hasValidationErrors = formsData.some((data) => data.tags.length > MAX_TAGS);
    const anyGenerating = Object.values(isGenerating).some(Boolean);

    const totalCount = formsData.length;
    const readyCount = formsData.filter(hasItemMetadata).length;
    const needsMetaCount = totalCount - readyCount;
    const readyPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

    const allCardsCollapsed =
        totalCount > 0 && formsData.every((item) => Boolean(collapsedCards[item.id]));

    const savePercent =
        saveProgress.total > 0
            ? Math.min(100, Math.round((saveProgress.completed / saveProgress.total) * 100))
            : 0;

    const handleSaveAll = () => {
        if (hasValidationErrors || isSaving) return;

        const updates = formsData.map((data) => ({
            id: data.id,
            name: data.name,
            tags: data.tags,
            altText: data.altText || undefined,
            description: data.description || undefined,
            contrastBgDark: data.contrastBgDark,
            contrastBgLight: data.contrastBgLight,
        }));
        saveUpdates(updates);
    };

    const cyclePreviewMode = (id, current) => {
        const next = current === 'dark' ? 'light' : current === 'light' ? 'checker' : 'dark';
        handleInputChange(id, 'previewMode', next);
    };

    const getPreviewStyle = (item) => {
        if (item.previewMode === 'dark') {
            const isDarkClash = item.luminance === 'dark' && item.contrastBgDark !== 'none';
            const bg = isDarkClash ? item.contrastBgDark || '#f8fafc' : '#0f172a';
            return {
                backgroundColor: bg,
                borderColor: isDarkClash ? '#e2e8f0' : '#1e293b',
            };
        }
        if (item.previewMode === 'light') {
            const isLightClash = item.luminance === 'light' && item.contrastBgLight !== 'none';
            const bg = isLightClash ? item.contrastBgLight || '#cbd5e1' : '#ffffff';
            return {
                backgroundColor: bg,
                borderColor: isLightClash ? '#94a3b8' : '#e2e8f0',
            };
        }
        return {
            backgroundImage:
                'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
        };
    };

    const showExpanded = isOpen && !isMinimized;
    const showMinimized = (isOpen && isMinimized) || (!isOpen && isDraggingCandidates);
    const uploadTrackerVisible = Boolean(uploadCtx?.job?.active);

    return (
        <>
            {/* Expanded Slide-Over Sidebar */}
            <aside
                data-bulk-dropzone="expanded"
                aria-hidden={!showExpanded}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!isDragOverExpanded) setIsDragOverExpanded(true);
                }}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragOverExpanded(true);
                }}
                onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsDragOverExpanded(false);
                    }
                }}
                onDrop={(e) => handleDropItems(e, { keepMinimized: false })}
                style={{
                    transition:
                        'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease',
                }}
                className={`fixed inset-y-0 right-0 w-full max-w-[500px] bg-card-bg border-l shadow-2xl z-50 flex flex-col ${
                    isDragOverExpanded
                        ? 'border-primary-glow ring-2 ring-primary-glow/40'
                        : isDraggingCandidates
                        ? 'border-primary-glow/60'
                        : 'border-card-border'
                } ${
                    showExpanded
                        ? 'translate-x-0 opacity-100 pointer-events-auto'
                        : 'translate-x-full opacity-0 pointer-events-none'
                }`}
            >
                {/* Drag-and-Drop Overlay Banner when dragging items over Expanded Sidebar */}
                {isDragOverExpanded && (
                    <div className="absolute inset-0 z-40 bg-primary-glow/15 backdrop-blur-[2px] border-2 border-dashed border-primary-glow rounded-l-xl flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
                        <div className="bg-card-bg/95 border border-primary-glow/50 rounded-2xl px-6 py-5 shadow-2xl flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-primary-glow/20 text-primary-glow flex items-center justify-center">
                                <Plus className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-foreground">
                                Drop to add {draggedCount > 0 ? `${draggedCount} ${draggedCount === 1 ? 'item' : 'items'}` : 'items'} to Bulk Editor
                            </p>
                            <p className="text-xs text-foreground/60">
                                Existing items in the sidebar will be kept
                            </p>
                        </div>
                    </div>
                )}

                {/* Side Edge Quick-Minimize Handle */}
                <button
                    type="button"
                    onClick={minimizeBulkEdit}
                    title="Minimize Bulk Editor"
                    className={`hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-14 rounded-l-xl bg-card-bg border border-r-0 border-card-border shadow-lg items-center justify-center text-foreground/60 hover:text-primary-glow hover:bg-background transition-all cursor-pointer ${
                        showExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Top Header + Metadata Readiness Summary */}
                <div className="p-5 sm:p-6 border-b border-card-border bg-background/60 backdrop-blur-md space-y-3.5">
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                                    Edit Details
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-foreground/10 text-foreground/80">
                                    {totalCount} {totalCount === 1 ? 'item' : 'items'}
                                </span>
                            </div>

                            {/* Done vs Needs Metadata Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {totalCount === 0 ? (
                                    <span className="text-[11px] font-medium text-foreground/55">
                                        Select or drag & drop items to edit
                                    </span>
                                ) : (
                                    <>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {readyCount} Done
                                        </span>
                                        {needsMetaCount > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                                <Clock className="w-3 h-3" />
                                                {needsMetaCount} {needsMetaCount === 1 ? 'Needs' : 'Need'} Metadata
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-semibold text-emerald-400">
                                                All items ready!
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <StudioSelect
                                size="sm"
                                aria-label="AI model"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                            >
                                {MODELS.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </StudioSelect>

                            <button
                                type="button"
                                onClick={minimizeBulkEdit}
                                title="Minimize editor to continue browsing"
                                aria-label="Minimize editor"
                                className="p-2 rounded-xl bg-background/80 hover:bg-foreground/10 border border-card-border text-foreground/70 hover:text-foreground transition-all cursor-pointer"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={closeBulkEdit}
                                title="Close editor"
                                aria-label="Close editor"
                                className="p-2 rounded-xl bg-background/80 hover:bg-rose-500/15 border border-card-border hover:border-rose-500/30 text-foreground/70 hover:text-rose-400 transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Readiness Progress Bar & Quick Card Collapse / Clear Actions */}
                    <div className="space-y-2 pt-1">
                        <div className="w-full h-1.5 bg-background border border-card-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-glow to-emerald-500 transition-all duration-300 rounded-full"
                                style={{ width: `${readyPercent}%` }}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2">
                                {totalCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllSidebarItems}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background hover:bg-foreground/10 border border-card-border text-foreground/75 hover:text-foreground font-semibold transition-colors cursor-pointer"
                                        title={
                                            selectedSidebarIds.length === totalCount
                                                ? 'Deselect all items in Bulk Editor'
                                                : 'Select all items in Bulk Editor'
                                        }
                                    >
                                        <span
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                                                selectedSidebarIds.length === totalCount && totalCount > 0
                                                    ? 'bg-primary-glow border-primary-glow text-white'
                                                    : selectedSidebarIds.length > 0
                                                    ? 'bg-primary-glow/30 border-primary-glow text-primary-glow'
                                                    : 'border-card-border bg-card-bg text-transparent'
                                            }`}
                                        >
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </span>
                                        <span>
                                            {selectedSidebarIds.length > 0
                                                ? `${selectedSidebarIds.length} Selected`
                                                : 'Select'}
                                        </span>
                                    </button>
                                )}
                                <span className="text-foreground/55 font-medium">
                                    {totalCount > 0
                                        ? `${readyCount} of ${totalCount} complete (${readyPercent}%)`
                                        : '0 items in queue'}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                {selectedSidebarIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearSelectedSidebarItems}
                                        disabled={isSaving}
                                        title={`Clear Selected (${selectedSidebarIds.length})`}
                                        aria-label={`Clear Selected (${selectedSidebarIds.length})`}
                                        className="group relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed animate-in fade-in zoom-in-95 duration-150"
                                    >
                                        <Eraser className="w-3.5 h-3.5" />
                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-50">
                                            Clear Selected ({selectedSidebarIds.length})
                                        </span>
                                    </button>
                                )}

                                {readyCount > 0 && needsMetaCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = {};
                                            formsData.forEach((item) => {
                                                next[item.id] = hasItemMetadata(item);
                                            });
                                            ctx.setCollapsedCards(next);
                                        }}
                                        title={`Minimize Done (${readyCount})`}
                                        aria-label={`Minimize Done (${readyCount})`}
                                        className="group relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-background hover:bg-foreground/10 border border-card-border text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-50">
                                            Minimize Done ({readyCount})
                                        </span>
                                    </button>
                                )}

                                {totalCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setAllCardsCollapsed(!allCardsCollapsed)}
                                        title={allCardsCollapsed ? 'Maximize All' : 'Minimize All'}
                                        aria-label={allCardsCollapsed ? 'Maximize All' : 'Minimize All'}
                                        className="group relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-background hover:bg-foreground/10 border border-card-border text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        {allCardsCollapsed ? (
                                            <ChevronsUpDown className="w-3.5 h-3.5" />
                                        ) : (
                                            <ChevronsDownUp className="w-3.5 h-3.5" />
                                        )}
                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-50">
                                            {allCardsCollapsed ? 'Maximize All' : 'Minimize All'}
                                        </span>
                                    </button>
                                )}

                                {totalCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            clearBulkEditItems({ animate: true });
                                            toast.success('Cleared all items from Bulk Editor');
                                        }}
                                        disabled={isSaving}
                                        title="Clear All"
                                        aria-label="Clear All"
                                        className="group relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="pointer-events-none absolute -top-8 right-0 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-50">
                                            Clear All
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                    {totalCount === 0 && (
                        <div className="h-full min-h-[260px] rounded-2xl border-2 border-dashed border-card-border bg-background/40 flex flex-col items-center justify-center p-8 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary-glow/10 border border-primary-glow/20 text-primary-glow flex items-center justify-center">
                                <Plus className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-foreground">
                                    Bulk Editor is Empty
                                </h4>
                                <p className="text-xs text-foreground/60 max-w-xs leading-relaxed">
                                    Click <strong>Edit</strong> on any image, or select multiple items and <strong>drag & drop</strong> them into this sidebar to add them.
                                </p>
                            </div>
                        </div>
                    )}

                    {formsData.map((data, index) => {
                        const isTagsLimitExceeded = data.tags.length > MAX_TAGS;
                        const isReady = hasItemMetadata(data);
                        const isCardCollapsed = Boolean(collapsedCards[data.id]);
                        const isExiting = Boolean(exitingIds[data.id]);
                        const isSidebarSelected = selectedSidebarIds.includes(data.id);
                        const itemHints = Array.isArray(data.aiHints) ? data.aiHints : [];
                        const hasPopulatedMeta = Boolean(
                            isReady ||
                                data.aiGenerated ||
                                (Array.isArray(data.tags) && data.tags.length > 0) ||
                                (data.altText && data.altText.trim()) ||
                                (data.description && data.description.trim()) ||
                                itemHints.length > 0
                        );
                        const isHintPopupOpen = activeHintPopupId === data.id;

                        return (
                            <div
                                key={data.id}
                                style={{
                                    transition:
                                        'grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease, transform 300ms cubic-bezier(0.22, 1, 0.36, 1), margin-bottom 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                                }}
                                className={`grid ${
                                    isExiting
                                        ? 'grid-rows-[0fr] opacity-0 scale-95 -translate-x-4 mb-0 pointer-events-none'
                                        : 'grid-rows-[1fr] opacity-100 scale-100 translate-x-0 mb-4 last:mb-0'
                                }`}
                            >
                                <div className="overflow-hidden min-h-0">
                                    <div
                                        className={`bg-background border rounded-xl transition-all duration-200 shadow-sm overflow-hidden ${
                                            isTagsLimitExceeded
                                                ? 'border-red-500/50'
                                                : isSidebarSelected
                                                ? 'border-primary-glow ring-1 ring-primary-glow/40'
                                                : isReady
                                                ? 'border-emerald-500/30'
                                                : 'border-card-border'
                                        }`}
                                    >
                                        {/* Item Card Header Bar (Click or Button to Minimize/Maximize Card) */}
                                        <div
                                            onClick={() => toggleCardCollapse(data.id)}
                                            className="px-4 py-3 bg-card-bg/60 hover:bg-card-bg flex items-center justify-between gap-3 cursor-pointer select-none border-b border-transparent data-[expanded=true]:border-card-border/70 transition-colors"
                                            data-expanded={!isCardCollapsed}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {/* Multi-select checkbox inside Bulk Editor */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSidebarItemSelect(data.id, e);
                                                    }}
                                                    title={
                                                        isSidebarSelected
                                                            ? 'Deselect item (Shift+Click for range)'
                                                            : 'Select item to clear multiple (Shift+Click for range)'
                                                    }
                                                    aria-label={isSidebarSelected ? 'Deselect item' : 'Select item'}
                                                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                                        isSidebarSelected
                                                            ? 'bg-primary-glow border-primary-glow text-white shadow-sm shadow-primary-glow/30'
                                                            : 'bg-background border-card-border hover:border-primary-glow/60 text-transparent'
                                                    }`}
                                                >
                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                </button>

                                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-foreground/10 text-foreground/70 shrink-0">
                                                    #{index + 1}
                                                </span>

                                                {/* Mini Thumbnail when Card is Minimized */}
                                                {isCardCollapsed && (
                                                    <div
                                                        className="w-9 h-9 rounded-lg border flex items-center justify-center p-1 shrink-0 overflow-hidden"
                                                        style={getPreviewStyle(data)}
                                                    >
                                                        <img
                                                            src={data.preview}
                                                            alt=""
                                                            className="max-w-full max-h-full object-contain"
                                                        />
                                                    </div>
                                                )}

                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-foreground truncate">
                                                        {data.name && data.name.trim() ? (
                                                            data.name
                                                        ) : (
                                                            <span className="text-foreground/40 italic">
                                                                Untitled image
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-foreground/50 truncate">
                                                        {data.tags.length} {data.tags.length === 1 ? 'tag' : 'tags'}
                                                        {data.altText ? ' · Alt text set' : ''}
                                                        {itemHints.length > 0
                                                            ? ` · ${itemHints.length} AI ${
                                                                  itemHints.length === 1 ? 'hint' : 'hints'
                                                              }`
                                                            : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {/* Metadata Status Pill */}
                                                {isReady ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                                        <Check className="w-3 h-3" />
                                                        Done
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                                        <Clock className="w-3 h-3" />
                                                        Needs Meta
                                                    </span>
                                                )}

                                                {/* Quick AI Auto-Fill button even when collapsed */}
                                                {isCardCollapsed && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAutoFill(data.id, data.preview);
                                                        }}
                                                        disabled={isGenerating[data.id]}
                                                        className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm disabled:opacity-50 cursor-pointer"
                                                        title={
                                                            itemHints.length > 0
                                                                ? `Retry AI with ${itemHints.length} hint(s)`
                                                                : 'Auto-fill with AI'
                                                        }
                                                    >
                                                        {isGenerating[data.id] ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Wand2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                )}

                                                {/* Card Minimize / Expand Toggle Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleCardCollapse(data.id);
                                                    }}
                                                    title={isCardCollapsed ? 'Expand item card' : 'Minimize item card'}
                                                    aria-label={isCardCollapsed ? 'Expand item card' : 'Minimize item card'}
                                                    className="p-1.5 rounded-lg bg-background/80 hover:bg-foreground/10 border border-card-border text-foreground/65 hover:text-foreground transition-colors cursor-pointer"
                                                >
                                                    {isCardCollapsed ? (
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                {/* Remove Individual Item from Bulk Editor Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeBulkEditItem(data.id, { animate: true });
                                                    }}
                                                    title="Remove this item from Bulk Editor"
                                                    aria-label="Remove item from Bulk Editor"
                                                    className="p-1.5 rounded-lg bg-background/80 hover:bg-rose-500/15 border border-card-border hover:border-rose-500/30 text-foreground/55 hover:text-rose-400 transition-colors cursor-pointer"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                {/* Smooth Collapsible Card Body */}
                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${
                                        isCardCollapsed
                                            ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
                                            : 'grid-rows-[1fr] opacity-100'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="p-5 space-y-5">
                                            {/* Image Preview Area with Mode Toggle, AI Autofill & Lightbulb Hints */}
                                            <div className="flex flex-col items-center mb-4">
                                                <div className="relative">
                                                    <div
                                                        className="w-36 h-36 rounded-xl border flex items-center justify-center p-3 relative overflow-hidden transition-all duration-200 shadow-md"
                                                        style={getPreviewStyle(data)}
                                                    >
                                                        <img
                                                            src={data.preview}
                                                            alt=""
                                                            className="max-w-full max-h-full object-contain select-none"
                                                        />
                                                    </div>

                                                    {/* Theme Mode Toggle (Top-Left of Preview Box) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => cyclePreviewMode(data.id, data.previewMode)}
                                                        className="absolute -left-2 -top-2 bg-card-bg/95 hover:bg-card-bg border border-card-border text-foreground p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                                                        title={`Current preview: ${data.previewMode} mode. Click to switch.`}
                                                    >
                                                        {data.previewMode === 'dark' ? (
                                                            <Moon className="w-3.5 h-3.5 text-blue-400" />
                                                        ) : data.previewMode === 'light' ? (
                                                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                                                        ) : (
                                                            <Grid className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </button>

                                                    {/* AI Auto-Fill Button (Top-Right of Preview Box) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAutoFill(data.id, data.preview)}
                                                        disabled={isGenerating[data.id]}
                                                        className="group absolute -right-2 -top-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-2 rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                        title={
                                                            itemHints.length > 0
                                                                ? `Retry AI with ${itemHints.length} hint(s)`
                                                                : 'Auto-fill with AI'
                                                        }
                                                    >
                                                        {isGenerating[data.id] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Wand2 className="w-4 h-4" />
                                                        )}
                                                    </button>

                                                    {/* Lightbulb AI Hints Button (Bottom-Right of Preview Box — appears after initial metadata populates) */}
                                                    {hasPopulatedMeta && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setActiveHintPopupId((prev) =>
                                                                    prev === data.id ? null : data.id
                                                                )
                                                            }
                                                            title={
                                                                itemHints.length > 0
                                                                    ? `AI Hints (${itemHints.length}) — Click to edit hints`
                                                                    : 'Give AI hints if metadata is inaccurate'
                                                            }
                                                            aria-label="AI Hints"
                                                            className={`group absolute -right-2 -bottom-2 p-2 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center cursor-pointer animate-in zoom-in-90 fade-in duration-200 ${
                                                                isHintPopupOpen || itemHints.length > 0
                                                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-300/60'
                                                                    : 'bg-card-bg/95 hover:bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-black/30'
                                                            }`}
                                                        >
                                                            <Lightbulb className="w-4 h-4" />
                                                            {itemHints.length > 0 && (
                                                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-slate-950 text-amber-400 border border-amber-400/60 text-[9px] font-extrabold flex items-center justify-center">
                                                                    {itemHints.length}
                                                                </span>
                                                            )}
                                                            <span className="pointer-events-none absolute -bottom-8 right-0 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-30">
                                                                {itemHints.length > 0
                                                                    ? `AI Hints (${itemHints.length})`
                                                                    : 'Add AI Hints'}
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Mode Indicator & Quick Switch Pills */}
                                                <div className="flex items-center gap-1.5 mt-2.5">
                                                    <span className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider mr-1">
                                                        Preview:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInputChange(data.id, 'previewMode', 'dark')}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                                            data.previewMode === 'dark'
                                                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                                                : 'bg-card-bg text-foreground/60 border-card-border hover:text-foreground'
                                                        }`}
                                                    >
                                                        <Moon className="w-2.5 h-2.5" /> Dark
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInputChange(data.id, 'previewMode', 'light')}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                                            data.previewMode === 'light'
                                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                                : 'bg-card-bg text-foreground/60 border-card-border hover:text-foreground'
                                                        }`}
                                                    >
                                                        <Sun className="w-2.5 h-2.5" /> Light
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInputChange(data.id, 'previewMode', 'checker')}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                                            data.previewMode === 'checker'
                                                                ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                                                                : 'bg-card-bg text-foreground/60 border-card-border hover:text-foreground'
                                                        }`}
                                                    >
                                                        <Grid className="w-2.5 h-2.5" /> Grid
                                                    </button>
                                                </div>

                                                {/* Small Popup Input Box for AI Context Hints (when Lightbulb is clicked) */}
                                                {isHintPopupOpen && (
                                                    <div className="w-full mt-3.5 p-3.5 rounded-xl bg-card-bg border border-amber-500/40 shadow-xl shadow-amber-500/5 space-y-2.5 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                                                                    <Lightbulb className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                                        <span>AI Context Hints</span>
                                                                        {itemHints.length > 0 && (
                                                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                                                                                {itemHints.length}
                                                                            </span>
                                                                        )}
                                                                    </h5>
                                                                    <p className="text-[11px] text-foreground/60">
                                                                        Enter hint tags (e.g.{' '}
                                                                        <span className="text-amber-400/90 font-mono">
                                                                            quora logo
                                                                        </span>
                                                                        ), then click the AI wand to retry.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveHintPopupId(null)}
                                                                title="Close hints popup"
                                                                className="p-1 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Tag-style Input Box for Hints */}
                                                        <div className="w-full bg-background border border-amber-500/30 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40 rounded-lg p-2.5 flex flex-wrap gap-1.5 items-center min-h-[40px] transition-all">
                                                            {itemHints.map((hint) => (
                                                                <span
                                                                    key={hint}
                                                                    className="bg-amber-500/15 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/30"
                                                                >
                                                                    <span>{hint}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeHint(data.id, hint)}
                                                                        className="hover:text-white transition-colors cursor-pointer"
                                                                        title={`Remove hint "${hint}"`}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                            <input
                                                                type="text"
                                                                value={hintInputs[data.id] || ''}
                                                                onChange={(e) =>
                                                                    setHintInputs((prev) => ({
                                                                        ...prev,
                                                                        [data.id]: e.target.value,
                                                                    }))
                                                                }
                                                                onKeyDown={(e) => handleHintKeyDown(data.id, e)}
                                                                onBlur={() => {
                                                                    if ((hintInputs[data.id] || '').trim()) {
                                                                        commitHintInput(data.id);
                                                                    }
                                                                }}
                                                                onPaste={(e) => {
                                                                    e.preventDefault();
                                                                    const pasted = e.clipboardData.getData('text');
                                                                    if (pasted) {
                                                                        commitHintInput(data.id, pasted);
                                                                    }
                                                                }}
                                                                placeholder={
                                                                    itemHints.length === 0
                                                                        ? "Type hint & press Enter (e.g. quora logo)..."
                                                                        : 'Add another hint...'
                                                                }
                                                                className="bg-transparent text-foreground text-xs focus:outline-none flex-1 min-w-[120px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Conditional Contrast Warning & Background Customizer */}
                                            {data.luminance === 'dark' && (
                                                <div className="bg-card-bg border border-card-border rounded-xl p-4 space-y-3 shadow-sm animate-in fade-in duration-200">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400">
                                                            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                                            <span>Dark Graphic Contrast Alert</span>
                                                        </div>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 shrink-0">
                                                            Dark Mode Issue
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-foreground/70 leading-relaxed">
                                                        This image is dark/black and will blend into Dark Mode. Choose a contrast background for Dark Mode:
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {FIXED_DARK_PRESETS.map((preset) => {
                                                            const isSelected =
                                                                (data.contrastBgDark || '#f8fafc').toLowerCase() ===
                                                                preset.color.toLowerCase();
                                                            return (
                                                                <button
                                                                    key={preset.color}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleInputChange(data.id, 'contrastBgDark', preset.color);
                                                                        handleInputChange(data.id, 'previewMode', 'dark');
                                                                        if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                        isSelected
                                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                                        style={{ backgroundColor: preset.color }}
                                                                    />
                                                                    <span>{preset.name}</span>
                                                                </button>
                                                            );
                                                        })}

                                                        {customDarkTemplates.map((customTmpl) => {
                                                            const isSelected =
                                                                (data.contrastBgDark || '').toLowerCase() ===
                                                                customTmpl.color.toLowerCase();
                                                            return (
                                                                <div
                                                                    key={customTmpl.color}
                                                                    className={`flex items-center rounded-lg border text-xs font-medium transition-all ${
                                                                        isSelected
                                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleInputChange(data.id, 'contrastBgDark', customTmpl.color);
                                                                            handleInputChange(data.id, 'previewMode', 'dark');
                                                                            if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                                        }}
                                                                        className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 cursor-pointer"
                                                                        title={`${customTmpl.name} (${customTmpl.color.toUpperCase()})`}
                                                                    >
                                                                        <span
                                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                                            style={{ backgroundColor: customTmpl.color }}
                                                                        />
                                                                        <span className="truncate max-w-[90px]">{customTmpl.name}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCustomTemplate('dark', customTmpl.color);
                                                                        }}
                                                                        className="pr-2 pl-1 py-1.5 text-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                                                                        title={`Delete custom template "${customTmpl.name}"`}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}

                                                        {(() => {
                                                            const isFixed = FIXED_DARK_PRESETS.some(
                                                                (p) => p.color.toLowerCase() === (data.contrastBgDark || '').toLowerCase()
                                                            );
                                                            const isSavedCustom = customDarkTemplates.some(
                                                                (c) => c.color.toLowerCase() === (data.contrastBgDark || '').toLowerCase()
                                                            );
                                                            const isCustomActive = Boolean(
                                                                data.contrastBgDark &&
                                                                    data.contrastBgDark !== 'none' &&
                                                                    !isFixed &&
                                                                    !isSavedCustom
                                                            );
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setActiveColorPicker((prev) =>
                                                                            prev?.id === data.id && prev?.type === 'dark'
                                                                                ? null
                                                                                : { id: data.id, type: 'dark' }
                                                                        )
                                                                    }
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                        isCustomActive
                                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                                    }`}
                                                                    title="Pick custom color with color picker"
                                                                >
                                                                    <Palette className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                                    <span>Custom</span>
                                                                    {isCustomActive && (
                                                                        <span
                                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                                            style={{ backgroundColor: data.contrastBgDark }}
                                                                        />
                                                                    )}
                                                                </button>
                                                            );
                                                        })()}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleInputChange(data.id, 'contrastBgDark', 'none');
                                                                handleInputChange(data.id, 'previewMode', 'dark');
                                                                if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                            }}
                                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                data.contrastBgDark === 'none'
                                                                    ? 'border-red-500 bg-red-500/15 text-red-500 dark:text-red-300 ring-1 ring-red-500 font-bold'
                                                                    : 'border-card-border bg-background text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                                            }`}
                                                            title="Do not apply contrast background (keep standard dark card)"
                                                        >
                                                            None (Standard Dark)
                                                        </button>
                                                    </div>

                                                    {activeColorPicker?.id === data.id && activeColorPicker?.type === 'dark' && (
                                                        <div className="p-3.5 bg-background border border-card-border rounded-xl shadow-md flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="text-xs font-bold text-foreground">
                                                                    Custom Dark Mode Background
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveColorPicker(null)}
                                                                    className="text-foreground/50 hover:text-foreground text-xs p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            <HexColorPicker
                                                                color={
                                                                    data.contrastBgDark && data.contrastBgDark !== 'none'
                                                                        ? data.contrastBgDark
                                                                        : '#f8fafc'
                                                                }
                                                                onChange={(newColor) => {
                                                                    handleInputChange(data.id, 'contrastBgDark', newColor);
                                                                    handleInputChange(data.id, 'previewMode', 'dark');
                                                                }}
                                                            />

                                                            <div className="flex items-center gap-2 w-full max-w-[240px]">
                                                                <span
                                                                    className="w-7 h-7 rounded-lg border border-card-border shrink-0 shadow-sm"
                                                                    style={{
                                                                        backgroundColor:
                                                                            data.contrastBgDark && data.contrastBgDark !== 'none'
                                                                                ? data.contrastBgDark
                                                                                : '#f8fafc',
                                                                    }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={(data.contrastBgDark && data.contrastBgDark !== 'none'
                                                                        ? data.contrastBgDark
                                                                        : '#f8fafc'
                                                                    ).toUpperCase()}
                                                                    onChange={(e) => {
                                                                        let val = e.target.value;
                                                                        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                                        handleInputChange(data.id, 'contrastBgDark', val);
                                                                        handleInputChange(data.id, 'previewMode', 'dark');
                                                                    }}
                                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:border-primary-glow text-center font-bold"
                                                                    placeholder="#HEX"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveColorPicker(null)}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-primary-glow text-white text-xs font-bold hover:bg-primary-glow/90 shrink-0 cursor-pointer"
                                                                >
                                                                    Done
                                                                </button>
                                                            </div>

                                                            {(() => {
                                                                const currentColor = (
                                                                    data.contrastBgDark && data.contrastBgDark !== 'none'
                                                                        ? data.contrastBgDark
                                                                        : '#f8fafc'
                                                                ).toLowerCase();
                                                                const isAlreadySaved = customDarkTemplates.some(
                                                                    (c) => c.color.toLowerCase() === currentColor
                                                                );
                                                                const isMaxReached = customDarkTemplates.length >= 3;
                                                                const inputKey = `${data.id}_dark`;
                                                                const currentNameInput = templateNameInput[inputKey] || '';

                                                                return (
                                                                    <div className="w-full pt-2.5 border-t border-card-border flex flex-col gap-2">
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="text-[11px] text-foreground/60">
                                                                                Custom Templates:{' '}
                                                                                <strong className="text-foreground">
                                                                                    {customDarkTemplates.length}/3
                                                                                </strong>
                                                                            </span>
                                                                            {isAlreadySaved ? (
                                                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                                                                                    <Check className="w-3.5 h-3.5" /> Saved as template
                                                                                </span>
                                                                            ) : isMaxReached ? (
                                                                                <span
                                                                                    className="text-[11px] text-amber-500 font-medium"
                                                                                    title="Delete an existing custom template to add a new one"
                                                                                >
                                                                                    Max 3 reached (delete one first)
                                                                                </span>
                                                                            ) : null}
                                                                        </div>

                                                                        {!isAlreadySaved && !isMaxReached && (
                                                                            <div className="flex items-center gap-2 w-full">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Template name (e.g. Pure White)"
                                                                                    value={currentNameInput}
                                                                                    maxLength={24}
                                                                                    onChange={(e) =>
                                                                                        setTemplateNameInput((prev) => ({
                                                                                            ...prev,
                                                                                            [inputKey]: e.target.value,
                                                                                        }))
                                                                                    }
                                                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary-glow font-medium"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isSavingTemplate}
                                                                                    onClick={() => {
                                                                                        handleAddCustomTemplate(
                                                                                            'dark',
                                                                                            currentColor,
                                                                                            currentNameInput
                                                                                        );
                                                                                        setTemplateNameInput((prev) => ({
                                                                                            ...prev,
                                                                                            [inputKey]: '',
                                                                                        }));
                                                                                    }}
                                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                                                                >
                                                                                    {isSavingTemplate ? (
                                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                    ) : (
                                                                                        <Plus className="w-3.5 h-3.5" />
                                                                                    )}
                                                                                    <span>Save</span>
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {data.luminance === 'light' && (
                                                <div className="bg-card-bg border border-card-border rounded-xl p-4 space-y-3 shadow-sm animate-in fade-in duration-200">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 dark:text-blue-400">
                                                            <AlertTriangle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                                                            <span>Light Graphic Contrast Alert</span>
                                                        </div>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 shrink-0">
                                                            Light Mode Issue
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-foreground/70 leading-relaxed">
                                                        This image is white/light and will blend into Light Mode. Choose a contrast background for Light Mode:
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {FIXED_LIGHT_PRESETS.map((preset) => {
                                                            const isSelected =
                                                                (data.contrastBgLight || '#cbd5e1').toLowerCase() ===
                                                                preset.color.toLowerCase();
                                                            return (
                                                                <button
                                                                    key={preset.color}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleInputChange(data.id, 'contrastBgLight', preset.color);
                                                                        handleInputChange(data.id, 'previewMode', 'light');
                                                                        if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                        isSelected
                                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                                        style={{ backgroundColor: preset.color }}
                                                                    />
                                                                    <span>{preset.name}</span>
                                                                </button>
                                                            );
                                                        })}

                                                        {customLightTemplates.map((customTmpl) => {
                                                            const isSelected =
                                                                (data.contrastBgLight || '').toLowerCase() ===
                                                                customTmpl.color.toLowerCase();
                                                            return (
                                                                <div
                                                                    key={customTmpl.color}
                                                                    className={`flex items-center rounded-lg border text-xs font-medium transition-all ${
                                                                        isSelected
                                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                                    }`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleInputChange(data.id, 'contrastBgLight', customTmpl.color);
                                                                            handleInputChange(data.id, 'previewMode', 'light');
                                                                            if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                                        }}
                                                                        className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 cursor-pointer"
                                                                        title={`${customTmpl.name} (${customTmpl.color.toUpperCase()})`}
                                                                    >
                                                                        <span
                                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                                            style={{ backgroundColor: customTmpl.color }}
                                                                        />
                                                                        <span className="truncate max-w-[90px]">{customTmpl.name}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCustomTemplate('light', customTmpl.color);
                                                                        }}
                                                                        className="pr-2 pl-1 py-1.5 text-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                                                                        title={`Delete custom template "${customTmpl.name}"`}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}

                                                        {(() => {
                                                            const isFixed = FIXED_LIGHT_PRESETS.some(
                                                                (p) => p.color.toLowerCase() === (data.contrastBgLight || '').toLowerCase()
                                                            );
                                                            const isSavedCustom = customLightTemplates.some(
                                                                (c) => c.color.toLowerCase() === (data.contrastBgLight || '').toLowerCase()
                                                            );
                                                            const isCustomActive = Boolean(
                                                                data.contrastBgLight &&
                                                                    data.contrastBgLight !== 'none' &&
                                                                    !isFixed &&
                                                                    !isSavedCustom
                                                            );
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setActiveColorPicker((prev) =>
                                                                            prev?.id === data.id && prev?.type === 'light'
                                                                                ? null
                                                                                : { id: data.id, type: 'light' }
                                                                        )
                                                                    }
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                        isCustomActive
                                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                                    }`}
                                                                    title="Pick custom color with color picker"
                                                                >
                                                                    <Palette className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                                    <span>Custom</span>
                                                                    {isCustomActive && (
                                                                        <span
                                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                                            style={{ backgroundColor: data.contrastBgLight }}
                                                                        />
                                                                    )}
                                                                </button>
                                                            );
                                                        })()}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleInputChange(data.id, 'contrastBgLight', 'none');
                                                                handleInputChange(data.id, 'previewMode', 'light');
                                                                if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                            }}
                                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                data.contrastBgLight === 'none'
                                                                    ? 'border-red-500 bg-red-500/15 text-red-500 dark:text-red-300 ring-1 ring-red-500 font-bold'
                                                                    : 'border-card-border bg-background text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                                            }`}
                                                            title="Do not apply contrast background (keep standard light card)"
                                                        >
                                                            None (Standard Light)
                                                        </button>
                                                    </div>

                                                    {activeColorPicker?.id === data.id && activeColorPicker?.type === 'light' && (
                                                        <div className="p-3.5 bg-background border border-card-border rounded-xl shadow-md flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="text-xs font-bold text-foreground">
                                                                    Custom Light Mode Background
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveColorPicker(null)}
                                                                    className="text-foreground/50 hover:text-foreground text-xs p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            <HexColorPicker
                                                                color={
                                                                    data.contrastBgLight && data.contrastBgLight !== 'none'
                                                                        ? data.contrastBgLight
                                                                        : '#cbd5e1'
                                                                }
                                                                onChange={(newColor) => {
                                                                    handleInputChange(data.id, 'contrastBgLight', newColor);
                                                                    handleInputChange(data.id, 'previewMode', 'light');
                                                                }}
                                                            />

                                                            <div className="flex items-center gap-2 w-full max-w-[240px]">
                                                                <span
                                                                    className="w-7 h-7 rounded-lg border border-card-border shrink-0 shadow-sm"
                                                                    style={{
                                                                        backgroundColor:
                                                                            data.contrastBgLight && data.contrastBgLight !== 'none'
                                                                                ? data.contrastBgLight
                                                                                : '#cbd5e1',
                                                                    }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={(data.contrastBgLight && data.contrastBgLight !== 'none'
                                                                        ? data.contrastBgLight
                                                                        : '#cbd5e1'
                                                                    ).toUpperCase()}
                                                                    onChange={(e) => {
                                                                        let val = e.target.value;
                                                                        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                                        handleInputChange(data.id, 'contrastBgLight', val);
                                                                        handleInputChange(data.id, 'previewMode', 'light');
                                                                    }}
                                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:border-primary-glow text-center font-bold"
                                                                    placeholder="#HEX"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveColorPicker(null)}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-primary-glow text-white text-xs font-bold hover:bg-primary-glow/90 shrink-0 cursor-pointer"
                                                                >
                                                                    Done
                                                                </button>
                                                            </div>

                                                            {(() => {
                                                                const currentColor = (
                                                                    data.contrastBgLight && data.contrastBgLight !== 'none'
                                                                        ? data.contrastBgLight
                                                                        : '#cbd5e1'
                                                                ).toLowerCase();
                                                                const isAlreadySaved = customLightTemplates.some(
                                                                    (c) => c.color.toLowerCase() === currentColor
                                                                );
                                                                const isMaxReached = customLightTemplates.length >= 3;
                                                                const inputKey = `${data.id}_light`;
                                                                const currentNameInput = templateNameInput[inputKey] || '';

                                                                return (
                                                                    <div className="w-full pt-2.5 border-t border-card-border flex flex-col gap-2">
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="text-[11px] text-foreground/60">
                                                                                Custom Templates:{' '}
                                                                                <strong className="text-foreground">
                                                                                    {customLightTemplates.length}/3
                                                                                </strong>
                                                                            </span>
                                                                            {isAlreadySaved ? (
                                                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                                                                                    <Check className="w-3.5 h-3.5" /> Saved as template
                                                                                </span>
                                                                            ) : isMaxReached ? (
                                                                                <span
                                                                                    className="text-[11px] text-amber-500 font-medium"
                                                                                    title="Delete an existing custom template to add a new one"
                                                                                >
                                                                                    Max 3 reached (delete one first)
                                                                                </span>
                                                                            ) : null}
                                                                        </div>

                                                                        {!isAlreadySaved && !isMaxReached && (
                                                                            <div className="flex items-center gap-2 w-full">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Template name (e.g. Pale Slate)"
                                                                                    value={currentNameInput}
                                                                                    maxLength={24}
                                                                                    onChange={(e) =>
                                                                                        setTemplateNameInput((prev) => ({
                                                                                            ...prev,
                                                                                            [inputKey]: e.target.value,
                                                                                        }))
                                                                                    }
                                                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary-glow font-medium"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isSavingTemplate}
                                                                                    onClick={() => {
                                                                                        handleAddCustomTemplate(
                                                                                            'light',
                                                                                            currentColor,
                                                                                            currentNameInput
                                                                                        );
                                                                                        setTemplateNameInput((prev) => ({
                                                                                            ...prev,
                                                                                            [inputKey]: '',
                                                                                        }));
                                                                                    }}
                                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                                                                >
                                                                                    {isSavingTemplate ? (
                                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                    ) : (
                                                                                        <Plus className="w-3.5 h-3.5" />
                                                                                    )}
                                                                                    <span>Save</span>
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Title and Alt Text */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                                                        Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={data.name}
                                                        onChange={(e) => handleInputChange(data.id, 'name', e.target.value)}
                                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all text-sm font-medium"
                                                        placeholder="Image title"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                                                        Alt Text
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={data.altText}
                                                        onChange={(e) => handleInputChange(data.id, 'altText', e.target.value)}
                                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all text-sm"
                                                        placeholder="Describe image for accessibility"
                                                    />
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={data.description}
                                                    onChange={(e) => handleInputChange(data.id, 'description', e.target.value)}
                                                    rows={2}
                                                    className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all text-sm resize-none"
                                                    placeholder="Detailed description..."
                                                />
                                            </div>

                                            {/* Tags */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider">
                                                        Tags
                                                    </label>
                                                    <span
                                                        className={`text-xs font-medium ${
                                                            isTagsLimitExceeded ? 'text-red-500' : 'text-foreground/40'
                                                        }`}
                                                    >
                                                        {data.tags.length}/{MAX_TAGS}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`w-full bg-card-bg border ${
                                                        isTagsLimitExceeded
                                                            ? 'border-red-500/50 ring-1 ring-red-500/20'
                                                            : 'border-card-border'
                                                    } rounded-lg p-3 flex flex-wrap gap-2 items-center min-h-[42px] transition-all`}
                                                >
                                                    {data.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="bg-primary-glow/20 text-primary-glow text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-primary-glow/20"
                                                        >
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTag(data.id, tag)}
                                                                className="hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                    className="w-3 h-3"
                                                                >
                                                                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                                                </svg>
                                                            </button>
                                                        </span>
                                                    ))}
                                                    <input
                                                        type="text"
                                                        value={tagInputs[data.id] || ''}
                                                        onChange={(e) => handleTagInput(data.id, e.target.value)}
                                                        onKeyDown={(e) => handleTagKeyDown(data.id, e)}
                                                        onPaste={(e) => {
                                                            e.preventDefault();
                                                            const pastedText = e.clipboardData.getData('text');
                                                            const newTags = pastedText
                                                                .split(',')
                                                                .map((t) => t.trim())
                                                                .filter((t) => t.length > 0);

                                                            if (newTags.length > 0) {
                                                                setFormsData((prev) =>
                                                                    prev.map((item) => {
                                                                        if (item.id === data.id) {
                                                                            const uniqueNewTags = newTags.filter(
                                                                                (t) => !item.tags.includes(t)
                                                                            );
                                                                            return {
                                                                                ...item,
                                                                                tags: [...item.tags, ...uniqueNewTags],
                                                                            };
                                                                        }
                                                                        return item;
                                                                    })
                                                                );
                                                            }
                                                        }}
                                                        placeholder={data.tags.length === 0 ? 'Add tags...' : ''}
                                                        className="bg-transparent text-foreground text-sm focus:outline-none flex-1 min-w-[60px]"
                                                    />
                                                </div>
                                                {isTagsLimitExceeded && (
                                                    <p className="text-red-500 text-xs mt-1.5 font-medium">
                                                        Limit exceeded. Please remove {data.tags.length - MAX_TAGS} tag(s).
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Action Footer + Save Progress Bar */}
                <div className="p-5 sm:p-6 border-t border-card-border bg-card-bg/95 backdrop-blur-sm space-y-3.5">
                    {hasValidationErrors && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-5 h-5 flex-shrink-0"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Maximum {MAX_TAGS} tags allowed per image.
                        </div>
                    )}

                    {/* Live Save Progress Bar */}
                    {(isSaving || saveProgress.active) && (
                        <div className="p-3.5 rounded-xl bg-background border border-card-border space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    {saveProgress.completed < saveProgress.total ? (
                                        <Loader2 className="w-4 h-4 text-primary-glow animate-spin shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    )}
                                    <span className="font-bold text-foreground truncate">
                                        {saveProgress.completed < saveProgress.total
                                            ? `Saving: ${saveProgress.currentName}`
                                            : 'All changes saved!'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                                    <span className="text-foreground/60 font-medium">
                                        {saveProgress.completed} / {saveProgress.total}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-primary-glow/15 text-primary-glow font-mono font-bold text-[11px]">
                                        {savePercent}%
                                    </span>
                                </div>
                            </div>

                            <div className="w-full h-2.5 bg-card-bg border border-card-border rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 via-primary-glow to-emerald-500 transition-all duration-200 ease-out rounded-full"
                                    style={{ width: `${savePercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={hasValidationErrors || isSaving || formsData.length === 0}
                        className="w-full py-4 px-8 bg-primary-glow hover:bg-primary-glow/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>
                            {isSaving
                                ? `SAVING CHANGES (${saveProgress.completed}/${saveProgress.total})...`
                                : `SAVE ALL CHANGES (${formsData.length})`}
                        </span>
                    </button>
                </div>
            </aside>

            {/* Minimized Persistent Dock (also acts as Drag-and-Drop target when minimized or closed) */}
            <div
                data-bulk-dropzone="dock"
                aria-hidden={!showMinimized}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!isDragOverDock) setIsDragOverDock(true);
                }}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragOverDock(true);
                }}
                onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsDragOverDock(false);
                    }
                }}
                onDrop={(e) => handleDropItems(e, { keepMinimized: isMinimized })}
                style={{
                    bottom: uploadTrackerVisible ? '116px' : '20px',
                    transition:
                        'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, bottom 300ms ease',
                }}
                className={`fixed right-5 z-[55] select-none ${
                    showMinimized
                        ? 'translate-y-0 scale-100 opacity-100 pointer-events-auto'
                        : 'translate-y-8 scale-90 opacity-0 pointer-events-none'
                }`}
            >
                <div
                    onClick={maximizeBulkEdit}
                    role="button"
                    tabIndex={showMinimized ? 0 : -1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            maximizeBulkEdit();
                        }
                    }}
                    title="Click to maximize Bulk Editor, or drag & drop items here"
                    className={`group flex flex-col gap-2 pl-3 pr-2.5 py-2.5 rounded-2xl bg-card-bg/95 hover:bg-card-bg border shadow-2xl shadow-black/40 backdrop-blur-xl cursor-pointer transition-all hover:scale-[1.02] ${
                        isDragOverDock
                            ? 'border-primary-glow ring-4 ring-primary-glow/30 scale-105 bg-primary-glow/10'
                            : isDraggingCandidates
                            ? 'border-primary-glow/80 ring-2 ring-primary-glow/20 animate-pulse'
                            : 'border-card-border hover:border-primary-glow/50'
                    }`}
                >
                    <div className="flex items-center gap-3.5">
                        {/* Stacked Thumbnails or Plus Drop Icon */}
                        <div className="relative flex items-center -space-x-2.5 shrink-0">
                            {formsData.length > 0 ? (
                                formsData.slice(0, 3).map((item, idx) => (
                                    <div
                                        key={item.id}
                                        style={{ zIndex: 10 - idx }}
                                        className="w-10 h-10 rounded-xl bg-slate-900 border border-card-border overflow-hidden flex items-center justify-center p-1 shadow-sm"
                                    >
                                        {item.preview ? (
                                            <img
                                                src={item.preview}
                                                alt=""
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        ) : (
                                            <Pencil className="w-4 h-4 text-primary-glow" />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-primary-glow/15 border border-primary-glow/30 flex items-center justify-center text-primary-glow shadow-sm">
                                    <Plus className="w-5 h-5" />
                                </div>
                            )}
                            {(anyGenerating || isSaving) && (
                                <span className="absolute -top-1 -right-1 z-20 p-0.5 rounded-full bg-indigo-600 text-white shadow">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                </span>
                            )}
                        </div>

                        {/* Text Summary */}
                        <div className="min-w-0 pr-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                                    {isDragOverDock || isDraggingCandidates
                                        ? `Drop to Add${draggedCount > 0 ? ` (${draggedCount})` : ''} to Bulk Editor`
                                        : `Bulk Editor (${formsData.length})`}
                                </span>
                                <span className="w-2 h-2 rounded-full bg-primary-glow animate-pulse" />
                            </div>
                            <p className="text-[11px] text-foreground/60 whitespace-nowrap">
                                {isDragOverDock || isDraggingCandidates
                                    ? formsData.length > 0
                                        ? `Adds to ${formsData.length} existing ${formsData.length === 1 ? 'item' : 'items'}`
                                        : 'Release to stage in Bulk Editor'
                                    : isSaving
                                    ? `Saving ${saveProgress.completed}/${saveProgress.total} (${savePercent}%)`
                                    : anyGenerating
                                    ? 'Generating AI metadata...'
                                    : formsData.length === 0
                                    ? 'Empty · Drag & drop or click Edit to add'
                                    : `${readyCount} done · ${needsMetaCount} need metadata`}
                            </p>
                        </div>

                        {/* Clear, Maximize & Close Controls */}
                        {isOpen && (
                            <div className="flex items-center gap-1 pl-1 border-l border-card-border">
                                {formsData.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearBulkEditItems({ animate: true });
                                            toast.success('Cleared all items from Bulk Editor');
                                        }}
                                        title="Clear all items without closing"
                                        aria-label="Clear all items"
                                        className="p-1.5 rounded-lg text-foreground/55 hover:text-amber-400 hover:bg-amber-500/15 transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        maximizeBulkEdit();
                                    }}
                                    title="Maximize Bulk Editor"
                                    aria-label="Maximize Bulk Editor"
                                    className="p-1.5 rounded-lg text-primary-glow hover:bg-primary-glow/15 transition-colors cursor-pointer"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeBulkEdit();
                                    }}
                                    title="Close Bulk Editor"
                                    aria-label="Close Bulk Editor"
                                    className="p-1.5 rounded-lg text-foreground/55 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mini progress bar when saving while minimized */}
                    {isSaving && (
                        <div className="w-full h-1.5 bg-background border border-card-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-200 rounded-full"
                                style={{ width: `${savePercent}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Live Floating Cursor Drag Preview (Single Item or Stacked Multiple Items with Spring & Pendulum Physics) */}
            {isDraggingCandidates && draggedItems.length > 0 && (
                <>
                    <style>{`* { cursor: grabbing !important; user-select: none !important; }`}</style>
                    <div
                        ref={dragPreviewElRef}
                        style={{
                            transform: `translate3d(${dragCursorPosRef.current.x - 48}px, ${
                                dragCursorPosRef.current.y - 2
                            }px, 0)`,
                        }}
                        className="fixed top-0 left-0 w-24 h-24 z-[100] pointer-events-none select-none will-change-transform"
                    >
                        <div
                            ref={dragCardBodyRef}
                            style={{ transformOrigin: '50% 6%' }}
                            className="relative w-24 h-24 flex items-center justify-center will-change-transform"
                        >
                        {/* 3rd Card in Stack (when 3+ items selected) */}
                        {draggedItems.length >= 3 && (
                            <div
                                ref={dragStackBack2Ref}
                                style={{
                                    transform: 'translate3d(13px, -6px, 0) rotate(12deg) scale(0.9)',
                                }}
                                className="absolute w-20 h-20 rounded-2xl bg-slate-900/90 border border-white/20 p-2 flex items-center justify-center overflow-hidden shadow-xl backdrop-blur-md will-change-transform"
                            >
                                {(draggedItems[2]?.path ||
                                    draggedItems[2]?.preview ||
                                    draggedItems[2]?.thumbPath) && (
                                    <img
                                        src={
                                            draggedItems[2].path ||
                                            draggedItems[2].preview ||
                                            draggedItems[2].thumbPath
                                        }
                                        alt=""
                                        className="max-w-full max-h-full object-contain opacity-80"
                                    />
                                )}
                            </div>
                        )}

                        {/* 2nd Card in Stack (when 2+ items selected) */}
                        {draggedItems.length >= 2 && (
                            <div
                                ref={dragStackBack1Ref}
                                style={{
                                    transform: 'translate3d(-11px, 4px, 0) rotate(-10deg) scale(0.95)',
                                }}
                                className="absolute w-20 h-20 rounded-2xl bg-slate-900/95 border border-primary-glow/40 p-2 flex items-center justify-center overflow-hidden shadow-xl backdrop-blur-md will-change-transform"
                            >
                                {(draggedItems[1]?.path ||
                                    draggedItems[1]?.preview ||
                                    draggedItems[1]?.thumbPath) && (
                                    <img
                                        src={
                                            draggedItems[1].path ||
                                            draggedItems[1].preview ||
                                            draggedItems[1].thumbPath
                                        }
                                        alt=""
                                        className="max-w-full max-h-full object-contain opacity-90"
                                    />
                                )}
                            </div>
                        )}

                        {/* Primary Front Card */}
                        <div
                            className={`relative z-10 w-20 h-20 rounded-2xl bg-slate-900/95 border-2 p-2 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-md transition-colors duration-200 ${
                                isDragOverExpanded || isDragOverDock
                                    ? 'border-emerald-400 shadow-emerald-500/30'
                                    : 'border-primary-glow shadow-primary-glow/30'
                            }`}
                        >
                            {(draggedItems[0]?.path ||
                                draggedItems[0]?.preview ||
                                draggedItems[0]?.thumbPath) && (
                                <img
                                    src={
                                        draggedItems[0].path ||
                                        draggedItems[0].preview ||
                                        draggedItems[0].thumbPath
                                    }
                                    alt=""
                                    className="max-w-full max-h-full object-contain"
                                />
                            )}
                        </div>

                        {/* Count Badge on Top-Right of Stack */}
                        <span
                            className={`absolute -top-1 -right-1 z-20 px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white shadow-lg border-2 border-slate-950 flex items-center gap-1 transition-colors ${
                                isDragOverExpanded || isDragOverDock
                                    ? 'bg-emerald-500 shadow-emerald-500/40'
                                    : 'bg-primary-glow shadow-primary-glow/50'
                            }`}
                        >
                            {draggedItems.length > 1
                                ? `${draggedItems.length} stacked`
                                : '1 item'}
                        </span>
                    </div>

                    {/* Floating Action Label centered beneath the 96x96 stack */}
                    <div
                        className={`absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xl border backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap ${
                            isDragOverExpanded || isDragOverDock
                                ? 'bg-emerald-500/95 text-white border-emerald-300/40'
                                : 'bg-card-bg/95 text-foreground border-primary-glow/40'
                        }`}
                    >
                        <Plus className="w-3 h-3" />
                        <span>
                            {isDragOverExpanded || isDragOverDock
                                ? `Release to add ${draggedItems.length} ${
                                      draggedItems.length === 1 ? 'item' : 'items'
                                  }`
                                : 'Drop in Bulk Editor'}
                        </span>
                    </div>
                </div>
                </>
            )}
        </>
    );
}

/**
 * Legacy bridge component if rendered inline on a page.
 * Syncs with the global persistent BulkEditProvider when available.
 */
const BulkEditSidebar = ({ isOpen, onClose, selectedImages = [], onSave }) => {
    const ctx = useContext(BulkEditContext);
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        if (!ctx) return;
        if (isOpen && !prevIsOpenRef.current && selectedImages.length > 0) {
            ctx.openBulkEdit(selectedImages);
        }
        prevIsOpenRef.current = Boolean(isOpen);
    }, [ctx, isOpen, selectedImages]);

    useEffect(() => {
        if (!ctx || typeof onSave !== 'function') return;
        return ctx.subscribe((updates) => {
            onSave(updates);
            if (typeof onClose === 'function') {
                onClose();
            }
        });
    }, [ctx, onSave, onClose]);

    return null;
};

export default BulkEditSidebar;
