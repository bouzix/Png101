import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Canvas,
    FabricImage,
    Shadow,
    PencilBrush,
    Group,
    ActiveSelection,
    Point,
    util,
} from 'fabric';
import EditorToaster, { editorToast as toast } from '../components/editor/EditorToaster';
import EditorTooltipLayer from '../components/editor/EditorTooltipLayer';
import EditorConfirmDialog from '../components/editor/EditorConfirmDialog';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from '../components/editor/useAnimatedPresence';
import { usePopoverDrag } from '../components/editor/useDraggablePanel';
import { X, Save, Sparkles, GripHorizontal, AlertTriangle } from 'lucide-react';
import EditorTopBar from '../components/editor/EditorTopBar';
import EditorContextBar from '../components/editor/EditorContextBar';
import EditorLeftDrawer from '../components/editor/EditorLeftDrawer';
import EditorStage from '../components/editor/EditorStage';
import EditorHomeView from '../components/editor/EditorHomeView';
import StudioSelect from '../components/ui/StudioSelect';
import {
    CUSTOM_PROPS,
    uid,
    saveProjectToIdb,
    loadProjectFromIdb,
    listSavedProjectsFromIdb,
    getSavedProjectFromIdb,
    deleteSavedProjectFromIdb,
    renameSavedProjectInIdb,
    duplicateSavedProjectInIdb,
    captureLightweightThumbnail,
    clearProjectFromIdb,
    createElementObject,
    createTextboxLayer,
    applyFrameToImage,
    applyImageFilters,
    TEXT_PAIRINGS,
    ensureFontLoaded,
    makeCanvasBackgroundGradient,
    DEFAULT_SNAP_PREFS,
    attachSnappingGuides,
    extractPaletteFromCanvas,
    renderPageOffscreen,
    exportPagesAsZip,
    generateThumbnailDataUrl,
    normalizeFabricLayerMetadata,
    assignFreshLayerIds,
    loadImageLayer,
    DEFAULT_SHADOW_CONFIG,
    DEFAULT_GLOW_CONFIG,
    normalizeShadowConfig,
    normalizeGlowConfig,
    createShadowItem,
    createGlowItem,
    parseShadowMeta,
    parseGlowMeta,
    applyEffectsToObject,
} from '../components/editor/editorHelpers';

function analyzeLayerSelection(layersTree = [], selectedIds = []) {
    if (!selectedIds?.length) {
        return { canGroup: false, canUngroup: false };
    }
    const selectedSet = new Set(selectedIds);
    const nodeById = new Map();
    const ancestorsById = new Map();

    const walk = (list, ancestors) => {
        for (const item of list) {
            nodeById.set(item.layerId, item);
            ancestorsById.set(item.layerId, ancestors);
            if (item.children?.length) {
                walk(item.children, [...ancestors, item.layerId]);
            }
        }
    };
    walk(layersTree, []);

    const nonOverlapping = selectedIds.filter((id) => {
        const ancs = ancestorsById.get(id) || [];
        return !ancs.some((ancId) => selectedSet.has(ancId));
    });

    const canGroup = nonOverlapping.length > 1;
    const canUngroup = selectedIds.some((id) => nodeById.get(id)?.type === 'group');
    return { canGroup, canUngroup };
}

function getParentGroupOf(obj) {
    if (!obj) return null;
    if (obj.parent && obj.parent.type !== 'activeselection') return obj.parent;
    if (obj.group && obj.group.type !== 'activeselection') return obj.group;
    return null;
}

function dirtyObjectAndAncestors(obj) {
    if (!obj) return;
    const targets = obj.type === 'activeselection' ? obj.getObjects() || [] : [obj];
    for (const t of targets) {
        t.set?.('dirty', true);
        let cur = getParentGroupOf(t);
        while (cur) {
            cur.set?.('dirty', true);
            cur.setCoords?.();
            cur = getParentGroupOf(cur);
        }
    }
}

function syncGroupInteractivity(canvas, selectedObjects = []) {
    if (!canvas) return;
    const activeAncestors = new Set();
    for (const obj of selectedObjects) {
        let cur = getParentGroupOf(obj);
        while (cur) {
            if ((cur.type || '').toLowerCase() === 'group' && cur.type !== 'activeselection') {
                activeAncestors.add(cur);
            }
            cur = getParentGroupOf(cur);
        }
    }
    const walk = (collection) => {
        for (const node of collection || []) {
            if ((node.type || '').toLowerCase() === 'group' && typeof node.getObjects === 'function') {
                const shouldEnable = activeAncestors.has(node);
                if (Boolean(node.interactive) !== shouldEnable || Boolean(node.subTargetCheck) !== shouldEnable) {
                    node.set({ interactive: shouldEnable, subTargetCheck: shouldEnable });
                }
                if (shouldEnable) {
                    node.setCoords();
                }
                walk(node.getObjects());
            }
        }
    };
    walk(canvas.getObjects());
}

function serializeCanvasSafely(canvas, props = CUSTOM_PROPS) {
    if (!canvas) return null;
    const active = canvas.getActiveObject?.();
    const actives = canvas.getActiveObjects?.() || [];
    const hasNestedActiveSelection =
        active?.type === 'activeselection' && actives.some((o) => Boolean(getParentGroupOf(o)));
    if (!hasNestedActiveSelection) {
        return canvas.toObject(props);
    }
    const wasSelected = [...actives];
    canvas._discardActiveObject();
    const snap = canvas.toObject(props);
    if (wasSelected.length > 1) {
        canvas._setActiveObject(new ActiveSelection(wasSelected, { canvas }));
    } else if (wasSelected.length === 1) {
        canvas._setActiveObject(wasSelected[0]);
    }
    return snap;
}

function selectObjectsOnCanvas(canvas, objs = []) {
    if (!canvas) return;
    const valid = (objs || []).filter(Boolean);
    canvas.discardActiveObject();
    syncGroupInteractivity(canvas, valid);
    if (valid.length > 1) {
        canvas.setActiveObject(new ActiveSelection(valid, { canvas }));
    } else if (valid.length === 1) {
        canvas.setActiveObject(valid[0]);
    }
    syncGroupInteractivity(canvas, valid);
    canvas.renderAll();
}

const EMPTY_PAGE = (w = 1080, h = 1080, transparent = true) => ({
    id: uid('page'),
    name: 'Page 1',
    width: w,
    height: h,
    presetLabel: `${w}×${h}`,
    background: transparent ? null : '#ffffff',
    bgMeta: {
        mode: transparent ? 'transparent' : 'solid',
        color: '#ffffff',
        gradientType: 'linear',
        gradientAngle: 135,
        gradientFrom: '#1d4ed8',
        gradientTo: '#7c3aed',
    },
    fabricJson: { version: '6.0.0', objects: [], ...(transparent ? {} : { background: '#ffffff' }) },
});

