import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import DropZone from '@/components/admin/DropZone';
import AssetCard from '@/components/admin/AssetCard';
import BulkEditSidebar from '@/components/admin/BulkEditSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';
import { CheckSquare, Square, Trash2, Loader2, CheckCircle2, Copy, X, Sparkles } from 'lucide-react';

export default function Dashboard() {
    const [stagedFiles, setStagedFiles] = useState([]);
    const [targetKeyword, setTargetKeyword] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('keyword') || '';
        }
        return '';
    });
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [progress, setProgress] = useState({
        active: false,
        mode: 'staging',
        total: 0,
        completed: 0,
        succeeded: 0,
        failed: 0,
        currentFileName: '',
    });

    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [editingFileId, setEditingFileId] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    useEffect(() => {
        fetch('/api/images?status=draft')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const drafts = data.map(img => ({
                        id: img.id,
                        file: null,
                        preview: img.path,
                        name: img.name,
                        tags: img.tags || [],
                        altText: img.altText || '',
                        description: img.description || '',
                        categoryIds: img.categories?.map(c => c.categoryId) || [],
                        hasMetadata: !!(img.name && img.tags && img.tags.length > 0),
                        isSelected: false,
                        luminance: img.luminance || null,
                        contrastBgDark: img.contrastBgDark || null,
                        contrastBgLight: img.contrastBgLight || null,
                    }));
                    setStagedFiles(drafts);
                }
            });
    }, []);

    const handleFilesDropped = async (files) => {
        if (files.length === 0) return;

        setProgress({
            active: true,
            mode: 'staging',
            total: files.length,
            completed: 0,
            succeeded: 0,
            failed: 0,
            currentFileName: files[0].name,
        });

        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setProgress(prev => ({
                ...prev,
                currentFileName: file.name,
            }));

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) {
                    const data = await res.json();
                    const newFile = {
                        id: data.image.id,
                        file: file,
                        preview: data.image.path,
                        name: data.image.name,
                        tags: [],
                        altText: '',
                        description: '',
                        categoryIds: [],
                        hasMetadata: false,
                        isSelected: false,
                        luminance: data.image.luminance || null,
                        contrastBgDark: data.image.contrastBgDark || null,
                        contrastBgLight: data.image.contrastBgLight || null,
                    };
                    setStagedFiles(prev => [newFile, ...prev]);
                    succeeded++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error('Upload failed', error);
                failed++;
            }

            setProgress(prev => ({
                ...prev,
                completed: i + 1,
                succeeded,
                failed,
            }));
        }

        if (failed === 0) {
            toast.success(
                succeeded === 1
                    ? 'Image uploaded successfully'
                    : `Successfully uploaded all ${succeeded} images!`
            );
        } else {
            toast.warning(`Uploaded ${succeeded} images. ${failed} failed.`);
        }

        setTimeout(() => {
            setProgress(prev => ({ ...prev, active: false }));
        }, 2000);
    };

    const handleEdit = (id) => {
        setEditingFileId(id);
        setIsBulkEditOpen(true);
    };

    const handleBulkEdit = () => {
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
                    setStagedFiles(prev => prev.map(f => {
                        if (f.id === update.id) {
                            return {
                                ...f,
                                ...update,
                                hasMetadata: !!(update.name && update.tags && update.tags.length > 0),
                            };
                        }
                        return f;
                    }));
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setIsBulkEditOpen(false);
        setEditingFileId(null);

        if (failCount === 0) {
            toast.success(`Successfully updated ${successCount} images`);
        } else {
            toast.warning(`Updated ${successCount} images. ${failCount} failed.`);
        }
    };

    const handleToggleSelect = (id) => {
        setStagedFiles(prev => prev.map(f => {
            if (f.id === id) {
                return { ...f, isSelected: !f.isSelected };
            }
            return f;
        }));
    };

    const allSelected = stagedFiles.length > 0 && stagedFiles.every(f => f.isSelected);

    const handleToggleSelectAll = () => {
        const nextState = !allSelected;
        setStagedFiles(prev => prev.map(f => ({ ...f, isSelected: nextState })));
    };

    const handleDeleteSelected = () => {
        const selected = stagedFiles.filter(f => f.isSelected);
        if (selected.length === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Delete Selected Draft Images',
            message: `Are you sure you want to permanently delete ${selected.length} selected ${selected.length === 1 ? 'image' : 'images'}? This action cannot be undone.`,
            onConfirm: async () => {
                setDeleting(true);
                const idsToDelete = selected.map(f => f.id);
                try {
                    const res = await fetch('/api/images/delete', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: idsToDelete }),
                    });

                    if (res.ok) {
                        setStagedFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
                        toast.success(
                            `Deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? 'image' : 'images'} successfully`
                        );
                    } else {
                        toast.error('Failed to delete selected images');
                    }
                } catch (error) {
                    console.error('Delete failed:', error);
                    toast.error('An error occurred while deleting images');
                } finally {
                    setDeleting(false);
                }
            },
        });
    };

    const handleUploadSelected = async () => {
        const selectedReady = stagedFiles.filter(f => f.isSelected && f.hasMetadata);
        if (selectedReady.length === 0) return;

        setUploading(true);
        setProgress({
            active: true,
            mode: 'publishing',
            total: selectedReady.length,
            completed: 0,
            succeeded: 0,
            failed: 0,
            currentFileName: selectedReady[0].name,
        });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedReady.length; i++) {
            const stagedFile = selectedReady[i];
            setProgress(prev => ({
                ...prev,
                currentFileName: stagedFile.name,
            }));

            try {
                const res = await fetch('/api/images/update', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: stagedFile.id, status: 'published' }),
                });

                if (res.ok) {
                    successCount++;
                    setStagedFiles(prev => prev.filter(f => f.id !== stagedFile.id));
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }

            setProgress(prev => ({
                ...prev,
                completed: i + 1,
                succeeded: successCount,
                failed: failCount,
            }));
        }

        setUploading(false);
        if (failCount === 0) {
            toast.success(`Successfully published ${successCount} images!`);
        } else {
            toast.warning(`Published ${successCount} images. ${failCount} failed.`);
        }

        setTimeout(() => {
            setProgress(prev => ({ ...prev, active: false }));
        }, 2000);
    };

    const editingFile = stagedFiles.find(f => f.id === editingFileId);
    const selectedFiles = stagedFiles.filter(f => f.isSelected);
    const readyToUploadCount = stagedFiles.filter(f => f.isSelected && f.hasMetadata).length;
    const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    const imagesToEdit = editingFile
        ? [editingFile]
        : selectedFiles;

    return (
        <AdminLayout>
            <Head title="Upload Image - Admin" />
            <div className="max-w-6xl mx-auto pb-24">
                <h2 className="text-2xl font-bold text-foreground mb-6">Upload Image</h2>

                {targetKeyword && (
                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                    Filling Search Demand Gap
                                </div>
                                <p className="text-sm text-foreground">
                                    Target keyword from Team Hub: <span className="font-bold text-amber-300">"{targetKeyword}"</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(targetKeyword);
                                    toast.success(`Copied "${targetKeyword}"`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Keyword
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetKeyword('')}
                                className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground cursor-pointer"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <DropZone onFilesDropped={handleFilesDropped} />
                </div>

                {progress.active && (
                    <div className="mb-8 bg-card-bg border border-card-border rounded-xl p-5 shadow-xl animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {progress.completed < progress.total ? (
                                    <div className="p-2 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 flex-shrink-0">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">
                                            {progress.completed < progress.total
                                                ? progress.mode === 'staging'
                                                    ? 'Uploading Files...'
                                                    : 'Publishing Images...'
                                                : progress.mode === 'staging'
                                                ? 'Batch Upload Complete!'
                                                : 'Publishing Complete!'}
                                        </h3>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground/60 truncate mt-0.5">
                                        {progress.completed < progress.total
                                            ? `Processing: ${progress.currentFileName}`
                                            : `${progress.succeeded} succeeded${progress.failed > 0 ? `, ${progress.failed} failed` : ''}`}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                                <span className="text-sm font-bold text-foreground">
                                    {progress.completed} / {progress.total}
                                </span>
                                <p className="text-xs text-foreground/50">files</p>
                            </div>
                        </div>

                        <div className="w-full h-3 bg-background border border-card-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-primary-glow transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {stagedFiles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-card-bg border border-card-border rounded-xl p-4 shadow-md">
                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleToggleSelectAll}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-background border border-card-border hover:border-primary-glow/50 text-foreground transition-all cursor-pointer"
                                >
                                    {allSelected ? (
                                        <CheckSquare className="w-4 h-4 text-primary-glow" />
                                    ) : (
                                        <Square className="w-4 h-4 text-foreground/60" />
                                    )}
                                    {allSelected ? 'Deselect All' : `Select All (${stagedFiles.length})`}
                                </button>

                                <span className="text-sm text-foreground/60">
                                    <strong className="text-foreground">{selectedFiles.length}</strong> of{' '}
                                    <strong className="text-foreground">{stagedFiles.length}</strong> selected
                                    <span className="mx-2 text-foreground/30">&bull;</span>
                                    <strong className="text-foreground">{readyToUploadCount}</strong>/{stagedFiles.length} ready to upload
                                </span>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={deleting || uploading}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deleting ? 'DELETING...' : `DELETE (${selectedFiles.length})`}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={selectedFiles.length === 1 ? () => handleEdit(selectedFiles[0].id) : handleBulkEdit}
                                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors cursor-pointer"
                                    >
                                        EDIT {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleUploadSelected}
                                        disabled={readyToUploadCount === 0 || uploading}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-primary-glow hover:bg-primary-glow/90 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors cursor-pointer"
                                    >
                                        {uploading ? 'PUBLISHING...' : 'UPLOAD SELECTED'}
                                        {!uploading && (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {stagedFiles.map(file => (
                                <AssetCard
                                    key={file.id}
                                    file={file.file}
                                    previewUrl={file.preview}
                                    hasMetadata={file.hasMetadata}
                                    isSelected={file.isSelected}
                                    onEdit={() => handleEdit(file.id)}
                                    onToggleSelect={() => handleToggleSelect(file.id)}
                                    luminance={file.luminance}
                                    contrastBgDark={file.contrastBgDark}
                                    contrastBgLight={file.contrastBgLight}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <BulkEditSidebar
                    isOpen={isBulkEditOpen}
                    onClose={() => {
                        setIsBulkEditOpen(false);
                        setEditingFileId(null);
                    }}
                    selectedImages={imagesToEdit.map(f => ({
                        ...f,
                        path: f.preview,
                        filename: f.name,
                        luminance: f.luminance,
                        contrastBgDark: f.contrastBgDark,
                        contrastBgLight: f.contrastBgLight,
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
