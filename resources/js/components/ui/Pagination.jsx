import React from 'react';

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange
}) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) {
        return (
            <div className="text-sm text-foreground/60 text-center py-4">
                Showing {totalItems} image{totalItems !== 1 ? 's' : ''}
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="text-sm text-foreground/60">
                Showing {startItem}-{endItem} of {totalItems} images
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-card-bg border border-card-border text-foreground/80 hover:text-foreground"
                >
                    ← Prev
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-2 text-foreground/40">
                                    ...
                                </span>
                            );
                        }

                        const pageNum = page;
                        const isActive = pageNum === currentPage;

                        return (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => onPageChange(pageNum)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-primary-glow text-white shadow-lg shadow-primary-glow/20'
                                        : 'text-foreground/80 hover:text-foreground hover:bg-card-bg border border-card-border'
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-card-bg border border-card-border text-foreground/80 hover:text-foreground"
                >
                    Next →
                </button>
            </div>
        </div>
    );
}
