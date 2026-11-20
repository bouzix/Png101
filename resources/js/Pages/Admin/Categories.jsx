import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import CategoryList from '@/components/admin/categories/CategoryList';
import CategoryForm from '@/components/admin/categories/CategoryForm';
import BulkEditCategoriesSidebar from '@/components/admin/categories/BulkEditCategoriesSidebar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { FolderTree } from 'lucide-react';
import { toast } from 'sonner';

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleCreate = async (data) => {
        const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            fetchCategories();
            toast.success('Category created successfully');
        } else {
            const errorData = await res.json().catch(() => ({}));
            toast.error(errorData.error || 'Failed to create category');
        }
    };

    const handleUpdate = async (data) => {
        if (!editingCategory) return;
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            fetchCategories();
            toast.success('Category updated successfully');
        } else {
            toast.error('Failed to update category');
        }
    };

    const handleDelete = async (id) => {
        const findCategory = (cats, targetId) => {
            for (const cat of cats) {
                if (cat.id === targetId) return cat;
                if (cat.children) {
                    const found = findCategory(cat.children, targetId);
                    if (found) return found;
                }
            }
            return undefined;
        };

        const category = findCategory(categories, id);

        setConfirmDialog({
            isOpen: true,
            title: 'Delete Category',
            message: `Are you sure you want to delete "${category?.name}"? This action cannot be undone.`,
            onConfirm: async () => {
                const res = await fetch(`/api/categories/${id}`, {
                    method: 'DELETE',
                });
                if (res.ok) {
                    fetchCategories();
                    toast.success('Category deleted successfully');
                } else {
                    toast.error('Failed to delete category');
                }
            },
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Delete Categories',
            message: `Are you sure you want to delete ${selectedIds.length} ${selectedIds.length === 1 ? 'category' : 'categories'}? This action cannot be undone.`,
            onConfirm: async () => {
                setLoading(true);
                let successCount = 0;
                let failCount = 0;

                for (const id of selectedIds) {
                    try {
                        const res = await fetch(`/api/categories/${id}`, {
                            method: 'DELETE',
                        });
                        if (res.ok) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } catch {
                        failCount++;
                    }
                }

                fetchCategories();
                setSelectedIds([]);
                setLoading(false);

                if (failCount === 0) {
                    toast.success(`Successfully deleted ${successCount} ${successCount === 1 ? 'category' : 'categories'}`);
                } else {
                    toast.warning(`Deleted ${successCount} categories. ${failCount} failed.`);
                }
            },
        });
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        const getAllIds = (cats) => {
            return cats.reduce((acc, cat) => {
                acc.push(cat.id);
                if (cat.children) {
                    acc.push(...getAllIds(cat.children));
                }
                return acc;
            }, []);
        };

        const allIds = getAllIds(categories);

        if (allIds.every(id => selectedIds.includes(id))) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allIds);
        }
    };

    const handleBulkEdit = () => {
        setIsBulkEditOpen(true);
    };

    const handleBulkSave = async (updates) => {
        let successCount = 0;
        let failCount = 0;

        for (const update of updates) {
            try {
                const res = await fetch(`/api/categories/${update.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: update.name,
                        slug: update.slug,
                        description: update.description,
                    }),
                });

                if (res.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setIsBulkEditOpen(false);
        setSelectedIds([]);
        fetchCategories();

        if (failCount === 0) {
            toast.success(`Successfully updated ${successCount} categories`);
        } else {
            toast.warning(`Updated ${successCount} categories. ${failCount} failed.`);
        }
    };

    const handleViewImages = (category) => {
        toast.info(`View images for category: ${category.name} (Coming soon)`);
    };

    const flattenCategories = (cats) => {
        return cats.reduce((acc, cat) => {
            acc.push(cat);
            if (cat.children) {
                acc.push(...flattenCategories(cat.children));
            }
            return acc;
        }, []);
    };

    const flatCategories = flattenCategories(categories);
    const selectedCategories = flatCategories.filter(cat => selectedIds.includes(cat.id));

    return (
        <AdminLayout>
            <Head title="Categories - Admin" />
            <div className="space-y-6 pb-24">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground mb-1 flex items-center gap-2.5 sm:gap-3">
                            <FolderTree className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0" />
                            <span>Categories</span>
                        </h1>
                        <p className="hidden xl:block text-sm text-foreground/60">Manage image categories and organization.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setIsFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-glow text-white text-xs sm:text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-glow/20 transition-all shrink-0 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="sm:hidden">New</span>
                        <span className="hidden sm:inline">New Category</span>
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto"></div>
                        <p className="mt-4 text-foreground/60">Loading categories...</p>
                    </div>
                ) : (
                    <CategoryList
                        categories={categories}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        onToggleSelectAll={handleToggleSelectAll}
                        onViewImages={handleViewImages}
                        onEdit={(category) => {
                            setEditingCategory(category);
                            setIsFormOpen(true);
                        }}
                        onDelete={handleDelete}
                    />
                )}

                {selectedIds.length > 0 && (
                    <div className="fixed bottom-24 md:bottom-0 right-0 left-0 md:left-20 lg:left-64 bg-card-bg border-t border-card-border px-4 py-3 sm:p-4 flex justify-end items-center gap-2.5 sm:gap-4 z-40">
                        <span className="text-foreground/60 font-medium mr-4">
                            {selectedIds.length} Selected
                        </span>

                        <button
                            onClick={selectedIds.length === 1
                                ? () => {
                                    const category = flatCategories.find(c => c.id === selectedIds[0]);
                                    if (category) {
                                        setEditingCategory(category);
                                        setIsFormOpen(true);
                                        setSelectedIds([]);
                                    }
                                }
                                : handleBulkEdit
                            }
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-6 py-2 rounded-lg font-bold transition-colors cursor-pointer"
                        >
                            EDIT {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                        </button>

                        <button
                            onClick={handleBulkDelete}
                            disabled={loading}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? 'DELETING...' : 'DELETE'}
                        </button>
                    </div>
                )}

                <CategoryForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={editingCategory ? handleUpdate : handleCreate}
                    initialData={editingCategory}
                    categories={flatCategories}
                />

                <BulkEditCategoriesSidebar
                    isOpen={isBulkEditOpen}
                    onClose={() => setIsBulkEditOpen(false)}
                    selectedCategories={selectedCategories}
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
