import React from 'react';
import { Link, usePage } from '@inertiajs/react';

const TABS = [
    { name: 'General', href: '/admin/dashboard/settings' },
    { name: 'Website & SEO', href: '/admin/dashboard/settings/website-info' },
    { name: 'API Keys', href: '/admin/dashboard/settings/api-keys' },
    { name: 'Code Injection', href: '/admin/dashboard/settings/code-injection' },
    { name: 'Error Pages', href: '/admin/dashboard/settings/error-pages' },
    { name: 'Data Management', href: '/admin/dashboard/settings/data-management' },
    { name: 'Team', href: '/admin/dashboard/settings/team' },
];

export default function SettingsNav() {
    const { url } = usePage();
    const pathname = url.split('?')[0];

    return (
        <div className="flex flex-wrap gap-2 pb-6 mb-6 border-b border-card-border">
            {TABS.map(tab => {
                const isActive = pathname === tab.href;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                                ? 'bg-primary-glow text-white shadow-md shadow-blue-500/20'
                                : 'bg-card-bg border border-card-border text-foreground/70 hover:text-foreground hover:bg-foreground/5'
                        }`}
                    >
                        {tab.name}
                    </Link>
                );
            })}
        </div>
    );
}

