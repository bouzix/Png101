import React from 'react';

export default function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPages = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-foreground/60">
                Showing <span className="font-semibold text-foreground">{startItem}</span> to{' '}
                <span className="font-semibold text-foreground">{endItem}</span> of{' '}
                <span className="font-semibold text-foreground">{totalItems}</span> items
            </p>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card-bg border border-card-border text-foreground/80 hover:bg-foreground/5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                    Prev
                </button>
                {getPages().map(p => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            p === currentPage
                                ? 'bg-primary-glow text-white border-primary-glow'
                                : 'bg-card-bg border-card-border text-foreground/70 hover:text-foreground'
                        }`}
                    >
                        {p}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-card-bg border border-card-border text-foreground/80 hover:bg-foreground/5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

