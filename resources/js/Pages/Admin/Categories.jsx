import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, FolderTree, X, ChevronRight, ChevronDown } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    // Form fields
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(Array.isArray(data) ? data : data.categories || []);
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

    const flattenCategories = (cats, depth = 0) => {
        let out = [];
        for (const cat of cats) {
            out.push({ ...cat, depth });
            if (cat.children && cat.children.length > 0) {
                out = out.concat(flattenCategories(cat.children, depth + 1));
            }
        }
        return out;
    };

    const flatList = flattenCategories(categories);

    const openCreateModal = (defaultParentId = '') => {
        setEditingCategory(null);
        setName('');
        setSlug('');
        setDescription('');
        setParentId(defaultParentId);
        setIsModalOpen(true);
    };

    const openEditModal = (cat) => {
        setEditingCategory(cat);
        setName(cat.name || '');
        setSlug(cat.slug || '');
        setDescription(cat.description || '');
        setParentId(cat.parentId || '');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const payload = {
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim() || null,
            parentId: parentId || null,
        };

        try {
            const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
            const method = editingCategory ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(editingCategory ? 'Category updated' : 'Category created');
                setIsModalOpen(false);
                fetchCategories();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Operation failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (cat) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Category',
            message: `Are you sure you want to delete "${cat.name}"?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        toast.success('Category deleted');
                        fetchCategories();
                    } else {
                        toast.error('Failed to delete category');
                    }
                } catch {
                    toast.error('Failed to delete category');
                }
            },
        });
    };

    const toggleExpand = (id) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const renderCategoryRows = (cats, depth = 0) => {
        return cats.map(cat => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isExpanded = expandedIds.has(cat.id);
            return (
                <React.Fragment key={cat.id}>
                    <div
                        className="flex items-center justify-between gap-4 p-4 border-b border-card-border hover:bg-foreground/[0.02] transition-colors"
                        style={{ paddingLeft: `${depth * 24 + 16}px` }}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => toggleExpand(cat.id)}
                                className={`p-1 rounded text-foreground/50 hover:text-foreground cursor-pointer ${!hasChildren ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <FolderTree className="w-4 h-4 text-primary-glow shrink-0" />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground truncate">{cat.name}</span>
                                    <span className="text-xs font-mono text-foreground/40">/{cat.slug}</span>
                                </div>
                                {cat.description && (
                                    <p className="text-xs text-foreground/60 truncate max-w-md">{cat.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {cat._count?.images ?? cat.images_count ?? 0} PNGs
                            </span>
                            <button
                                onClick={() => openEditModal(cat)}
                                className="p-2 rounded-lg text-foreground/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="Edit"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(cat)}
                                className="p-2 rounded-lg text-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {hasChildren && isExpanded && renderCategoryRows(cat.children, depth + 1)}
                </React.Fragment>
            );
        });
    };

    return (
        <AdminLayout>
            <Head title="Categories - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Categories</h2>
                        <p className="text-sm text-foreground/60 mt-1">Organize your PNG library with hierarchical categories</p>
                    </div>
                    <button
                        onClick={() => openCreateModal()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-glow hover:bg-primary-glow/90 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        New Category
                    </button>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-xl">
                    {isLoading ? (
                        <div className="p-12 text-center text-foreground/50">Loading categories...</div>
                    ) : categories.length > 0 ? (
                        <div>{renderCategoryRows(categories)}</div>
                    ) : (
                        <div className="p-16 text-center text-foreground/50">No categories yet. Create your first category above.</div>
                    )}
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-card-bg border border-card-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
                            <div className="flex items-center justify-between border-b border-card-border pb-4">
                                <h3 className="text-lg font-bold text-foreground">
                                    {editingCategory ? 'Edit Category' : 'Create Category'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-foreground/50 hover:text-foreground cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                        className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                                        placeholder="e.g., Technology"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Slug (optional)</label>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={e => setSlug(e.target.value)}
                                        className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:border-primary-glow"
                                        placeholder="auto-generated-from-name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Parent Category</label>
                                    <select
                                        value={parentId}
                                        onChange={e => setParentId(e.target.value)}
                                        className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                                    >
                                        <option value="">None (Top Level)</option>
                                        {flatList
                                            .filter(c => c.id !== editingCategory?.id)
                                            .map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {'— '.repeat(c.depth)}{c.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Description</label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full bg-background border border-card-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                                        placeholder="Optional category description..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-card-border text-sm text-foreground/70 hover:text-foreground cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 rounded-xl bg-primary-glow hover:bg-primary-glow/90 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Delete"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}

