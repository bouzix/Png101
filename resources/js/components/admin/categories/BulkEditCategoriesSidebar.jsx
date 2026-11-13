import React, { useState, useEffect } from 'react';

const BulkEditCategoriesSidebar = ({ isOpen, onClose, selectedCategories = [], onSave }) => {
    const [editedCategories, setEditedCategories] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setEditedCategories(JSON.parse(JSON.stringify(selectedCategories)));
        }
    }, [isOpen, selectedCategories]);

    const handleUpdate = (id, field, value) => {
        setEditedCategories(prev => prev.map(cat => {
            if (cat.id === id) {
                return { ...cat, [field]: value };
            }
            return cat;
        }));
    };

    const handleSave = () => {
        const updates = editedCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
        }));
        onSave(updates);
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-card-bg border-l border-card-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-card-bg/95 backdrop-blur supports-[backdrop-filter]:bg-card-bg/60 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Bulk Edit Categories</h2>
                        <p className="text-sm text-foreground/60">Editing {selectedCategories.length} categories</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-foreground/60 hover:text-foreground"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {editedCategories.map((cat) => (
                        <div key={cat.id} className="bg-background border border-card-border rounded-xl p-4 shadow-sm">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={cat.name}
                                        onChange={(e) => handleUpdate(cat.id, 'name', e.target.value)}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary-glow"
                                        placeholder="Category Name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1">Slug</label>
                                    <input
                                        type="text"
                                        value={cat.slug}
                                        onChange={(e) => handleUpdate(cat.id, 'slug', e.target.value)}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary-glow font-mono"
                                        placeholder="category-slug"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1">Description</label>
                                    <textarea
                                        value={cat.description || ''}
                                        onChange={(e) => handleUpdate(cat.id, 'description', e.target.value)}
                                        rows={2}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-md text-sm focus:outline-none focus:border-primary-glow resize-none"
                                        placeholder="Description (optional)"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-card-border bg-card-bg/95 backdrop-blur supports-[backdrop-filter]:bg-card-bg/60 sticky bottom-0 z-10 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold transition-colors border border-red-600/20"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-2 rounded-lg bg-primary-glow hover:bg-primary-glow/90 text-white font-bold transition-colors shadow-lg shadow-blue-500/20"
                    >
                        SAVE ALL
                    </button>
                </div>
            </div>
        </>
    );
};

export default BulkEditCategoriesSidebar;

