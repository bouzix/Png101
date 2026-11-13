'use client';

import React, { useState } from 'react';

interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    _count: {
        images: number;
    };
    children?: Category[];
}

interface CategoryListProps {
    categories: Category[];
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onViewImages: (category: Category) => void;
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
}

export default function CategoryList({
    categories,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onViewImages,
    onEdit,
    onDelete
}: CategoryListProps) {
    // Helper to get all IDs from the tree
    const getAllIds = (cats: Category[]): string[] => {
        return cats.reduce((acc: string[], cat) => {
            acc.push(cat.id);
            if (cat.children) {
                acc.push(...getAllIds(cat.children));
            }
            return acc;
        }, []);
    };

    const allIds = getAllIds(categories);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    // Recursive row renderer
    const renderRows = (cats: Category[], depth = 0) => {
        return cats.map((category) => (
            <React.Fragment key={category.id}>
                <tr
                    className={`hover:bg-background/50 transition-colors group ${selectedIds.includes(category.id) ? 'bg-primary-glow/5' : ''}`}
                >
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(category.id)}
                                onChange={() => onToggleSelect(category.id)}
                                className="w-4 h-4 text-primary-glow bg-background border-card-border rounded focus:ring-primary-glow focus:ring-2 cursor-pointer"
                            />
                        </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                        <div style={{ paddingLeft: `${depth * 1.5}rem` }} className="flex items-center gap-2">
                            {depth > 0 && (
                                <span className="text-foreground/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M15.28 9.47a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L13.69 10 9.97 6.28a.75.75 0 0 1 1.06-1.06l4.25 4.25ZM6.03 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.69 10 6.03 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                            {category.name}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-primary-glow font-mono text-sm">{category.slug}</td>
                    <td className="px-6 py-4 text-foreground/70 truncate max-w-xs">{category.description || '-'}</td>
                    <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-glow/10 text-primary-glow border border-primary-glow/30">
                            {category._count.images}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                            {/* View Images Button */}
                            <button
                                onClick={() => onViewImages(category)}
                                className="p-2 text-foreground/60 hover:text-primary-glow hover:bg-primary-glow/10 rounded-lg transition-all group/btn"
                                title="View Images"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            </button>

                            {/* Edit Button */}
                            <button
                                onClick={() => onEdit(category)}
                                className="p-2 text-foreground/60 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all group/btn"
                                title="Edit Category"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                                onClick={() => onDelete(category.id)}
                                className="p-2 text-foreground/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all group/btn"
                                title="Delete Category"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
                {category.children && category.children.length > 0 && renderRows(category.children, depth + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden shadow-xl">
            <table className="w-full text-left">
                <thead className="bg-background/50 text-foreground/80 uppercase text-xs font-semibold">
                    <tr>
                        <th className="px-6 py-4 w-12">
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(input) => {
                                        if (input) input.indeterminate = someSelected;
                                    }}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 text-primary-glow bg-background border-card-border rounded focus:ring-primary-glow focus:ring-2 cursor-pointer"
                                />
                            </div>
                        </th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Slug</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4 text-center">Images</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                    {categories.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-foreground/40">
                                No categories found. Create one to get started.
                            </td>
                        </tr>
                    ) : (
                        renderRows(categories)
                    )}
                </tbody>
            </table>
        </div>
    );
}
