import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useCallback,
    createContext,
    useContext,
} from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    ShieldAlert,
    Lock,
    Wrench,
    UploadCloud,
    LayoutGrid,
    FolderOpen,
    Settings as SettingsIcon,
    Menu,
    X,
    ExternalLink,
    LogOut,
    ChevronDown,
    Sparkles,
    SlidersHorizontal,
    KeyRound,
    Code2,
    Database,
    AlertTriangle,
    Scale,
    ShieldCheck,
    RefreshCw,
    Layers,
    Type,
    BarChart3,
    Globe,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { BrandIcon } from '@/components/BrandMark';
import GlobalUpdateNotifier from '@/components/admin/GlobalUpdateNotifier';
import { useBulkEdit } from '@/components/admin/BulkEditSidebar';
import { useUploadManager } from '@/components/admin/UploadManager';

const AdminShellContext = createContext(false);

function SubmenuList({ items, activePath, onSelectChild }) {
    const listRef = useRef(null);
    const itemRefs = useRef({});
    const hasMeasuredRef = useRef(false);
    const [indicator, setIndicator] = useState({
        top: 0,
        height: 0,
        visible: false,
        animate: false,
    });

    const activeChild = useMemo(
        () => items.find((c) => c.permitted && activePath === c.href) || null,
        [items, activePath]
    );

    const updateIndicator = useCallback(() => {
        if (!activeChild) {
            setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }
        const el = itemRefs.current[activeChild.href];
        if (!el) return;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (height <= 0) return;

        const shouldAnimate = hasMeasuredRef.current;
        hasMeasuredRef.current = true;
        setIndicator((prev) => {
            if (
                prev.top === top &&
                prev.height === height &&
                prev.visible === true &&
                prev.animate === shouldAnimate
            ) {
                return prev;
            }
            return {
                top,
                height,
                visible: true,
                animate: shouldAnimate,
            };
        });
    }, [activeChild]);

    useLayoutEffect(() => {
        updateIndicator();
    }, [updateIndicator, items]);

    useEffect(() => {
        if (!listRef.current || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            updateIndicator();
        });
        observer.observe(listRef.current);
        return () => observer.disconnect();
    }, [updateIndicator]);

    return (
        <div
            ref={listRef}
            className="relative ml-10 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200"
        >
            <div
                aria-hidden="true"
                className="absolute left-0 right-0 rounded-lg bg-blue-50 dark:bg-blue-600/25 border border-blue-200/80 dark:border-blue-500/30 shadow-xs pointer-events-none z-0 before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-blue-600 dark:before:bg-blue-400"
                style={{
                    top: 0,
                    height: `${indicator.height}px`,
                    transform: `translate3d(0, ${indicator.top}px, 0)`,
                    opacity: indicator.visible ? 1 : 0,
                    transition: indicator.animate
                        ? 'transform 380ms cubic-bezier(0.22, 1.08, 0.36, 1), height 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease'
                        : 'opacity 180ms ease',
                }}
            />

            {items.map((child) => {
                const isChildActive = activePath === child.href;
                if (!child.permitted) {
                    return (
                        <div
                            key={child.name}
                            title={child.reason}
                            aria-disabled="true"
                            className="relative z-10 flex items-center justify-between py-1.5 px-3 text-xs rounded-lg text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed select-none"
                        >
                            <span>{child.name}</span>
                            <Lock className="w-3 h-3 flex-shrink-0" />
                        </div>
                    );
                }
                return (
                    <Link
                        key={child.name}
                        ref={(el) => {
                            itemRefs.current[child.href] = el;
                        }}
                        href={child.href}
                        onClick={() => onSelectChild(child.href)}
                        className={`relative z-10 block py-1.5 px-3 text-xs rounded-lg transition-colors duration-250 ${
                            isChildActive
                                ? 'text-blue-600 dark:text-white font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/30'
                        }`}
                    >
                        {child.name}
                    </Link>
                );
            })}
        </div>
    );
}

