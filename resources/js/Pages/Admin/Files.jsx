import React, { useState, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import AdminLayout from '@/Layouts/AdminLayout';
import AssetCard from '@/components/admin/AssetCard';
import BulkEditSidebar from '@/components/admin/BulkEditSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';

export default function AdminFiles() {
    const [images, setImages] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [loading, setLoading] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [editingFileId, setEditingFileId] = useState(null);
    const [session, setSession] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
                if (data) setSession(data);
            })
            .catch(() => {});
        fetchImages();
    }, []);

    const canEdit = !session || session.role === 'super_admin' || session.permissions?.includes('files_edit');
    const canDelete = !session || session.role === 'super_admin' || session.permissions?.includes('files_delete');

    const fetchImages = async () => {
        try {
            const res = await fetch('/api/images?limit=1000');
            if (res.ok) {
                const data = await res.json();
                setImages(data.images || data || []);
            }
        } catch (error) {
            console.error('Failed to fetch images', error);
        }
    };

    const filteredImages = useMemo(() => {
        if (!search.trim()) return images;
        const q = search.toLowerCase();
        return images.filter(
            img =>
                (img.name && img.name.toLowerCase().includes(q)) ||
                (img.filename && img.filename.toLowerCase().includes(q)) ||
                (Array.isArray(img.tags) && img.tags.some(t => t.toLowerCase().includes(q)))
        );
    }, [images, search]);

    const totalPages = Math.max(1, Math.ceil(filteredImages.length / itemsPerPage));
    const paginatedImages = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredImages.slice(start, start + itemsPerPage);
    }, [filteredImages, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
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
                    body: JSON.stringify(update),
                });

                if (res.ok) {
                    successCount++;
                    setImages(prev => prev.map(img => (img.id === update.id ? { ...img, ...update } : img)));
                } else {
                    failCount++;
                }
            } catch {
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
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (res.ok) {
                setImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
                setSelectedIds([]);
                toast.success('Images deleted successfully');
            } else {
                toast.error('Failed to delete images');
            }
        } catch {
            toast.error('Delete failed: Network or server error');
        } finally {
            setLoading(false);
        }
    };

    const editingImage = images.find(img => img.id === editingFileId);
    const selectedImages = images.filter(img => selectedIds.includes(img.id));
    const imagesToEdit = editingImage ? [editingImage] : selectedImages;

    return (
        <AdminLayout>
            <Head title="Files Manager - Png101 Admin" />
            <div className="max-w-6xl mx-auto pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
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
                                onChange={e => setItemsPerPage(Number(e.target.value))}
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
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-card-bg border border-card-border text-foreground px-4 py-2 rounded-lg focus:outline-none focus:border-primary-glow pl-10 pr-8"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-foreground/50 absolute left-3 top-1/2 -translate-y-1/2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground cursor-pointer"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {paginatedImages.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {paginatedImages.map(img => (
                                <AssetCard
                                    key={img.id}
                                    file={null}
                                    previewUrl={img.path}
                                    hasMetadata={true}
                                    isSelected={selectedIds.includes(img.id)}
                                    onEdit={() => handleEdit(img.id)}
                                    onToggleSelect={() => handleToggleSelect(img.id)}
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
                                onPageChange={page => {
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-foreground/50">
                        {search ? 'No matching files found across your catalog.' : 'No files uploaded yet.'}
                    </div>
                )}

                {selectedIds.length > 0 && (
                    <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-card-bg border-t border-card-border p-4 flex justify-end items-center gap-4 z-40">
                        <span className="text-foreground/60 font-medium mr-4">{selectedIds.length} Selected</span>

                        {canEdit && (
                            <button
                                onClick={selectedIds.length === 1 ? () => handleEdit(selectedIds[0]) : handleBulkEdit}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer"
                            >
                                EDIT {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                            </button>
                        )}

                        {canDelete && (
                            <button
                                onClick={() =>
                                    setConfirmDialog({
                                        isOpen: true,
                                        title: 'Delete Images',
                                        message: `Are you sure you want to delete ${selectedIds.length} image(s)? This action cannot be undone.`,
                                        onConfirm: handleDelete,
                                    })
                                }
                                disabled={loading}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? 'DELETING...' : 'DELETE'}
                            </button>
                        )}
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
                        contrastBgLight: img.contrastBgLight,
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