export default function ImageEditor({
    editorSettings = {},
    templateCategories = [],
    allTemplateCategories = [],
    canvasPresets = [],
    fonts = [],
    catalogCategories = [],
    catalogCollections = [],
    initialAsset = null,
    initialTemplate = null,
    adminTemplateMode = null,
    adminTemplate = null,
    collectionHeroMode = null,
    canManageEditor = false,
    auth = null,
    seo = {},
}) {
    const isStaffAuthenticated =
        Boolean(auth?.authenticated) && (auth?.role === 'super_admin' || auth?.role === 'team_member');
    const canPublishTemplate = Boolean(canManageEditor && isStaffAuthenticated);
    const defaultW = Number(collectionHeroMode?.width || editorSettings.defaultWidth) || 1080;
    const defaultH = Number(collectionHeroMode?.height || editorSettings.defaultHeight) || 1080;
    const defaultTrans = collectionHeroMode ? true : editorSettings.defaultTransparentBg !== false;
    const maxWidth = Number(editorSettings.maxCanvasWidth) || 4096;
    const maxHeight = Number(editorSettings.maxCanvasHeight) || 4096;
    const maxPages = Number(editorSettings.maxPagesPerProject) || 12;

    const canvasElRef = useRef(null);
    const fabricRef = useRef(null);
    const viewportRef = useRef(null);
    const isRestoringRef = useRef(false);
    const logicalWRef = useRef(defaultW);
    const logicalHRef = useRef(defaultH);
    const autosaveTimerRef = useRef(null);
    const pendingOpenRef = useRef(null);

    const initialProjectQueryId =
        typeof window !== 'undefined' && !collectionHeroMode
            ? new URLSearchParams(window.location.search).get('project')?.trim() || null
            : null;

    const [isProjectOpen, setIsProjectOpen] = useState(() =>
        Boolean(initialTemplate || initialAsset || adminTemplateMode || collectionHeroMode || initialProjectQueryId)
    );
    const [activeProjectId, setActiveProjectId] = useState(() => initialProjectQueryId || uid('proj'));
    const activeProjectIdRef = useRef(activeProjectId);
    const [savedProjects, setSavedProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);

    const [projectTitle, setProjectTitle] = useState(
        collectionHeroMode
            ? `${collectionHeroMode.collectionName || 'Collection'} Hero Cover`
            : adminTemplate?.title || initialTemplate?.title || initialAsset?.name || 'Untitled Design'
    );
    const [pages, setPages] = useState(() => [EMPTY_PAGE(defaultW, defaultH, defaultTrans)]);
    const [activePageIdx, setActivePageIdx] = useState(0);
    const [canvasWidth, setCanvasWidth] = useState(defaultW);
    const [canvasHeight, setCanvasHeight] = useState(defaultH);
    const [bgMeta, setBgMeta] = useState(() => EMPTY_PAGE(defaultW, defaultH, defaultTrans).bgMeta);

    const [zoom, setZoom] = useState(0.6);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [activeTool, setActiveTool] = useState('select');
    const [activeTab, setActiveTab] = useState(initialTemplate || adminTemplate ? 'templates' : 'assets');
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [showGrid, setShowGrid] = useState(false);
    const [showSafeMargins, setShowSafeMargins] = useState(false);
    const [snapGuides, setSnapGuides] = useState([]);
    const [snapPrefs, setSnapPrefs] = useState(() => {
        try {
            const raw = window.localStorage?.getItem('png101:editor:snapPrefs:v1');
            if (raw) return { ...DEFAULT_SNAP_PREFS, ...JSON.parse(raw) };
        } catch {
            // ignore storage errors
        }
        return { ...DEFAULT_SNAP_PREFS };
    });
    const snapPrefsRef = useRef(snapPrefs);
    useEffect(() => {
        snapPrefsRef.current = snapPrefs;
        try {
            window.localStorage?.setItem('png101:editor:snapPrefs:v1', JSON.stringify(snapPrefs));
        } catch {
            // ignore storage errors
        }
    }, [snapPrefs]);

    const handleToggleSnapPref = useCallback((key) => {
        setSnapPrefs((prev) => {
            if (key === 'enabled') {
                return { ...prev, enabled: !prev.enabled };
            }
            const nextVal = !prev[key];
            return {
                ...prev,
                enabled: nextVal ? true : prev.enabled,
                [key]: nextVal,
            };
        });
    }, []);

    const handleUpdateSnapPrefs = useCallback((patch) => {
        setSnapPrefs((prev) => ({ ...prev, ...patch }));
    }, []);

    const [selectedObject, setSelectedObject] = useState(null);
    const [selectionMeta, setSelectionMeta] = useState(null);
    const [selectionBounds, setSelectionBounds] = useState(null);
    const [isTransforming, setIsTransforming] = useState(false);
    const [layers, setLayers] = useState([]);
    const [layersOpen, setLayersOpen] = useState(false);
    const [activeLayerIds, setActiveLayerIds] = useState([]);
    const lastSelectedLayerIdRef = useRef(null);

    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const persistFnRef = useRef(null);

    const [uploads, setUploads] = useState([]);
    const [removingBg, setRemovingBg] = useState(false);
    const [removingUploadId, setRemovingUploadId] = useState(null);
    const [extractedPalette, setExtractedPalette] = useState([]);
    const [brushConfig, setBrushConfig] = useState({ kind: 'pencil', color: '#ffffff', width: 8, opacity: 1 });
    const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const [showSaveText, setShowSaveText] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [autosaveIntervalSec, setAutosaveIntervalSec] = useState(() => {
        try {
            const raw = window.localStorage?.getItem('png101:editor:autosaveSec:v1');
            if (raw !== null && raw !== '') {
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed >= 0) return parsed;
            }
        } catch {
            // ignore storage errors
        }
        return 30;
    });
    const saveTextTimerRef = useRef(null);
    const isDirtyRef = useRef(false);
    const isSavingRef = useRef(false);
    const latestPagesRef = useRef(pages);
    const latestTitleRef = useRef(projectTitle);
    const latestPageIdxRef = useRef(activePageIdx);
    const latestBgMetaRef = useRef(bgMeta);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        latestBgMetaRef.current = bgMeta;
    }, [bgMeta]);

    useEffect(() => {
        latestPagesRef.current = pages;
    }, [pages]);
    useEffect(() => {
        latestTitleRef.current = projectTitle;
    }, [projectTitle]);
    useEffect(() => {
        latestPageIdxRef.current = activePageIdx;
    }, [activePageIdx]);
    useEffect(() => {
        activeProjectIdRef.current = activeProjectId;
    }, [activeProjectId]);

    const syncProjectUrl = useCallback(
        (projectId) => {
            if (typeof window === 'undefined' || adminTemplateMode || collectionHeroMode) return;
            const nextUrl = projectId ? `/image-editor?project=${encodeURIComponent(projectId)}` : '/image-editor';
            if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
                window.history.replaceState(null, '', nextUrl);
            }
        },
        [adminTemplateMode, collectionHeroMode]
    );

    const refreshSavedProjects = useCallback(async () => {
        setProjectsLoading(true);
        try {
            const list = await listSavedProjectsFromIdb();
            setSavedProjects(list);
        } finally {
            setProjectsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isProjectOpen) {
            refreshSavedProjects();
        }
    }, [isProjectOpen, refreshSavedProjects]);
    useEffect(() => {
        try {
            window.localStorage?.setItem('png101:editor:autosaveSec:v1', String(autosaveIntervalSec));
        } catch {
            // ignore storage errors
        }
    }, [autosaveIntervalSec]);

    // Admin Save Template Modal
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const { rendered: adminModalRendered, visible: adminModalVisible } = useAnimatedPresence(
        Boolean(adminModalOpen && canPublishTemplate),
        295
    );
    const adminModalDrag = usePopoverDrag({ open: Boolean(adminModalOpen && canPublishTemplate) });
    const [adminSaving, setAdminSaving] = useState(false);

    // Custom Confirm / Alert Dialog state (replaces native browser alert/confirm)
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        variant: 'warning',
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
    });

    // Unsaved-edits guard prompt (Cancel / Close Without Saving / Save & Close)
    const [unsavedPrompt, setUnsavedPrompt] = useState(null);
    const [unsavedSaving, setUnsavedSaving] = useState(false);
    const unsavedPromptRef = useRef(null);
    unsavedPromptRef.current = unsavedPrompt;
    const bypassUnsavedGuardRef = useRef(false);
    const unsavedModalPresence = useAnimatedPresence(Boolean(unsavedPrompt), 240);
    const lastUnsavedPromptRef = useRef(null);
    if (unsavedPrompt) lastUnsavedPromptRef.current = unsavedPrompt;
    const clipboardRef = useRef([]);
    const clipboardPasteCountRef = useRef(0);
    const groupSelectedFnRef = useRef(null);
    const ungroupSelectedFnRef = useRef(null);
    const dialogResolveRef = useRef(null);

    const requestConfirm = useCallback(
        ({
            variant = 'warning',
            title = 'Confirm Action',
            message = '',
            confirmLabel = 'Confirm',
            cancelLabel = 'Cancel',
        }) => {
            if (dialogResolveRef.current) {
                dialogResolveRef.current(false);
                dialogResolveRef.current = null;
            }
            return new Promise((resolve) => {
                dialogResolveRef.current = resolve;
                setConfirmDialog({
                    open: true,
                    variant,
                    title,
                    message,
                    confirmLabel,
                    cancelLabel,
                });
            });
        },
        []
    );

    const closeConfirmDialog = useCallback((accepted) => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        const resolver = dialogResolveRef.current;
        dialogResolveRef.current = null;
        if (resolver) resolver(Boolean(accepted));
    }, []);

    // Route any stray browser window.alert calls inside the editor to the custom animated dialog
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const nativeAlert = window.alert;
        window.alert = (msg) => {
            requestConfirm({
                variant: 'info',
                title: 'Notice',
                message: String(msg ?? ''),
                confirmLabel: 'OK',
                cancelLabel: null,
            });
        };
        return () => {
            window.alert = nativeAlert;
            if (dialogResolveRef.current) {
                dialogResolveRef.current(false);
                dialogResolveRef.current = null;
            }
        };
    }, [requestConfirm]);

    // Disable browser default context menu across the entire image editor so only editor menus appear
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const handleDocumentContextMenu = (e) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleDocumentContextMenu);
        return () => document.removeEventListener('contextmenu', handleDocumentContextMenu);
    }, []);

    useEffect(() => {
        if (!adminModalOpen) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setAdminModalOpen(false);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [adminModalOpen]);
    const [tplForm, setTplForm] = useState({
        id: adminTemplate?.id || null,
        title: adminTemplate?.title || 'New Studio Template',
        description: adminTemplate?.description || '',
        categoryId: adminTemplate?.categoryId || (allTemplateCategories[0]?.id || templateCategories[0]?.id || ''),
        status: adminTemplate?.status || 'published',
        isFeatured: Boolean(adminTemplate?.isFeatured),
        tags: Array.isArray(adminTemplate?.tags) ? adminTemplate.tags.join(', ') : '',
    });

    // Inject active editor font stylesheet
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/editor-fonts.css';
        document.head.appendChild(link);
        return () => link.remove();
    }, []);

    // Track Studio Open
    useEffect(() => {
        fetch('/api/editor/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType: 'open' }),
        }).catch(() => {});
    }, []);

    const fitZoomToViewport = useCallback((w = logicalWRef.current, h = logicalHRef.current) => {
        const vp = viewportRef.current;
        if (!vp) return;
        const padW = Math.max(240, vp.clientWidth - 96);
        const padH = Math.max(200, vp.clientHeight - 72);
        const fitted = Math.min(padW / Math.max(1, w), padH / Math.max(1, h), 1.2);
        const clamped = Math.max(0.15, Math.min(2, Number(fitted.toFixed(2))));
        setZoom(clamped);
        setPanOffset({ x: 0, y: 0 });
    }, []);

    const syncLayersState = useCallback((canvas) => {
        if (!canvas) return;
        const mapLayer = (o, parentGroupId = null) => {
            normalizeFabricLayerMetadata(o);
            const t = (o.type || 'layer').toLowerCase();
            const isGroup = t === 'group' && typeof o.getObjects === 'function';
            const children = isGroup
                ? [...o.getObjects()].reverse().map((child) => mapLayer(child, o.layerId))
                : [];
            return {
                layerId: o.layerId,
                layerName: o.layerName || (isGroup ? 'Group' : o.type || 'Layer'),
                type: t,
                visible: o.visible !== false,
                locked: Boolean(o.lockedLayer),
                parentGroupId,
                children,
            };
        };
        const objs = canvas.getObjects() || [];
        const nextLayers = [...objs].reverse().map((o) => mapLayer(o, null));
        setLayers(nextLayers);
    }, []);

    const collectSelectionLeafObjects = useCallback((item, out = []) => {
        if (!item) return out;
        const itemType = (item.type || '').toLowerCase();
        if ((itemType === 'activeselection' || itemType === 'group') && typeof item.getObjects === 'function') {
            item.getObjects().forEach((child) => collectSelectionLeafObjects(child, out));
        } else {
            out.push(item);
        }
        return out;
    }, []);

    const readSelectionMeta = useCallback((obj) => {
        if (!obj) return null;
        const shadowConfig = parseShadowMeta(obj);
        const glowConfig = parseGlowMeta(obj);
        const objType = (obj.type || '').toLowerCase();
        const isContainer = objType === 'activeselection' || objType === 'group';
        const leafObjects = isContainer ? collectSelectionLeafObjects(obj) : [];
        const textLeafs = leafObjects.filter((ch) => (ch.type || '').toLowerCase().includes('text'));
        const multiFillFallback =
            textLeafs.find((ch) => typeof ch.fill === 'string')?.fill ||
            leafObjects.find((ch) => typeof ch.fill === 'string')?.fill;

        return {
            type: obj.type,
            layerId: obj.layerId,
            layerName: obj.layerName,
            lockedLayer: Boolean(obj.lockedLayer),
            fill: obj.fill ?? multiFillFallback,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            rx: obj.rx,
            opacity: obj.opacity ?? 1,
            globalCompositeOperation: obj.globalCompositeOperation || 'source-over',
            left: obj.left,
            top: obj.top,
            angle: obj.angle || 0,
            hasShadow: Boolean(shadowConfig.enabled),
            hasGlow: Boolean(glowConfig.enabled),
            shadowConfig,
            glowConfig,
            hasTextChildren: textLeafs.length > 0,
            textChildrenCount: textLeafs.length,
            allTextChildren: leafObjects.length > 0 && textLeafs.length === leafObjects.length,
            // Text
            text: obj.text,
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            fontWeight: obj.fontWeight,
            fontStyle: obj.fontStyle,
            underline: obj.underline,
            linethrough: obj.linethrough,
            textAlign: obj.textAlign,
            lineHeight: obj.lineHeight,
            charSpacing: obj.charSpacing,
            // Image
            filterState: obj.filterState,
            frameShape: obj.frameShape,
            stickerOutlineSize: obj.stickerOutlineSize || 0,
        };
    }, [collectSelectionLeafObjects]);

    const readSelectionBounds = useCallback((obj) => {
        if (!obj || typeof obj.getBoundingRect !== 'function') return null;
        const b = obj.getBoundingRect();
        if (!b || !Number.isFinite(b.left) || !Number.isFinite(b.top)) return null;
        return { left: b.left, top: b.top, width: b.width, height: b.height };
    }, []);

    const pushHistorySnapshot = useCallback((canvas) => {
        if (!canvas || isRestoringRef.current) return;
        const snap = serializeCanvasSafely(canvas, CUSTOM_PROPS);
        const clipped = historyRef.current.slice(0, historyIndexRef.current + 1);
        const next = [...clipped, snap].slice(-50);
        const nextIdx = next.length - 1;
        historyRef.current = next;
        historyIndexRef.current = nextIdx;
        setHistory(next);
        setHistoryIndex(nextIdx);
    }, []);

    // Sync canvas zoom dimensions whenever zoom or logical canvas size changes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        logicalWRef.current = canvasWidth;
        logicalHRef.current = canvasHeight;
        canvas.setZoom(zoom);
        canvas.setDimensions({
            width: Math.max(1, Math.round(canvasWidth * zoom)),
            height: Math.max(1, Math.round(canvasHeight * zoom)),
        });
        canvas.renderAll();
    }, [zoom, canvasWidth, canvasHeight]);

    const runCloudSave = useCallback(async (payload) => {
        if (isSavingRef.current) return false;
        isSavingRef.current = true;
        if (saveTextTimerRef.current) {
            clearTimeout(saveTextTimerRef.current);
            saveTextTimerRef.current = null;
        }
        setSaveState('saving');
        setShowSaveText(true);
        const minAnimDelay = new Promise((resolve) => setTimeout(resolve, 650));
        const [ok] = await Promise.all([saveProjectToIdb(payload), minAnimDelay]);
        isSavingRef.current = false;
        if (ok) {
            isDirtyRef.current = false;
            setHasUnsavedChanges(false);
            setSaveState('saved');
            setShowSaveText(true);
            saveTextTimerRef.current = setTimeout(() => {
                setShowSaveText(false);
                setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
            }, 2200);
        } else {
            isDirtyRef.current = true;
            setHasUnsavedChanges(true);
            setSaveState('error');
            setShowSaveText(true);
            saveTextTimerRef.current = setTimeout(() => {
                setShowSaveText(false);
            }, 3500);
        }
        return ok;
    }, []);

    // Keep current page synced inside pages state + mark design dirty for interval autosave
    const persistActivePageSnapshot = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas || isRestoringRef.current) return null;
        const json = serializeCanvasSafely(canvas, CUSTOM_PROPS);
        let updatedPages = null;
        setPages((prev) => {
            updatedPages = prev.map((p, idx) =>
                idx === activePageIdx
                    ? {
                        ...p,
                        width: canvasWidth,
                        height: canvasHeight,
                        bgMeta,
                        background: bgMeta.mode === 'solid' ? bgMeta.color : null,
                        fabricJson: json,
                    }
                    : p
            );
            latestPagesRef.current = updatedPages;
            return updatedPages;
        });

        isDirtyRef.current = true;
        setHasUnsavedChanges(true);
        return json;
    }, [activePageIdx, canvasWidth, canvasHeight, bgMeta]);

    const handleTitleChange = useCallback((nextTitle) => {
        setProjectTitle(nextTitle);
        latestTitleRef.current = nextTitle;
        isDirtyRef.current = true;
        setHasUnsavedChanges(true);
    }, []);

    const buildCurrentProjectPayload = useCallback(
        (overrideTitle) => {
            const canvas = fabricRef.current;
            const json = canvas ? serializeCanvasSafely(canvas, CUSTOM_PROPS) : null;
            const basePages = latestPagesRef.current || pages;
            const pageIdx = latestPageIdxRef.current ?? activePageIdx;
            const currentBg = latestBgMetaRef.current || bgMeta;
            const snapshotPages = json
                ? basePages.map((p, idx) =>
                    idx === pageIdx
                        ? {
                            ...p,
                            width: logicalWRef.current,
                            height: logicalHRef.current,
                            bgMeta: currentBg,
                            background: currentBg.mode === 'solid' ? currentBg.color : null,
                            fabricJson: json,
                        }
                        : p
                )
                : basePages;
            const thumbnail = canvas ? captureLightweightThumbnail(canvas) : null;
            return {
                id: activeProjectIdRef.current,
                title: overrideTitle ?? latestTitleRef.current ?? projectTitle,
                width: snapshotPages[pageIdx]?.width || logicalWRef.current,
                height: snapshotPages[pageIdx]?.height || logicalHRef.current,
                pageCount: snapshotPages.length,
                activePageIdx: pageIdx,
                pages: snapshotPages,
                thumbnail,
                updatedAt: Date.now(),
                savedAt: Date.now(),
            };
        },
        [activePageIdx, bgMeta, pages, projectTitle]
    );

    const handleManualSave = useCallback(async () => {
        if (!isProjectOpen) return;
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        await runCloudSave(buildCurrentProjectPayload());
    }, [isProjectOpen, buildCurrentProjectPayload, runCloudSave]);

    // Periodic autosave every N seconds (default 30s) ONLY when project open & dirty
    useEffect(() => {
        if (!isProjectOpen || editorSettings.enableAutosave === false || adminTemplateMode) return undefined;
        if (!autosaveIntervalSec || autosaveIntervalSec <= 0) return undefined;

        const timerId = setInterval(() => {
            if (!isDirtyRef.current || isSavingRef.current || isRestoringRef.current) return;
            runCloudSave(buildCurrentProjectPayload());
        }, autosaveIntervalSec * 1000);

        return () => clearInterval(timerId);
    }, [isProjectOpen, autosaveIntervalSec, editorSettings.enableAutosave, adminTemplateMode, buildCurrentProjectPayload, runCloudSave]);

    useEffect(() => {
        persistFnRef.current = persistActivePageSnapshot;
    }, [persistActivePageSnapshot]);

    // Load a page object cleanly into active Fabric canvas
    const loadPageIntoCanvas = useCallback(async (page, resetHistory = true) => {
        const canvas = fabricRef.current;
        if (!canvas || !page) return;
        isRestoringRef.current = true;
        try {
            const w = Number(page.width) || defaultW;
            const h = Number(page.height) || defaultH;
            logicalWRef.current = w;
            logicalHRef.current = h;
            setCanvasWidth(w);
            setCanvasHeight(h);

            const nextBgMeta = page.bgMeta || {
                mode: page.background ? 'solid' : 'transparent',
                color: page.background || '#ffffff',
                gradientType: 'linear',
                gradientAngle: 135,
                gradientFrom: '#1d4ed8',
                gradientTo: '#7c3aed',
            };
            setBgMeta(nextBgMeta);
            latestBgMetaRef.current = nextBgMeta;

            const jsonCopy = JSON.parse(JSON.stringify(page.fabricJson || { version: '6.0.0', objects: [] }));
            // Ensure objects without explicit origin default to top-left (matching template coordinates)
            const fontFamilies = new Set();
            (jsonCopy.objects || []).forEach((o) => {
                if (!o.originX) o.originX = 'left';
                if (!o.originY) o.originY = 'top';
                if (o.fontFamily) fontFamilies.add(o.fontFamily);
            });
            await Promise.all([...fontFamilies].map((f) => ensureFontLoaded(f)));

            await canvas.loadFromJSON(jsonCopy);

            // Re-apply gradient bg if bgMeta says gradient
            if (nextBgMeta.mode === 'gradient') {
                canvas.backgroundColor = makeCanvasBackgroundGradient(w, h, {
                    type: nextBgMeta.gradientType,
                    angle: nextBgMeta.gradientAngle,
                    from: nextBgMeta.gradientFrom,
                    to: nextBgMeta.gradientTo,
                });
            } else if (nextBgMeta.mode === 'solid') {
                canvas.backgroundColor = nextBgMeta.color || '#ffffff';
            } else if (page.background) {
                canvas.backgroundColor = page.background;
            } else if (!jsonCopy.background) {
                canvas.backgroundColor = null;
            }

            // Re-apply locked flags recursively & ensure groups start non-interactive
            const normalizeTree = (col) => {
                (col || []).forEach((o) => {
                    normalizeFabricLayerMetadata(o);
                    if (o.lockedLayer) {
                        o.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false });
                    }
                    if ((o.type || '').toLowerCase() === 'group' && typeof o.getObjects === 'function') {
                        normalizeTree(o.getObjects());
                    }
                });
            };
            normalizeTree(canvas.getObjects());
            syncGroupInteractivity(canvas, []);

            canvas.discardActiveObject();
            canvas.setZoom(zoom);
            canvas.setDimensions({ width: Math.round(w * zoom), height: Math.round(h * zoom) });
            canvas.renderAll();

            syncLayersState(canvas);
            setSelectedObject(null);
            setSelectionMeta(null);
            setSelectionBounds(null);
            setActiveLayerIds([]);

            if (resetHistory) {
                const initSnap = serializeCanvasSafely(canvas, CUSTOM_PROPS);
                historyRef.current = [initSnap];
                historyIndexRef.current = 0;
                setHistory([initSnap]);
                setHistoryIndex(0);
            }
            fitZoomToViewport(w, h);
        } finally {
            isRestoringRef.current = false;
        }
    }, [defaultW, defaultH, zoom, syncLayersState, fitZoomToViewport]);

    const insertAssetOnCanvas = useCallback(async (asset, dropCoords = null) => {
        const canvas = fabricRef.current;
        if (!canvas || !asset?.url) return;
        try {
            const img = await loadImageLayer(asset.url, { name: asset.name, assetId: asset.id });
            const w = logicalWRef.current;
            const h = logicalHRef.current;
            const maxDim = Math.min(w, h) * 0.52;
            const scale = Math.min(maxDim / Math.max(1, img.width || 400), maxDim / Math.max(1, img.height || 400), 1.5);
            img.set({
                scaleX: scale,
                scaleY: scale,
                left: dropCoords?.x ?? w / 2,
                top: dropCoords?.y ?? h / 2,
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();

            if (asset.id) {
                fetch('/api/editor/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventType: 'asset_insert', imageId: asset.id }),
                }).catch(() => {});
            }
        } catch {
            toast.error('Could not load PNG image onto canvas');
        }
    }, []);

    // Mount & hydrate Fabric Canvas whenever a project workspace opens
    useEffect(() => {
        if (!isProjectOpen) {
            if (fabricRef.current) {
                fabricRef.current.dispose();
                fabricRef.current = null;
            }
            return undefined;
        }
        if (!canvasElRef.current || fabricRef.current) return undefined;

        const pending = pendingOpenRef.current;
        pendingOpenRef.current = null;

        const initPage = pending?.pages?.[pending.activePageIdx || 0];
        const startW = Number(initPage?.width) || defaultW;
        const startH = Number(initPage?.height) || defaultH;

        const canvas = new Canvas(canvasElRef.current, {
            width: startW,
            height: startH,
            preserveObjectStacking: true,
            selection: true,
            backgroundColor: defaultTrans ? null : '#ffffff',
        });
        fabricRef.current = canvas;

        const updateSelection = () => {
            const active = canvas.getActiveObject();
            setSelectedObject(active || null);
            setSelectionMeta(readSelectionMeta(active));
            setSelectionBounds(readSelectionBounds(active));
            const actives = canvas.getActiveObjects() || [];
            setActiveLayerIds(actives.map((o) => o.layerId).filter(Boolean));
            syncGroupInteractivity(canvas, actives);
        };

        const handleMutation = () => {
            setIsTransforming(false);
            if (isRestoringRef.current) return;
            syncLayersState(canvas);
            updateSelection();
            pushHistorySnapshot(canvas);
            persistFnRef.current?.();
        };

        const handleTransformStart = () => setIsTransforming(true);
        const handleTransformEnd = () => {
            setIsTransforming(false);
            setSelectionBounds(readSelectionBounds(canvas.getActiveObject()));
        };

        canvas.on('selection:created', updateSelection);
        canvas.on('selection:updated', updateSelection);
        canvas.on('selection:cleared', () => {
            setIsTransforming(false);
            updateSelection();
        });
        canvas.on('object:moving', handleTransformStart);
        canvas.on('object:scaling', handleTransformStart);
        canvas.on('object:rotating', handleTransformStart);
        canvas.on('mouse:up', handleTransformEnd);
        canvas.on('object:added', handleMutation);
        canvas.on('object:modified', handleMutation);
        canvas.on('object:removed', handleMutation);
        canvas.on('text:changed', () => {
            updateSelection();
            persistFnRef.current?.();
        });

        const detachSnap = attachSnappingGuides(canvas, logicalWRef, logicalHRef, setSnapGuides, snapPrefsRef);

        // Hydrate document
        (async () => {
            if (pending && Array.isArray(pending.pages) && pending.pages.length > 0) {
                const idx = Math.min(pending.activePageIdx || 0, pending.pages.length - 1);
                await loadPageIntoCanvas(pending.pages[idx], true);
                isDirtyRef.current = false;
                setHasUnsavedChanges(false);
                setSaveState('idle');
                setShowSaveText(false);
                if (pending.saveImmediately && !adminTemplateMode) {
                    await saveProjectToIdb(buildCurrentProjectPayload(pending.title));
                }
            } else if (adminTemplate && Array.isArray(adminTemplate.pagesJson) && adminTemplate.pagesJson.length > 0) {
                setPages(adminTemplate.pagesJson);
                setActivePageIdx(0);
                await loadPageIntoCanvas(adminTemplate.pagesJson[0], true);
            } else if (adminTemplateMode === 'new' || collectionHeroMode) {
                const blank = EMPTY_PAGE(defaultW, defaultH, defaultTrans);
                if (collectionHeroMode) {
                    blank.presetLabel = `Hero Cover (${defaultW}×${defaultH})`;
                }
                setPages([blank]);
                await loadPageIntoCanvas(blank, true);
            } else if (initialTemplate && Array.isArray(initialTemplate.pagesJson) && initialTemplate.pagesJson.length > 0) {
                setPages(initialTemplate.pagesJson);
                setActivePageIdx(0);
                await loadPageIntoCanvas(initialTemplate.pagesJson[0], true);
                fetch('/api/editor/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventType: 'template_apply', templateId: initialTemplate.id }),
                }).catch(() => {});
            } else if (initialAsset) {
                const blank = EMPTY_PAGE(defaultW, defaultH, defaultTrans);
                setPages([blank]);
                await loadPageIntoCanvas(blank, true);
                await insertAssetOnCanvas(initialAsset);
            } else if (initialProjectQueryId) {
                const savedById = await getSavedProjectFromIdb(initialProjectQueryId);
                if (savedById && Array.isArray(savedById.pages) && savedById.pages.length > 0) {
                    const idx = Math.min(savedById.activePageIdx || 0, savedById.pages.length - 1);
                    setActiveProjectId(savedById.id);
                    activeProjectIdRef.current = savedById.id;
                    setProjectTitle(savedById.title || 'Untitled Design');
                    latestTitleRef.current = savedById.title || 'Untitled Design';
                    setPages(savedById.pages);
                    latestPagesRef.current = savedById.pages;
                    setActivePageIdx(idx);
                    latestPageIdxRef.current = idx;
                    await loadPageIntoCanvas(savedById.pages[idx], true);
                    isDirtyRef.current = false;
                    setHasUnsavedChanges(false);
                    setSaveState('idle');
                    setShowSaveText(false);
                } else {
                    const fallback = await loadProjectFromIdb();
                    if (fallback && fallback.id === initialProjectQueryId && Array.isArray(fallback.pages) && fallback.pages.length > 0) {
                        const idx = Math.min(fallback.activePageIdx || 0, fallback.pages.length - 1);
                        setProjectTitle(fallback.title || 'Untitled Design');
                        setPages(fallback.pages);
                        setActivePageIdx(idx);
                        await loadPageIntoCanvas(fallback.pages[idx], true);
                    } else {
                        syncProjectUrl(null);
                        setIsProjectOpen(false);
                        toast.error('Saved project was not found');
                    }
                }
            } else {
                const blank = EMPTY_PAGE(defaultW, defaultH, defaultTrans);
                setPages([blank]);
                await loadPageIntoCanvas(blank, true);
            }
        })();

        return () => {
            detachSnap();
            canvas.dispose();
            fabricRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isProjectOpen]);

    // Keep Drawing Brush synced with brushConfig & activeTool
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const drawing = activeTool === 'draw';
        canvas.isDrawingMode = drawing;
        if (drawing) {
            const brush = new PencilBrush(canvas);
            let hex = brushConfig.color || '#ffffff';
            if (brushConfig.kind === 'highlighter') {
                // translucent rgba
                const r = parseInt(hex.slice(1, 3), 16) || 255;
                const g = parseInt(hex.slice(3, 5), 16) || 230;
                const b = parseInt(hex.slice(5, 7), 16) || 0;
                brush.color = `rgba(${r}, ${g}, ${b}, 0.35)`;
                brush.width = Math.max(16, brushConfig.width * 2);
            } else if (brushConfig.kind === 'marker') {
                brush.color = hex;
                brush.width = Math.max(10, brushConfig.width * 1.4);
            } else {
                brush.color = hex;
                brush.width = brushConfig.width;
            }
            canvas.freeDrawingBrush = brush;
        }
    }, [activeTool, brushConfig]);

    // Undo & Redo Actions
    const applyHistorySnapshot = useCallback(async (snap) => {
        const canvas = fabricRef.current;
        if (!canvas || !snap) return;
        isRestoringRef.current = true;
        try {
            await canvas.loadFromJSON(JSON.parse(JSON.stringify(snap)));
            syncGroupInteractivity(canvas, []);
            canvas.renderAll();
            syncLayersState(canvas);
            setSelectedObject(null);
            setSelectionMeta(null);
            setSelectionBounds(null);
            setActiveLayerIds([]);
        } finally {
            isRestoringRef.current = false;
        }
    }, [syncLayersState]);

    const handleUndo = useCallback(async () => {
        if (historyIndexRef.current <= 0) return;
        const nextIdx = historyIndexRef.current - 1;
        historyIndexRef.current = nextIdx;
        setHistoryIndex(nextIdx);
        await applyHistorySnapshot(historyRef.current[nextIdx]);
        persistFnRef.current?.();
    }, [applyHistorySnapshot]);

    const handleRedo = useCallback(async () => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        const nextIdx = historyIndexRef.current + 1;
        historyIndexRef.current = nextIdx;
        setHistoryIndex(nextIdx);
        await applyHistorySnapshot(historyRef.current[nextIdx]);
        persistFnRef.current?.();
    }, [applyHistorySnapshot]);

    // Layer Operations
    const handleDuplicate = useCallback(async () => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;

        const targets = active.type === 'activeselection' ? [...(active.getObjects() || [])] : [active];
        if (!targets.length) return;
        const resolved = targets.map((o) => ({ obj: o, parentGroup: getParentGroupOf(o) }));
        const hasNested = resolved.some((r) => Boolean(r.parentGroup));

        const clones = [];
        isRestoringRef.current = true;
        try {
            canvas.discardActiveObject();
            for (const { obj: o, parentGroup } of resolved) {
                const cloned = await o.clone(CUSTOM_PROPS);
                assignFreshLayerIds(cloned);
                const offset = hasNested ? 18 : 28;
                cloned.set({
                    left: (o.left || 0) + offset,
                    top: (o.top || 0) + offset,
                    layerName: `${o.layerName || 'Layer'} Copy`,
                });
                if (parentGroup) {
                    parentGroup.add(cloned);
                    dirtyObjectAndAncestors(parentGroup);
                } else {
                    canvas.add(cloned);
                }
                clones.push(cloned);
            }
        } finally {
            isRestoringRef.current = false;
        }

        if (clones.length) {
            selectObjectsOnCanvas(canvas, clones);
            syncLayersState(canvas);
            pushHistorySnapshot(canvas);
            persistFnRef.current?.();
        }
    }, [syncLayersState, pushHistorySnapshot]);

    const handleDeleteSelected = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const actives = canvas.getActiveObjects() || [];
        const hasNestedActive = actives.some((o) => Boolean(getParentGroupOf(o)));
        const nestedSelected = activeLayerIds
            .map((id) => findObjectWithParent(id))
            .filter((r) => r && r.parentGroup);
        if (hasNestedActive || nestedSelected.length > 0) {
            const ids = activeLayerIds.length
                ? activeLayerIds
                : actives.map((o) => o.layerId).filter(Boolean);
            handleDeleteLayerIds(ids);
            return;
        }
        if (!actives.length) return;
        canvas.discardActiveObject();
        actives.forEach((o) => canvas.remove(o));
        canvas.renderAll();
    }, [activeLayerIds]);

    const handleCopySelection = useCallback(async () => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;

        const isMulti = active.type === 'activeselection';
        const rawTargets = isMulti ? [...(active.getObjects() || [])] : [active];
        if (!rawTargets.length) return;

        const snapshots = [];
        if (isMulti) {
            canvas._discardActiveObject();
        }
        try {
            for (const obj of rawTargets) {
                const parentGroup = getParentGroupOf(obj);
                const cloned = await obj.clone(CUSTOM_PROPS);
                if (parentGroup) {
                    const decomposed = util.qrDecompose(obj.calcTransformMatrix());
                    cloned.set({
                        left: decomposed.translateX,
                        top: decomposed.translateY,
                        scaleX: decomposed.scaleX,
                        scaleY: decomposed.scaleY,
                        angle: decomposed.angle,
                        skewX: decomposed.skewX,
                        skewY: decomposed.skewY,
                        originX: 'center',
                        originY: 'center',
                    });
                }
                snapshots.push(cloned);
            }
        } finally {
            if (isMulti) {
                canvas._setActiveObject(new ActiveSelection(rawTargets, { canvas }));
                canvas.requestRenderAll?.();
            }
        }

        if (snapshots.length) {
            clipboardRef.current = snapshots;
            clipboardPasteCountRef.current = 0;
            toast.success(
                snapshots.length > 1
                    ? `Copied ${snapshots.length} elements`
                    : `Copied "${snapshots[0].layerName || 'Element'}"`
            );
        }
    }, []);

    const handlePasteSelection = useCallback(async () => {
        const canvas = fabricRef.current;
        const clipboard = clipboardRef.current;
        if (!canvas || !clipboard || !clipboard.length) return;

        clipboardPasteCountRef.current += 1;
        const offset = (((clipboardPasteCountRef.current - 1) % 6) + 1) * 24;
        const pasted = [];
        isRestoringRef.current = true;
        try {
            canvas.discardActiveObject();
            for (const src of clipboard) {
                const cloned = await src.clone(CUSTOM_PROPS);
                assignFreshLayerIds(cloned);
                cloned.set({
                    left: (src.left || 0) + offset,
                    top: (src.top || 0) + offset,
                    layerName: `${src.layerName || 'Layer'} Copy`,
                });
                canvas.add(cloned);
                canvas.bringObjectToFront(cloned);
                pasted.push(cloned);
            }
        } finally {
            isRestoringRef.current = false;
        }

        if (pasted.length) {
            selectObjectsOnCanvas(canvas, pasted);
            syncLayersState(canvas);
            pushHistorySnapshot(canvas);
            persistFnRef.current?.();
        }
    }, [syncLayersState, pushHistorySnapshot]);

    // Global Keyboard Shortcuts + Browser Unsaved Reload/Close Guard
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (bypassUnsavedGuardRef.current) return;
            if (!isProjectOpen || !isDirtyRef.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isProjectOpen]);

    useEffect(() => {
        if (typeof router?.on !== 'function') return undefined;
        const removeListener = router.on('before', (event) => {
            if (bypassUnsavedGuardRef.current) return true;
            if (!isProjectOpen || !isDirtyRef.current) return true;
            const targetUrl = event?.detail?.visit?.url?.href;
            setUnsavedPrompt({
                actionType: 'navigate',
                pendingAction: () => {
                    if (targetUrl) {
                        router.visit(targetUrl);
                    }
                },
            });
            return false;
        });
        return removeListener;
    }, [isProjectOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isProjectOpen) return;

            const mod = e.ctrlKey || e.metaKey;
            const keyLower = (e.key || '').toLowerCase();

            // Prompt user when pressing F5 or Ctrl+R / Cmd+R with unsaved project edits
            if (
                (e.key === 'F5' || (mod && keyLower === 'r')) &&
                isDirtyRef.current &&
                !bypassUnsavedGuardRef.current
            ) {
                e.preventDefault();
                setUnsavedPrompt({
                    actionType: 'reload',
                    pendingAction: () => {
                        window.location.reload();
                    },
                });
                return;
            }

            // Ctrl+S / Cmd+S works globally in workspace even inside project title input
            if (mod && keyLower === 's') {
                e.preventDefault();
                handleManualSave();
                return;
            }

            if (unsavedPromptRef.current) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setUnsavedPrompt(null);
                }
                return;
            }

            const tag = document.activeElement?.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
            const active = fabricRef.current?.getActiveObject();
            if (active?.isEditing) return;

            if (mod && keyLower === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((mod && keyLower === 'z' && e.shiftKey) || (mod && keyLower === 'y')) {
                e.preventDefault();
                handleRedo();
            } else if (mod && keyLower === 'c') {
                if (active) {
                    e.preventDefault();
                    handleCopySelection();
                }
            } else if (mod && keyLower === 'v') {
                if (clipboardRef.current?.length > 0) {
                    e.preventDefault();
                    handlePasteSelection();
                }
            } else if (mod && keyLower === 'd') {
                e.preventDefault();
                handleDuplicate();
            } else if (mod && !e.altKey && keyLower === 'g' && e.shiftKey) {
                e.preventDefault();
                ungroupSelectedFnRef.current?.();
            } else if (mod && !e.altKey && keyLower === 'g' && !e.shiftKey) {
                e.preventDefault();
                groupSelectedFnRef.current?.();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (active) {
                    e.preventDefault();
                    handleDeleteSelected();
                }
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && active && !active.lockedLayer) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                const pos = active.getXY();
                active.setXY(new Point(pos.x + dx, pos.y + dy));
                active.setCoords();
                active.fire('modified');
                dirtyObjectAndAncestors(active);
                fabricRef.current.renderAll();
                setSelectionMeta(readSelectionMeta(active));
                setSelectionBounds(readSelectionBounds(active));
            } else if (!mod) {
                if (keyLower === 'v') setActiveTool('select');
                if (keyLower === 'h') setActiveTool('pan');
                if (keyLower === 'b' && editorSettings.enableFreehandDraw !== false) {
                    setActiveTool('draw');
                    setActiveTab('draw');
                    setDrawerOpen(true);
                }
                if (keyLower === 't') {
                    setActiveTab('text');
                    setDrawerOpen(true);
                }
                if (keyLower === 'l' && !e.altKey && !e.repeat) {
                    e.preventDefault();
                    setLayersOpen((prev) => !prev);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isProjectOpen,
        handleUndo,
        handleRedo,
        handleCopySelection,
        handlePasteSelection,
        handleDuplicate,
        handleDeleteSelected,
        handleManualSave,
        readSelectionMeta,
        editorSettings.enableFreehandDraw,
    ]);

    // Canvas Mutators
    const handleResizeCanvas = (w, h, presetLabel = null) => {
        const nextW = Math.max(32, Math.min(maxWidth, Number(w) || defaultW));
        const nextH = Math.max(32, Math.min(maxHeight, Number(h) || defaultH));
        logicalWRef.current = nextW;
        logicalHRef.current = nextH;
        setCanvasWidth(nextW);
        setCanvasHeight(nextH);
        fitZoomToViewport(nextW, nextH);
        setPages((prev) => prev.map((p, idx) => (idx === activePageIdx ? { ...p, width: nextW, height: nextH, presetLabel: presetLabel || p.presetLabel } : p)));
        toast.success(`Canvas resized to ${nextW}×${nextH} px`);
    };

    const handleUpdateProp = async (prop, val, commit = true) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;

        if (prop === 'fontFamily') {
            await ensureFontLoaded(val, active.fontWeight);
        } else if (prop === 'fontWeight' && active.fontFamily) {
            await ensureFontLoaded(active.fontFamily, val);
        }

        const activeType = (active.type || '').toLowerCase();

        if (prop === 'textFill') {
            const targets = collectSelectionLeafObjects(active);
            targets.forEach((child) => {
                if (!child) return;
                if ((child.type || '').toLowerCase().includes('text')) {
                    child.set('fill', val);
                    if (child.styles && typeof child.styles === 'object') {
                        Object.values(child.styles).forEach((lineStyles) => {
                            if (!lineStyles || typeof lineStyles !== 'object') return;
                            Object.values(lineStyles).forEach((charStyle) => {
                                if (charStyle && 'fill' in charStyle) {
                                    delete charStyle.fill;
                                }
                            });
                        });
                    }
                    child.set('dirty', true);
                    dirtyObjectAndAncestors(child);
                }
            });
        } else if (activeType === 'activeselection') {
            active.getObjects().forEach((child) => {
                child.set(prop, val);
                if (prop === 'fontFamily' || prop === 'fontWeight') {
                    child.initDimensions?.();
                    child.set('dirty', true);
                }
            });
        } else {
            active.set(prop, val);
            if (prop === 'fontFamily' || prop === 'fontWeight') {
                active.initDimensions?.();
                active.set('dirty', true);
            }
        }
        active.setCoords();
        dirtyObjectAndAncestors(active);
        canvas.requestRenderAll?.();
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        setSelectionBounds(readSelectionBounds(active));
        if (commit !== false) {
            pushHistorySnapshot(canvas);
            persistActivePageSnapshot();
        }
    };

    const handleUpdateFilter = (nextState) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        applyImageFilters(active, nextState);
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleApplyFrame = (frameKind) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active || active.type?.toLowerCase() !== 'image') {
            toast.info('Select an image layer on the canvas first to apply a clip frame.');
            return;
        }
        applyFrameToImage(active, frameKind);
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleUpdateShadow = (nextCfg, commit = true) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        const cfg = normalizeShadowConfig(nextCfg);
        if (active.type === 'activeselection') {
            active.getObjects().forEach((child) => {
                applyEffectsToObject(child, cfg, undefined);
                dirtyObjectAndAncestors(child);
            });
            active.set('shadowConfig', cfg);
        } else {
            applyEffectsToObject(active, cfg, undefined);
        }
        dirtyObjectAndAncestors(active);
        canvas.requestRenderAll?.();
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        if (commit !== false) {
            pushHistorySnapshot(canvas);
            persistActivePageSnapshot();
        }
    };

    const handleUpdateGlow = (nextCfg, commit = true) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        const cfg = normalizeGlowConfig(nextCfg);
        if (active.type === 'activeselection') {
            active.getObjects().forEach((child) => {
                applyEffectsToObject(child, undefined, cfg);
                dirtyObjectAndAncestors(child);
            });
            active.set('glowConfig', cfg);
        } else {
            applyEffectsToObject(active, undefined, cfg);
        }
        dirtyObjectAndAncestors(active);
        canvas.requestRenderAll?.();
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        if (commit !== false) {
            pushHistorySnapshot(canvas);
            persistActivePageSnapshot();
        }
    };

    const handleToggleShadow = () => {
        const active = fabricRef.current?.getActiveObject();
        if (!active) return;
        const current = parseShadowMeta(active);
        const nextEnabled = !current.enabled;
        const items = current.items.length > 0 ? current.items : [createShadowItem()];
        handleUpdateShadow({ enabled: nextEnabled, items }, true);
    };

    const handleToggleStickerOutline = () => {
        const active = fabricRef.current?.getActiveObject();
        if (!active) return;
        const current = parseGlowMeta(active);
        const nextEnabled = !current.enabled;
        const items = current.items.length > 0 ? current.items : [createGlowItem()];
        handleUpdateGlow({ enabled: nextEnabled, items }, true);
    };

    const handleFlip = (axis) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        if (axis === 'x') active.set('flipX', !active.flipX);
        if (axis === 'y') active.set('flipY', !active.flipY);
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleAlign = (dir) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        const w = logicalWRef.current;
        const h = logicalHRef.current;
        const rect = active.getBoundingRect();
        let dx = 0;
        let dy = 0;
        if (dir === 'left') dx = -rect.left;
        if (dir === 'right') dx = w - (rect.left + rect.width);
        if (dir === 'center-h') dx = w / 2 - (rect.left + rect.width / 2);
        if (dir === 'top') dy = -rect.top;
        if (dir === 'bottom') dy = h - (rect.top + rect.height);
        if (dir === 'center-v') dy = h / 2 - (rect.top + rect.height / 2);
        const pos = active.getXY();
        active.setXY(new Point(pos.x + dx, pos.y + dy));
        active.setCoords();
        active.fire('modified');
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        setSelectionBounds(readSelectionBounds(active));
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleContextMenuSelectTarget = useCallback((nativeEvent) => {
        const canvas = fabricRef.current;
        if (!canvas || !nativeEvent || canvas.isDrawingMode) return false;

        const result = canvas.findTarget(nativeEvent) || {};
        const hitTarget = result.target || null;
        if (!hitTarget) return false;

        const active = canvas.getActiveObject();
        if (active?.type === 'activeselection') {
            const members = active.getObjects?.() || [];
            if (hitTarget === active || members.includes(hitTarget)) {
                return true;
            }
        }

        if (hitTarget === active) {
            return true;
        }

        if (hitTarget.selectable !== false) {
            canvas.setActiveObject(hitTarget, nativeEvent);
            canvas.requestRenderAll?.();
            return Boolean(canvas.getActiveObject());
        }

        return false;
    }, []);

    const handleZOrder = (action) => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active || active.type === 'activeselection') return;
        const container = getParentGroupOf(active) || canvas;
        if (action === 'front') container.bringObjectToFront(active);
        if (action === 'forward') container.bringObjectForward(active);
        if (action === 'backward') container.sendObjectBackwards(active);
        if (action === 'back') container.sendObjectToBack(active);
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        syncLayersState(canvas);
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleToggleLock = () => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        const targets = active.type === 'activeselection' ? active.getObjects() || [] : [active];
        const nextLock = !targets.every((o) => Boolean(o.lockedLayer));
        targets.forEach((o) => {
            o.set({
                lockedLayer: nextLock,
                lockMovementX: nextLock,
                lockMovementY: nextLock,
                lockScalingX: nextLock,
                lockScalingY: nextLock,
                lockRotation: nextLock,
                hasControls: !nextLock,
            });
        });
        if (active.type === 'activeselection') {
            active.set({
                lockedLayer: nextLock,
                lockMovementX: nextLock,
                lockMovementY: nextLock,
                lockScalingX: nextLock,
                lockScalingY: nextLock,
                lockRotation: nextLock,
                hasControls: !nextLock,
            });
        }
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        syncLayersState(canvas);
        setSelectionMeta(readSelectionMeta(active));
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleFitToCanvas = () => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;
        const w = logicalWRef.current;
        const h = logicalHRef.current;
        const scale = Math.min(w / Math.max(1, active.width || w), h / Math.max(1, active.height || h)) * 0.9;
        active.set({ scaleX: scale, scaleY: scale, angle: 0 });
        active.setXY(new Point(w / 2, h / 2), 'center', 'center');
        active.setCoords();
        active.fire('modified');
        dirtyObjectAndAncestors(active);
        canvas.renderAll();
        setSelectionMeta(readSelectionMeta(active));
        setSelectionBounds(readSelectionBounds(active));
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    // AI Background Remover (browser-only ONNX via @imgly/background-removal)
    const runBgRemovalOnDataUrl = async (srcUrl) => {
        const mod = await import('@imgly/background-removal');
        const removeFn = mod.removeBackground || mod.default;
        const blob = await removeFn(srcUrl);
        return URL.createObjectURL(blob);
    };

    const handleRemoveBgSelected = async () => {
        const canvas = fabricRef.current;
        const active = canvas?.getActiveObject();
        if (!canvas || !active || active.type?.toLowerCase() !== 'image') return;
        setRemovingBg(true);
        const toastId = toast.loading('Removing background locally in your browser...');
        try {
            const src = active.getSrc ? active.getSrc() : active._element?.src;
            if (!src) throw new Error('Image source unavailable');
            const cleanedUrl = await runBgRemovalOnDataUrl(src);
            const nextImg = await FabricImage.fromURL(cleanedUrl, { crossOrigin: 'anonymous' });
            nextImg.set({
                left: active.left,
                top: active.top,
                scaleX: (active.width * active.scaleX) / Math.max(1, nextImg.width),
                scaleY: (active.height * active.scaleY) / Math.max(1, nextImg.height),
                angle: active.angle,
                originX: active.originX,
                originY: active.originY,
                layerId: active.layerId,
                layerName: `${active.layerName || 'Image'} (Cutout)`,
            });
            canvas.remove(active);
            canvas.add(nextImg);
            canvas.setActiveObject(nextImg);
            canvas.renderAll();
            toast.success('Background removed!', { id: toastId });
        } catch (err) {
            toast.error(err?.message || 'Background removal unavailable in offline mode', { id: toastId });
        } finally {
            setRemovingBg(false);
        }
    };

    const handleRemoveBgUpload = async (item) => {
        setRemovingUploadId(item.id);
        const toastId = toast.loading(`Removing background from ${item.name}...`);
        try {
            const cleanedUrl = await runBgRemovalOnDataUrl(item.url);
            setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, url: cleanedUrl } : u)));
            toast.success('Transparent PNG ready!', { id: toastId });
        } catch (err) {
            toast.error(err?.message || 'Background removal failed', { id: toastId });
        } finally {
            setRemovingUploadId(null);
        }
    };

    // Add Element / Text / Pairing / Uploads / Background
    const handleAddElement = (kind) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        setActiveTool('select');
        const obj = createElementObject(kind, logicalWRef.current / 2, logicalHRef.current / 2);
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.renderAll();
    };

    const handleAddText = async (opts = {}) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        setActiveTool('select');
        const family = opts.fontFamily || fonts[0]?.family || 'Inter';
        await ensureFontLoaded(family);
        const tb = createTextboxLayer(opts.text || 'Double click to edit', {
            ...opts,
            fontFamily: family,
            left: logicalWRef.current / 2,
            top: logicalHRef.current / 2,
            width: Math.min(820, logicalWRef.current * 0.72),
        });
        canvas.add(tb);
        canvas.setActiveObject(tb);
        canvas.renderAll();
    };

    const handleAddTextPairing = async (pair) => {
        const canvas = fabricRef.current;
        if (!canvas || !pair) return;
        setActiveTool('select');
        const cx = logicalWRef.current / 2;
        const cy = logicalHRef.current / 2;
        await Promise.all(pair.items.map((it) => ensureFontLoaded(it.fontFamily)));
        const created = pair.items.map((it) =>
            createTextboxLayer(it.text, {
                fontFamily: it.fontFamily,
                fontSize: it.fontSize,
                fontWeight: it.fontWeight,
                fill: it.fill,
                left: cx,
                top: cy + (it.dy || 0),
                width: Math.min(880, logicalWRef.current * 0.78),
            })
        );
        created.forEach((tb) => canvas.add(tb));
        canvas.setActiveObject(new ActiveSelection(created, { canvas }));
        canvas.renderAll();
    };

    const handleUploadFiles = (fileList) => {
        Array.from(fileList).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = () => {
                const entry = { id: uid('upl'), name: file.name, url: reader.result };
                setUploads((prev) => [entry, ...prev]);
                insertAssetOnCanvas({ name: file.name, url: reader.result });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpdateBackground = (nextBgMeta) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        setBgMeta(nextBgMeta);
        if (nextBgMeta.mode === 'transparent') {
            canvas.backgroundColor = null;
            canvas.backgroundImage = null;
        } else if (nextBgMeta.mode === 'solid') {
            canvas.backgroundImage = null;
            canvas.backgroundColor = nextBgMeta.color || '#ffffff';
        } else if (nextBgMeta.mode === 'gradient') {
            canvas.backgroundImage = null;
            canvas.backgroundColor = makeCanvasBackgroundGradient(logicalWRef.current, logicalHRef.current, {
                type: nextBgMeta.gradientType,
                angle: nextBgMeta.gradientAngle,
                from: nextBgMeta.gradientFrom,
                to: nextBgMeta.gradientTo,
            });
        }
        canvas.renderAll();
        pushHistorySnapshot(canvas);
        persistActivePageSnapshot();
    };

    const handleUploadBgImage = (file) => {
        const canvas = fabricRef.current;
        if (!canvas || !file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const img = await FabricImage.fromURL(reader.result, { crossOrigin: 'anonymous' });
            const scale = Math.max(logicalWRef.current / Math.max(1, img.width), logicalHRef.current / Math.max(1, img.height));
            img.set({
                scaleX: scale,
                scaleY: scale,
                originX: 'center',
                originY: 'center',
                left: logicalWRef.current / 2,
                top: logicalHRef.current / 2,
            });
            canvas.backgroundImage = img;
            canvas.renderAll();
            setBgMeta((prev) => ({ ...prev, mode: 'image' }));
            pushHistorySnapshot(canvas);
            persistActivePageSnapshot();
        };
        reader.readAsDataURL(file);
    };

    const handleExtractPalette = async () => {
        if (!fabricRef.current) return;
        const colors = await extractPaletteFromCanvas(fabricRef.current);
        setExtractedPalette(colors);
        toast.success('Extracted color palette from your design');
    };

    // Layer Panel Actions
    const findObjectWithParent = (layerId) => {
        const canvas = fabricRef.current;
        if (!canvas || !layerId) return null;
        const walk = (collection, parentGroup = null) => {
            for (const o of collection) {
                if (o.layerId === layerId) {
                    return { obj: o, parentGroup };
                }
                if ((o.type || '').toLowerCase() === 'group' && typeof o.getObjects === 'function') {
                    const hit = walk(o.getObjects(), o);
                    if (hit) return hit;
                }
            }
            return null;
        };
        return walk(canvas.getObjects() || [], null);
    };

    const findObjectByLayerId = (layerId) => findObjectWithParent(layerId)?.obj || null;

    const findRootAncestor = (obj) => {
        let cur = obj;
        while (cur && (cur.parent || cur.group)) {
            cur = cur.parent || cur.group;
        }
        return cur;
    };

    const dirtyAncestorChain = (groupObj) => {
        let cur = groupObj;
        while (cur) {
            cur.set('dirty', true);
            cur = cur.parent || cur.group || null;
        }
    };

    const pruneSelectedResolved = (resolvedList) => {
        const selectedObjSet = new Set(resolvedList.map((r) => r.obj));
        return resolvedList.filter((r) => {
            let cur = r.obj.parent || r.obj.group || r.parentGroup || null;
            while (cur) {
                if (selectedObjSet.has(cur)) return false;
                cur = cur.parent || cur.group || null;
            }
            return true;
        });
    };

    const flattenCanvasTreePanelOrder = () => {
        const canvas = fabricRef.current;
        if (!canvas) return [];
        const rows = [];
        const walk = (collection, parentGroup = null) => {
            const rev = [...collection].reverse();
            for (const o of rev) {
                rows.push({ obj: o, parentGroup });
                if ((o.type || '').toLowerCase() === 'group' && typeof o.getObjects === 'function') {
                    walk(o.getObjects(), o);
                }
            }
        };
        walk(canvas.getObjects() || [], null);
        return rows;
    };

    const cleanupEmptyAncestorGroups = (canvas, startGroup) => {
        let cur = startGroup;
        while (cur) {
            const parent = cur.parent || cur.group || null;
            if (cur.size() === 0) {
                if (parent) {
                    parent.remove(cur);
                } else {
                    canvas.remove(cur);
                }
                cur = parent;
            } else {
                dirtyAncestorChain(cur);
                break;
            }
        }
    };

    const handleSelectLayer = (layerId, { toggle = false, range = false, orderedIds = null } = {}) => {
        const canvas = fabricRef.current;
        const clicked = findObjectWithParent(layerId);
        if (!canvas || !clicked) return;

        let nextIds = [];
        if (range) {
            const order =
                Array.isArray(orderedIds) && orderedIds.length > 0
                    ? orderedIds
                    : flattenCanvasTreePanelOrder().map((r) => r.obj.layerId).filter(Boolean);
            const anchorId = lastSelectedLayerIdRef.current || activeLayerIds[0] || layerId;
            const aIdx = order.indexOf(anchorId);
            const bIdx = order.indexOf(layerId);
            nextIds =
                aIdx >= 0 && bIdx >= 0
                    ? order.slice(Math.min(aIdx, bIdx), Math.max(aIdx, bIdx) + 1)
                    : [layerId];
        } else if (toggle) {
            const exists = activeLayerIds.includes(layerId);
            nextIds = exists
                ? activeLayerIds.filter((id) => id !== layerId)
                : [...activeLayerIds, layerId];
            lastSelectedLayerIdRef.current = layerId;
        } else {
            nextIds = [layerId];
            lastSelectedLayerIdRef.current = layerId;
        }

        if (nextIds.length === 0) {
            canvas.discardActiveObject();
            syncGroupInteractivity(canvas, []);
            canvas.renderAll();
            setActiveLayerIds([]);
            return;
        }

        const resolved = nextIds.map(findObjectWithParent).filter(Boolean);
        if (!resolved.length) return;

        // Avoid circular ActiveSelection (cannot simultaneously select both a group and its descendant)
        const targetObjs = pruneSelectedResolved(resolved).map((r) => r.obj);
        selectObjectsOnCanvas(canvas, targetObjs);
    };

    const handleRenameLayer = (layerId, nextName) => {
        const canvas = fabricRef.current;
        const found = findObjectWithParent(layerId);
        const trimmed = String(nextName || '').trim();
        if (!canvas || !found || !trimmed || found.obj.layerName === trimmed) return;
        found.obj.set('layerName', trimmed);
        if (found.parentGroup) dirtyAncestorChain(found.parentGroup);
        syncLayersState(canvas);
        const active = canvas.getActiveObject();
        if (active) {
            setSelectionMeta(readSelectionMeta(active));
        }
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleToggleLayerVisible = (layerId) => {
        const canvas = fabricRef.current;
        const found = findObjectWithParent(layerId);
        if (!canvas || !found) return;
        found.obj.set('visible', found.obj.visible === false);
        if (found.parentGroup) dirtyAncestorChain(found.parentGroup);
        canvas.renderAll();
        syncLayersState(canvas);
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleBatchToggleVisible = (layerIds = []) => {
        const canvas = fabricRef.current;
        if (!canvas || !layerIds.length) return;
        const resolved = layerIds.map(findObjectWithParent).filter(Boolean);
        if (!resolved.length) return;
        const anyVisible = resolved.some((r) => r.obj.visible !== false);
        const nextVisible = !anyVisible;
        resolved.forEach(({ obj, parentGroup }) => {
            obj.set('visible', nextVisible);
            if (parentGroup) dirtyAncestorChain(parentGroup);
        });
        canvas.renderAll();
        syncLayersState(canvas);
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const applyLockToObject = (obj, nextLock) => {
        obj.set({
            lockedLayer: nextLock,
            lockMovementX: nextLock,
            lockMovementY: nextLock,
            lockScalingX: nextLock,
            lockScalingY: nextLock,
            lockRotation: nextLock,
            hasControls: !nextLock,
        });
    };

    const handleToggleLayerLock = (layerId) => {
        const canvas = fabricRef.current;
        const found = findObjectWithParent(layerId);
        if (!canvas || !found) return;
        applyLockToObject(found.obj, !found.obj.lockedLayer);
        if (found.parentGroup) dirtyAncestorChain(found.parentGroup);
        canvas.renderAll();
        syncLayersState(canvas);
        const active = canvas.getActiveObject();
        if (active) setSelectionMeta(readSelectionMeta(active));
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleBatchToggleLock = (layerIds = []) => {
        const canvas = fabricRef.current;
        if (!canvas || !layerIds.length) return;
        const resolved = layerIds.map(findObjectWithParent).filter(Boolean);
        if (!resolved.length) return;
        const allLocked = resolved.every((r) => Boolean(r.obj.lockedLayer));
        const nextLock = !allLocked;
        resolved.forEach(({ obj, parentGroup }) => {
            applyLockToObject(obj, nextLock);
            if (parentGroup) dirtyAncestorChain(parentGroup);
        });
        canvas.renderAll();
        syncLayersState(canvas);
        const active = canvas.getActiveObject();
        if (active) setSelectionMeta(readSelectionMeta(active));
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleDuplicateLayer = async (layerIdOrIds) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const targetIds = Array.isArray(layerIdOrIds)
            ? layerIdOrIds
            : typeof layerIdOrIds === 'string' && layerIdOrIds
              ? [layerIdOrIds]
              : activeLayerIds;

        const resolved = pruneSelectedResolved(
            (targetIds || []).map(findObjectWithParent).filter(Boolean)
        );

        const hasNestedTarget = resolved.some((r) => Boolean(r.parentGroup));
        if (!resolved.length || (!hasNestedTarget && !Array.isArray(layerIdOrIds) && typeof layerIdOrIds !== 'string')) {
            await handleDuplicate();
            return;
        }

        if (!hasNestedTarget) {
            await handleDuplicate();
            return;
        }

        const clonedObjs = [];
        isRestoringRef.current = true;
        try {
            canvas.discardActiveObject();
            for (const { obj, parentGroup } of resolved) {
                const cloned = await obj.clone(CUSTOM_PROPS);
                assignFreshLayerIds(cloned);
                cloned.set({
                    left: (obj.left || 0) + 18,
                    top: (obj.top || 0) + 18,
                    layerName: `${obj.layerName || 'Layer'} Copy`,
                });
                if (parentGroup) {
                    parentGroup.add(cloned);
                    dirtyAncestorChain(parentGroup);
                } else {
                    canvas.add(cloned);
                }
                clonedObjs.push(cloned);
            }
        } finally {
            isRestoringRef.current = false;
        }

        if (clonedObjs.length) {
            selectObjectsOnCanvas(canvas, clonedObjs);
        } else {
            canvas.renderAll();
        }
        syncLayersState(canvas);
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleMoveLayersBatch = ({ layerIds = [], destinationParentGroupId = null, destinationIndex = 0 }) => {
        const canvas = fabricRef.current;
        if (!canvas || !layerIds?.length) return;

        const treeOrder = flattenCanvasTreePanelOrder().map((r) => r.obj.layerId);
        const rawResolved = pruneSelectedResolved(
            layerIds.map(findObjectWithParent).filter(Boolean)
        );
        if (!rawResolved.length) return;

        rawResolved.sort((a, b) => treeOrder.indexOf(a.obj.layerId) - treeOrder.indexOf(b.obj.layerId));

        const destGroupObj = destinationParentGroupId
            ? findObjectWithParent(destinationParentGroupId)?.obj
            : null;
        if (destinationParentGroupId && (!destGroupObj || (destGroupObj.type || '').toLowerCase() !== 'group')) {
            return;
        }

        const movable = rawResolved.filter(({ obj }) => {
            if (!destGroupObj) return true;
            if (obj === destGroupObj) return false;
            return !destGroupObj.isDescendantOf(obj);
        });
        if (!movable.length) return;

        // Fast path: single-item same-container reorder
        if (movable.length === 1) {
            const { obj, parentGroup: sourceGroup } = movable[0];
            if (!sourceGroup && !destGroupObj) {
                const objs = canvas.getObjects() || [];
                if (objs.length < 2) return;
                const clampedPanelIdx = Math.max(0, Math.min(objs.length - 1, destinationIndex));
                const targetCanvasIdx = objs.length - 1 - clampedPanelIdx;
                if (!canvas.moveObjectTo(obj, targetCanvasIdx)) return;
                canvas.renderAll();
                syncLayersState(canvas);
                pushHistorySnapshot(canvas);
                persistFnRef.current?.();
                return;
            }
            if (sourceGroup && destGroupObj === sourceGroup) {
                const children = sourceGroup.getObjects() || [];
                if (children.length < 2) return;
                const clampedIdx = Math.max(0, Math.min(children.length - 1, destinationIndex));
                const targetChildIdx = children.length - 1 - clampedIdx;
                if (!sourceGroup.moveObjectTo(obj, targetChildIdx)) return;
                dirtyAncestorChain(sourceGroup);
                canvas.renderAll();
                syncLayersState(canvas);
                pushHistorySnapshot(canvas);
                persistFnRef.current?.();
                return;
            }
        }

        isRestoringRef.current = true;
        const movedIds = [];
        const movedObjs = [];
        try {
            canvas.discardActiveObject();
            const initialRootReverse = [...(canvas.getObjects() || [])].reverse();
            const removedRootBeforeDestCount = movable.filter(
                (m) => !m.parentGroup && initialRootReverse.indexOf(m.obj) < destinationIndex
            ).length;
            const emptiedRootGroupsBeforeDest = new Set();

            for (const { obj, parentGroup } of movable) {
                if (parentGroup) {
                    const rootAnc = findRootAncestor(parentGroup);
                    const rootIdxBefore = initialRootReverse.indexOf(rootAnc);
                    parentGroup.remove(obj);
                    cleanupEmptyAncestorGroups(canvas, parentGroup);
                    if (
                        rootAnc &&
                        !canvas.getObjects().includes(rootAnc) &&
                        rootIdxBefore >= 0 &&
                        rootIdxBefore < destinationIndex
                    ) {
                        emptiedRootGroupsBeforeDest.add(rootAnc);
                    }
                } else {
                    canvas.remove(obj);
                }
            }

            if (destGroupObj) {
                const basePanelIdx = Math.max(0, destinationIndex);
                for (let i = movable.length - 1; i >= 0; i -= 1) {
                    const { obj } = movable[i];
                    const curLen = destGroupObj.size();
                    const insertIdx = Math.max(0, Math.min(curLen, curLen - basePanelIdx));
                    destGroupObj.insertAt(insertIdx, obj);
                    movedIds.unshift(obj.layerId);
                    movedObjs.unshift(obj);
                }
                dirtyAncestorChain(destGroupObj);
                selectObjectsOnCanvas(canvas, movedObjs);
            } else {
                const adjustedStartPanelIdx = Math.max(
                    0,
                    destinationIndex - removedRootBeforeDestCount - emptiedRootGroupsBeforeDest.size
                );
                for (let i = 0; i < movable.length; i += 1) {
                    const { obj } = movable[i];
                    canvas.add(obj);
                    const objs = canvas.getObjects() || [];
                    const panelSlot = Math.max(0, Math.min(objs.length - 1, adjustedStartPanelIdx + i));
                    const targetCanvasIdx = objs.length - 1 - panelSlot;
                    canvas.moveObjectTo(obj, targetCanvasIdx);
                    movedIds.push(obj.layerId);
                    movedObjs.push(obj);
                }
                selectObjectsOnCanvas(canvas, movedObjs);
            }
        } finally {
            isRestoringRef.current = false;
        }

        canvas.renderAll();
        syncLayersState(canvas);
        const active = canvas.getActiveObject();
        setSelectedObject(active || null);
        setSelectionMeta(readSelectionMeta(active));
        setSelectionBounds(readSelectionBounds(active));
        setActiveLayerIds(movedIds);
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleMoveLayerTree = ({ layerId, destinationParentGroupId = null, destinationIndex = 0 }) => {
        handleMoveLayersBatch({
            layerIds: [layerId],
            destinationParentGroupId,
            destinationIndex,
        });
    };

    const handleReorderLayer = (layerId, targetPanelIndex) => {
        handleMoveLayersBatch({
            layerIds: [layerId],
            destinationParentGroupId: null,
            destinationIndex: targetPanelIndex,
        });
    };

    const handleDeleteLayerIds = (layerIds = []) => {
        const canvas = fabricRef.current;
        if (!canvas || !layerIds.length) return;
        const resolved = pruneSelectedResolved(
            layerIds.map(findObjectWithParent).filter(Boolean)
        );
        if (!resolved.length) return;

        isRestoringRef.current = true;
        try {
            canvas.discardActiveObject();
            for (const { obj, parentGroup } of resolved) {
                if (parentGroup) {
                    parentGroup.remove(obj);
                    cleanupEmptyAncestorGroups(canvas, parentGroup);
                } else {
                    canvas.remove(obj);
                }
            }
        } finally {
            isRestoringRef.current = false;
        }

        canvas.renderAll();
        syncGroupInteractivity(canvas, []);
        syncLayersState(canvas);
        setSelectedObject(null);
        setSelectionMeta(null);
        setSelectionBounds(null);
        setActiveLayerIds([]);
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleDeleteLayer = (layerId) => {
        handleDeleteLayerIds([layerId]);
    };

    const handleGroupSelected = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        let resolved = pruneSelectedResolved(
            activeLayerIds.map(findObjectWithParent).filter(Boolean)
        );
        if (resolved.length < 2) {
            const active = canvas.getActiveObject();
            if (active?.type === 'activeselection') {
                resolved = (active.getObjects() || []).map((o) => ({ obj: o, parentGroup: getParentGroupOf(o) }));
            }
        }
        if (resolved.length < 2) return;

        const targetParent = resolved[0].parentGroup || null;
        let insertCanvasIdx = 0;
        const parentCollection = targetParent ? targetParent.getObjects() : canvas.getObjects();
        const matchingIndices = resolved
            .filter((r) => r.parentGroup === targetParent)
            .map((r) => parentCollection.indexOf(r.obj))
            .filter((idx) => idx >= 0);
        const lowestIndexInParent = matchingIndices.length ? Math.min(...matchingIndices) : parentCollection.length;

        let newGrp = null;
        isRestoringRef.current = true;
        try {
            canvas.discardActiveObject();
            const objsToGroup = [];
            for (const { obj, parentGroup } of resolved) {
                if (parentGroup) {
                    parentGroup.remove(obj);
                    if (parentGroup !== targetParent) {
                        cleanupEmptyAncestorGroups(canvas, parentGroup);
                    }
                } else {
                    canvas.remove(obj);
                }
                objsToGroup.push(obj);
            }

            newGrp = new Group(objsToGroup, { layerId: uid('layer'), layerName: 'Group' });
            if (targetParent) {
                insertCanvasIdx = Math.max(0, Math.min(targetParent.size(), lowestIndexInParent));
                targetParent.insertAt(insertCanvasIdx, newGrp);
                dirtyAncestorChain(targetParent);
                selectObjectsOnCanvas(canvas, [newGrp]);
            } else {
                canvas.add(newGrp);
                const curObjs = canvas.getObjects() || [];
                const targetSlot = Math.max(0, Math.min(curObjs.length - 1, lowestIndexInParent));
                canvas.moveObjectTo(newGrp, targetSlot);
                selectObjectsOnCanvas(canvas, [newGrp]);
            }
        } finally {
            isRestoringRef.current = false;
        }

        canvas.renderAll();
        syncLayersState(canvas);
        const active = canvas.getActiveObject();
        setSelectedObject(active || null);
        setSelectionMeta(readSelectionMeta(active));
        setSelectionBounds(readSelectionBounds(active));
        if (newGrp) setActiveLayerIds([newGrp.layerId]);
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    const handleUngroupSelected = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        let targetGroups = activeLayerIds
            .map(findObjectWithParent)
            .filter((r) => r && (r.obj.type || '').toLowerCase() === 'group');

        if (!targetGroups.length) {
            const active = canvas.getActiveObject();
            if (active?.type === 'group') {
                targetGroups = [{ obj: active, parentGroup: getParentGroupOf(active) }];
            } else if (active?.type === 'activeselection') {
                targetGroups = (active.getObjects() || [])
                    .filter((o) => (o.type || '').toLowerCase() === 'group')
                    .map((o) => ({ obj: o, parentGroup: getParentGroupOf(o) }));
            }
        }
        if (!targetGroups.length) return;

        const released = [];
        isRestoringRef.current = true;
        try {
            canvas.discardActiveObject();
            for (const { obj: grp, parentGroup } of targetGroups) {
                const container = parentGroup || canvas;
                const grpIdx = container.getObjects().indexOf(grp);
                const items = grp.removeAll();
                container.remove(grp);
                items.forEach((child, offset) => {
                    normalizeFabricLayerMetadata(child);
                    if (parentGroup) {
                        const idx = Math.max(0, Math.min(parentGroup.size(), grpIdx + offset));
                        parentGroup.insertAt(idx, child);
                    } else {
                        canvas.add(child);
                        const objs = canvas.getObjects() || [];
                        const idx = Math.max(0, Math.min(objs.length - 1, grpIdx + offset));
                        canvas.moveObjectTo(child, idx);
                    }
                    released.push(child);
                });
                if (parentGroup) {
                    dirtyAncestorChain(parentGroup);
                }
            }

            selectObjectsOnCanvas(canvas, released);
        } finally {
            isRestoringRef.current = false;
        }

        canvas.renderAll();
        syncLayersState(canvas);
        const active = canvas.getActiveObject();
        setSelectedObject(active || null);
        setSelectionMeta(readSelectionMeta(active));
        setSelectionBounds(readSelectionBounds(active));
        setActiveLayerIds(released.map((o) => o.layerId).filter(Boolean));
        pushHistorySnapshot(canvas);
        persistFnRef.current?.();
    };

    groupSelectedFnRef.current = handleGroupSelected;
    ungroupSelectedFnRef.current = handleUngroupSelected;

    // Multi-Page Controls
    const snapshotCurrentPageIntoArray = () => {
        const canvas = fabricRef.current;
        if (!canvas) return pages;
        const json = serializeCanvasSafely(canvas, CUSTOM_PROPS);
        return pages.map((p, i) =>
            i === activePageIdx
                ? {
                    ...p,
                    width: canvasWidth,
                    height: canvasHeight,
                    bgMeta,
                    background: bgMeta.mode === 'solid' ? bgMeta.color : null,
                    fabricJson: json,
                }
                : p
        );
    };

    const handleSwitchPage = async (targetIdx) => {
        if (targetIdx === activePageIdx || !pages[targetIdx]) return;
        const nextPages = snapshotCurrentPageIntoArray();
        setPages(nextPages);
        setActivePageIdx(targetIdx);
        await loadPageIntoCanvas(nextPages[targetIdx], true);
    };

    const handleAddPage = async () => {
        if (pages.length >= maxPages) {
            toast.error(`Maximum of ${maxPages} pages reached`);
            return;
        }
        const updated = snapshotCurrentPageIntoArray();
        const blank = {
            ...EMPTY_PAGE(canvasWidth, canvasHeight, defaultTrans),
            name: `Page ${updated.length + 1}`,
        };
        const nextPages = [...updated, blank];
        setPages(nextPages);
        setActivePageIdx(nextPages.length - 1);
        await loadPageIntoCanvas(blank, true);
    };

    const handleDuplicatePage = async (idx) => {
        if (pages.length >= maxPages) return;
        const updated = snapshotCurrentPageIntoArray();
        const src = updated[idx];
        const copy = {
            ...JSON.parse(JSON.stringify(src)),
            id: uid('page'),
            name: `${src.name || 'Page'} Copy`,
        };
        const nextPages = [...updated.slice(0, idx + 1), copy, ...updated.slice(idx + 1)];
        setPages(nextPages);
        setActivePageIdx(idx + 1);
        await loadPageIntoCanvas(copy, true);
    };

    const handleDeletePage = async (idx) => {
        if (pages.length <= 1) return;
        const updated = snapshotCurrentPageIntoArray();
        const nextPages = updated.filter((_, i) => i !== idx);
        const nextActive = Math.min(activePageIdx, nextPages.length - 1);
        setPages(nextPages);
        setActivePageIdx(nextActive);
        await loadPageIntoCanvas(nextPages[nextActive], true);
    };

    // Editor Homepage & Multi-Project Lifecycle
    const finishClosingToHome = () => {
        setSelectedObject(null);
        setSelectionMeta(null);
        setSelectionBounds(null);
        setActiveLayerIds([]);
        setLayers([]);
        setLayersOpen(false);
        setDrawerOpen(false);
        setActiveTool('select');
        setSaveState('idle');
        setShowSaveText(false);
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        syncProjectUrl(null);
        setIsProjectOpen(false);
    };

    const handleGoEditorHome = async () => {
        if (!isProjectOpen) return;
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
        if (saveTextTimerRef.current) {
            clearTimeout(saveTextTimerRef.current);
            saveTextTimerRef.current = null;
        }
        if (isDirtyRef.current && !bypassUnsavedGuardRef.current) {
            setUnsavedPrompt({
                actionType: 'close',
                pendingAction: () => finishClosingToHome(),
            });
            return;
        }
        finishClosingToHome();
    };

    const handleResolveUnsaved = async (choice) => {
        const promptState = unsavedPrompt;
        if (!promptState) return;
        if (choice === 'cancel') {
            setUnsavedPrompt(null);
            return;
        }
        if (choice === 'save') {
            setUnsavedSaving(true);
            try {
                if (!adminTemplateMode && fabricRef.current) {
                    await saveProjectToIdb(buildCurrentProjectPayload());
                }
            } finally {
                setUnsavedSaving(false);
            }
        }
        bypassUnsavedGuardRef.current = true;
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        setUnsavedPrompt(null);
        try {
            await promptState.pendingAction?.();
        } finally {
            setTimeout(() => {
                bypassUnsavedGuardRef.current = false;
            }, 300);
        }
    };

    const handleCreateNewProjectFromHome = ({
        title = 'Untitled Design',
        width = defaultW,
        height = defaultH,
        transparent = defaultTrans,
        presetLabel = null,
    } = {}) => {
        const w = Math.max(32, Math.min(maxWidth, Number(width) || defaultW));
        const h = Math.max(32, Math.min(maxHeight, Number(height) || defaultH));
        const nextId = uid('proj');
        const nextTitle = String(title || '').trim() || 'Untitled Design';
        const blank = {
            ...EMPTY_PAGE(w, h, transparent ?? defaultTrans),
            presetLabel: presetLabel || `${w}×${h}`,
        };

        setActiveProjectId(nextId);
        activeProjectIdRef.current = nextId;
        setProjectTitle(nextTitle);
        latestTitleRef.current = nextTitle;
        setPages([blank]);
        latestPagesRef.current = [blank];
        setActivePageIdx(0);
        latestPageIdxRef.current = 0;
        pendingOpenRef.current = {
            projectId: nextId,
            title: nextTitle,
            pages: [blank],
            activePageIdx: 0,
            saveImmediately: true,
        };
        syncProjectUrl(nextId);
        setIsProjectOpen(true);
    };

    const handleOpenSavedProject = (project) => {
        if (!project || !Array.isArray(project.pages) || project.pages.length === 0) {
            toast.error('This project has no valid pages');
            return;
        }
        const idx = Math.min(Math.max(0, Number(project.activePageIdx) || 0), project.pages.length - 1);
        const nextTitle = project.title || 'Untitled Design';
        setActiveProjectId(project.id);
        activeProjectIdRef.current = project.id;
        setProjectTitle(nextTitle);
        latestTitleRef.current = nextTitle;
        setPages(project.pages);
        latestPagesRef.current = project.pages;
        setActivePageIdx(idx);
        latestPageIdxRef.current = idx;
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        setSaveState('idle');
        setShowSaveText(false);
        pendingOpenRef.current = {
            projectId: project.id,
            title: nextTitle,
            pages: project.pages,
            activePageIdx: idx,
            saveImmediately: false,
        };
        syncProjectUrl(project.id);
        setIsProjectOpen(true);
    };

    const handleRenameSavedProject = async (projectId, nextTitle) => {
        const updated = await renameSavedProjectInIdb(projectId, nextTitle);
        if (updated) {
            await refreshSavedProjects();
            toast.success('Project renamed');
        }
    };

    const handleDuplicateSavedProject = async (projectId) => {
        const copy = await duplicateSavedProjectInIdb(projectId);
        if (copy) {
            await refreshSavedProjects();
            toast.success(`Duplicated "${copy.title}"`);
        }
    };

    const handleDeleteSavedProject = async (project) => {
        if (!project?.id) return;
        const confirmed = await requestConfirm({
            variant: 'danger',
            title: 'Delete Saved Project?',
            message: `Delete "${project.title || 'Untitled Design'}" permanently from your saved projects?`,
            confirmLabel: 'Delete Project',
            cancelLabel: 'Keep Project',
        });
        if (!confirmed) return;
        await deleteSavedProjectFromIdb(project.id);
        await refreshSavedProjects();
        toast.success('Project deleted');
    };

    // Template Apply & Reset
    const handleApplyTemplate = async (tpl) => {
        if (!tpl || !Array.isArray(tpl.pagesJson) || tpl.pagesJson.length === 0) return;
        const nextTitle = tpl.title || 'Untitled Design';
        const clonedPages = JSON.parse(JSON.stringify(tpl.pagesJson));

        if (!isProjectOpen) {
            const nextId = uid('proj');
            setActiveProjectId(nextId);
            activeProjectIdRef.current = nextId;
            setProjectTitle(nextTitle);
            latestTitleRef.current = nextTitle;
            setPages(clonedPages);
            latestPagesRef.current = clonedPages;
            setActivePageIdx(0);
            latestPageIdxRef.current = 0;
            pendingOpenRef.current = {
                projectId: nextId,
                title: nextTitle,
                pages: clonedPages,
                activePageIdx: 0,
                saveImmediately: true,
            };
            syncProjectUrl(nextId);
            setIsProjectOpen(true);
        } else {
            setProjectTitle(nextTitle);
            latestTitleRef.current = nextTitle;
            setPages(clonedPages);
            latestPagesRef.current = clonedPages;
            setActivePageIdx(0);
            latestPageIdxRef.current = 0;
            await loadPageIntoCanvas(clonedPages[0], true);
        }

        toast.success(`Applied "${tpl.title}"`);
        fetch('/api/editor/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType: 'template_apply', templateId: tpl.id }),
        }).catch(() => {});
    };

    const handleNewBlank = async () => {
        const confirmed = await requestConfirm({
            variant: 'warning',
            title: 'Start New Blank Design?',
            message: 'Current unsaved canvas changes will be cleared and replaced with a fresh blank canvas.',
            confirmLabel: 'Start Blank Design',
            cancelLabel: 'Keep Editing',
        });
        if (!confirmed) return;
        await clearProjectFromIdb();
        const nextId = uid('proj');
        setActiveProjectId(nextId);
        activeProjectIdRef.current = nextId;
        const blank = EMPTY_PAGE(defaultW, defaultH, defaultTrans);
        setProjectTitle('Untitled Design');
        latestTitleRef.current = 'Untitled Design';
        setPages([blank]);
        latestPagesRef.current = [blank];
        setActivePageIdx(0);
        latestPageIdxRef.current = 0;
        syncProjectUrl(nextId);
        await loadPageIntoCanvas(blank, true);
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        toast.success('Fresh blank canvas ready');
    };

    const handleImportProjectJson = async (file) => {
        try {
            const parsed = JSON.parse(await file.text());
            const nextPages = Array.isArray(parsed.pagesJson)
                ? parsed.pagesJson
                : Array.isArray(parsed.pages)
                    ? parsed.pages
                    : null;
            if (!nextPages || !nextPages.length) throw new Error('Invalid project JSON format');
            const nextTitle = parsed.title || 'Imported Design';

            if (!isProjectOpen) {
                const nextId = uid('proj');
                setActiveProjectId(nextId);
                activeProjectIdRef.current = nextId;
                setProjectTitle(nextTitle);
                latestTitleRef.current = nextTitle;
                setPages(nextPages);
                latestPagesRef.current = nextPages;
                setActivePageIdx(0);
                latestPageIdxRef.current = 0;
                pendingOpenRef.current = {
                    projectId: nextId,
                    title: nextTitle,
                    pages: nextPages,
                    activePageIdx: 0,
                    saveImmediately: true,
                };
                syncProjectUrl(nextId);
                setIsProjectOpen(true);
            } else {
                setProjectTitle(nextTitle);
                latestTitleRef.current = nextTitle;
                setPages(nextPages);
                latestPagesRef.current = nextPages;
                setActivePageIdx(0);
                latestPageIdxRef.current = 0;
                await loadPageIntoCanvas(nextPages[0], true);
            }
            toast.success('Project JSON loaded');
        } catch (err) {
            toast.error(err.message || 'Could not load JSON project');
        }
    };

    // Export Handler
    const handleExport = async (opts) => {
        const snapshotPages = snapshotCurrentPageIntoArray();
        setPages(snapshotPages);
        const safeName = (projectTitle || 'design').toLowerCase().replace(/[^a-z0-9-_]+/g, '-');

        if (opts.format === 'json') {
            const blob = new Blob([JSON.stringify({ title: projectTitle, pages: snapshotPages }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Project JSON downloaded');
            return;
        }

        setExporting(true);
        const toastId = toast.loading('Rendering high-resolution export...');
        try {
            if (opts.scope === 'all' && snapshotPages.length > 1) {
                const zipBlob = await exportPagesAsZip(snapshotPages, safeName, opts);
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${safeName}-all-pages.zip`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported ${snapshotPages.length} pages as ZIP!`, { id: toastId });
            } else {
                const activePage = snapshotPages[activePageIdx];
                const blob = await renderPageOffscreen(activePage, opts);
                const ext = opts.format === 'jpeg' ? 'jpg' : opts.format;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${safeName}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`Downloaded ${ext.toUpperCase()}!`, { id: toastId });
            }

            fetch('/api/editor/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'export',
                    format: opts.format,
                    width: canvasWidth * (opts.multiplier || 1),
                    height: canvasHeight * (opts.multiplier || 1),
                    pageCount: opts.scope === 'all' ? snapshotPages.length : 1,
                }),
            }).catch(() => {});
        } catch (err) {
            toast.error(err?.message || 'Export failed (ensure all layers loaded cleanly)', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const [savingCollectionHero, setSavingCollectionHero] = useState(false);

    const handleSaveCollectionHero = async () => {
        if (savingCollectionHero) return;
        setSavingCollectionHero(true);
        const toastId = toast.loading('Creating PNG & saving to collection...');
        try {
            const snapshotPages = snapshotCurrentPageIntoArray();
            setPages(snapshotPages);
            const activePage = snapshotPages[activePageIdx] || snapshotPages[0];
            const blob = await renderPageOffscreen(activePage, {
                format: 'png',
                quality: 1,
                multiplier: 1,
                transparent: activePage?.bgMeta?.mode === 'transparent',
            });

            const formData = new FormData();
            formData.append('file', blob, 'collection-hero.png');
            if (collectionHeroMode?.collectionId) {
                formData.append('collectionId', collectionHeroMode.collectionId);
            }
            if (collectionHeroMode?.targetField) {
                formData.append('targetField', collectionHeroMode.targetField);
            }

            const res = await fetch('/api/collections/upload-hero', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save cover image');
            }

            toast.success('Image saved to collection!', { id: toastId });
            const msg = {
                type: 'PNG101_COLLECTION_HERO_SAVED',
                path: data.path,
                targetField: collectionHeroMode?.targetField || 'heroImagePath',
                collectionId: collectionHeroMode?.collectionId || null,
            };
            if (typeof window !== 'undefined') {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(msg, window.location.origin);
                }
                if (window.opener) {
                    window.opener.postMessage(msg, window.location.origin);
                }
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to save cover image', { id: toastId });
        } finally {
            setSavingCollectionHero(false);
        }
    };

    const handleCancelCollectionHero = () => {
        if (typeof window !== 'undefined') {
            const msg = { type: 'PNG101_COLLECTION_HERO_CLOSE' };
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(msg, window.location.origin);
                return;
            }
            if (window.opener) {
                window.close();
                return;
            }
            window.history.back();
        }
    };

    // Admin Save / Publish Template
    const handleAdminSaveTemplate = async (e) => {
        e.preventDefault();
        if (!tplForm.title.trim()) {
            toast.error('Please enter a template title');
            return;
        }
        setAdminSaving(true);
        try {
            const latestPages = snapshotCurrentPageIntoArray();
            const thumbDataUrl = fabricRef.current
                ? await generateThumbnailDataUrl(fabricRef.current, canvasWidth, canvasHeight)
                : null;

            const payload = {
                title: tplForm.title.trim(),
                description: tplForm.description.trim(),
                categoryId: tplForm.categoryId || null,
                width: canvasWidth,
                height: canvasHeight,
                presetLabel: latestPages[0]?.presetLabel || `${canvasWidth}×${canvasHeight}`,
                pagesJson: latestPages,
                thumbnailPath: thumbDataUrl,
                status: tplForm.status,
                isFeatured: Boolean(tplForm.isFeatured),
                tags: tplForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
            };

            const isUpdate = Boolean(tplForm.id);
            const url = isUpdate ? `/api/admin/editor/templates/${tplForm.id}` : '/api/admin/editor/templates';
            const res = await fetch(url, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save template');

            setTplForm((prev) => ({ ...prev, id: data.template.id }));
            setProjectTitle(data.template.title);
            setAdminModalOpen(false);
            toast.success(isUpdate ? 'Template updated!' : 'New template published to Studio!');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAdminSaving(false);
        }
    };

    const categoriesForSelect = allTemplateCategories.length > 0 ? allTemplateCategories : templateCategories;

    const { canGroup: treeCanGroup, canUngroup: treeCanUngroup } = analyzeLayerSelection(layers, activeLayerIds);
    const resolvedCanGroup = selectionMeta?.type === 'activeselection' || treeCanGroup;
    const resolvedCanUngroup = selectionMeta?.type === 'group' || treeCanUngroup;

    return (
        <div
            data-editor-root="true"
            onContextMenu={(e) => e.preventDefault()}
            className="h-screen w-screen overflow-hidden flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors"
        >
            <Head title={seo.title || 'Image Editor Studio'}>
                {seo.description && <meta name="description" content={seo.description} />}
            </Head>

            <EditorTopBar
                isProjectOpen={isProjectOpen}
                onGoHome={handleGoEditorHome}
                projectTitle={projectTitle}
                onTitleChange={handleTitleChange}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                onResizeCanvas={handleResizeCanvas}
                presets={canvasPresets}
                maxWidth={maxWidth}
                maxHeight={maxHeight}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onNewBlank={handleNewBlank}
                onImportProjectJson={handleImportProjectJson}
                saveState={saveState}
                showSaveText={showSaveText}
                hasUnsavedChanges={hasUnsavedChanges}
                autosaveIntervalSec={autosaveIntervalSec}
                onChangeAutosaveInterval={(next) => {
                    const parsed = Number(next);
                    if (Number.isFinite(parsed) && parsed >= 0) setAutosaveIntervalSec(parsed);
                }}
                onManualSave={handleManualSave}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid((g) => !g)}
                showSafeMargins={showSafeMargins}
                onToggleSafeMargins={() => setShowSafeMargins((s) => !s)}
                snapPrefs={snapPrefs}
                onToggleSnapPref={handleToggleSnapPref}
                onUpdateSnapPrefs={handleUpdateSnapPrefs}
                layersOpen={layersOpen}
                onToggleLayers={() => setLayersOpen((o) => !o)}
                allowedFormats={editorSettings.allowedExportFormats}
                defaultQuality={editorSettings.defaultExportQuality}
                enableSvgExport={editorSettings.enableSvgExport}
                pageCount={pages.length}
                onExport={handleExport}
                exporting={exporting}
                adminTemplateMode={adminTemplateMode}
                adminTemplate={adminTemplate}
                canManageEditor={canPublishTemplate}
                onOpenAdminSaveModal={() => {
                    if (!canPublishTemplate) return;
                    setTplForm((p) => ({ ...p, title: p.title || projectTitle }));
                    setAdminModalOpen(true);
                }}
                collectionHeroMode={collectionHeroMode}
                onSaveCollectionHero={handleSaveCollectionHero}
                savingCollectionHero={savingCollectionHero}
                onCancelCollectionHero={handleCancelCollectionHero}
            />

            {isProjectOpen && (
                <EditorContextBar
                    selectedObject={selectedObject}
                    selectionMeta={selectionMeta}
                    fonts={fonts}
                    enableBgRemover={editorSettings.enableBgRemover}
                    removingBg={removingBg}
                    onUpdateProp={handleUpdateProp}
                    onUpdateFilter={handleUpdateFilter}
                    onApplyFrame={handleApplyFrame}
                    onToggleShadow={handleToggleShadow}
                    onToggleStickerOutline={handleToggleStickerOutline}
                    onUpdateShadow={handleUpdateShadow}
                    onUpdateGlow={handleUpdateGlow}
                    onFlip={handleFlip}
                    onAlign={handleAlign}
                    onZOrder={handleZOrder}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeleteSelected}
                    onToggleLock={handleToggleLock}
                    onRemoveBgSelected={handleRemoveBgSelected}
                    onFitToCanvas={handleFitToCanvas}
                    onOpenBgPanel={() => {
                        setActiveTab('background');
                        setDrawerOpen(true);
                    }}
                    snapPrefs={snapPrefs}
                    onToggleSnapPref={handleToggleSnapPref}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                />
            )}

            {isProjectOpen ? (
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    <EditorLeftDrawer
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    drawerOpen={drawerOpen}
                    onToggleDrawer={setDrawerOpen}
                    templateCategories={templateCategories}
                    onApplyTemplate={handleApplyTemplate}
                    catalogCategories={catalogCategories}
                    catalogCollections={catalogCollections}
                    onInsertAsset={(asset) => insertAssetOnCanvas(asset)}
                    onAddElement={handleAddElement}
                    onApplyFrame={handleApplyFrame}
                    selectedIsImage={selectionMeta?.type?.toLowerCase() === 'image'}
                    fonts={fonts}
                    onAddText={handleAddText}
                    onAddTextPairing={handleAddTextPairing}
                    uploads={uploads}
                    onUploadFiles={handleUploadFiles}
                    onInsertUpload={(item) => insertAssetOnCanvas({ name: item.name, url: item.url })}
                    onRemoveBgUpload={handleRemoveBgUpload}
                    removingUploadId={removingUploadId}
                    enableBgRemover={editorSettings.enableBgRemover}
                    bgMeta={bgMeta}
                    onUpdateBackground={handleUpdateBackground}
                    onUploadBgImage={handleUploadBgImage}
                    extractedPalette={extractedPalette}
                    onExtractPalette={handleExtractPalette}
                    enableFreehandDraw={editorSettings.enableFreehandDraw}
                    isDrawingMode={activeTool === 'draw'}
                    onToggleDrawingMode={(next) => setActiveTool(next ? 'draw' : 'select')}
                    brushConfig={brushConfig}
                    onChangeBrushConfig={setBrushConfig}
                    layers={layers}
                    layersOpen={layersOpen}
                    onToggleLayers={setLayersOpen}
                    activeLayerIds={activeLayerIds}
                    onSelectLayer={handleSelectLayer}
                    onToggleLayerVisible={handleToggleLayerVisible}
                    onToggleLayerLock={handleToggleLayerLock}
                    onDeleteLayer={handleDeleteLayer}
                    onGroupSelected={handleGroupSelected}
                    onUngroupSelected={handleUngroupSelected}
                    canGroup={resolvedCanGroup}
                    canUngroup={resolvedCanUngroup}
                />

                <EditorStage
                    canvasElRef={canvasElRef}
                    viewportRef={viewportRef}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    onFitZoom={() => fitZoomToViewport()}
                    panOffset={panOffset}
                    onPanChange={setPanOffset}
                    activeTool={activeTool}
                    onSelectTool={(t) => {
                        setActiveTool(t);
                        if (t === 'text') {
                            handleAddText({ text: 'New Heading', fontSize: 72, fontWeight: '800' });
                        } else if (t === 'draw') {
                            setActiveTab('draw');
                            setDrawerOpen(true);
                        }
                    }}
                    enableFreehandDraw={editorSettings.enableFreehandDraw}
                    showGrid={showGrid}
                    onToggleGrid={() => setShowGrid((g) => !g)}
                    showSafeMargins={showSafeMargins}
                    onToggleSafeMargins={() => setShowSafeMargins((s) => !s)}
                    snapGuides={snapGuides}
                    snapPrefs={snapPrefs}
                    onToggleSnapPref={handleToggleSnapPref}
                    isTransparentBg={bgMeta.mode === 'transparent'}
                    onDropAssetOrFile={(payload) => {
                        if (payload.type === 'asset') {
                            insertAssetOnCanvas(payload.asset);
                        } else if (payload.type === 'files') {
                            handleUploadFiles(payload.files);
                        }
                    }}
                    selectedObject={selectedObject}
                    selectionMeta={selectionMeta}
                    selectionBounds={selectionBounds}
                    isTransforming={isTransforming}
                    fonts={fonts}
                    enableBgRemover={editorSettings.enableBgRemover}
                    removingBg={removingBg}
                    onUpdateProp={handleUpdateProp}
                    onUpdateFilter={handleUpdateFilter}
                    onApplyFrame={handleApplyFrame}
                    onFitToCanvas={handleFitToCanvas}
                    onAlign={handleAlign}
                    onToggleShadow={handleToggleShadow}
                    onToggleStickerOutline={handleToggleStickerOutline}
                    onUpdateShadow={handleUpdateShadow}
                    onUpdateGlow={handleUpdateGlow}
                    onRemoveBgSelected={handleRemoveBgSelected}
                    onGroupSelected={handleGroupSelected}
                    onUngroupSelected={handleUngroupSelected}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeleteSelected}
                    onZOrder={handleZOrder}
                    onContextMenuSelectTarget={handleContextMenuSelectTarget}
                    onFlip={handleFlip}
                    onToggleLock={handleToggleLock}
                    layers={layers}
                    layersOpen={layersOpen}
                    onToggleLayers={setLayersOpen}
                    activeLayerIds={activeLayerIds}
                    onSelectLayer={handleSelectLayer}
                    onToggleLayerVisible={handleToggleLayerVisible}
                    onToggleLayerLock={handleToggleLayerLock}
                    onReorderLayer={handleReorderLayer}
                    onMoveLayerTree={handleMoveLayerTree}
                    onMoveLayersBatch={handleMoveLayersBatch}
                    onRenameLayer={handleRenameLayer}
                    onDuplicateLayer={handleDuplicateLayer}
                    onBatchToggleVisible={handleBatchToggleVisible}
                    onBatchToggleLock={handleBatchToggleLock}
                    onDeleteLayer={handleDeleteLayer}
                    onDeleteLayerIds={handleDeleteLayerIds}
                    canGroup={resolvedCanGroup}
                    canUngroup={resolvedCanUngroup}
                    pages={pages}
                    activePageIdx={activePageIdx}
                    maxPages={maxPages}
                    onSwitchPage={handleSwitchPage}
                    onAddPage={handleAddPage}
                    onDuplicatePage={handleDuplicatePage}
                    onDeletePage={handleDeletePage}
                />
                </div>
            ) : (
                <EditorHomeView
                    savedProjects={savedProjects}
                    projectsLoading={projectsLoading}
                    templateCategories={templateCategories}
                    canvasPresets={canvasPresets}
                    defaultWidth={defaultW}
                    defaultHeight={defaultH}
                    defaultTransparent={defaultTrans}
                    maxWidth={maxWidth}
                    maxHeight={maxHeight}
                    onCreateProject={handleCreateNewProjectFromHome}
                    onOpenProject={handleOpenSavedProject}
                    onRenameProject={handleRenameSavedProject}
                    onDuplicateProject={handleDuplicateSavedProject}
                    onDeleteProject={handleDeleteSavedProject}
                    onApplyTemplate={handleApplyTemplate}
                    onImportProjectJson={handleImportProjectJson}
                />
            )}

            {/* Admin Publish / Save Template Modal */}
            {adminModalRendered && canPublishTemplate && (
                <div
                    data-testid="admin-template-modal"
                    data-visible={adminModalVisible ? 'true' : 'false'}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setAdminModalOpen(false);
                    }}
                    className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        adminModalVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <form
                        ref={adminModalDrag.panelRef}
                        noValidate
                        onSubmit={handleAdminSaveTemplate}
                        data-testid="admin-template-card"
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ transform: `translate3d(${adminModalDrag.offset.x}px, ${adminModalDrag.offset.y}px, 0)` }}
                        className={`w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 origin-center ${EDITOR_PANEL_TRANSITION} ${adminModalDrag.isDragging ? '!transition-none' : ''} ${
                            adminModalVisible
                                ? 'opacity-100 translate-y-0 scale-100'
                                : 'opacity-0 translate-y-5 scale-75'
                        }`}
                    >
                        <div
                            data-testid="admin-template-drag-handle"
                            onPointerDown={adminModalDrag.handleDragStart}
                            className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                        >
                            <div className="flex items-center gap-2 text-sm font-bold">
                                <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                                <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                <span>{tplForm.id ? 'Update Studio Template' : 'Publish New Studio Template'}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAdminModalOpen(false)}
                                data-tooltip="Close"
                                aria-label="Close modal"
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Template Title</label>
                                <input
                                    type="text"
                                    value={tplForm.title}
                                    onChange={(e) => setTplForm((p) => ({ ...p, title: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                    <StudioSelect
                                        aria-label="Template category"
                                        value={tplForm.categoryId}
                                        onChange={(e) => setTplForm((p) => ({ ...p, categoryId: e.target.value }))}
                                        className="w-full"
                                    >
                                        <option value="">Uncategorized</option>
                                        {categoriesForSelect.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </StudioSelect>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Visibility Status</label>
                                    <StudioSelect
                                        aria-label="Template visibility status"
                                        value={tplForm.status}
                                        onChange={(e) => setTplForm((p) => ({ ...p, status: e.target.value }))}
                                        className="w-full"
                                    >
                                        <option value="published">Published (Live)</option>
                                        <option value="draft">Draft (Hidden)</option>
                                        <option value="archived">Archived</option>
                                    </StudioSelect>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    value={tplForm.description}
                                    onChange={(e) => setTplForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="Brief summary for users browsing templates..."
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    value={tplForm.tags}
                                    onChange={(e) => setTplForm((p) => ({ ...p, tags: e.target.value }))}
                                    placeholder="promo, sale, instagram"
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                <span className="font-bold">Mark as Featured Template</span>
                                <input
                                    type="checkbox"
                                    checked={tplForm.isFeatured}
                                    onChange={(e) => setTplForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                                    className="w-4 h-4 accent-blue-600"
                                />
                            </label>
                        </div>

                        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/60">
                            <button
                                type="button"
                                onClick={() => router.visit('/admin/dashboard/editor/templates')}
                                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                                Manage All Templates
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAdminModalOpen(false)}
                                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adminSaving}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{adminSaving ? 'Saving...' : 'Save Template'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Unsaved Edits Guard Modal (Cancel / Close Without Saving / Save & Close) */}
            {unsavedModalPresence.rendered && (
                <div
                    data-testid="unsaved-edits-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Unsaved edits confirmation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget && !unsavedSaving) {
                            handleResolveUnsaved('cancel');
                        }
                    }}
                    className={`fixed inset-0 z-[125] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${
                        unsavedModalPresence.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <div
                        className={`w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 ${EDITOR_PANEL_TRANSITION} ${
                            unsavedModalPresence.visible
                                ? 'opacity-100 scale-100 translate-y-0'
                                : 'opacity-0 scale-95 translate-y-2'
                        }`}
                    >
                        <div className="p-5 flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    Save changes before leaving?
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    You have unsaved edits in{' '}
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        &ldquo;{projectTitle || 'Untitled Design'}&rdquo;
                                    </span>
                                    . If you{' '}
                                    {lastUnsavedPromptRef.current?.actionType === 'reload'
                                        ? 'refresh now'
                                        : 'close without saving'}
                                    , your recent changes will be lost.
                                </p>
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                data-testid="unsaved-cancel-btn"
                                disabled={unsavedSaving}
                                onClick={() => handleResolveUnsaved('cancel')}
                                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                data-testid="unsaved-discard-btn"
                                disabled={unsavedSaving}
                                onClick={() => handleResolveUnsaved('discard')}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/12 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                            >
                                Close Without Saving
                            </button>
                            <button
                                type="button"
                                data-testid="unsaved-save-btn"
                                disabled={unsavedSaving}
                                onClick={() => handleResolveUnsaved('save')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{unsavedSaving ? 'Saving...' : 'Save & Close'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <EditorConfirmDialog
                open={confirmDialog.open}
                variant={confirmDialog.variant}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={() => closeConfirmDialog(true)}
                onCancel={() => closeConfirmDialog(false)}
            />

            <EditorToaster />
            <EditorTooltipLayer />
        </div>
    );
}
