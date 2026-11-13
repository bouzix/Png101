'use client';
import React, { useState, useMemo } from 'react';

interface Category {
    id: string;
    name: string;
    parentId?: string | null;
    children?: Category[];
}

interface CategoryTreeSelectProps {
    categories: Category[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

const CategoryTreeSelect = ({ categories, selectedIds, onSelectionChange }: CategoryTreeSelectProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Helper to toggle expansion
    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    // Helper to handle selection
    const handleSelect = (id: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        }
    };

    // Filter categories based on search
    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories;

        const lowerTerm = searchTerm.toLowerCase();

        // Recursive filter function
        const filterTree = (cats: Category[]): Category[] => {
            return cats.reduce((acc: Category[], cat) => {
                const matches = cat.name.toLowerCase().includes(lowerTerm);
                const filteredChildren = cat.children ? filterTree(cat.children) : [];

                if (matches || filteredChildren.length > 0) {
                    acc.push({
                        ...cat,
                        children: filteredChildren
                    });
                }
                return acc;
            }, []);
        };

        return filterTree(categories);
    }, [categories, searchTerm]);

    // Recursive render function
    const renderTree = (cats: Category[], depth = 0) => {
        return cats.map(cat => {
            const isExpanded = expandedIds.has(cat.id) || searchTerm.length > 0;
            const hasChildren = cat.children && cat.children.length > 0;
            const isSelected = selectedIds.includes(cat.id);

            return (
                <div key={cat.id} className="select-none">
                    <div
                        className={`flex items-center gap-2 p-2 hover:bg-card-border/20 rounded transition-colors ${isSelected ? 'bg-primary-glow/10' : ''}`}
                        style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                    >
                        {/* Expand/Collapse Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(cat.id);
                            }}
                            className={`w-4 h-4 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors ${!hasChildren ? 'opacity-0 pointer-events-none' : ''}`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            >
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {/* Checkbox */}
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelect(cat.id, e.target.checked)}
                            className="w-4 h-4 text-primary-glow bg-background border-card-border rounded focus:ring-primary-glow focus:ring-2 cursor-pointer"
                        />

                        {/* Label */}
                        <span
                            className="text-sm text-foreground cursor-pointer flex-1"
                            onClick={() => handleSelect(cat.id, !isSelected)}
                        >
                            {cat.name}
                        </span>
                    </div>

                    {/* Children */}
                    {hasChildren && isExpanded && (
                        <div className="border-l border-card-border/50 ml-[1.1rem]">
                            {renderTree(cat.children!, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="w-full">
            {/* Search Bar */}
            <div className="relative mb-2">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full bg-background border border-card-border text-foreground text-sm px-3 py-2 pl-9 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all"
                />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                >
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
            </div>

            {/* Tree List */}
            <div className="bg-background border border-card-border rounded-lg max-h-60 overflow-y-auto p-2">
                {categories.length === 0 ? (
                    <p className="text-foreground/40 text-sm text-center py-4">No categories found</p>
                ) : (
                    renderTree(filteredCategories)
                )}
            </div>
        </div>
    );
};

export default CategoryTreeSelect;
