import React, { useState, useMemo } from 'react';

const CategoryTreeSelect = ({ categories = [], selectedIds = [], onSelectionChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set());

    const toggleExpand = (id) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const handleSelect = (id, checked) => {
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        }
    };

    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories;
        const lowerTerm = searchTerm.toLowerCase();
        const filterTree = (cats) => {
            return cats.reduce((acc, cat) => {
                const matches = cat.name.toLowerCase().includes(lowerTerm);
                const filteredChildren = cat.children ? filterTree(cat.children) : [];
                if (matches || filteredChildren.length > 0) {
                    acc.push({ ...cat, children: filteredChildren });
                }
                return acc;
            }, []);
        };
        return filterTree(categories);
    }, [categories, searchTerm]);

    const renderTree = (cats, depth = 0) => {
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
                        <button
                            type="button"
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

                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelect(cat.id, e.target.checked)}
                            className="w-4 h-4 text-primary-glow bg-background border-card-border rounded focus:ring-primary-glow focus:ring-2 cursor-pointer"
                        />

                        <span
                            className="text-sm text-foreground cursor-pointer flex-1"
                            onClick={() => handleSelect(cat.id, !isSelected)}
                        >
                            {cat.name}
                        </span>
                    </div>

                    {hasChildren && isExpanded && (
                        <div className="border-l border-card-border/50 ml-[1.1rem]">
                            {renderTree(cat.children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="w-full">
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

