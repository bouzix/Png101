import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import AssetCard from '@/components/admin/AssetCard';
import { useBulkEdit } from '@/components/admin/BulkEditSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import StudioSelect from '@/components/ui/StudioSelect';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from 'sonner';
import { CheckSquare, Square, Trash2, Pencil, RotateCcw, AlertTriangle, FolderOpen, Image as ImageIcon, Search, X, Loader2 } from 'lucide-react';

export default function AdminFiles() {
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
    const [images, setImages] = useState([]);
    const [trashedImages, setTrashedImages] = useState([]);
    const [retentionDays, setRetentionDays] = useState(30);
    const [search, setSearch] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('search') || '';
        }
        return '';
    });
    const [selectedIds, setSelectedIds] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(24);
    const [permissions, setPermissions] = useState(['*']);

    const {
        isOpen: isBulkEditOpen,
        isMinimized: isBulkEditMinimized,
        formsData: bulkEditItems,
        openBulkEdit,
        removeBulkEditItems,
        startDraggingItems,
        endDraggingItems,
        subscribe: subscribeBulkEdit,
    } = useBulkEdit();

    const bulkEditIdSet = useMemo(
        () => new Set((bulkEditItems || []).map((item) => item.id)),
        [bulkEditItems]
    );
    const [loading, setLoading] = useState(false);
    const [isBarSticky, setIsBarSticky] = useState(false);
    const stickyBarRef = useRef(null);
    const lastSelectedIdRef = useRef(null);
    const lastSelectedActionRef = useRef(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    useEffect(() => {
        fetchImages();
        fetchTrash();
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data.permissions)) {
                    setPermissions(data.permissions);
                }
            })
            .catch(() => {});

        return subscribeBulkEdit((updates) => {
            const updateMap = new Map(updates.map((u) => [u.id, u]));
            setImages((prev) =>
                prev.map((img) => {
                    const update = updateMap.get(img.id);
                    return update ? { ...img, ...update } : img;
                })
            );
            setSelectedIds([]);
        });
    }, [subscribeBulkEdit]);

    const canEdit = permissions.includes('*') || permissions.includes('edit_images');
    const canDelete = permissions.includes('*') || permissions.includes('delete_images');

    const fetchImages = () => {
        fetch('/api/images?status=published')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setImages(data);
                }
            })
            .catch(err => {
                console.error('Failed to load images', err);
                toast.error('Failed to load images');
            });
    };

    const fetchTrash = () => {
        fetch('/api/images/trash')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data?.images)) {
                    setTrashedImages(data.images);
                }
                if (typeof data?.retentionDays === 'number') {
                    setRetentionDays(data.retentionDays);
                }
            })
            .catch(() => {});
    };

    const currentDataset = viewMode === 'trash' ? trashedImages : images;

    const filteredImages = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return currentDataset;

        return currentDataset.filter((img) => {
            const nameMatch = (img.name || img.filename || '').toLowerCase().includes(q);
            const filenameMatch = (img.filename || '').toLowerCase().includes(q);
            const altMatch = (img.altText || '').toLowerCase().includes(q);
            const descMatch = (img.description || '').toLowerCase().includes(q);
            const tagMatch = Array.isArray(img.tags) && img.tags.some(t => String(t).toLowerCase().includes(q));
            return nameMatch || filenameMatch || altMatch || descMatch || tagMatch;
        });
    }, [currentDataset, search]);

    const totalPages = Math.max(1, Math.ceil(filteredImages.length / itemsPerPage));

    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const paginatedImages = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredImages.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredImages, currentPage, itemsPerPage]);

    useEffect(() => {
        const barEl = stickyBarRef.current;
        if (!barEl) {
            setIsBarSticky(false);
            return;
        }
        const scrollRoot = barEl.closest('main') || window;
        const checkSticky = () => {
            if (!stickyBarRef.current || !stickyBarRef.current.parentElement) return;
            const barRect = stickyBarRef.current.getBoundingClientRect();
            const parentRect = stickyBarRef.current.parentElement.getBoundingClientRect();
            setIsBarSticky(barRect.top - parentRect.top > 1);
        };
        checkSticky();
        scrollRoot.addEventListener('scroll', checkSticky, { passive: true });
        window.addEventListener('scroll', checkSticky, { passive: true });
        window.addEventListener('resize', checkSticky, { passive: true });
        return () => {
            scrollRoot.removeEventListener('scroll', checkSticky);
            window.removeEventListener('scroll', checkSticky);
            window.removeEventListener('resize', checkSticky);
        };
    }, [paginatedImages.length > 0]);

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const allPageSelected =
        paginatedImages.length > 0 && paginatedImages.every((img) => selectedSet.has(img.id));
    const allFilteredSelected =
        filteredImages.length > 0 && filteredImages.every((img) => selectedSet.has(img.id));

    const handleToggleSelect = (id, event) => {
        const isShift = Boolean(event?.shiftKey || event?.nativeEvent?.shiftKey);
        if (isShift && lastSelectedIdRef.current !== null) {
            const startIdx = filteredImages.findIndex((img) => img.id === lastSelectedIdRef.current);
            const endIdx = filteredImages.findIndex((img) => img.id === id);
            if (startIdx !== -1 && endIdx !== -1) {
                const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                const rangeIds = filteredImages.slice(from, to + 1).map((img) => img.id);
                setSelectedIds((prev) => {
                    const prevSet = new Set(prev);
                    const allRangeSelected = rangeIds.every((rId) => prevSet.has(rId));
                    const shouldSelect =
                        lastSelectedActionRef.current === 'unselect'
                            ? false
                            : allRangeSelected
                            ? false
                            : true;

                    lastSelectedIdRef.current = id;
                    lastSelectedActionRef.current = shouldSelect ? 'select' : 'unselect';

                    if (shouldSelect) {
                        return Array.from(new Set([...prev, ...rangeIds]));
                    }
                    const removeSet = new Set(rangeIds);
                    return prev.filter((itemId) => !removeSet.has(itemId));
                });
                return;
            }
        }

        lastSelectedIdRef.current = id;
        setSelectedIds((prev) => {
            const exists = prev.includes(id);
            lastSelectedActionRef.current = exists ? 'unselect' : 'select';
            return exists ? prev.filter((i) => i !== id) : [...prev, id];
        });
    };

    const handleToggleSelectPage = () => {
        const pageIds = paginatedImages.map((img) => img.id);
        if (allPageSelected) {
            lastSelectedActionRef.current = 'unselect';
            const pageSet = new Set(pageIds);
            setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
        } else {
            lastSelectedActionRef.current = 'select';
            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const handleSelectAllFiltered = () => {
        if (allFilteredSelected) {
            lastSelectedActionRef.current = 'unselect';
            const filteredSet = new Set(filteredImages.map((img) => img.id));
            setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
        } else {
            lastSelectedActionRef.current = 'select';
            setSelectedIds((prev) =>
                Array.from(new Set([...prev, ...filteredImages.map((img) => img.id)]))
            );
        }
    };

    const toBulkItemPayload = (img) => ({
        id: img.id,
        filename: img.name || img.filename,
        path: img.path || img.thumbPath,
        tags: img.tags,
        altText: img.altText,
        description: img.description,
        categoryIds: img.categories?.map((c) => c.categoryId),
        luminance: img.luminance,
        contrastBgDark: img.contrastBgDark,
        contrastBgLight: img.contrastBgLight,
    });

    const handleEdit = (id) => {
        if (!canEdit) {
            toast.error('You do not have permission to edit images.');
            return;
        }
        const img = images.find((item) => item.id === id);
        if (!img) return;
        if (!selectedIds.includes(img.id)) {
            lastSelectedIdRef.current = img.id;
            lastSelectedActionRef.current = 'select';
            setSelectedIds((prev) => (prev.includes(img.id) ? prev : [...prev, img.id]));
        }
        openBulkEdit([toBulkItemPayload(img)]);
    };

    const handleBulkEdit = () => {
        if (!canEdit) {
            toast.error('You do not have permission to edit images.');
            return;
        }
        const selected = images.filter((img) => selectedIds.includes(img.id));
        if (selected.length === 0) return;
        openBulkEdit(selected.map(toBulkItemPayload));
    };

    const handleCardDragStart = (e, img) => {
        if (viewMode !== 'active' || !canEdit) return;
        if (!selectedIds.includes(img.id)) {
            lastSelectedIdRef.current = img.id;
            lastSelectedActionRef.current = 'select';
            setSelectedIds((prev) => (prev.includes(img.id) ? prev : [...prev, img.id]));
        }
        const selected = images.filter((item) => selectedIds.includes(item.id));
        const itemsToDrag =
            selected.length > 0
                ? selected.some((s) => s.id === img.id)
                    ? selected
                    : [...selected, img]
                : [img];
        const payload = itemsToDrag.map(toBulkItemPayload);
        startDraggingItems(payload, e);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copy';
            try {
                e.dataTransfer.setData('application/x-png101-bulk-items', JSON.stringify(payload));
            } catch {
                // Ignore dataTransfer quota limits
            }
        }
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;

        setLoading(true);
        try {
            const res = await fetch('/api/images/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (res.ok) {
                setImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
                removeBulkEditItems(selectedIds);
                setSelectedIds([]);
                fetchTrash();
                toast.success('Moved selected image(s) to Trash Bin');
            } else {
                toast.error('Failed to delete images');
            }
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Delete failed: Network or server error');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (idsToRestore = selectedIds) => {
        if (!idsToRestore.length) return;
        setLoading(true);
        try {
            const res = await fetch('/api/images/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToRestore }),
            });
            if (res.ok) {
                setTrashedImages((prev) => prev.filter((img) => !idsToRestore.includes(img.id)));
                setSelectedIds([]);
                fetchImages();
                toast.success(`Restored ${idsToRestore.length} image(s) to catalog`);
            } else {
                toast.error('Failed to restore selected images');
            }
        } catch {
            toast.error('Network error while restoring images');
        } finally {
            setLoading(false);
        }
    };

    const handlePermanentDelete = async (idsToPurge = selectedIds) => {
        if (!idsToPurge.length) return;
        setLoading(true);
        try {
            const res = await fetch('/api/images/trash', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToPurge }),
            });
            if (res.ok) {
                setTrashedImages((prev) => prev.filter((img) => !idsToPurge.includes(img.id)));
                setSelectedIds([]);
                toast.success(`Permanently deleted ${idsToPurge.length} image(s) from disk`);
            } else {
                toast.error('Failed to permanently delete images');
            }
        } catch {
            toast.error('Network error while permanently deleting images');
        } finally {
            setLoading(false);
        }
    };

    const handleEmptyTrash = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/images/trash/empty', { method: 'DELETE' });
            if (res.ok) {
                setTrashedImages([]);
                setSelectedIds([]);
                toast.success('Trash Bin emptied completely');
            } else {
                toast.error('Failed to empty Trash Bin');
            }
        } catch {
            toast.error('Network error while emptying Trash Bin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="My Files - Admin" />
            <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                            {viewMode === 'trash' ? (
                                <Trash2 className="w-7 h-7 text-rose-400" />
                            ) : (
                                <FolderOpen className="w-7 h-7 text-primary-glow" />
                            )}
                            <span>{viewMode === 'trash' ? 'Trash Bin' : 'My Files'}</span>
                        </h1>
                        <p className="text-sm text-foreground/55 mt-1">
                            {search.trim()
                                ? `Showing ${filteredImages.length} matching file${filteredImages.length !== 1 ? 's' : ''} out of ${currentDataset.length}.`
                                : viewMode === 'trash'
                                ? 'Review, restore, or permanently remove deleted PNG assets.'
                                : 'Browse, search, bulk edit metadata, and manage your published PNG catalog.'}
                        </p>
                    </div>

                    {/* Active vs Trash Switcher */}
                    <div className="inline-flex rounded-xl bg-card-bg border border-card-border p-1 gap-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('active');
                                setSelectedIds([]);
                                setCurrentPage(1);
                            }}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'active'
                                    ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/25'
                                    : 'text-foreground/65 hover:text-foreground'
                            }`}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Active Catalog ({images.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('trash');
                                setSelectedIds([]);
                                setCurrentPage(1);
                                fetchTrash();
                            }}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'trash'
                                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                                    : 'text-foreground/65 hover:text-foreground'
                            }`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Trash Bin ({trashedImages.length})</span>
                        </button>
                    </div>
                </div>

                {/* KPI Overview Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Active Catalog"
                        value={images.length.toLocaleString()}
                        subtitle="Published PNG assets"
                        icon={ImageIcon}
                        color="blue"
                    />
                    <StatCard
                        title="Trash Bin"
                        value={trashedImages.length.toLocaleString()}
                        subtitle={
                            retentionDays === 0
                                ? 'Auto-purge disabled'
                                : `Auto-purge after ${retentionDays}d`
                        }
                        icon={Trash2}
                        color="rose"
                    />
                    <StatCard
                        title="Showing Now"
                        value={filteredImages.length.toLocaleString()}
                        subtitle={
                            search.trim()
                                ? 'Matching current search'
                                : viewMode === 'trash'
                                ? 'Total in Trash view'
                                : 'Total in catalog view'
                        }
                        icon={Search}
                        color="purple"
                    />
                    <StatCard
                        title="Selected Items"
                        value={selectedIds.length.toLocaleString()}
                        subtitle={`Page ${currentPage} of ${totalPages} • ${itemsPerPage}/page`}
                        icon={CheckSquare}
                        color="green"
                    />
                </div>

                {viewMode === 'trash' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-foreground/80">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>
                                {retentionDays === 0
                                    ? 'Auto-purge is disabled — trashed files stay recoverable forever until manually deleted.'
                                    : `Files in Trash are automatically and permanently deleted after ${retentionDays} day(s).`}
                                {' '}
                                <Link href="/admin/dashboard/settings" className="text-primary-glow font-semibold hover:underline">
                                    Change retention in General Settings
                                </Link>
                            </span>
                        </div>
                        {canDelete && trashedImages.length > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmDialog({
                                        isOpen: true,
                                        title: 'Empty Trash Bin',
                                        message: `Permanently delete all ${trashedImages.length} image(s) in Trash? Their PNG files and thumbnails will be removed from disk forever.`,
                                        onConfirm: handleEmptyTrash,
                                    })
                                }
                                className="px-3.5 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0 cursor-pointer shadow-sm"
                            >
                                Empty Trash ({trashedImages.length})
                            </button>
                        )}
                    </div>
                )}

                {/* Floating Circular Icon-Only Action Buttons when Bulk Edit Sidebar is Open */}
                {isBulkEditOpen && !isBulkEditMinimized && paginatedImages.length > 0 && (
                    <div className="fixed top-4 right-[516px] z-[52] flex items-center gap-2.5 bg-card-bg/95 backdrop-blur-xl border border-card-border rounded-full px-3 py-2 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-250">
                        <span className="text-xs font-semibold text-foreground/75 px-2 whitespace-nowrap hidden sm:inline">
                            <strong className="text-foreground">{selectedIds.length}</strong>/{filteredImages.length} selected
                        </span>

                        {viewMode === 'trash' ? (
                            <>
                                {(canEdit || canDelete) && (
                                    <button
                                        type="button"
                                        onClick={() => handleRestore(selectedIds)}
                                        disabled={selectedIds.length === 0 || loading}
                                        title={
                                            selectedIds.length > 0
                                                ? `Restore ${selectedIds.length} selected item(s)`
                                                : 'Select items to restore'
                                        }
                                        aria-label="Restore selected items"
                                        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        {selectedIds.length > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-emerald-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                                {selectedIds.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmDialog({
                                                isOpen: true,
                                                title: 'Delete Permanently',
                                                message: `Permanently delete ${selectedIds.length} trashed image(s) and their PNG files from disk? This cannot be undone.`,
                                                onConfirm: () => handlePermanentDelete(selectedIds),
                                            })
                                        }
                                        disabled={selectedIds.length === 0 || loading}
                                        title={
                                            selectedIds.length > 0
                                                ? `Delete ${selectedIds.length} selected item(s) forever`
                                                : 'Select items to delete forever'
                                        }
                                        aria-label="Delete selected items forever"
                                        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        {selectedIds.length > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-rose-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                                {selectedIds.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={
                                            selectedIds.length === 1
                                                ? () => handleEdit(selectedIds[0])
                                                : handleBulkEdit
                                        }
                                        disabled={selectedIds.length === 0}
                                        title={
                                            selectedIds.length > 0
                                                ? `Edit / Add ${selectedIds.length} selected item(s) to Bulk Editor`
                                                : 'Select items to add to Bulk Editor'
                                        }
                                        aria-label="Edit selected items"
                                        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        {selectedIds.length > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-blue-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                                {selectedIds.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmDialog({
                                                isOpen: true,
                                                title: 'Move to Trash Bin',
                                                message: `Move ${selectedIds.length} image(s) to Trash Bin? ${
                                                    retentionDays === 0
                                                        ? 'They will stay recoverable until manually deleted.'
                                                        : `You can restore them within ${retentionDays} day(s).`
                                                }`,
                                                onConfirm: handleDelete,
                                            })
                                        }
                                        disabled={selectedIds.length === 0 || loading}
                                        title={
                                            selectedIds.length > 0
                                                ? `Move ${selectedIds.length} selected item(s) to Trash`
                                                : 'Select items to move to Trash'
                                        }
                                        aria-label="Move selected items to Trash"
                                        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        {selectedIds.length > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-rose-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                                                {selectedIds.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Combined Selection, Search & Display Controls Sticky Card */}
                    <div
                        ref={stickyBarRef}
                        className={`sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 bg-card-bg/95 backdrop-blur-md border border-card-border rounded-xl px-3.5 py-2.5 transition-shadow duration-200 ${
                            isBarSticky ? 'shadow-xl shadow-black/25' : 'shadow-none'
                        }`}
                    >
                        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                            <div className="flex items-center p-1 bg-card-header-bg border border-card-border rounded-xl">
                                <button
                                    type="button"
                                    onClick={handleToggleSelectPage}
                                    disabled={paginatedImages.length === 0}
                                    title={
                                        filteredImages.length > paginatedImages.length
                                            ? allPageSelected
                                                ? `Deselect Page (${paginatedImages.length})`
                                                : `Select Page (${paginatedImages.length})`
                                            : allPageSelected
                                            ? 'Deselect All'
                                            : `Select All (${paginatedImages.length})`
                                    }
                                    aria-label="Toggle page selection"
                                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:text-primary-glow text-foreground shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                    {allPageSelected ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-primary-glow" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5 text-foreground/60" />
                                    )}
                                </button>

                                {/* Smooth slide-out tray from checkbox to the right */}
                                <div
                                    className={`grid transition-all duration-300 ease-out ${
                                        selectedIds.length > 0
                                            ? 'grid-cols-[1fr] opacity-100'
                                            : 'grid-cols-[0fr] opacity-0 pointer-events-none'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <div
                                            className={`flex items-center gap-1 pl-1 whitespace-nowrap transition-transform duration-300 ease-out ${
                                                selectedIds.length > 0 ? 'translate-x-0' : '-translate-x-4'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={handleSelectAllFiltered}
                                                className="h-7 px-2.5 rounded-lg text-xs font-bold bg-card-bg hover:text-primary-glow text-foreground shadow-sm transition-all cursor-pointer"
                                            >
                                                {allFilteredSelected
                                                    ? `Deselect All (${filteredImages.length})`
                                                    : `Select All (${filteredImages.length})`}
                                            </button>

                                            <span className="h-7 px-2.5 rounded-lg bg-card-bg text-xs font-bold text-foreground/65 shadow-sm inline-flex items-center gap-1">
                                                <strong className="text-foreground">{selectedIds.length}</strong> of{' '}
                                                <strong className="text-foreground">{filteredImages.length}</strong> selected
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-w-[200px] max-w-md p-1 bg-card-header-bg border border-card-border rounded-xl">
                                <div className="relative h-7 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                                    <Search className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search all files by title, filename, or tag..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full h-full bg-transparent text-xs font-medium text-foreground placeholder:text-foreground/40 focus:outline-none"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="p-0.5 rounded-md text-foreground/45 hover:text-foreground hover:bg-card-header-bg cursor-pointer transition-colors shrink-0"
                                            title="Clear search"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                            {selectedIds.length > 0 && (!isBulkEditOpen || isBulkEditMinimized) && (
                                <div className="flex items-center gap-1 animate-in fade-in duration-200">
                                    {viewMode === 'trash' ? (
                                        <>
                                            {(canEdit || canDelete) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(selectedIds)}
                                                    disabled={loading}
                                                    title={`Restore (${selectedIds.length})`}
                                                    aria-label={`Restore ${selectedIds.length} selected`}
                                                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:bg-emerald-500/20 text-emerald-400 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Delete Permanently',
                                                            message: `Permanently delete ${selectedIds.length} trashed image(s) and their PNG files from disk? This cannot be undone.`,
                                                            onConfirm: () => handlePermanentDelete(selectedIds),
                                                        })
                                                    }
                                                    disabled={loading}
                                                    title={`Delete Forever (${selectedIds.length})`}
                                                    aria-label={`Delete ${selectedIds.length} selected forever`}
                                                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Move to Trash Bin',
                                                            message: `Move ${selectedIds.length} image(s) to Trash Bin? ${retentionDays === 0 ? 'They will stay recoverable until manually deleted.' : `You can restore them within ${retentionDays} day(s).`}`,
                                                            onConfirm: handleDelete,
                                                        })
                                                    }
                                                    disabled={loading}
                                                    title={loading ? 'Moving to Trash...' : `Move to Trash (${selectedIds.length})`}
                                                    aria-label={`Move ${selectedIds.length} selected to Trash`}
                                                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:bg-red-500/20 text-red-400 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            )}

                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        selectedIds.length === 1
                                                            ? () => handleEdit(selectedIds[0])
                                                            : handleBulkEdit
                                                    }
                                                    title={`Edit (${selectedIds.length})`}
                                                    aria-label={`Edit ${selectedIds.length} selected`}
                                                    className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-card-bg hover:bg-blue-500/20 text-primary-glow shadow-sm transition-colors cursor-pointer"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 h-7 pl-2 pr-0.5 rounded-lg bg-card-bg shadow-sm text-xs font-bold text-foreground">
                                <span className="text-[11px] font-semibold opacity-60 whitespace-nowrap">
                                    Per page:
                                </span>
                                <StudioSelect
                                    size="sm"
                                    aria-label="Items per page"
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="!h-6 !px-2 !border-0 !shadow-none"
                                >
                                    <option value={24}>24</option>
                                    <option value={48}>48</option>
                                    <option value={72}>72</option>
                                    <option value={96}>96</option>
                                </StudioSelect>
                            </div>
                        </div>
                    </div>

                    {paginatedImages.length > 0 ? (
                        <>
                            <div
                                className={`grid transition-all duration-300 ${
                                    isBulkEditOpen && !isBulkEditMinimized
                                        ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4'
                                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-5'
                                }`}
                            >
                                {paginatedImages.map((img) => (
                                    <div key={img.id} className="relative">
                                        <AssetCard
                                            file={null}
                                            previewUrl={img.thumbPath || img.path}
                                            hasMetadata={true}
                                            isSelected={selectedSet.has(img.id)}
                                            isInBulkEdit={viewMode === 'active' && bulkEditIdSet.has(img.id)}
                                            draggable={viewMode === 'active' && canEdit}
                                            onDragStart={(e) => handleCardDragStart(e, img)}
                                            onDragEnd={endDraggingItems}
                                            onEdit={() => (viewMode === 'trash' ? handleRestore([img.id]) : handleEdit(img.id))}
                                            onToggleSelect={(e) => handleToggleSelect(img.id, e)}
                                            luminance={img.luminance}
                                            contrastBgDark={img.contrastBgDark}
                                            contrastBgLight={img.contrastBgLight}
                                        />
                                        {viewMode === 'trash' && (
                                            <div className="mt-1.5 flex items-center justify-between text-[11px] px-1">
                                                <span className="text-foreground/60 truncate max-w-[110px]" title={img.name || img.filename}>
                                                    {img.name || img.filename}
                                                </span>
                                                <span className="text-rose-400 font-semibold whitespace-nowrap">
                                                    {img.daysRemaining === null || img.daysRemaining === undefined
                                                        ? 'Kept'
                                                        : img.daysRemaining === 0
                                                        ? 'Expires soon'
                                                        : `${img.daysRemaining}d left`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <GlassCard className="px-4 py-2.5 !shadow-none">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={filteredImages.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={(page) => {
                                        setCurrentPage(page);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            </GlassCard>
                        </>
                    ) : (
                        <GlassCard className="py-16 text-center space-y-3 !shadow-none">
                            <div className="w-12 h-12 mx-auto rounded-xl bg-foreground/5 border border-card-border flex items-center justify-center text-foreground/40">
                                {viewMode === 'trash' ? (
                                    <Trash2 className="w-6 h-6" />
                                ) : (
                                    <FolderOpen className="w-6 h-6" />
                                )}
                            </div>
                            <p className="text-sm font-medium text-foreground/60">
                                {search
                                    ? 'No matching files found for your search.'
                                    : viewMode === 'trash'
                                    ? 'Trash Bin is empty.'
                                    : 'No files uploaded yet.'}
                            </p>
                        </GlassCard>
                    )}
                </div>

                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Confirm"
                    cancelText="Cancel"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
