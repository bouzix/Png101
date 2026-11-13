import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import AssetCard from '@/components/admin/AssetCard';
import BulkEditSidebar from '@/components/admin/BulkEditSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from 'sonner';
import { CheckSquare, Square, Trash2, Pencil, RotateCcw, AlertTriangle, FolderOpen, Image as ImageIcon, Search, X } from 'lucide-react';

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

    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [editingFileId, setEditingFileId] = useState(null);
    const [loading, setLoading] = useState(false);
    const lastSelectedIdRef = useRef(null);
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
    }, []);

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

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const allPageSelected =
        paginatedImages.length > 0 && paginatedImages.every((img) => selectedSet.has(img.id));
    const allFilteredSelected =
        filteredImages.length > 0 && filteredImages.every((img) => selectedSet.has(img.id));

    const handleToggleSelect = (id, event) => {
        const isShift = Boolean(event?.shiftKey || event?.nativeEvent?.shiftKey);
        if (isShift && lastSelectedIdRef.current) {
            const startIdx = filteredImages.findIndex((img) => img.id === lastSelectedIdRef.current);
            const endIdx = filteredImages.findIndex((img) => img.id === id);
            if (startIdx !== -1 && endIdx !== -1) {
                const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                const rangeIds = filteredImages.slice(from, to + 1).map((img) => img.id);
                setSelectedIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
                lastSelectedIdRef.current = id;
                return;
            }
        }

        lastSelectedIdRef.current = id;
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleToggleSelectPage = () => {
        const pageIds = paginatedImages.map((img) => img.id);
        if (allPageSelected) {
            const pageSet = new Set(pageIds);
            setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const handleSelectAllFiltered = () => {
        if (allFilteredSelected) {
            const filteredSet = new Set(filteredImages.map((img) => img.id));
            setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
        } else {
            setSelectedIds((prev) =>
                Array.from(new Set([...prev, ...filteredImages.map((img) => img.id)]))
            );
        }
    };

    const handleEdit = (id) => {
        if (!canEdit) {
            toast.error('You do not have permission to edit images.');
            return;
        }
        setEditingFileId(id);
        setIsBulkEditOpen(true);
    };

    const handleBulkEdit = () => {
        if (!canEdit) {
            toast.error('You do not have permission to edit images.');
            return;
        }
        setEditingFileId(null);
        setIsBulkEditOpen(true);
    };

    const handleBulkSave = async (updates) => {
        let successCount = 0;
        let failCount = 0;

        for (const update of updates) {
            try {
                const res = await fetch('/api/images/update', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update)
                });

                if (res.ok) {
                    successCount++;
                    setImages(prev => prev.map(img => {
                        if (img.id === update.id) {
                            return { ...img, ...update };
                        }
                        return img;
                    }));
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }

        setIsBulkEditOpen(false);
        setEditingFileId(null);
        setSelectedIds([]);

        if (failCount === 0) {
            toast.success(`Successfully updated ${successCount} images`);
        } else {
            toast.warning(`Updated ${successCount} images. ${failCount} failed.`);
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

    const editingImage = images.find(img => img.id === editingFileId);
    const selectedImages = images.filter(img => selectedIds.includes(img.id));

    const imagesToEdit = editingImage
        ? [editingImage]
        : selectedImages;

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

                {/* Search & Display Controls */}
                <GlassCard className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-foreground/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search all files by title, filename, or tag..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-background border border-card-border text-foreground pl-10 pr-9 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary-glow transition-colors"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-foreground/45 hover:text-foreground cursor-pointer transition-colors"
                                    title="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="flex items-center gap-2 bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground/80">
                                <span className="text-foreground/50 text-xs font-medium whitespace-nowrap">Per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
                                >
                                    <option value={24} className="bg-card-bg text-foreground">24</option>
                                    <option value={48} className="bg-card-bg text-foreground">48</option>
                                    <option value={72} className="bg-card-bg text-foreground">72</option>
                                    <option value={96} className="bg-card-bg text-foreground">96</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {paginatedImages.length > 0 ? (
                    <div className="space-y-6">
                        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-4 bg-card-bg/95 backdrop-blur-md border border-card-border rounded-xl p-4 shadow-lg">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleToggleSelectPage}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-background border border-card-border hover:border-primary-glow/50 text-foreground transition-all cursor-pointer"
                                >
                                    {allPageSelected ? (
                                        <CheckSquare className="w-4 h-4 text-primary-glow" />
                                    ) : (
                                        <Square className="w-4 h-4 text-foreground/60" />
                                    )}
                                    {filteredImages.length > paginatedImages.length
                                        ? allPageSelected
                                            ? `Deselect Page (${paginatedImages.length})`
                                            : `Select Page (${paginatedImages.length})`
                                        : allPageSelected
                                        ? 'Deselect All'
                                        : `Select All (${paginatedImages.length})`}
                                </button>

                                {filteredImages.length > paginatedImages.length && (
                                    <button
                                        type="button"
                                        onClick={handleSelectAllFiltered}
                                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-background border border-card-border hover:border-primary-glow/40 text-foreground/80 hover:text-foreground transition-all cursor-pointer"
                                    >
                                        {allFilteredSelected
                                            ? `Deselect All (${filteredImages.length})`
                                            : `Select All (${filteredImages.length})`}
                                    </button>
                                )}

                                <span className="text-sm text-foreground/60">
                                    <strong className="text-foreground">{selectedIds.length}</strong> of{' '}
                                    <strong className="text-foreground">{filteredImages.length}</strong> selected
                                </span>

                                {selectedIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIds([])}
                                        className="text-xs font-semibold text-foreground/55 hover:text-foreground underline underline-offset-2 cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {selectedIds.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {viewMode === 'trash' ? (
                                        <>
                                            {(canEdit || canDelete) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(selectedIds)}
                                                    disabled={loading}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    RESTORE ({selectedIds.length})
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
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    DELETE FOREVER ({selectedIds.length})
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
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {loading ? 'MOVING...' : `MOVE TO TRASH (${selectedIds.length})`}
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
                                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors cursor-pointer"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    EDIT {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
                            {paginatedImages.map((img) => (
                                <div key={img.id} className="relative">
                                    <AssetCard
                                        file={null}
                                        previewUrl={img.thumbPath || img.path}
                                        hasMetadata={true}
                                        isSelected={selectedSet.has(img.id)}
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

                        <GlassCard className="p-4">
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
                    </div>
                ) : (
                    <GlassCard className="py-16 text-center space-y-3">
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

                <BulkEditSidebar
                    isOpen={isBulkEditOpen}
                    onClose={() => {
                        setIsBulkEditOpen(false);
                        setEditingFileId(null);
                    }}
                    selectedImages={imagesToEdit.map(img => ({
                        id: img.id,
                        filename: img.name || img.filename,
                        path: img.path,
                        tags: img.tags,
                        altText: img.altText,
                        description: img.description,
                        categoryIds: img.categories?.map(c => c.categoryId),
                        luminance: img.luminance,
                        contrastBgDark: img.contrastBgDark,
                        contrastBgLight: img.contrastBgLight
                    }))}
                    onSave={handleBulkSave}
                />

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
