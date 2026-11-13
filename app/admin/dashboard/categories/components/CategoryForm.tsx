'use client';

import { useState, useEffect } from 'react';

interface Category {
    id?: string;
    name: string;
    slug: string;
    description: string | null;
    parentId?: string | null;
}

interface CategoryFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Category) => Promise<void>;
    initialData?: Category | null;
    categories: Category[]; // Pass all categories for parent selection
}

export default function CategoryForm({ isOpen, onClose, onSubmit, initialData, categories }: CategoryFormProps) {
    const [formData, setFormData] = useState<Category>({
        name: '',
        slug: '',
        description: '',
        parentId: null
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({ name: '', slug: '', description: '', parentId: null });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === '' ? null : value,
            // Auto-generate slug from name if slug field is not being edited directly
            slug: name === 'name' && !initialData ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.slug
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter out the current category and its children to prevent circular references (simplified: just filter self)
    const availableParents = categories.filter(c => c.id !== initialData?.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Modal Title */}
                <h2 className="text-2xl font-bold text-foreground mb-6">
                    {initialData ? 'Edit Category' : 'New Category'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full bg-background border border-card-border text-foreground px-4 py-3 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all"
                            placeholder="e.g. Nature"
                        />
                    </div>

                    {/* Slug Input */}
                    <div>
                        <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                            Slug
                        </label>
                        <input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            required
                            className="w-full bg-background border border-card-border text-foreground px-4 py-3 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all font-mono text-sm"
                            placeholder="e.g. nature"
                        />
                    </div>

                    {/* Parent Category Select */}
                    <div>
                        <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                            Parent Category (Optional)
                        </label>
                        <select
                            name="parentId"
                            value={formData.parentId || ''}
                            onChange={handleChange}
                            className="w-full bg-background border border-card-border text-foreground px-4 py-3 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all appearance-none"
                        >
                            <option value="">None (Top Level)</option>
                            {availableParents.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description Input */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-background border border-card-border text-foreground px-4 py-3 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all resize-none"
                            placeholder="Optional description..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-6 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold rounded-lg border border-red-600/20 transition-colors cursor-pointer"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-8 bg-primary-glow hover:bg-primary-glow/90 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-glow cursor-pointer"
                        >
                            {loading ? 'SAVING...' : 'SAVE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
