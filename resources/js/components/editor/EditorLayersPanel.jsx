import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Layers,
    X,
    GripVertical,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Trash2,
    Group,
    Ungroup,
    Pencil,
    Copy,
    Folder,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Type,
    Image as ImageIcon,
    PenTool,
    Square,
    Circle as CircleIcon,
    Triangle as TriangleIcon,
    Hexagon,
    Star,
    Minus,
    FolderOutput,
    Plus,
    Frame,
    FolderPlus,
    Maximize2,
} from 'lucide-react';
import { useDraggablePanel } from './useDraggablePanel';
import { AnimatedPopover } from './useAnimatedPresence';

function findLayerInTree(list, layerId) {
    for (const item of list) {
        if (item.layerId === layerId) return item;
        if (item.children?.length) {
            const hit = findLayerInTree(item.children, layerId);
            if (hit) return hit;
        }
    }
    return null;
}

function getLayerTypeVisual(layer, isCollapsed = false) {
    const t = (layer.type || 'layer').toLowerCase();
    const name = (layer.layerName || '').toLowerCase();

    if (t === 'artboard') {
        const count = layer.children?.length ?? 0;
        const dims = layer.width && layer.height ? `${layer.width}×${layer.height} · ` : '';
        return {
            Icon: Frame,
            badgeClass:
                'bg-blue-600/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300 border border-blue-500/40',
            subtitle: `${dims}${count} ${count === 1 ? 'layer' : 'layers'}`,
        };
    }
    if (t === 'group') {
        const count = layer.children?.length ?? 0;
        const isLayerRole = layer.layerRole === 'layer';
        return {
            Icon: isLayerRole ? Layers : isCollapsed ? Folder : FolderOpen,
            badgeClass: isLayerRole
                ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-300 border border-emerald-400/35'
                : 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-300 border border-indigo-400/35',
            subtitle: isLayerRole
                ? count === 0
                    ? 'Empty Layer'
                    : `Layer · ${count} ${count === 1 ? 'item' : 'items'}`
                : `Group · ${count} ${count === 1 ? 'item' : 'items'}`,
        };
    }
    if (t === 'textbox' || t === 'i-text' || t === 'text') {
        return {
            Icon: Type,
            badgeClass: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300',
            subtitle: 'Text',
        };
    }
    if (t === 'image') {
        return {
            Icon: ImageIcon,
            badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-300',
            subtitle: 'Image',
        };
    }
    if (t === 'path') {
        return {
            Icon: PenTool,
            badgeClass: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-300',
            subtitle: 'Path',
        };
    }
    if (t === 'circle') {
        return {
            Icon: CircleIcon,
            badgeClass: 'bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-300',
            subtitle: 'Circle',
        };
    }
    if (t === 'triangle') {
        return {
            Icon: TriangleIcon,
            badgeClass: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/25 dark:text-orange-300',
            subtitle: 'Triangle',
        };
    }
    if (t === 'polygon') {
        const isStar = name.includes('star') || name.includes('burst');
        return {
            Icon: isStar ? Star : Hexagon,
            badgeClass: 'bg-pink-500/15 text-pink-600 dark:bg-pink-500/25 dark:text-pink-300',
            subtitle: isStar ? 'Star' : 'Polygon',
        };
    }
    if (t === 'line') {
        return {
            Icon: Minus,
            badgeClass: 'bg-slate-500/15 text-slate-600 dark:bg-slate-500/25 dark:text-slate-300',
            subtitle: 'Line',
        };
    }
    return {
        Icon: Square,
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300',
        subtitle: t === 'rect' ? 'Rectangle' : t,
    };
}

function getSubtreeBottom(groupSlot, rows) {
    let bottom = groupSlot.bottom;
    for (let i = groupSlot.flatIndex + 1; i < rows.length; i += 1) {
        const r = rows[i];
        if (r.ancestorGroupIds.includes(groupSlot.layerId)) {
            bottom = Math.max(bottom, r.bottom);
        } else {
            break;
        }
    }
    return bottom;
}

