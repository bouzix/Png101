import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Database, Trash2, FolderX, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import SettingsNav from '@/components/admin/SettingsNav';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function DataManagementSettings() {
    const [loadingDb, setLoadingDb] = useState(false);
    const [loadingUploads, setLoadingUploads] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const handleClearDb = async () => {
        setLoadingDb(true);
        try {
            const res = await fetch('/api/admin/clear-db', { method: 'DELETE' });
            if (res.ok) toast.success('Database image records cleared');
            else toast.error('Failed to clear database');
        } catch {
            toast.error('Network error');
        } finally {
            setLoadingDb(false);
        }
    };

    const handleClearUploads = async () => {
        setLoadingUploads(true);
        try {
            const res = await fetch('/api/admin/clear-uploads', { method: 'DELETE' });
            if (res.ok) toast.success('Uploads folder cleared');
            else toast.error('Failed to clear uploads');
        } catch {
            toast.error('Network error');
        } finally {
            setLoadingUploads(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Data Management - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <SettingsNav />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Data Management</h1>
                    <p className="text-sm text-foreground/60">Dangerous administrative actions for resetting database records or uploaded files.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card-bg border border-red-500/20 rounded-2xl p-6 space-y-4 shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Clear Image Database</h3>
                        <p className="text-sm text-foreground/60">
                            Permanently deletes all image records from the database. Uploaded files on disk remain unless cleared separately.
                        </p>
                        <button
                            onClick={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    title: 'Clear All Image Records?',
                                    message: 'This will permanently delete ALL image records from the database. This cannot be undone.',
                                    onConfirm: handleClearDb,
                                })
                            }
                            disabled={loadingDb}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold cursor-pointer disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            {loadingDb ? 'Clearing...' : 'Clear Image Database'}
                        </button>
                    </div>

                    <div className="bg-card-bg border border-red-500/20 rounded-2xl p-6 space-y-4 shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                            <FolderX className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Clear Uploads Folder</h3>
                        <p className="text-sm text-foreground/60">
                            Deletes all files inside <code className="font-mono text-xs">public/uploads</code>. Make sure you have a backup if needed.
                        </p>
                        <button
                            onClick={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    title: 'Clear Uploads Directory?',
                                    message: 'This will delete ALL uploaded PNG files from disk. This cannot be undone.',
                                    onConfirm: handleClearUploads,
                                })
                            }
                            disabled={loadingUploads}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold cursor-pointer disabled:opacity-50"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {loadingUploads ? 'Clearing...' : 'Clear Uploads Folder'}
                        </button>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Yes, Proceed"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}