export function PersistentAdminLayout({ children }) {
    const { url, props: pageProps } = usePage();
    const websiteInfo = pageProps?.websiteInfo || {};
    const adminBrandName = websiteInfo?.websiteName || 'Png101';
    const { isOpen: isBulkEditOpen, isMinimized: isBulkEditMinimized } = useBulkEdit();
    const { startStagingUpload } = useUploadManager();
    const [isGlobalDragging, setIsGlobalDragging] = useState(false);
    const globalDragCounterRef = useRef(0);
    const rawPathname = url.split('?')[0];
    const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, '') : rawPathname;
    const isUploadOrFilesPage =
        pathname === '/admin/upload' || pathname === '/admin/dashboard/files';
    const shouldSlideOverForBulkEdit = Boolean(
        isBulkEditOpen && !isBulkEditMinimized && isUploadOrFilesPage
    );

    const [optimisticPath, setOptimisticPath] = useState(null);
    const activePath = optimisticPath || pathname;

    const [openMenus, setOpenMenus] = useState(() => {
        const initPath =
            typeof window !== 'undefined' ? window.location.pathname : pathname;
        return {
            Settings: true,
            Editor: initPath.startsWith('/admin/dashboard/editor'),
        };
    });

    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        if (window.innerWidth >= 768 && window.innerWidth < 1024) {
            return true;
        }
        try {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved ? Boolean(JSON.parse(saved)) : false;
        } catch (e) {
            return false;
        }
    });

    const [collapsedPopoverItem, setCollapsedPopoverItem] = useState(null);
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
    const [mobileSheetTab, setMobileSheetTab] = useState('more'); // 'more' | 'settings'
    const [mobileEditorExpanded, setMobileEditorExpanded] = useState(() =>
        pathname.startsWith('/admin/dashboard/editor')
    );
    const sidebarRef = useRef(null);

    // Always default to minimized sidebar when entering tablet viewport (768px - 1023px)
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
        const tabletMql = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
        const handleTabletChange = (e) => {
            if (e.matches) {
                setIsCollapsed(true);
                setCollapsedPopoverItem(null);
            }
        };
        if (tabletMql.addEventListener) {
            tabletMql.addEventListener('change', handleTabletChange);
            return () => tabletMql.removeEventListener('change', handleTabletChange);
        }
        tabletMql.addListener(handleTabletChange);
        return () => tabletMql.removeListener(handleTabletChange);
    }, []);

    // Close collapsed submenu popover on outside click/tap or Escape
    useEffect(() => {
        if (!collapsedPopoverItem) return undefined;
        const handlePointerDown = (e) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                setCollapsedPopoverItem(null);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setCollapsedPopoverItem(null);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [collapsedPopoverItem]);

    const [session, setSession] = useState(null);
    const mainRef = useRef(null);
    const navListRef = useRef(null);
    const itemWrapperRefs = useRef({});
    const itemRowRefs = useRef({});
    const hasMeasuredNavRef = useRef(false);
    const [navIndicator, setNavIndicator] = useState({
        top: 0,
        height: 0,
        visible: false,
        animate: false,
    });

    // Fetch session once on mount so the sidebar never refreshes or re-fetches on page transitions
    useEffect(() => {
        let isMounted = true;
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) setSession(data);
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, []);

    // Clear optimistic path if an Inertia visit finishes or is cancelled/interrupted
    useEffect(() => {
        const removeFinish = router.on('finish', () => {
            setOptimisticPath(null);
        });
        const removeException = router.on('exception', () => {
            setOptimisticPath(null);
        });
        return () => {
            removeFinish();
            removeException();
        };
    }, []);

    // Sync optimisticPath and auto-expand parent group when pathname changes
    useEffect(() => {
        setOptimisticPath(null);
        setCollapsedPopoverItem(null);
        setMobileSheetOpen(false);
        if (pathname.startsWith('/admin/dashboard/editor')) {
            setOpenMenus((prev) => (prev.Editor ? prev : { ...prev, Editor: true }));
        } else if (pathname.startsWith('/admin/dashboard/settings')) {
            setOpenMenus((prev) => (prev.Settings ? prev : { ...prev, Settings: true }));
        }
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [pathname]);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        setCollapsedPopoverItem(null);
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
        }
    };

    const handleSignOut = async () => {
        const wasTeamMember = session?.role === 'team_member';
        await fetch('/api/logout', { method: 'POST' });
        router.visit(wasTeamMember ? '/team/login' : '/admin');
    };

    const toggleMenu = (name) => {
        if (isCollapsed) {
            setCollapsedPopoverItem((prev) => (prev === name ? null : name));
            return;
        }
        setOpenMenus((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    };

    const hasPerm = (perm) => {
        if (!session) return true;
        if (session.role === 'super_admin' || session.permissions?.includes('*')) return true;
        return Array.isArray(session.permissions) && session.permissions.includes(perm);
    };

    const isSuperAdmin = !session || session.role === 'super_admin';

    const navItems = useMemo(() => {
        const items = [
            {
                name: 'Dashboard',
                href: '/admin/dashboard',
                permitted: true,
                reason: null,
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                    </svg>
                ),
            },
            {
                name: 'Upload',
                href: '/admin/upload',
                permitted: hasPerm('upload_images'),
                reason: 'Requires Upload Images permission',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                ),
            },
            {
                name: 'Files',
                href: '/admin/dashboard/files',
                permitted: hasPerm('upload_images') || hasPerm('edit_images') || hasPerm('delete_images'),
                reason: 'Requires Upload, Edit, or Delete Images permission',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                ),
            },
            {
                name: 'Collections',
                href: '/admin/dashboard/collections',
                permitted: hasPerm('manage_collections'),
                reason: 'Requires Collections & Categories permission',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                ),
            },
            {
                name: 'Team',
                href: '/admin/dashboard/team',
                permitted: isSuperAdmin,
                reason: 'Super Admin only',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                ),
            },
            {
                name: 'Analytics',
                href: '/admin/dashboard/analytics',
                permitted: hasPerm('view_analytics'),
                reason: 'Requires View Analytics permission',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                ),
            },
            {
                name: 'Tools',
                href: '/admin/dashboard/tools',
                permitted: isSuperAdmin,
                reason: 'Super Admin only',
                icon: <Wrench className="w-5 h-5" />,
            },
            {
                name: 'Editor',
                href: '#',
                permitted: hasPerm('manage_editor'),
                reason: 'Requires Manage Image Editor permission',
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                    </svg>
                ),
                children: [
                    { name: 'Dashboard', href: '/admin/dashboard/editor', permitted: hasPerm('manage_editor'), reason: 'Requires Manage Image Editor permission' },
                    { name: 'Templates', href: '/admin/dashboard/editor/templates', permitted: hasPerm('manage_editor'), reason: 'Requires Manage Image Editor permission' },
                    { name: 'Categories & Presets', href: '/admin/dashboard/editor/categories', permitted: hasPerm('manage_editor'), reason: 'Requires Manage Image Editor permission' },
                    { name: 'Fonts & Brand Assets', href: '/admin/dashboard/editor/fonts', permitted: hasPerm('manage_editor'), reason: 'Requires Manage Image Editor permission' },
                    { name: 'Analytics', href: '/admin/dashboard/editor/analytics', permitted: hasPerm('manage_editor'), reason: 'Requires Manage Image Editor permission' },
                    { name: 'Settings', href: '/admin/dashboard/editor/settings', permitted: hasPerm('manage_editor'), reason: 'Requires Manage Image Editor permission' },
                ],
            },
            {
                name: 'Settings',
                href: '#',
                permitted: true,
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                ),
                children: [
                    { name: 'General', href: '/admin/dashboard/settings', permitted: hasPerm('manage_general_settings'), reason: 'Requires General & Website Settings permission' },
                    { name: 'Sliders', href: '/admin/dashboard/settings/sliders', permitted: hasPerm('manage_general_settings'), reason: 'Requires General & Website Settings permission' },
                    { name: 'API Keys', href: '/admin/dashboard/settings/api-keys', permitted: hasPerm('manage_api_keys'), reason: 'Requires Gemini API Keys permission' },
                    { name: 'Code Injection', href: '/admin/dashboard/settings/code-injection', permitted: hasPerm('manage_code_injection'), reason: 'Requires Code Injection permission' },
                    { name: 'Data Management', href: '/admin/dashboard/settings/data-management', permitted: hasPerm('manage_data_seo'), reason: 'Requires Data, Backup & SEO permission' },
                    { name: 'Error Pages', href: '/admin/dashboard/settings/error-pages', permitted: hasPerm('manage_general_settings'), reason: 'Requires General & Website Settings permission' },
                    { name: 'Legal Pages', href: '/admin/dashboard/settings/legal-pages', permitted: hasPerm('manage_general_settings'), reason: 'Requires General & Website Settings permission' },
                    { name: 'Captcha', href: '/admin/dashboard/settings/captcha', permitted: hasPerm('manage_general_settings'), reason: 'Requires General & Website Settings permission' },
                    { name: 'Update App', href: '/admin/dashboard/settings/update-app', permitted: isSuperAdmin, reason: 'Super Admin only' },
                ],
            },
        ];

        return items.map((item) => {
            if (item.children) {
                const anyChildPermitted = item.children.some((c) => c.permitted);
                return {
                    ...item,
                    permitted: anyChildPermitted,
                    reason: anyChildPermitted ? null : 'No Settings permissions granted',
                };
            }
            return item;
        });
    }, [session]);

    const isItemActive = useCallback(
        (item, path) => {
            if (item.children) {
                return item.children.some((child) => path === child.href);
            }
            if (item.href === '/admin/dashboard') {
                return path === '/admin/dashboard';
            }
            if (item.href === '/admin/dashboard/collections') {
                return (
                    path === '/admin/dashboard/collections' ||
                    path.startsWith('/admin/dashboard/categories')
                );
            }
            return path === item.href || path.startsWith(`${item.href}/`);
        },
        []
    );

    const activeParentName = useMemo(() => {
        const match = navItems.find((item) => isItemActive(item, activePath));
        return match ? match.name : null;
    }, [navItems, activePath, isItemActive]);

    const updateNavIndicator = useCallback(() => {
        if (!activeParentName) {
            setNavIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            return;
        }
        const wrapperEl = itemWrapperRefs.current[activeParentName];
        const rowEl = itemRowRefs.current[activeParentName];
        if (!wrapperEl || !rowEl) return;

        const top = wrapperEl.offsetTop + rowEl.offsetTop;
        const height = rowEl.offsetHeight;
        if (height <= 0) return;

        const shouldAnimate = hasMeasuredNavRef.current;
        hasMeasuredNavRef.current = true;
        setNavIndicator((prev) => {
            if (
                prev.top === top &&
                prev.height === height &&
                prev.visible === true &&
                prev.animate === shouldAnimate
            ) {
                return prev;
            }
            return {
                top,
                height,
                visible: true,
                animate: shouldAnimate,
            };
        });
    }, [activeParentName]);

    useLayoutEffect(() => {
        updateNavIndicator();
    }, [updateNavIndicator, openMenus, isCollapsed, navItems]);

    useEffect(() => {
        if (!navListRef.current || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            updateNavIndicator();
        });
        observer.observe(navListRef.current);
        return () => observer.disconnect();
    }, [updateNavIndicator]);

    const isCurrentRoutePermitted = useMemo(() => {
        if (!session || session.role === 'super_admin') return true;
        if (pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard/workspace')) return true;
        if (pathname === '/admin/upload') return hasPerm('upload_images');
        if (pathname.startsWith('/admin/dashboard/files')) {
            return hasPerm('upload_images') || hasPerm('edit_images') || hasPerm('delete_images');
        }
        if (pathname.startsWith('/admin/dashboard/collections') || pathname.startsWith('/admin/dashboard/categories')) {
            return hasPerm('manage_collections');
        }
        if (pathname.startsWith('/admin/dashboard/analytics')) return hasPerm('view_analytics');
        if (pathname.startsWith('/admin/dashboard/editor')) return hasPerm('manage_editor');
        if (pathname === '/admin/dashboard/settings') return hasPerm('manage_general_settings');
        if (pathname.startsWith('/admin/dashboard/settings/api-keys')) return hasPerm('manage_api_keys');
        if (pathname.startsWith('/admin/dashboard/settings/code-injection')) return hasPerm('manage_code_injection');
        if (pathname.startsWith('/admin/dashboard/settings/data-management')) return hasPerm('manage_data_seo');
        if (
            pathname.startsWith('/admin/dashboard/settings/error-pages') ||
            pathname.startsWith('/admin/dashboard/settings/legal-pages') ||
            pathname.startsWith('/admin/dashboard/settings/sliders') ||
            pathname.startsWith('/admin/dashboard/settings/website-info') ||
            pathname.startsWith('/admin/dashboard/settings/captcha')
        ) {
            return hasPerm('manage_general_settings');
        }
        if (pathname.startsWith('/admin/dashboard/team') || pathname.startsWith('/admin/dashboard/tools') || pathname.startsWith('/admin/dashboard/settings/team') || pathname.startsWith('/admin/dashboard/settings/update-app')) return false;
        return true;
    }, [session, pathname]);

    const editorNavItem = useMemo(
        () => navItems.find((i) => i.name === 'Editor') || null,
        [navItems]
    );
    const settingsNavItem = useMemo(
        () => navItems.find((i) => i.name === 'Settings') || null,
        [navItems]
    );
    const extraModuleItems = useMemo(
        () =>
            navItems.filter(
                (i) =>
                    (!i.children || i.children.length === 0) &&
                    i.name !== 'Dashboard' &&
                    i.name !== 'Upload' &&
                    i.name !== 'Files'
            ),
        [navItems]
    );

    const getSettingsChildIcon = (name) => {
        switch (name) {
            case 'General':
                return <Globe className="w-3.5 h-3.5 shrink-0" />;
            case 'Sliders':
                return <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />;
            case 'API Keys':
                return <KeyRound className="w-3.5 h-3.5 shrink-0" />;
            case 'Code Injection':
                return <Code2 className="w-3.5 h-3.5 shrink-0" />;
            case 'Data Management':
                return <Database className="w-3.5 h-3.5 shrink-0" />;
            case 'Error Pages':
                return <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
            case 'Legal Pages':
                return <Scale className="w-3.5 h-3.5 shrink-0" />;
            case 'Captcha':
                return <ShieldCheck className="w-3.5 h-3.5 shrink-0" />;
            case 'Update App':
                return <RefreshCw className="w-3.5 h-3.5 shrink-0" />;
            default:
                return <SettingsIcon className="w-3.5 h-3.5 shrink-0" />;
        }
    };

    const getEditorChildIcon = (name) => {
        switch (name) {
            case 'Dashboard':
                return <LayoutGrid className="w-3.5 h-3.5 shrink-0" />;
            case 'Templates':
                return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
            case 'Categories & Presets':
                return <Layers className="w-3.5 h-3.5 shrink-0" />;
            case 'Fonts & Brand Assets':
                return <Type className="w-3.5 h-3.5 shrink-0" />;
            case 'Analytics':
                return <BarChart3 className="w-3.5 h-3.5 shrink-0" />;
            default:
                return <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />;
        }
    };

    const mobileActiveIndex = useMemo(() => {
        if (mobileSheetOpen) {
            return mobileSheetTab === 'settings' ? 3 : 4;
        }
        if (activePath === '/admin/dashboard') return 0;
        if (activePath === '/admin/upload') return 1;
        if (activePath.startsWith('/admin/dashboard/files')) return 2;
        if (activePath.startsWith('/admin/dashboard/settings')) return 3;
        return 4;
    }, [mobileSheetOpen, mobileSheetTab, activePath]);

    const canUploadImages = !session || session.role === 'super_admin' || (Array.isArray(session.permissions) && (session.permissions.includes('*') || session.permissions.includes('upload_images')));
    const isGlobalDropEnabled = canUploadImages && pathname !== '/admin/upload';

    const isExternalFileDrag = useCallback((e) => {
        const types = e?.dataTransfer?.types;
        if (!types) return false;
        const typeList = Array.from(types);
        if (typeList.includes('application/x-png101-bulk-items')) return false;
        return typeList.includes('Files');
    }, []);

    useEffect(() => {
        globalDragCounterRef.current = 0;
        setIsGlobalDragging(false);
    }, [pathname]);

    useEffect(() => {
        const resetDrag = () => {
            globalDragCounterRef.current = 0;
            setIsGlobalDragging(false);
        };
        window.addEventListener('dragend', resetDrag);
        return () => window.removeEventListener('dragend', resetDrag);
    }, []);

    const handleGlobalDragEnter = (e) => {
        if (!isGlobalDropEnabled || !isExternalFileDrag(e)) return;
        e.preventDefault();
        globalDragCounterRef.current += 1;
        setIsGlobalDragging(true);
    };

    const handleGlobalDragOver = (e) => {
        if (!isGlobalDropEnabled || !isExternalFileDrag(e)) return;
        e.preventDefault();
    };

    const handleGlobalDragLeave = (e) => {
        if (!isGlobalDropEnabled || !isExternalFileDrag(e)) return;
        globalDragCounterRef.current = Math.max(0, globalDragCounterRef.current - 1);
        if (globalDragCounterRef.current === 0) {
            setIsGlobalDragging(false);
        }
    };

    const handleGlobalDrop = (e) => {
        if (!isGlobalDropEnabled || !isExternalFileDrag(e)) return;
        e.preventDefault();
        globalDragCounterRef.current = 0;
        setIsGlobalDragging(false);
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length > 0) {
            startStagingUpload(files, null, { startMinimized: true });
        }
    };

    return (
        <AdminShellContext.Provider value={true}>
            <div
                className="h-screen overflow-hidden bg-background flex relative"
                onDragEnter={handleGlobalDragEnter}
                onDragOver={handleGlobalDragOver}
                onDragLeave={handleGlobalDragLeave}
                onDrop={handleGlobalDrop}
            >
                {isGlobalDragging && isGlobalDropEnabled && (
                    <div className="fixed inset-0 z-[70] pointer-events-none bg-primary-glow/10 backdrop-blur-[2px] border-4 border-dashed border-primary-glow flex items-center justify-center animate-in fade-in duration-150">
                        <div className="px-6 py-4 rounded-2xl bg-card-bg/95 border border-primary-glow/40 shadow-2xl flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary-glow/15 text-primary-glow">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">Drop PNG images anywhere to upload</p>
                                <p className="text-xs text-foreground/60">Progress will appear in the bottom-right upload tracker</p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Sidebar (Tablet & Desktop only; Mobile uses dedicated bottom pill & sheet) */}
                <aside
                    ref={sidebarRef}
                    data-testid="admin-desktop-sidebar"
                    className={`admin-sidebar hidden md:flex ${isCollapsed ? 'w-20 overflow-visible' : 'w-64'} bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800/80 flex-col transition-all duration-300 ease-in-out relative shadow-sm dark:shadow-xl z-20`}
                >
                    {/* Toggle Button */}
                    <button
                        type="button"
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
                        <Link href="/" data-testid="admin-sidebar-brand-link" className="shrink-0">
                            <BrandIcon
                                iconUrl={websiteInfo?.iconUrl}
                                alt={`${adminBrandName} icon`}
                                sizeClass="w-8 h-8"
                                roundedClass="rounded-lg"
                            />
                        </Link>
                        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {adminBrandName}
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

                    <nav className={`flex-1 p-4 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
                        <div ref={navListRef} className="relative space-y-2">
                            {/* Animated Sliding Active Background Shape */}
                            <div
                                aria-hidden="true"
                                className="absolute left-0 right-0 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_6px_18px_rgba(37,99,235,0.38)] pointer-events-none z-0"
                                style={{
                                    top: 0,
                                    height: `${navIndicator.height}px`,
                                    transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                                    opacity: navIndicator.visible ? 1 : 0,
                                    transition: navIndicator.animate
                                        ? 'transform 420ms cubic-bezier(0.22, 1.08, 0.36, 1), height 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease'
                                        : 'opacity 200ms ease',
                                }}
                            />

                            {navItems.map((item) => {
                                const isParentActive = activeParentName === item.name;
                                const hasChildren = item.children && item.children.length > 0;
                                const isOpen = openMenus[item.name];
                                const isLocked = !item.permitted && !hasChildren;
                                const isMutedParent = !item.permitted && hasChildren;

                                return (
                                    <div
                                        key={item.name}
                                        ref={(el) => {
                                            itemWrapperRefs.current[item.name] = el;
                                        }}
                                        className="group relative z-10"
                                    >
                                        <div
                                            ref={(el) => {
                                                itemRowRefs.current[item.name] = el;
                                            }}
                                            title={!item.permitted && item.reason ? item.reason : undefined}
                                            aria-disabled={isLocked ? 'true' : undefined}
                                            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-colors duration-250 ${
                                                isLocked
                                                    ? 'opacity-45 cursor-not-allowed text-slate-400 dark:text-slate-500 bg-slate-100/40 dark:bg-slate-900/30 select-none'
                                                    : isParentActive
                                                        ? 'text-white font-medium cursor-pointer'
                                                        : isMutedParent
                                                            ? 'opacity-60 text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white cursor-pointer'
                                            }`}
                                            onClick={() => {
                                                if (hasChildren) {
                                                    toggleMenu(item.name);
                                                } else if (item.permitted) {
                                                    setOptimisticPath(item.href);
                                                    if (pathname !== item.href) {
                                                        router.visit(item.href);
                                                    }
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`flex-shrink-0 transition-transform duration-300 ${
                                                        isParentActive ? 'scale-105 text-white' : ''
                                                    }`}
                                                >
                                                    {item.icon}
                                                </span>
                                                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            {!isCollapsed && !item.permitted && !hasChildren && (
                                                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                            )}
                                            {hasChildren && !isCollapsed && (
                                                <div className="flex items-center gap-1.5">
                                                    {!item.permitted && (
                                                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                                    )}
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
                                                </div>
                                            )}
                                        </div>

                                        {isCollapsed && (
                                            <div
                                                data-testid={`collapsed-submenu-${item.name.toLowerCase()}`}
                                                className={`absolute left-full ${
                                                    hasChildren ? 'bottom-0' : 'top-0'
                                                } pl-2 z-50 transition-opacity duration-200 ${
                                                    collapsedPopoverItem === item.name
                                                        ? 'opacity-100 pointer-events-auto'
                                                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                                                }`}
                                            >
                                                <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 px-1.5 min-w-[190px] max-h-[calc(100vh-5rem)] overflow-y-auto">
                                                    <div className="px-3 py-2 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 mb-1 whitespace-nowrap text-xs flex items-center justify-between gap-2">
                                                        <span>{item.name}</span>
                                                        {!item.permitted && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-amber-500">
                                                                <Lock className="w-3 h-3" /> Restricted
                                                            </span>
                                                        )}
                                                    </div>
                                                    {hasChildren && (
                                                        <div className="space-y-0.5">
                                                            {item.children.map((child) =>
                                                                child.permitted ? (
                                                                    <Link
                                                                        key={child.name}
                                                                        href={child.href}
                                                                        onClick={() => {
                                                                            setOptimisticPath(child.href);
                                                                            setCollapsedPopoverItem(null);
                                                                        }}
                                                                        className={`block px-3 py-2 text-xs rounded-lg transition-colors whitespace-nowrap ${
                                                                            activePath === child.href
                                                                                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold'
                                                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {child.name}
                                                                    </Link>
                                                                ) : (
                                                                    <div
                                                                        key={child.name}
                                                                        title={child.reason}
                                                                        className="flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg text-slate-400 dark:text-slate-500 opacity-55 cursor-not-allowed whitespace-nowrap"
                                                                    >
                                                                        <span>{child.name}</span>
                                                                        <Lock className="w-3 h-3" />
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {hasChildren && isOpen && !isCollapsed && (
                                            <SubmenuList
                                                items={item.children}
                                                activePath={activePath}
                                                onSelectChild={(href) => setOptimisticPath(href)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Bottom Bar: Theme Toggle & Sign Out */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
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
                            type="button"
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
                <main
                    ref={mainRef}
                    style={{
                        transition:
                            'margin-right 380ms cubic-bezier(0.22, 1, 0.36, 1), padding 300ms ease',
                    }}
                    className={`flex-1 overflow-y-auto ${
                        shouldSlideOverForBulkEdit
                            ? 'p-3 pb-28 sm:p-4 sm:pb-28 md:p-4 lg:p-6 lg:mr-[500px]'
                            : 'p-3 pb-28 sm:p-5 sm:pb-28 md:p-8 lg:mr-0'
                    }`}
                >
                    {isCurrentRoutePermitted ? (
                        <div
                            className={`w-full max-w-[1600px] mx-auto transition-all duration-300 ${
                                shouldSlideOverForBulkEdit ? 'p-1 sm:p-3 md:p-5' : 'p-2 sm:p-4 md:p-8'
                            }`}
                        >
                            <GlobalUpdateNotifier session={session} pathname={pathname} />
                            {children}
                        </div>
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

                {/* Dedicated Mobile Admin Navigation (Floating Pill + Cardless Floating Pill Launcher) */}
                <div className="md:hidden" data-testid="admin-mobile-nav">
                    {mobileSheetOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40 bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
                                onClick={() => setMobileSheetOpen(false)}
                            />
                            <div
                                data-testid="admin-mobile-sheet"
                                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(360px,calc(100vw-24px))] max-h-[calc(100vh-124px)] overflow-y-auto pointer-events-none flex flex-col items-center gap-2.5 pb-1 animate-in fade-in slide-in-from-bottom-3 duration-200"
                            >
                                {mobileSheetTab === 'settings' ? (
                                    <>
                                        {/* Floating Settings Section Pill Tag */}
                                        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#121c32]/90 dark:bg-[#121c32]/95 light:bg-white/95 border border-blue-400/40 text-[10px] font-extrabold uppercase tracking-widest text-blue-400 shadow-lg backdrop-blur-xl">
                                            <SettingsIcon className="w-3 h-3" />
                                            <span>Settings</span>
                                        </div>

                                        {/* Cardless Floating Settings Pill Chips */}
                                        <div className="w-full grid grid-cols-2 gap-2">
                                            {(settingsNavItem?.children || []).map((child, idx) => {
                                                const active = activePath === child.href;
                                                const isLastOdd =
                                                    idx === (settingsNavItem?.children?.length || 0) - 1 &&
                                                    (settingsNavItem?.children?.length || 0) % 2 === 1;
                                                const spanClass = isLastOdd ? 'col-span-2 justify-center' : '';

                                                if (!child.permitted) {
                                                    return (
                                                        <div
                                                            key={child.name}
                                                            title={child.reason}
                                                            className={`pointer-events-auto flex items-center justify-between gap-2 px-4 py-3 rounded-full bg-white/80 dark:bg-[#121c32]/80 border border-slate-300/60 dark:border-slate-700/60 opacity-50 text-xs font-semibold text-slate-400 backdrop-blur-xl select-none ${spanClass}`}
                                                        >
                                                            <span className="flex items-center gap-2 truncate">
                                                                {getSettingsChildIcon(child.name)}
                                                                <span className="truncate">{child.name}</span>
                                                            </span>
                                                            <Lock className="w-3 h-3 shrink-0" />
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href}
                                                        onClick={() => {
                                                            setOptimisticPath(child.href);
                                                            setMobileSheetOpen(false);
                                                        }}
                                                        className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full border text-xs font-bold transition-all backdrop-blur-xl active:scale-95 ${spanClass} ${
                                                            active
                                                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400 text-white shadow-[0_8px_20px_rgba(37,99,235,0.45)]'
                                                                : 'bg-white/95 dark:bg-[#121c32]/95 border-slate-200/95 dark:border-blue-400/40 text-slate-800 dark:text-slate-100 hover:border-blue-400 shadow-[0_12px_28px_rgba(2,6,23,0.45)]'
                                                        }`}
                                                    >
                                                        <span className={active ? 'text-white' : 'text-blue-500 dark:text-blue-400'}>
                                                            {getSettingsChildIcon(child.name)}
                                                        </span>
                                                        <span className="truncate">{child.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Top Floating Quick Utility Pills (Live Site, Theme Toggle, Sign Out) */}
                                        <div className="pointer-events-auto flex items-center justify-center gap-2 flex-wrap">
                                            <Link
                                                href="/"
                                                onClick={() => setMobileSheetOpen(false)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 dark:bg-[#121c32]/95 border border-slate-200/95 dark:border-blue-400/40 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-[0_10px_24px_rgba(2,6,23,0.45)] backdrop-blur-xl active:scale-95"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                                                <span>Live Site</span>
                                            </Link>

                                            <div className="inline-flex items-center px-1.5 py-1 rounded-full bg-white/95 dark:bg-[#121c32]/95 border border-slate-200/95 dark:border-blue-400/40 shadow-[0_10px_24px_rgba(2,6,23,0.45)] backdrop-blur-xl">
                                                <ThemeToggle
                                                    size="sm"
                                                    className="bg-transparent border-0 shadow-none"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleSignOut}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 dark:bg-[#121c32]/95 border border-red-400/45 text-xs font-bold text-red-600 dark:text-red-400 shadow-[0_10px_24px_rgba(2,6,23,0.45)] backdrop-blur-xl cursor-pointer active:scale-95"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>

                                        {/* Expandable Image Editor Suite Floating Pills */}
                                        {editorNavItem && (
                                            <div className="w-full flex flex-col items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileEditorExpanded((prev) => !prev)}
                                                    className={`pointer-events-auto w-full flex items-center justify-between px-4 py-3 rounded-full border text-xs font-bold transition-all backdrop-blur-xl cursor-pointer ${
                                                        activePath.startsWith('/admin/dashboard/editor')
                                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400 text-white shadow-[0_8px_20px_rgba(37,99,235,0.45)]'
                                                            : 'bg-white/95 dark:bg-[#121c32]/95 border-slate-200/95 dark:border-blue-400/40 text-slate-800 dark:text-slate-100 shadow-[0_12px_28px_rgba(2,6,23,0.45)]'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2.5">
                                                        <Sparkles
                                                            className={`w-4 h-4 ${
                                                                activePath.startsWith('/admin/dashboard/editor')
                                                                    ? 'text-white'
                                                                    : 'text-blue-500 dark:text-blue-400'
                                                            }`}
                                                        />
                                                        <span>Image Editor Suite</span>
                                                    </span>
                                                    <ChevronDown
                                                        className={`w-4 h-4 transition-transform duration-200 ${
                                                            mobileEditorExpanded ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </button>

                                                {mobileEditorExpanded && (
                                                    <div className="w-full grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
                                                        {(editorNavItem.children || []).map((child) => {
                                                            const active = activePath === child.href;
                                                            if (!child.permitted) {
                                                                return (
                                                                    <div
                                                                        key={child.name}
                                                                        title={child.reason}
                                                                        className="pointer-events-auto flex items-center justify-between gap-1.5 px-3.5 py-2.5 rounded-full bg-white/80 dark:bg-[#121c32]/80 border border-slate-300/60 dark:border-slate-700/60 opacity-50 text-[11px] font-semibold text-slate-400 backdrop-blur-xl select-none"
                                                                    >
                                                                        <span className="truncate">{child.name}</span>
                                                                        <Lock className="w-3 h-3 shrink-0" />
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <Link
                                                                    key={child.name}
                                                                    href={child.href}
                                                                    onClick={() => {
                                                                        setOptimisticPath(child.href);
                                                                        setMobileSheetOpen(false);
                                                                    }}
                                                                    className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-full border text-[11px] font-bold transition-all backdrop-blur-xl active:scale-95 ${
                                                                        active
                                                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400 text-white shadow-[0_8px_20px_rgba(37,99,235,0.45)]'
                                                                            : 'bg-white/90 dark:bg-[#16223d]/95 border-slate-200/95 dark:border-blue-400/35 text-slate-700 dark:text-slate-200 shadow-[0_10px_22px_rgba(2,6,23,0.4)]'
                                                                    }`}
                                                                >
                                                                    <span className={active ? 'text-white' : 'text-blue-500 dark:text-blue-400'}>
                                                                        {getEditorChildIcon(child.name)}
                                                                    </span>
                                                                    <span className="truncate">{child.name}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Remaining Primary Module Floating Pills (Collections, Team, Analytics, Tools) */}
                                        <div className="w-full grid grid-cols-2 gap-2">
                                            {extraModuleItems.map((mod) => {
                                                const active = isItemActive(mod, activePath);
                                                if (!mod.permitted) {
                                                    return (
                                                        <div
                                                            key={mod.name}
                                                            title={mod.reason}
                                                            className="pointer-events-auto flex items-center justify-between gap-2 px-4 py-3 rounded-full bg-white/80 dark:bg-[#121c32]/80 border border-slate-300/60 dark:border-slate-700/60 opacity-50 text-xs font-semibold text-slate-400 backdrop-blur-xl select-none"
                                                        >
                                                            <span className="flex items-center gap-2 truncate">
                                                                <span className="shrink-0 [&_svg]:w-4 [&_svg]:h-4">{mod.icon}</span>
                                                                <span className="truncate">{mod.name}</span>
                                                            </span>
                                                            <Lock className="w-3.5 h-3.5 shrink-0" />
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <Link
                                                        key={mod.name}
                                                        href={mod.href}
                                                        onClick={() => {
                                                            setOptimisticPath(mod.href);
                                                            setMobileSheetOpen(false);
                                                        }}
                                                        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-full border text-xs font-bold transition-all backdrop-blur-xl active:scale-95 ${
                                                            active
                                                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400 text-white shadow-[0_8px_20px_rgba(37,99,235,0.45)]'
                                                                : 'bg-white/95 dark:bg-[#121c32]/95 border-slate-200/95 dark:border-blue-400/40 text-slate-800 dark:text-slate-100 hover:border-blue-400 shadow-[0_12px_28px_rgba(2,6,23,0.45)]'
                                                        }`}
                                                    >
                                                        <span className={`shrink-0 [&_svg]:w-4 [&_svg]:h-4 ${active ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`}>
                                                            {mod.icon}
                                                        </span>
                                                        <span className="truncate">{mod.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* Floating Bottom Pill Navigation (matches frontend .mobile-pill-nav aesthetic) */}
                    <nav
                        aria-label="Admin Mobile Navigation"
                        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 mobile-pill-nav"
                    >
                        <ul>
                            <li className={`list ${mobileActiveIndex === 0 ? 'active' : ''}`}>
                                <Link
                                    href="/admin/dashboard"
                                    aria-label="Dashboard"
                                    onClick={() => {
                                        setOptimisticPath('/admin/dashboard');
                                        setMobileSheetOpen(false);
                                    }}
                                >
                                    <span className="icon">
                                        <LayoutGrid className="w-5 h-5" />
                                    </span>
                                    <span className="title">Dashboard</span>
                                </Link>
                            </li>

                            <li className={`list ${mobileActiveIndex === 1 ? 'active' : ''}`}>
                                <Link
                                    href="/admin/upload"
                                    aria-label="Upload"
                                    onClick={() => {
                                        setOptimisticPath('/admin/upload');
                                        setMobileSheetOpen(false);
                                    }}
                                >
                                    <span className="icon">
                                        <UploadCloud className="w-5 h-5" />
                                    </span>
                                    <span className="title">Upload</span>
                                </Link>
                            </li>

                            <li className={`list ${mobileActiveIndex === 2 ? 'active' : ''}`}>
                                <Link
                                    href="/admin/dashboard/files"
                                    aria-label="Files"
                                    onClick={() => {
                                        setOptimisticPath('/admin/dashboard/files');
                                        setMobileSheetOpen(false);
                                    }}
                                >
                                    <span className="icon">
                                        <FolderOpen className="w-5 h-5" />
                                    </span>
                                    <span className="title">Files</span>
                                </Link>
                            </li>

                            <li className={`list ${mobileActiveIndex === 3 ? 'active' : ''}`}>
                                <button
                                    type="button"
                                    aria-label="Admin Settings Menu"
                                    aria-expanded={mobileSheetOpen && mobileSheetTab === 'settings'}
                                    onClick={() => {
                                        if (mobileSheetOpen && mobileSheetTab === 'settings') {
                                            setMobileSheetOpen(false);
                                        } else {
                                            setMobileSheetTab('settings');
                                            setMobileSheetOpen(true);
                                        }
                                    }}
                                >
                                    <span className="icon">
                                        {mobileSheetOpen && mobileSheetTab === 'settings' ? (
                                            <X className="w-5 h-5" />
                                        ) : (
                                            <SettingsIcon className="w-5 h-5" />
                                        )}
                                    </span>
                                    <span className="title">Settings</span>
                                </button>
                            </li>

                            <li className={`list ${mobileActiveIndex === 4 ? 'active' : ''}`}>
                                <button
                                    type="button"
                                    aria-label="All Admin Modules"
                                    aria-expanded={mobileSheetOpen && mobileSheetTab !== 'settings'}
                                    onClick={() => {
                                        if (mobileSheetOpen && mobileSheetTab !== 'settings') {
                                            setMobileSheetOpen(false);
                                        } else {
                                            setMobileSheetTab('more');
                                            setMobileEditorExpanded(
                                                activePath.startsWith('/admin/dashboard/editor')
                                            );
                                            setMobileSheetOpen(true);
                                        }
                                    }}
                                >
                                    <span className="icon">
                                        {mobileSheetOpen && mobileSheetTab !== 'settings' ? (
                                            <X className="w-5 h-5" />
                                        ) : (
                                            <Menu className="w-5 h-5" />
                                        )}
                                    </span>
                                    <span className="title">More</span>
                                </button>
                            </li>

                            <div
                                className="indicator"
                                style={{
                                    transform:
                                        mobileActiveIndex >= 0
                                            ? `translateX(${mobileActiveIndex * 100}%)`
                                            : 'translateX(0%) scale(0.75)',
                                    opacity: mobileActiveIndex >= 0 ? 1 : 0,
                                }}
                            />
                        </ul>
                    </nav>
                </div>
            </div>
        </AdminShellContext.Provider>
    );
}

export default function AdminLayout({ children }) {
    const isInsidePersistentShell = useContext(AdminShellContext);
    if (isInsidePersistentShell) {
        return <>{children}</>;
    }
    return <PersistentAdminLayout>{children}</PersistentAdminLayout>;
}