function computeDropDecision(fromSlot, draggedMid, rawOffsetY, slots) {
    const { rows } = slots;

    // Artboards stay top-level and only reorder among artboards
    if (fromSlot.isArtboard) {
        const artboardSlots = rows.filter((r) => r.isArtboard);
        let targetIdx = fromSlot.indexInParent;
        let targetFlat = fromSlot.flatIndex;
        if (draggedMid > fromSlot.mid) {
            for (const r of artboardSlots) {
                if (r.indexInParent <= fromSlot.indexInParent) continue;
                const passY = !r.isCollapsed ? getSubtreeBottom(r, rows) - 6 : r.mid;
                if (draggedMid > passY) {
                    targetIdx = r.indexInParent;
                    targetFlat = r.flatIndex;
                }
            }
        } else if (draggedMid < fromSlot.mid) {
            for (const r of artboardSlots) {
                if (r.indexInParent >= fromSlot.indexInParent) continue;
                if (draggedMid < r.mid) {
                    targetIdx = Math.min(targetIdx, r.indexInParent);
                    if (targetIdx === r.indexInParent) targetFlat = r.flatIndex;
                }
            }
        }
        return {
            mode: 'reorder-artboard',
            destinationParentGroupId: null,
            destinationIndex: targetIdx,
            hoverGroupId: null,
            targetFlatIndex: targetFlat,
        };
    }

    const groupsDeepestFirst = rows
        .filter((r) => r.isContainer)
        .sort((a, b) => b.depth - a.depth || a.flatIndex - b.flatIndex);

    const isEligibleGroup = (g) =>
        g.layerId !== fromSlot.layerId && !g.ancestorGroupIds.includes(fromSlot.layerId);

    // 1. Check direct drop ONTO a Group card (works for both leaf layers and nested Groups)
    for (const g of groupsDeepestFirst) {
        if (!isEligibleGroup(g)) continue;
        const isOwnParent = fromSlot.parentGroupId === g.layerId;
        if (!isOwnParent && draggedMid >= g.top + 5 && draggedMid <= g.bottom - 5) {
            return {
                mode: 'into-group',
                destinationParentGroupId: g.layerId,
                destinationIndex: 0,
                hoverGroupId: g.layerId,
                targetFlatIndex: g.flatIndex,
            };
        }
    }

    // 2. Check direct children / descendants inside expanded Groups (deepest first)
    for (const g of groupsDeepestFirst) {
        if (!isEligibleGroup(g) || g.isCollapsed) continue;
        const directChildren = rows.filter((r) => r.parentGroupId === g.layerId);
        if (directChildren.length === 0) continue;

        const subtreeBottom = getSubtreeBottom(g, rows);
        const lastDirectChild = directChildren[directChildren.length - 1];
        const isOwnParent = fromSlot.parentGroupId === g.layerId;

        if (isOwnParent) {
            const pulledAboveOwnGroup = draggedMid < g.mid;
            const pulledBelowLastChild =
                draggedMid > subtreeBottom - 2 ||
                (fromSlot.flatIndex === lastDirectChild.flatIndex &&
                    rawOffsetY > lastDirectChild.mid - fromSlot.mid + 14);
            if (pulledAboveOwnGroup || pulledBelowLastChild) {
                continue;
            }
        }

        if (draggedMid >= g.bottom - 3 && draggedMid <= subtreeBottom + 2) {
            if (isOwnParent) {
                let targetIdx = fromSlot.indexInParent;
                let targetFlat = fromSlot.flatIndex;
                for (const c of directChildren) {
                    const cPassY = c.isGroup && !c.isCollapsed ? getSubtreeBottom(c, rows) - 6 : c.mid;
                    if (c.indexInParent > fromSlot.indexInParent && draggedMid > cPassY) {
                        targetIdx = c.indexInParent;
                        targetFlat = c.flatIndex;
                    } else if (c.indexInParent < fromSlot.indexInParent && draggedMid < c.mid) {
                        targetIdx = Math.min(targetIdx, c.indexInParent);
                        if (targetIdx === c.indexInParent) targetFlat = c.flatIndex;
                    }
                }
                return {
                    mode: 'reorder-sibling',
                    destinationParentGroupId: g.layerId,
                    destinationIndex: targetIdx,
                    hoverGroupId: g.layerId,
                    targetFlatIndex: targetFlat,
                };
            }

            let insertIdx = 0;
            let targetFlat = g.flatIndex + 1;
            for (const c of directChildren) {
                if (draggedMid > c.mid) {
                    insertIdx = c.indexInParent + 1;
                    targetFlat = c.flatIndex;
                }
            }
            return {
                mode: 'into-group',
                destinationParentGroupId: g.layerId,
                destinationIndex: insertIdx,
                hoverGroupId: g.layerId,
                targetFlatIndex: targetFlat,
            };
        }
    }

    // 3. Reorder or extract to an enclosing parent level (walking from immediate parent upward to root)
    if (fromSlot.parentGroupId) {
        const ownParent = rows.find((r) => r.layerId === fromSlot.parentGroupId);
        if (ownParent) {
            const targetParentId = ownParent.parentGroupId || null;
            const targetSiblings = rows.filter((r) => (r.parentGroupId || null) === targetParentId);

            // Check if user dragged even past an outer ancestor up/down to root
            const ancestorToBreak = ownParent.parentGroupId
                ? rows.find((r) => r.layerId === ownParent.parentGroupId)
                : null;
            const useRootFallback =
                ancestorToBreak &&
                (draggedMid < ancestorToBreak.mid ||
                    draggedMid > getSubtreeBottom(ancestorToBreak, rows) - 2);

            if (!useRootFallback) {
                let targetIdx = ownParent.indexInParent;
                if (draggedMid <= ownParent.mid) {
                    targetIdx = ownParent.indexInParent;
                    for (const s of targetSiblings) {
                        if (s.indexInParent >= ownParent.indexInParent) break;
                        if (draggedMid < s.mid) {
                            targetIdx = Math.min(targetIdx, s.indexInParent);
                        }
                    }
                } else {
                    targetIdx = Math.min(targetSiblings.length, ownParent.indexInParent + 1);
                    for (const s of targetSiblings) {
                        if (s.indexInParent <= ownParent.indexInParent) continue;
                        const passY = s.isGroup && !s.isCollapsed ? getSubtreeBottom(s, rows) - 6 : s.mid;
                        if (draggedMid > passY) {
                            targetIdx = Math.min(targetSiblings.length, s.indexInParent + 1);
                        }
                    }
                }

                return {
                    mode: 'to-parent',
                    destinationParentGroupId: targetParentId,
                    destinationIndex: targetIdx,
                    hoverGroupId: targetParentId,
                    targetFlatIndex: -1,
                };
            }
        }
    }

    // 4. Reorder within owning Artboard if dragged near top/bottom outside nested group
    const hasArtboardRoot = rows.some((r) => r.isArtboard);
    if (hasArtboardRoot) {
        const ownAbId = fromSlot.ancestorGroupIds[0] || fromSlot.parentGroupId;
        const fallbackAb = rows.find((r) => r.layerId === ownAbId) || rows.find((r) => r.isArtboard);
        if (fallbackAb) {
            const directChildren = rows.filter((r) => r.parentGroupId === fallbackAb.layerId);
            const atBottom = draggedMid > getSubtreeBottom(fallbackAb, rows) - 4;
            return {
                mode: 'to-parent',
                destinationParentGroupId: fallbackAb.layerId,
                destinationIndex: atBottom ? directChildren.length : 0,
                hoverGroupId: fallbackAb.layerId,
                targetFlatIndex: -1,
            };
        }
    }

    const rootSlots = rows.filter((r) => r.depth === 0);
    if (fromSlot.depth === 0) {
        let targetTopIdx = fromSlot.indexInParent;
        let targetFlat = fromSlot.flatIndex;

        if (draggedMid > fromSlot.mid) {
            for (const r of rootSlots) {
                if (r.indexInParent <= fromSlot.indexInParent) continue;
                const passY = r.isGroup && !r.isCollapsed ? getSubtreeBottom(r, rows) - 6 : r.mid;
                if (draggedMid > passY) {
                    targetTopIdx = r.indexInParent;
                    targetFlat = r.flatIndex;
                }
            }
        } else if (draggedMid < fromSlot.mid) {
            for (const r of rootSlots) {
                if (r.indexInParent >= fromSlot.indexInParent) continue;
                if (draggedMid < r.mid) {
                    targetTopIdx = Math.min(targetTopIdx, r.indexInParent);
                    if (targetTopIdx === r.indexInParent) targetFlat = r.flatIndex;
                }
            }
        }

        return {
            mode: 'reorder-sibling',
            destinationParentGroupId: null,
            destinationIndex: targetTopIdx,
            hoverGroupId: null,
            targetFlatIndex: targetFlat,
        };
    }

    const rootAncestorId = fromSlot.ancestorGroupIds[0];
    const rootAnc = rootSlots.find((r) => r.layerId === rootAncestorId);
    const rootAncIdx = rootAnc ? rootAnc.indexInParent : 0;
    let targetRootIdx = rootAncIdx;
    if (rootAnc && draggedMid <= rootAnc.mid) {
        for (const r of rootSlots) {
            if (r.indexInParent >= rootAncIdx) break;
            if (draggedMid < r.mid) targetRootIdx = Math.min(targetRootIdx, r.indexInParent);
        }
    } else {
        targetRootIdx = Math.min(rootSlots.length, rootAncIdx + 1);
        for (const r of rootSlots) {
            if (r.indexInParent <= rootAncIdx) continue;
            const passY = r.isGroup && !r.isCollapsed ? getSubtreeBottom(r, rows) - 6 : r.mid;
            if (draggedMid > passY) targetRootIdx = Math.min(rootSlots.length, r.indexInParent + 1);
        }
    }

    return {
        mode: 'to-parent',
        destinationParentGroupId: null,
        destinationIndex: targetRootIdx,
        hoverGroupId: null,
        targetFlatIndex: -1,
    };
}

