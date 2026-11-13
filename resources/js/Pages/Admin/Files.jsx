import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import AssetCard from '@/components/admin/AssetCard';
import BulkEditSidebar from '@/components/admin/BulkEditSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { CheckSquare, Square, Trash2, Pencil } from 'lucide-react';

export default function AdminFiles() {
    const [images, setImages] = useState([]);
    const [search, setSearch] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('search') || '';
        }
        return '';
    });
    const [selectedIds, setSelectedIds] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
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

    const filteredImages = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return images;

        return images.filter((img) => {
            const nameMatch = (img.name || img.filename || '').toLowerCase().includes(q);
            const filenameMatch = (img.filename || '').toLowerCase().includes(q);
            const altMatch = (img.altText || '').toLowerCase().includes(q);
            const descMatch = (img.description || '').toLowerCase().includes(q);
            const tagMatch = Array.isArray(img.tags) && img.tags.some(t => String(t).toLowerCase().includes(q));
            return nameMatch || filenameMatch || altMatch || descMatch || tagMatch;
        });
    }, [images, search]);

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
                toast.success('Images deleted successfully');
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

    const editingImage = images.find(img => img.id === editingFileId);
    const selectedImages = images.filter(img => selectedIds.includes(img.id));

    const imagesToEdit = editingImage
        ? [editingImage]
        : selectedImages;

    return (
        <AdminLayout>
            <Head title="My Files - Admin" />
            <div className="max-w-6xl mx-auto pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">My Files</h2>
                        <p className="text-sm text-foreground/60 mt-0.5">
                            {search.trim()
                                ? `Found ${filteredImages.length} matching file${filteredImages.length !== 1 ? 's' : ''} out of ${images.length} total`
                                : `${images.length} published file${images.length !== 1 ? 's' : ''} in catalog`}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground/80">
                            <span className="text-foreground/50 text-xs font-medium whitespace-nowrap">Per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
                            >
                                <option value={20} className="bg-card-bg text-foreground">20</option>
                                <option value={40} className="bg-card-bg text-foreground">40</option>
                                <option value={60} className="bg-card-bg text-foreground">60</option>
                                <option value={100} className="bg-card-bg text-foreground">100</option>
                            </select>
                        </div>

                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Search all files by title, tag..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-card-bg border border-card-border text-foreground px-4 py-2 rounded-lg focus:outline-none focus:border-primary-glow pl-10 pr-8"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-foreground/50 absolute left-3 top-1/2 -translate-y-1/2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground cursor-pointer"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {paginatedImages.length > 0 ? (
                    <div className="space-y-6">
                        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-4 bg-card-bg/95 backdrop-blur-md border border-card-border rounded-xl p-4 shadow-md">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleToggleSelectPage}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-background border border-card-border hover:border-primary-glow/50 text-foreground transition-all cursor-pointer"
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
                                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-background/70 border border-card-border hover:border-primary-glow/40 text-foreground/80 hover:text-foreground transition-all cursor-pointer"
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
                                        className="text-xs font-semibold text-foreground/50 hover:text-foreground underline underline-offset-2 cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {selectedIds.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: 'Delete Images',
                                                    message: `Are you sure you want to delete ${selectedIds.length} image(s)? This action cannot be undone.`,
                                                    onConfirm: handleDelete,
                                                })
                                            }
                                            disabled={loading}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {loading ? 'DELETING...' : `DELETE (${selectedIds.length})`}
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
                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors cursor-pointer"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            EDIT {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {paginatedImages.map((img) => (
                                <AssetCard
                                    key={img.id}
                                    file={null}
                                    previewUrl={img.path}
                                    hasMetadata={true}
                                    isSelected={selectedSet.has(img.id)}
                                    onEdit={() => handleEdit(img.id)}
                                    onToggleSelect={(e) => handleToggleSelect(img.id, e)}
                                    luminance={img.luminance}
                                    contrastBgDark={img.contrastBgDark}
                                    contrastBgLight={img.contrastBgLight}
                                />
                            ))}
                        </div>

                        <div className="mt-8 pt-4 border-t border-card-border">
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
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-foreground/50">
                        {search ? 'No matching files found across your catalog.' : 'No files uploaded yet.'}
                    </div>
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
                    confirmText="Yes, Delete"
                    cancelText="Cancel"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
