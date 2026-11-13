import React from 'react';
import GlassCard from './GlassCard';

export default function StatCard({ title, value, icon, trend, subtitle }) {
    return (
        <GlassCard>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-foreground/60 text-sm font-medium mb-2">{title}</p>
                    <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
                    {subtitle && (
                        <p className="text-foreground/50 text-xs">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                            {trend.direction === 'up' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                                </svg>
                            )}
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="ml-4 p-3 bg-primary-glow/10 rounded-lg text-primary-glow">
                        {icon}
                    </div>
                )}
            </div>
        </GlassCard>
    );
}

