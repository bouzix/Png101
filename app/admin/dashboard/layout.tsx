'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

interface SessionInfo {
    authenticated: boolean;
    role: 'super_admin' | 'team_member' | null;
    name?: string;
    email?: string | null;
    permissions: string[];
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        Settings: true,
    });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [session, setSession] = useState<SessionInfo | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) {
            setIsCollapsed(JSON.parse(saved));
        }

        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                setSession(data);
            })
            .catch(() => {});
    }, [pathname]);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    const handleSignOut = async () => {
        const wasTeamMember = session?.role === 'team_member';
        await fetch('/api/logout', { method: 'POST' });
        router.push(wasTeamMember ? '/team/login' : '/admin');
    };

    const toggleMenu = (name: string) => {
        if (isCollapsed) return; // Don't toggle accordion when collapsed
        setOpenMenus((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    };

    const hasPerm = (perm: string) => {
        if (!session) return true; // While loading initial session, avoid flicker
        if (session.role === 'super_admin' || session.permissions.includes('*')) return true;
        return session.permissions.includes(perm);
    };

    const isSuperAdmin = !session || session.role === 'super_admin';

    const navItems = useMemo(() => {
        const items: {
            name: string;
            href: string;
            icon: React.ReactNode;
            visible: boolean;
            children?: { name: string; href: string; visible: boolean }[];
        }[] = [
            {
                name: 'Upload',
                href: '/admin/dashboard',
                visible: hasPerm('upload_images'),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                ),
            },
            {
                name: 'Files',
                href: '/admin/dashboard/files',
                visible: hasPerm('upload_images') || hasPerm('edit_images') || hasPerm('delete_images'),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                ),
            },
            {
                name: 'Collections',
                href: '/admin/dashboard/collections',
                visible: hasPerm('manage_collections'),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                ),
            },
            {
                name: 'Team',
                href: '/admin/dashboard/team',
                visible: isSuperAdmin,
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                ),
            },
            {
                name: 'Analytics',
                href: '/admin/dashboard/analytics',
                visible: hasPerm('view_analytics'),
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                ),
            },
            {
                name: 'Settings',
                href: '#',
                visible: true,
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                ),
                children: [
                    { name: 'General', href: '/admin/dashboard/settings', visible: hasPerm('manage_general_settings') },
                    { name: 'API Keys', href: '/admin/dashboard/settings/api-keys', visible: hasPerm('manage_api_keys') },
                    { name: 'Code Injection', href: '/admin/dashboard/settings/code-injection', visible: hasPerm('manage_code_injection') },
                    { name: 'Data Management', href: '/admin/dashboard/settings/data-management', visible: hasPerm('manage_data_seo') },
                    { name: 'Error Pages', href: '/admin/dashboard/settings/error-pages', visible: hasPerm('manage_general_settings') },
                ],
            },
        ];

        return items
            .map((item) => {
                if (item.children) {
                    const visibleChildren = item.children.filter((c) => c.visible);
                    return {
                        ...item,
                        children: visibleChildren,
                        visible: visibleChildren.length > 0,
                    };
                }
                return item;
            })
            .filter((item) => item.visible);
    }, [session]);

    // Check if the current route is permitted for this user
    const isCurrentRoutePermitted = useMemo(() => {
        if (!session || session.role === 'super_admin') return true;
        if (pathname === '/admin/dashboard') return hasPerm('upload_images');
        if (pathname.startsWith('/admin/dashboard/files')) {
            return hasPerm('upload_images') || hasPerm('edit_images') || hasPerm('delete_images');
        }
        if (pathname.startsWith('/admin/dashboard/collections')) return hasPerm('manage_collections');
        if (pathname.startsWith('/admin/dashboard/analytics')) return hasPerm('view_analytics');
        if (pathname === '/admin/dashboard/settings') return hasPerm('manage_general_settings');
        if (pathname.startsWith('/admin/dashboard/settings/api-keys')) return hasPerm('manage_api_keys');
        if (pathname.startsWith('/admin/dashboard/settings/code-injection')) return hasPerm('manage_code_injection');
        if (pathname.startsWith('/admin/dashboard/settings/data-management')) return hasPerm('manage_data_seo');
        if (pathname.startsWith('/admin/dashboard/settings/error-pages')) return hasPerm('manage_general_settings');
        if (pathname.startsWith('/admin/dashboard/team') || pathname.startsWith('/admin/dashboard/settings/team')) return false;
        return true;
    }, [session, pathname]);

    return (
        <div className="h-screen overflow-hidden bg-background flex">
            {/* Sidebar */}
            <aside className={`admin-sidebar ${isCollapsed ? 'w-20 overflow-visible' : 'w-64'} bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out relative shadow-sm dark:shadow-xl z-20`}>
                {/* Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-9 bg-blue-600 border-2 border-white dark:border-slate-800 rounded-full p-1 text-white hover:bg-blue-500 shadow-md z-50 transition-colors cursor-pointer"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>

                {/* Header */}
                <div className={`p-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 h-[88px]`}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            PNG Finder
                        </h1>
                        {session && (
                            <p className="text-[11px] text-slate-500 dark:text-blue-300/70 truncate">
                                {session.role === 'super_admin'
                                    ? 'Super Admin'
                                    : `Team · ${session.name || session.email}`}
                            </p>
                        )}
                    </div>
                </div>

                <nav className={`flex-1 p-4 space-y-2 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
                    {navItems.map((item) => {
                        const isParentActive = item.children
                            ? item.children.some((child) => pathname === child.href)
                            : pathname === item.href;
                        const hasChildren = item.children && item.children.length > 0;
                        const isOpen = openMenus[item.name];

                        return (
                            <div key={item.name} className="group relative">
                                <div
                                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all cursor-pointer ${
                                        isParentActive
                                            ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/25'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                    onClick={() => {
                                        if (hasChildren) {
                                            toggleMenu(item.name);
                                        } else {
                                            router.push(item.href);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon}
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    {hasChildren && !isCollapsed && (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    )}
                                </div>

                                {/* Collapsed Tooltip / Floating Menu */}
                                {isCollapsed && (
                                    <div className="absolute left-full top-0 pl-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                                        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 px-1 min-w-max">
                                            <div className="px-3 py-2 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 mb-1 whitespace-nowrap text-xs">
                                                {item.name}
                                            </div>
                                            {hasChildren && (
                                                <div className="space-y-0.5">
                                                    {item.children!.map((child) => (
                                                        <Link
                                                            key={child.name}
                                                            href={child.href}
                                                            className={`block px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                                                                pathname === child.href
                                                                    ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold'
                                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Expanded Submenu */}
                                {hasChildren && isOpen && !isCollapsed && (
                                    <div className="ml-10 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {item.children!.map((child) => {
                                            const isChildActive = pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.name}
                                                    href={child.href}
                                                    className={`block py-1.5 px-3 text-xs rounded-lg transition-colors ${
                                                        isChildActive
                                                            ? 'text-blue-600 dark:text-white font-semibold bg-blue-50 dark:bg-blue-800/30'
                                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/30'
                                                    }`}
                                                >
                                                    {child.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom Bar: Theme Toggle & Sign Out */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    {/* Theme Toggle in Sidebar */}
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1'} py-1`}>
                        {!isCollapsed && (
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Theme
                            </span>
                        )}
                        <ThemeToggle
                            size="sm"
                            className="bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-500/50"
                        />
                    </div>

                    <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors group relative cursor-pointer text-sm font-medium`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 2.062-2.062a.908.908 0 0 0 0-1.285L18.75 12m4.5 3L21 12m0 0 2.25-2.25" />
                        </svg>
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                            Sign Out
                        </span>

                        {isCollapsed && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-blue-700 rounded-lg shadow-xl px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300 whitespace-nowrap">
                                    Sign Out
                                </div>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {isCurrentRoutePermitted ? (
                    children
                ) : (
                    <div className="max-w-lg mx-auto mt-20 bg-card-bg border border-card-border rounded-2xl p-8 text-center shadow-2xl space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
                        <p className="text-sm text-foreground/60">
                            Your team account does not have permission to access this section. Contact the Super Admin if you need additional permissions.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
