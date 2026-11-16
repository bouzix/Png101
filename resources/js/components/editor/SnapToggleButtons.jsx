import React from 'react';
import { Magnet, Frame, Boxes, Crosshair, Grid3X3 } from 'lucide-react';

/**
 * Shared clickable snapping toggle icon strip rendered in both the top contextual toolbar
 * and the expanded floating selection toolbar.
 */
export default function SnapToggleButtons({
    snapPrefs,
    onToggleSnapPref,
    testIdPrefix = 'snap',
}) {
    if (!snapPrefs || !onToggleSnapPref) return null;

    const items = [
        {
            key: 'enabled',
            suffix: 'master',
            label: snapPrefs.enabled ? 'Disable All Snapping' : 'Enable Snapping',
            active: Boolean(snapPrefs.enabled),
            Icon: Magnet,
        },
        {
            key: 'artboard',
            suffix: 'artboard',
            label: 'Snap to Artboard',
            active: Boolean(snapPrefs.enabled && snapPrefs.artboard),
            Icon: Frame,
        },
        {
            key: 'elements',
            suffix: 'elements',
            label: 'Snap to Elements',
            active: Boolean(snapPrefs.enabled && snapPrefs.elements),
            Icon: Boxes,
        },
        {
            key: 'points',
            suffix: 'points',
            label: 'Snap to Points',
            active: Boolean(snapPrefs.enabled && snapPrefs.points),
            Icon: Crosshair,
        },
        {
            key: 'grid',
            suffix: 'grid',
            label: `Snap to Grid (${snapPrefs.gridSize || 40}px)`,
            active: Boolean(snapPrefs.enabled && snapPrefs.grid),
            Icon: Grid3X3,
        },
    ];

    return (
        <div className="flex items-center gap-1">
            {items.map((item) => {
                const Icon = item.Icon;
                return (
                    <button
                        key={item.key}
                        type="button"
                        data-testid={`${testIdPrefix}-${item.suffix}`}
                        aria-pressed={item.active}
                        onClick={() => onToggleSnapPref(item.key)}
                        data-tooltip={item.label}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            item.active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                    </button>
                );
            })}
        </div>
    );
}
