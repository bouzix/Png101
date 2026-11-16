import React from 'react';
import { LayoutGrid, LayoutList } from 'lucide-react';

/**
 * Shared List / Grid view switcher for batch processing result cards.
 */
export default function BatchViewToggle({ viewMode, onChange }) {
    return (
        <div
            role="group"
            aria-label="View mode"
            className="inline-flex items-center p-0.5 rounded-xl bg-background border border-card-border"
        >
            <button
                type="button"
                aria-pressed={viewMode === 'list'}
                onClick={() => onChange('list')}
                title="List view"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-foreground/65 hover:text-foreground'
                }`}
            >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
            </button>
            <button
                type="button"
                aria-pressed={viewMode === 'grid'}
                onClick={() => onChange('grid')}
                title="Grid view"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'grid'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-foreground/65 hover:text-foreground'
                }`}
            >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
            </button>
        </div>
    );
}
