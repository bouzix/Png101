import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    onClick?: () => void;
}

export default function GlassCard({ children, className = '', noPadding = false, onClick }: GlassCardProps) {
    const baseStyles = 'bg-card-bg border border-card-border rounded-xl shadow-lg transition-all duration-300';
    const paddingStyles = noPadding ? '' : 'p-6';
    const hoverStyles = onClick ? 'hover:border-primary-glow/50 hover:shadow-primary-glow/10 cursor-pointer' : '';

    return (
        <div
            className={`${baseStyles} ${paddingStyles} ${hoverStyles} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