export default function EditorLayersPanel({
    open = false,
    onClose,
    layers = [],
    activeLayerIds = [],
    activeArtboardId = null,
    onSelectArtboard,
    onSelectLayer,
    onToggleLayerVisible,
    onToggleLayerLock,
    onReorderLayer,
    onMoveLayerTree,
    onMoveLayersBatch,
    onRenameLayer,
    onDuplicate,
    onBatchToggleVisible,
    onBatchToggleLock,
    onDeleteLayer,
    onDeleteSelected,
    onGroupSelected,
    onUngroupSelected,
    onOpenNewArtboardModal,
    onResizeArtboard,
    onDuplicateArtboard,
    onReorderArtboard,
    onCreateGroupLayer,
    onCreateEmptyLayer,
    canGroup = false,
    canUngroup = false,
    obstacleRects = [],
    viewportRef = null,
}) {
    const [rendered, setRendered] = useState(open);
    const [visible, setVisible] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [dragState, setDragState] = useState(null);
    const [layerMenu, setLayerMenu] = useState(null);
    const lastLayerMenuRef = useRef(null);
    if (layerMenu) {
        lastLayerMenuRef.current = layerMenu;
    }
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const addBtnRef = useRef(null);
    const addMenuPanelRef = useRef(null);
    const lastAddPosRef = useRef({ top: 300, left: 800 });
    const [renamingLayerId, setRenamingLayerId] = useState(null);
    const [renameDraft, setRenameDraft] = useState('');
    const renameInputRef = useRef(null);
    const [smartDelta, setSmartDelta] = useState({ x: 0, y: 0 });

    const {
        panelRef,
        offset: panelOffset,
        isDragging: isDraggingPanel,
        hasMoved: panelMoved,
        handleDragPointerDown,
        resetPosition: resetPanelPosition,
    } = useDraggablePanel('layers', smartDelta);

    useLayoutEffect(() => {
        if (!open) {
            if (!rendered) setSmartDelta({ x: 0, y: 0 });
            return;
        }
        if (isDraggingPanel) {
            if (smartDelta.x !== 0 || smartDelta.y !== 0) {
                setSmartDelta({ x: 0, y: 0 });
            }
            return;
        }
        const el = panelRef.current;
        const vp = viewportRef?.current || el?.parentElement;
        if (!el || !vp) return;

        const vpW = vp.clientWidth;
        const vpH = vp.clientHeight;
        const panelW = el.offsetWidth || 304;
        const panelH = el.offsetHeight || 280;
        if (!vpW || !vpH) return;

        const minLeft = 8;
        const maxLeftAny = Math.max(minLeft, vpW - panelW - 8);
        const maxLeftSafe = Math.max(minLeft, vpW - panelW - 64);
        const minTop = 12;
        const maxTop = Math.max(minTop, vpH - panelH - 12);

        const prefLeft = Math.max(minLeft, Math.min(maxLeftAny, vpW - 66 + panelOffset.x - panelW));
        const prefTop = Math.max(minTop, Math.min(maxTop, 12 + panelOffset.y));

        const obstacles = Array.isArray(obstacleRects) ? obstacleRects.filter(Boolean) : [];
        if (obstacles.length === 0) {
            if (smartDelta.x !== 0 || smartDelta.y !== 0) {
                setSmartDelta({ x: 0, y: 0 });
            }
            return;
        }

        const gap = 12;
        const overlapsAny = (rect) =>
            obstacles.some(
                (obs) =>
                    obs.left - gap < rect.right &&
                    obs.right + gap > rect.left &&
                    obs.top - gap < rect.bottom &&
                    obs.bottom + gap > rect.top
            );

        const prefRect = { left: prefLeft, top: prefTop, right: prefLeft + panelW, bottom: prefTop + panelH };
        if (!overlapsAny(prefRect)) {
            if (smartDelta.x !== 0 || smartDelta.y !== 0) {
                setSmartDelta({ x: 0, y: 0 });
            }
            return;
        }

        const clampX = (x) => Math.max(minLeft, Math.min(maxLeftSafe, x));
        const clampY = (y) => Math.max(minTop, Math.min(maxTop, y));
        const candidates = [];
        const addCandidate = (left, top) => {
            const cLeft = Math.round(left);
            const cTop = Math.round(top);
            if (cLeft < minLeft || cLeft > maxLeftSafe || cTop < minTop || cTop > maxTop) return;
            const rect = { left: cLeft, top: cTop, right: cLeft + panelW, bottom: cTop + panelH };
            if (!overlapsAny(rect)) {
                candidates.push({ left: cLeft, top: cTop });
            }
        };

        for (const obs of obstacles) {
            addCandidate(obs.left - gap - panelW, clampY(prefTop)); // Left of panel (keep vertical preference)
            addCandidate(clampX(prefLeft), obs.bottom + gap); // Below panel (keep horizontal preference)
            addCandidate(obs.right + gap, clampY(prefTop)); // Right of panel (if tool moved left)
            addCandidate(clampX(prefLeft), obs.top - gap - panelH); // Above panel
            addCandidate(obs.left - gap - panelW, clampY(obs.top)); // Align top on left
            addCandidate(clampX(obs.left), obs.bottom + gap); // Align left below
            addCandidate(clampX(obs.right - panelW), obs.bottom + gap); // Align right below
            addCandidate(obs.left - gap - panelW, maxTop); // Left bottom fallback
        }

        if (candidates.length > 0) {
            let best = candidates[0];
            let bestDist = Math.hypot(best.left - prefLeft, best.top - prefTop);
            for (let i = 1; i < candidates.length; i++) {
                const c = candidates[i];
                const d = Math.hypot(c.left - prefLeft, c.top - prefTop);
                if (d < bestDist) {
                    best = c;
                    bestDist = d;
                }
            }
            const nextDelta = { x: Math.round(best.left - prefLeft), y: Math.round(best.top - prefTop) };
            if (nextDelta.x !== smartDelta.x || nextDelta.y !== smartDelta.y) {
                setSmartDelta(nextDelta);
            }
        }
    }, [open, rendered, isDraggingPanel, obstacleRects, panelOffset.x, panelOffset.y, layers.length, expandedGroups]);

    const visibleRows = useMemo(() => {
        const rows = [];
        const walk = (list, depth = 0, parentGroupId = null, ancestorGroupIds = [], inheritedLocked = false) => {
            list.forEach((layer, indexInParent) => {
                const t = (layer.type || '').toLowerCase();
                const isArtboard = t === 'artboard';
                const isGroup = t === 'group';
                const isContainer = isArtboard || isGroup;
                const isCollapsed = isArtboard
                    ? expandedGroups[layer.layerId] === false
                    : isGroup && !expandedGroups[layer.layerId];
                const effectiveLocked = inheritedLocked || Boolean(layer.locked);
                rows.push({
                    layer,
                    layerId: layer.layerId,
                    depth,
                    parentGroupId,
                    ancestorGroupIds,
                    indexInParent,
                    siblingCount: list.length,
                    isArtboard,
                    isGroup,
                    isContainer,
                    isCollapsed,
                    effectiveLocked,
                });
                if (isContainer && !isCollapsed && Array.isArray(layer.children) && layer.children.length > 0) {
                    walk(layer.children, depth + 1, layer.layerId, [...ancestorGroupIds, layer.layerId], effectiveLocked);
                }
            });
        };
        walk(layers, 0, null, [], false);
        return rows;
    }, [layers, expandedGroups]);

    const { artboardCount, totalLeafCount } = useMemo(() => {
        let abCount = 0;
        let leafCount = 0;
        const countWalk = (list) => {
            for (const item of list || []) {
                const t = (item.type || '').toLowerCase();
                if (t === 'artboard') {
                    abCount += 1;
                    countWalk(item.children);
                } else if (t === 'group') {
                    countWalk(item.children);
                } else {
                    leafCount += 1;
                }
            }
        };
        countWalk(layers);
        return { artboardCount: abCount, totalLeafCount: leafCount };
    }, [layers]);

    const effectiveLockedById = useMemo(() => {
        const map = new Map();
        const walk = (list, inheritedLocked = false) => {
            for (const layer of list || []) {
                const eff = inheritedLocked || Boolean(layer.locked);
                if (layer.layerId) map.set(layer.layerId, eff);
                if (Array.isArray(layer.children) && layer.children.length > 0) {
                    walk(layer.children, eff);
                }
            }
        };
        walk(layers, false);
        return map;
    }, [layers]);

    const exitTimerRef = useRef(null);
    const listRef = useRef(null);
    const pendingDragRef = useRef(null);
    const activeDragRef = useRef(null);
    const slotsRef = useRef(null);
    const justDraggedRef = useRef(false);
    const visibleRowsRef = useRef(visibleRows);
    const activeLayerIdsRef = useRef(activeLayerIds);
    const moveBatchCbRef = useRef(onMoveLayersBatch);
    const moveTreeCbRef = useRef(onMoveLayerTree);
    const reorderCbRef = useRef(onReorderLayer);
    const reorderAbCbRef = useRef(onReorderArtboard);

    visibleRowsRef.current = visibleRows;
    activeLayerIdsRef.current = activeLayerIds;
    moveBatchCbRef.current = onMoveLayersBatch;
    moveTreeCbRef.current = onMoveLayerTree;
    reorderCbRef.current = onReorderLayer;
    reorderAbCbRef.current = onReorderArtboard;

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
        pendingDragRef.current = null;
        activeDragRef.current = null;
        slotsRef.current = null;
        setDragState(null);
        setLayerMenu(null);
        setAddMenuOpen(false);
        setRenamingLayerId(null);

        exitTimerRef.current = setTimeout(() => {
            setRendered(false);
        }, 295);

        return () => {
            if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        };
    }, [open]);

    useEffect(() => {
        const measureSlots = () => {
            const container = listRef.current;
            if (!container) return null;
            const rowEls = Array.from(container.querySelectorAll('[data-layer-row-index]'));
            if (rowEls.length === 0) return null;
            const curRows = visibleRowsRef.current;
            const rows = rowEls.map((el, idx) => {
                const r = el.getBoundingClientRect();
                const meta = curRows[idx] || {};
                return {
                    flatIndex: idx,
                    layerId: meta.layerId,
                    depth: meta.depth ?? 0,
                    parentGroupId: meta.parentGroupId ?? null,
                    ancestorGroupIds: meta.ancestorGroupIds ?? [],
                    indexInParent: meta.indexInParent ?? idx,
                    isArtboard: Boolean(meta.isArtboard),
                    isGroup: Boolean(meta.isGroup),
                    isContainer: Boolean(meta.isContainer),
                    isCollapsed: Boolean(meta.isCollapsed),
                    top: r.top,
                    bottom: r.bottom,
                    height: r.height,
                    mid: r.top + r.height / 2,
                };
            });
            const pitch =
                rows.length >= 2
                    ? rows[1].top - rows[0].top
                    : (rows[0]?.height || 44) + 6;
            return { rows, pitch, startScrollTop: container.scrollTop };
        };

        const handlePointerMove = (e) => {
            const pending = pendingDragRef.current;
            if (!pending && !activeDragRef.current) return;

            if (!activeDragRef.current && pending) {
                const dx = e.clientX - pending.startX;
                const dy = e.clientY - pending.startY;
                if (Math.hypot(dx, dy) < 4) return;

                const slots = measureSlots();
                if (!slots) return;
                slotsRef.current = slots;

                const curActive = activeLayerIdsRef.current;
                const dragIds =
                    curActive.includes(pending.layerId) && curActive.length > 1
                        ? [...curActive]
                        : [pending.layerId];

                activeDragRef.current = {
                    layerId: pending.layerId,
                    dragIds,
                    fromFlatIndex: pending.fromFlatIndex,
                    startY: pending.startY,
                    decision: null,
                };
            }

            if (activeDragRef.current && slotsRef.current) {
                const listEl = listRef.current;
                const slots = slotsRef.current;

                if (listEl) {
                    const listRect = listEl.getBoundingClientRect();
                    if (e.clientY < listRect.top + 28) {
                        listEl.scrollTop -= 8;
                    } else if (e.clientY > listRect.bottom - 28) {
                        listEl.scrollTop += 8;
                    }
                }

                const scrollDelta = (listEl?.scrollTop || 0) - slots.startScrollTop;
                const rawOffsetY = e.clientY - activeDragRef.current.startY + scrollDelta;

                const fromSlot = slots.rows[activeDragRef.current.fromFlatIndex];
                if (!fromSlot) return;

                const firstTop = slots.rows[0]?.top ?? 0;
                const lastRow = slots.rows[slots.rows.length - 1];
                const minOffsetY = firstTop - fromSlot.top - 10;
                const maxOffsetY = lastRow ? lastRow.bottom - fromSlot.bottom + 14 : rawOffsetY;
                const offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, rawOffsetY));

                const draggedMid = fromSlot.mid + offsetY;
                const decision = computeDropDecision(fromSlot, draggedMid, offsetY, slots);
                activeDragRef.current.decision = decision;

                setDragState({
                    layerId: activeDragRef.current.layerId,
                    dragCount: activeDragRef.current.dragIds.length,
                    fromFlatIndex: activeDragRef.current.fromFlatIndex,
                    fromDepth: fromSlot.depth,
                    fromParentGroupId: fromSlot.parentGroupId,
                    offsetY,
                    pitch: slots.pitch,
                    decision,
                });
            }
        };

        const finishDrag = () => {
            const active = activeDragRef.current;
            const slots = slotsRef.current;
            pendingDragRef.current = null;
            activeDragRef.current = null;
            slotsRef.current = null;
            setDragState(null);

            if (!active || !active.decision || !slots) return;

            justDraggedRef.current = true;
            setTimeout(() => {
                justDraggedRef.current = false;
            }, 60);

            const fromSlot = slots.rows[active.fromFlatIndex];
            const d = active.decision;
            if (!fromSlot) return;

            const isNoOpSingle =
                active.dragIds.length === 1 &&
                (d.destinationParentGroupId || null) === (fromSlot.parentGroupId || null) &&
                d.destinationIndex === fromSlot.indexInParent;

            if (isNoOpSingle) return;

            if (d.mode === 'reorder-artboard') {
                if (d.destinationIndex !== fromSlot.indexInParent && typeof reorderAbCbRef.current === 'function') {
                    reorderAbCbRef.current(active.layerId, d.destinationIndex);
                }
                return;
            }

            if (d.destinationParentGroupId) {
                setExpandedGroups((prev) => ({ ...prev, [d.destinationParentGroupId]: true }));
            }

            if (typeof moveBatchCbRef.current === 'function') {
                moveBatchCbRef.current({
                    layerIds: active.dragIds,
                    destinationParentGroupId: d.destinationParentGroupId,
                    destinationIndex: d.destinationIndex,
                });
            } else if (typeof moveTreeCbRef.current === 'function') {
                moveTreeCbRef.current({
                    layerId: active.layerId,
                    destinationParentGroupId: d.destinationParentGroupId,
                    destinationIndex: d.destinationIndex,
                });
            } else if (!d.destinationParentGroupId && typeof reorderCbRef.current === 'function') {
                reorderCbRef.current(active.layerId, d.destinationIndex);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', finishDrag);
        window.addEventListener('pointercancel', finishDrag);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
        };
    }, []);

    useEffect(() => {
        if (!layerMenu) return undefined;
        const closeMenu = () => setLayerMenu(null);
        const handleKey = (e) => {
            if (e.key === 'Escape') setLayerMenu(null);
        };
        window.addEventListener('pointerdown', closeMenu);
        window.addEventListener('keydown', handleKey);
        return () => {
            window.removeEventListener('pointerdown', closeMenu);
            window.removeEventListener('keydown', handleKey);
        };
    }, [layerMenu]);

    useEffect(() => {
        if (!addMenuOpen) return undefined;
        const onPointerDown = (e) => {
            if (
                !addBtnRef.current?.contains(e.target) &&
                !addMenuPanelRef.current?.contains(e.target)
            ) {
                setAddMenuOpen(false);
            }
        };
        const onEsc = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setAddMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('keydown', onEsc, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('keydown', onEsc, true);
        };
    }, [addMenuOpen]);

    useEffect(() => {
        if (!renamingLayerId) return undefined;
        const raf = requestAnimationFrame(() => {
            renameInputRef.current?.focus();
            renameInputRef.current?.select();
        });
        return () => cancelAnimationFrame(raf);
    }, [renamingLayerId]);

    if (!rendered) {
        return null;
    }

    const stopEvent = (e) => e.stopPropagation();

    const toggleGroupCollapsed = (groupId, isArtboard = false) => {
        setExpandedGroups((prev) => {
            const currentExpanded = isArtboard ? prev[groupId] !== false : Boolean(prev[groupId]);
            return { ...prev, [groupId]: !currentExpanded };
        });
    };

    const beginRename = (layerId) => {
        const target = findLayerInTree(layers, layerId);
        if (!target) return;
        setLayerMenu(null);
        setRenamingLayerId(target.layerId);
        setRenameDraft(target.layerName || '');
    };

    const commitRename = () => {
        if (!renamingLayerId) return;
        const trimmed = renameDraft.trim();
        if (trimmed && typeof onRenameLayer === 'function') {
            onRenameLayer(renamingLayerId, trimmed);
        }
        setRenamingLayerId(null);
    };

    const cancelRename = () => {
        setRenamingLayerId(null);
        setRenameDraft('');
    };

    const openLayerContextMenu = (e, row) => {
        const { layer, isArtboard } = row;
        e.preventDefault();
        e.stopPropagation();
        pendingDragRef.current = null;

        if (isArtboard) {
            onSelectArtboard?.(layer.layerId);
            const menuW = 212;
            const menuH = 260;
            setLayerMenu({
                x: Math.max(8, Math.min(window.innerWidth - menuW - 8, e.clientX)),
                y: Math.max(8, Math.min(window.innerHeight - menuH - 8, e.clientY)),
                layerId: layer.layerId,
                layerType: 'artboard',
                isArtboard: true,
                parentGroupId: null,
                selectedIds: [layer.layerId],
                isMulti: false,
                hasGroup: false,
                hasParentGroup: false,
                visible: layer.visible !== false,
                locked: Boolean(layer.locked),
                isCollapsed: expandedGroups[layer.layerId] === false,
            });
            return;
        }

        const alreadyInSelection = activeLayerIds.includes(layer.layerId);
        const selectedSet = alreadyInSelection ? activeLayerIds : [layer.layerId];
        if (!alreadyInSelection) {
            onSelectLayer?.(layer.layerId, { orderedIds: visibleRows.filter((r) => !r.isArtboard).map((r) => r.layerId) });
        }

        const isMulti = selectedSet.length > 1;
        const hasGroup = isMulti
            ? selectedSet.some((id) => findLayerInTree(layers, id)?.type === 'group')
            : layer.type === 'group';
        const hasParentGroup = selectedSet.some((id) => {
            const pId = findLayerInTree(layers, id)?.parentGroupId;
            return pId && findLayerInTree(layers, pId)?.type === 'group';
        });

        const menuW = 204;
        const menuH = isMulti ? 290 : hasGroup ? 280 : hasParentGroup ? 248 : 208;
        const clampedX = Math.max(8, Math.min(window.innerWidth - menuW - 8, e.clientX));
        const clampedY = Math.max(8, Math.min(window.innerHeight - menuH - 8, e.clientY));

        setLayerMenu({
            x: clampedX,
            y: clampedY,
            layerId: layer.layerId,
            layerType: layer.type,
            isArtboard: false,
            parentGroupId: layer.parentGroupId || null,
            selectedIds: selectedSet,
            isMulti,
            hasGroup,
            hasParentGroup,
            visible: layer.visible !== false,
            locked: Boolean(layer.locked),
            isCollapsed: layer.type === 'group' && !expandedGroups[layer.layerId],
        });
    };

    const startRowPointerDown = (e, row, flatIndex) => {
        e.stopPropagation();
        if (e.button !== 0 || visibleRows.length < 2) return;
        if (row.isArtboard && artboardCount <= 1) return;
        if (e.target.closest('button, input, textarea, select')) return;
        if (renamingLayerId === row.layerId) return;
        e.preventDefault();
        pendingDragRef.current = {
            layerId: row.layerId,
            fromFlatIndex: flatIndex,
            startX: e.clientX,
            startY: e.clientY,
        };
    };

    const getSiblingShiftY = (row, flatIdx) => {
        if (!dragState || !dragState.decision) return 0;
        const { fromFlatIndex, fromParentGroupId, pitch, decision } = dragState;
        const { mode, targetFlatIndex } = decision;

        if (mode === 'reorder-sibling' && (row.parentGroupId || null) === (fromParentGroupId || null)) {
            if (fromFlatIndex < targetFlatIndex && flatIdx > fromFlatIndex && flatIdx <= targetFlatIndex) {
                return -pitch;
            }
            if (fromFlatIndex > targetFlatIndex && flatIdx >= targetFlatIndex && flatIdx < fromFlatIndex) {
                return pitch;
            }
        }
        return 0;
    };

    const ctxMenu = lastLayerMenuRef.current;

    return (
        <div
            ref={panelRef}
            data-testid="right-layers-panel"
            data-visible={visible ? 'true' : 'false'}
            data-moved={panelMoved ? 'true' : 'false'}
            style={{
                top: `${12 + panelOffset.y + smartDelta.y}px`,
                right: `${66 - panelOffset.x - smartDelta.x}px`,
            }}
            onPointerDown={stopEvent}
            onMouseDown={stopEvent}
            onClick={stopEvent}
            className={`absolute z-30 w-76 max-h-[calc(100%-24px)] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 select-none origin-top-right ${
                isDraggingPanel
                    ? 'ring-2 ring-blue-500/40'
                    : 'transition-[opacity,translate,scale,transform,top,right] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
            } ${
                visible
                    ? 'opacity-100 translate-x-0 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-x-5 -translate-y-2 scale-75 pointer-events-none'
            }`}
        >
            {/* Panel Header (drag handle) */}
            <div
                data-testid="right-layers-panel-drag-handle"
                onPointerDown={handleDragPointerDown}
                onDoubleClick={resetPanelPosition}
                data-tooltip="Drag to move panel (double-click to reset)"
                className={`px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 ${
                    isDraggingPanel ? 'cursor-grabbing' : 'cursor-grab'
                }`}
            >
                <div className="flex items-center gap-1.5 pointer-events-none">
                    <GripVertical
                        className={`w-3.5 h-3.5 shrink-0 ${
                            panelMoved ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'
                        }`}
                    />
                    <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Layers ({layers.length})
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    data-tooltip="Close Layers Panel"
                    aria-label="Close Layers Panel"
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Group / Ungroup Actions */}
            <div className="p-2.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-1.5 shrink-0">
                <button
                    type="button"
                    data-testid="layers-panel-group-btn"
                    disabled={!canGroup}
                    onClick={onGroupSelected}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-35"
                >
                    <Group className="w-3.5 h-3.5" />
                    <span>Group</span>
                </button>
                <button
                    type="button"
                    data-testid="layers-panel-ungroup-btn"
                    disabled={!canUngroup}
                    onClick={onUngroupSelected}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-35"
                >
                    <Ungroup className="w-3.5 h-3.5" />
                    <span>Ungroup</span>
                </button>
            </div>

            {/* Drag-to-Reorder & Recursive Tree-Nest Layers Stack */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5 relative">
                {visibleRows.length === 0 ? (
                    <div className="py-8 px-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        Canvas has no layers yet. Add text, shapes, or PNG assets!
                    </div>
                ) : (
                    visibleRows.map((row, idx) => {
                        const { layer, depth, parentGroupId, isArtboard, isGroup, isContainer, isCollapsed, effectiveLocked } = row;
                        const selected = isArtboard
                            ? activeArtboardId === layer.layerId
                            : activeLayerIds.includes(layer.layerId);
                        const isDragging = dragState?.layerId === layer.layerId;
                        const isRenaming = renamingLayerId === layer.layerId;
                        const isDropGroupTarget =
                            Boolean(dragState) &&
                            !isDragging &&
                            isContainer &&
                            dragState.decision?.hoverGroupId === layer.layerId &&
                            dragState.fromParentGroupId !== layer.layerId;

                        const dragBadgeLabel = isDragging
                            ? dragState?.dragCount > 1
                                ? `Moving ${dragState.dragCount}`
                                : dragState?.decision?.mode === 'into-group'
                                  ? 'Move into'
                                  : dragState?.decision?.mode === 'to-parent'
                                    ? 'Reorder'
                                    : null
                            : null;

                        const shiftY = isDragging ? dragState.offsetY : getSiblingShiftY(row, idx);
                        const rowStyle = dragState
                            ? isDragging
                                ? {
                                      transform: `translate3d(0px, ${dragState.offsetY}px, 0px) scale(1.02)`,
                                      zIndex: 40,
                                      transition: 'box-shadow 150ms ease, border-color 150ms ease',
                                  }
                                : {
                                      transform: `translate3d(0px, ${shiftY}px, 0px)`,
                                      transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                                  }
                            : undefined;

                        const { Icon: TypeIcon, badgeClass, subtitle } = getLayerTypeVisual(layer, isCollapsed);
                        const deleteDisabled = effectiveLocked || (isArtboard && artboardCount <= 1);

                        const cardSurfaceClass = isDragging
                            ? 'cursor-grabbing bg-white dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/50 shadow-xl'
                            : isDropGroupTarget
                              ? 'bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/60 dark:bg-indigo-500/25'
                              : isRenaming
                                ? 'cursor-default border-blue-500 bg-blue-50/70 dark:bg-slate-900'
                                : isArtboard
                                  ? selected
                                      ? 'bg-blue-600/12 border-blue-500 ring-1 ring-blue-500/40 dark:bg-blue-500/20 dark:border-blue-400'
                                      : 'bg-slate-100/90 border-slate-300/85 hover:border-blue-400/70 dark:bg-slate-900/95 dark:border-slate-700/90 dark:hover:border-blue-500/60'
                                  : isGroup
                                    ? selected
                                        ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/35 dark:bg-indigo-500/25 dark:border-indigo-400'
                                        : 'bg-indigo-50/65 border-indigo-300/80 hover:border-indigo-400 dark:bg-indigo-950/35 dark:border-indigo-500/40 dark:hover:border-indigo-400/70'
                                    : selected
                                      ? 'bg-blue-600/10 border-blue-500/60 dark:bg-blue-600/20'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700';

                        return (
                            <div
                                key={layer.layerId}
                                style={depth > 0 ? { marginLeft: `${depth * 12}px` } : undefined}
                                className={
                                    depth > 0
                                        ? 'pl-2 border-l-2 border-slate-300/70 dark:border-slate-700/70'
                                        : ''
                                }
                            >
                                <div
                                    data-testid="layer-row"
                                    data-layer-id={layer.layerId}
                                    data-layer-type={layer.type}
                                    data-depth={depth}
                                    data-parent-group-id={parentGroupId || ''}
                                    data-layer-row-index={idx}
                                    data-selected={selected ? 'true' : 'false'}
                                    data-dragging={isDragging ? 'true' : 'false'}
                                    data-drop-target={isDropGroupTarget ? 'true' : 'false'}
                                    style={rowStyle}
                                    onPointerDown={(e) => startRowPointerDown(e, row, idx)}
                                    onClick={(e) => {
                                        if (justDraggedRef.current || isRenaming) return;
                                        if (isArtboard) {
                                            onSelectArtboard?.(layer.layerId);
                                            return;
                                        }
                                        onSelectLayer?.(layer.layerId, {
                                            toggle: e.ctrlKey || e.metaKey,
                                            range: e.shiftKey,
                                            orderedIds: visibleRows.filter((r) => !r.isArtboard).map((r) => r.layerId),
                                        });
                                    }}
                                    onContextMenu={(e) => openLayerContextMenu(e, row)}
                                    className={`relative p-2 rounded-xl border flex items-center justify-between gap-1.5 transition-colors ${
                                        !isDragging && !isRenaming
                                            ? visibleRows.length > 1
                                                ? 'cursor-grab'
                                                : 'cursor-pointer'
                                            : ''
                                    } ${cardSurfaceClass}`}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <GripVertical className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />

                                        {isContainer && (
                                            <button
                                                type="button"
                                                data-testid="group-collapse-toggle"
                                                data-collapsed={isCollapsed ? 'true' : 'false'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleGroupCollapsed(layer.layerId, isArtboard);
                                                }}
                                                data-tooltip={isCollapsed ? 'Expand' : 'Collapse'}
                                                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                                                className={`p-0.5 rounded-md cursor-pointer shrink-0 ${
                                                    isArtboard
                                                        ? 'hover:bg-blue-500/15 text-blue-600 dark:text-blue-300'
                                                        : 'hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                                                }`}
                                            >
                                                {isCollapsed ? (
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        )}

                                        <span
                                            data-testid="layer-type-icon"
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${badgeClass}`}
                                        >
                                            <TypeIcon className="w-3.5 h-3.5" />
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            {isRenaming ? (
                                                <input
                                                    ref={renameInputRef}
                                                    data-testid="layer-rename-input"
                                                    type="text"
                                                    value={renameDraft}
                                                    onChange={(e) => setRenameDraft(e.target.value)}
                                                    onClick={stopEvent}
                                                    onPointerDown={stopEvent}
                                                    onKeyDown={(e) => {
                                                        e.stopPropagation();
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            commitRename();
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelRename();
                                                        }
                                                    }}
                                                    onBlur={commitRename}
                                                    className="w-full px-1.5 py-0.5 text-xs font-semibold rounded-md bg-white dark:bg-slate-950 border border-blue-500 text-slate-900 dark:text-white outline-none select-text"
                                                />
                                            ) : (
                                                <div
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        beginRename(layer.layerId);
                                                    }}
                                                    className={`text-xs font-semibold truncate ${
                                                        !layer.visible ? 'opacity-60 ' : ''
                                                    }${
                                                        isGroup
                                                            ? 'text-indigo-950 dark:text-indigo-100'
                                                            : 'text-slate-900 dark:text-white'
                                                    }`}
                                                >
                                                    {layer.layerName}
                                                </div>
                                            )}
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                                                <span
                                                    className={
                                                        isGroup
                                                            ? 'font-bold text-indigo-600 dark:text-indigo-300'
                                                            : ''
                                                    }
                                                >
                                                    {subtitle}
                                                </span>
                                                {dragBadgeLabel && (
                                                    <span className="px-1.5 py-0 rounded bg-blue-600 text-white text-[9px] font-bold normal-case">
                                                        {dragBadgeLabel}
                                                    </span>
                                                )}
                                                {isDropGroupTarget && (
                                                    <span className="px-1.5 py-0 rounded bg-indigo-600 text-white text-[9px] font-bold normal-case">
                                                        Drop here
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0" onClick={stopEvent}>
                                        <button
                                            type="button"
                                            data-testid="layer-visibility-toggle"
                                            data-hidden={!layer.visible ? 'true' : 'false'}
                                            onClick={() => onToggleLayerVisible(layer.layerId)}
                                            aria-label={layer.visible ? 'Hide Layer' : 'Show Layer'}
                                            data-tooltip={layer.visible ? 'Hide Layer' : 'Show Layer'}
                                            className={`p-1 rounded cursor-pointer transition-colors ${
                                                !layer.visible
                                                    ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/15 hover:bg-yellow-500/25'
                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {layer.visible ? (
                                                <Eye className="w-3 h-3" />
                                            ) : (
                                                <EyeOff className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onToggleLayerLock(layer.layerId)}
                                            aria-label={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                                            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer ${
                                                layer.locked
                                                    ? 'text-amber-500 dark:text-amber-400'
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {layer.locked ? (
                                                <Lock className="w-3 h-3" />
                                            ) : (
                                                <Unlock className="w-3 h-3" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="layer-row-delete"
                                            disabled={deleteDisabled}
                                            aria-disabled={deleteDisabled}
                                            onClick={() => {
                                                if (!deleteDisabled) onDeleteLayer(layer.layerId);
                                            }}
                                            aria-label={isArtboard ? 'Delete Artboard' : 'Delete Layer'}
                                            data-tooltip={
                                                effectiveLocked
                                                    ? 'Unlock to delete'
                                                    : isArtboard && artboardCount <= 1
                                                      ? 'Keep at least 1 artboard'
                                                      : isArtboard
                                                        ? 'Delete Artboard'
                                                        : 'Delete Layer'
                                            }
                                            className={`p-1 rounded ${
                                                deleteDisabled
                                                    ? 'text-rose-400/45 dark:text-rose-500/40 opacity-45 cursor-not-allowed'
                                                    : 'hover:bg-rose-500/15 dark:hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 cursor-pointer'
                                            }`}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Panel Footer with "+" Creation Menu */}
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-50/70 dark:bg-slate-950/60">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {artboardCount} {artboardCount === 1 ? 'Artboard' : 'Artboards'} · {totalLeafCount} {totalLeafCount === 1 ? 'Layer' : 'Layers'}
                </span>
                <button
                    ref={addBtnRef}
                    type="button"
                    data-testid="layers-add-menu-btn"
                    aria-expanded={addMenuOpen}
                    aria-label="Add artboard, group, or layer"
                    data-tooltip="Add Artboard, Group, or Layer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!addMenuOpen && addBtnRef.current) {
                            const rect = addBtnRef.current.getBoundingClientRect();
                            lastAddPosRef.current = {
                                top: Math.max(12, rect.top - 8),
                                left: Math.max(12, Math.min(window.innerWidth - 216, rect.right - 200)),
                            };
                        }
                        setAddMenuOpen((o) => !o);
                    }}
                    className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-colors cursor-pointer ${
                        addMenuOpen
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatedPopover
                        ref={addMenuPanelRef}
                        open={Boolean(addMenuOpen && rendered && visible)}
                        originClass="origin-bottom-right"
                        data-testid="layers-add-menu"
                        onPointerDown={stopEvent}
                        style={{
                            top: `${Math.max(12, lastAddPosRef.current.top - 134)}px`,
                            left: `${lastAddPosRef.current.left}px`,
                        }}
                        className="fixed z-[75] w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 text-xs text-slate-800 dark:text-slate-200 select-none"
                    >
                        <button
                            type="button"
                            data-testid="layers-add-artboard"
                            onClick={() => {
                                setAddMenuOpen(false);
                                onOpenNewArtboardModal?.();
                            }}
                            className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl hover:bg-blue-600/10 hover:text-blue-600 dark:hover:text-blue-300 font-semibold cursor-pointer"
                        >
                            <Frame className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>New Artboard...</span>
                        </button>
                        <button
                            type="button"
                            data-testid="layers-add-group"
                            onClick={() => {
                                setAddMenuOpen(false);
                                onCreateGroupLayer?.();
                            }}
                            className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <FolderPlus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>New Group</span>
                        </button>
                        <button
                            type="button"
                            data-testid="layers-add-empty-layer"
                            onClick={() => {
                                setAddMenuOpen(false);
                                onCreateEmptyLayer?.();
                            }}
                            className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>New Empty Layer</span>
                        </button>
                    </AnimatedPopover>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatedPopover
                        open={Boolean(layerMenu && rendered && visible)}
                        originClass="origin-top-left"
                        data-testid="layer-context-menu"
                        style={
                            ctxMenu
                                ? {
                                      top: `${ctxMenu.y}px`,
                                      left: `${ctxMenu.x}px`,
                                  }
                                : undefined
                        }
                        onPointerDown={stopEvent}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        className="fixed z-[70] w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 text-xs text-slate-800 dark:text-slate-200 select-none"
                    >
                        {ctxMenu && (
                            <>
                                {!ctxMenu.isMulti && (
                                    <button
                                        type="button"
                                        data-testid="layer-ctx-rename"
                                        onClick={() => beginRename(ctxMenu.layerId)}
                                        className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                        <span>Rename</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    data-testid="layer-ctx-duplicate"
                                    onClick={() => {
                                        if (ctxMenu.isArtboard) {
                                            onDuplicateArtboard?.(ctxMenu.layerId);
                                        } else {
                                            onDuplicate?.(ctxMenu.isMulti ? ctxMenu.selectedIds : ctxMenu.layerId);
                                        }
                                        setLayerMenu(null);
                                    }}
                                    className="w-full flex items-center justify-between text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                        <span>{ctxMenu.isArtboard ? 'Duplicate Artboard' : 'Duplicate'}</span>
                                    </span>
                                    {!ctxMenu.isArtboard && <span className="text-[10px] font-mono text-slate-400">Ctrl+D</span>}
                                </button>

                                {ctxMenu.isArtboard && (
                                    <button
                                        type="button"
                                        data-testid="layer-ctx-resize-artboard"
                                        onClick={() => {
                                            onResizeArtboard?.(ctxMenu.layerId);
                                            setLayerMenu(null);
                                        }}
                                        className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Resize Artboard...</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    data-testid="layer-ctx-toggle-visible"
                                    onClick={() => {
                                        if (ctxMenu.isMulti && onBatchToggleVisible) {
                                            onBatchToggleVisible(ctxMenu.selectedIds);
                                        } else {
                                            onToggleLayerVisible?.(ctxMenu.layerId);
                                        }
                                        setLayerMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    {ctxMenu.visible ? (
                                        <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    ) : (
                                        <Eye className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
                                    )}
                                    <span>{ctxMenu.visible ? 'Hide Layer' : 'Show Layer'}</span>
                                </button>

                                <button
                                    type="button"
                                    data-testid="layer-ctx-toggle-lock"
                                    onClick={() => {
                                        if (ctxMenu.isMulti && onBatchToggleLock) {
                                            onBatchToggleLock(ctxMenu.selectedIds);
                                        } else {
                                            onToggleLayerLock?.(ctxMenu.layerId);
                                        }
                                        setLayerMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    {ctxMenu.locked ? (
                                        <Unlock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                                    ) : (
                                        <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                    )}
                                    <span>{ctxMenu.locked ? 'Unlock Layer' : 'Lock Layer'}</span>
                                </button>

                                {((!ctxMenu.isMulti && ctxMenu.layerType === 'group') ||
                                    ctxMenu.hasParentGroup ||
                                    ctxMenu.isMulti ||
                                    ctxMenu.hasGroup) && (
                                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                                )}

                                {!ctxMenu.isMulti && ctxMenu.layerType === 'group' && (
                                    <button
                                        type="button"
                                        data-testid="layer-ctx-toggle-collapse"
                                        onClick={() => {
                                            toggleGroupCollapsed(ctxMenu.layerId);
                                            setLayerMenu(null);
                                        }}
                                        className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        {ctxMenu.isCollapsed ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                                        )}
                                        <span>{ctxMenu.isCollapsed ? 'Expand Group' : 'Collapse Group'}</span>
                                    </button>
                                )}

                                {ctxMenu.hasParentGroup && (
                                    <button
                                        type="button"
                                        data-testid="layer-ctx-remove-from-group"
                                        onClick={() => {
                                            const firstNestedId =
                                                ctxMenu.selectedIds.find((id) =>
                                                    Boolean(findLayerInTree(layers, id)?.parentGroupId)
                                                ) || ctxMenu.layerId;
                                            const parentNode = findLayerInTree(layers, firstNestedId);
                                            const parentGroupId = parentNode?.parentGroupId;
                                            const parentGroupObj = parentGroupId
                                                ? findLayerInTree(layers, parentGroupId)
                                                : null;
                                            const destParentId = parentGroupObj?.parentGroupId || null;
                                            const siblings = destParentId
                                                ? findLayerInTree(layers, destParentId)?.children || []
                                                : layers;
                                            const destIdx = Math.max(
                                                0,
                                                siblings.findIndex((l) => l.layerId === parentGroupId)
                                            );
                                            onMoveLayersBatch?.({
                                                layerIds: ctxMenu.selectedIds,
                                                destinationParentGroupId: destParentId,
                                                destinationIndex: destIdx,
                                            });
                                            setLayerMenu(null);
                                        }}
                                        className="w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <FolderOutput className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Move Out of Group</span>
                                    </button>
                                )}

                                {(ctxMenu.isMulti || ctxMenu.hasGroup) && (
                                    <>
                                        {ctxMenu.isMulti && (
                                            <button
                                                type="button"
                                                data-testid="layer-ctx-group"
                                                disabled={!canGroup}
                                                onClick={() => {
                                                    onGroupSelected?.();
                                                    setLayerMenu(null);
                                                }}
                                                className="w-full flex items-center justify-between text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Group className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                    <span>Group</span>
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">Ctrl+G</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            data-testid="layer-ctx-ungroup"
                                            disabled={!ctxMenu.hasGroup && !canUngroup}
                                            onClick={() => {
                                                onUngroupSelected?.();
                                                setLayerMenu(null);
                                            }}
                                            className="w-full flex items-center justify-between text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Ungroup className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                <span>Ungroup</span>
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">Ctrl+Shift+G</span>
                                        </button>
                                    </>
                                )}

                                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                                {(() => {
                                    const ctxTargetIds = ctxMenu.isMulti ? (ctxMenu.selectedIds || []) : [ctxMenu.layerId];
                                    const ctxAllLocked =
                                        ctxTargetIds.length > 0 &&
                                        ctxTargetIds.every((id) => Boolean(effectiveLockedById.get(id)));
                                    const isLastArtboard = ctxMenu.isArtboard && artboardCount <= 1;
                                    const ctxDeleteDisabled = ctxAllLocked || isLastArtboard;
                                    return (
                                        <button
                                            type="button"
                                            data-testid="layer-ctx-delete"
                                            disabled={ctxDeleteDisabled}
                                            aria-disabled={ctxDeleteDisabled}
                                            onClick={() => {
                                                if (ctxDeleteDisabled) return;
                                                if (ctxMenu.isMulti) {
                                                    onDeleteSelected?.(ctxMenu.selectedIds);
                                                } else {
                                                    onDeleteLayer?.(ctxMenu.layerId);
                                                }
                                                setLayerMenu(null);
                                            }}
                                            className={`w-full flex items-center gap-2 text-left px-3 py-1.5 rounded-xl font-semibold ${
                                                ctxDeleteDisabled
                                                    ? 'text-rose-400/50 dark:text-rose-500/40 opacity-50 cursor-not-allowed'
                                                    : 'hover:bg-rose-500/15 text-rose-500 dark:text-rose-400 cursor-pointer'
                                            }`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>
                                                {ctxAllLocked
                                                    ? 'Unlock to Delete'
                                                    : isLastArtboard
                                                      ? 'Keep at least 1 Artboard'
                                                      : ctxMenu.isArtboard
                                                        ? 'Delete Artboard'
                                                        : 'Delete'}
                                            </span>
                                        </button>
                                    );
                                })()}
                            </>
                        )}
                    </AnimatedPopover>,
                    document.body
                )}
        </div>
    );
}
