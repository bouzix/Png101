import React, { isValidElement } from 'react';
import GlassCard from './GlassCard';

const COLOR_MAP = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    orange: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    teal: 'bg-teal-500/10 text-teal-400',
};

export function StatCard({ title, value, icon, trend, subtitle, color }) {
    const renderIcon = () => {
        if (!icon) return null;
        if (isValidElement(icon)) return icon;
        const IconComp = icon;
        return <IconComp className="w-6 h-6" />;
    };

    const normalizedTrend =
        typeof trend === 'number'
            ? { direction: trend >= 0 ? 'up' : 'down', value: trend }
            : trend;

    const iconClass = COLOR_MAP[color] || 'bg-primary-glow/10 text-primary-glow';

    return (
        <GlassCard>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-foreground/60 text-sm font-medium mb-2">{title}</p>
                    <p className="text-3xl font-bold text-foreground mb-1 truncate">{value}</p>
                    {subtitle && (
                        <p className="text-foreground/50 text-xs">{subtitle}</p>
                    )}
                    {normalizedTrend && (
                        <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${normalizedTrend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                            {normalizedTrend.direction === 'up' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                                </svg>
                            )}
                            <span>{Math.abs(normalizedTrend.value)}%</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`ml-4 p-3 rounded-lg shrink-0 ${iconClass}`}>
                        {renderIcon()}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}

export default StatCard;
