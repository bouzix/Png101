import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from 'sonner';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';
import ScrollToTopButton from './components/ScrollToTopButton';
import { UploadManagerProvider, FloatingUploadTracker } from './components/admin/UploadManager';
import { BulkEditProvider, GlobalBulkEditSidebar } from './components/admin/BulkEditSidebar';
import { PersistentAdminLayout } from './Layouts/AdminLayout';
import { GlobalColorPickerDefaultsProvider, sanitizeColorPickerDefaults } from './lib/colorPickerConfig';

const renderPersistentAdminLayout = (pageNode) => (
    <PersistentAdminLayout>{pageNode}</PersistentAdminLayout>
);

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        const page = pages[`./Pages/${name}.jsx`];
        if (
            name.startsWith('Admin/') &&
            name !== 'Admin/Login' &&
            page?.default &&
            !page.default.layout
        ) {
            page.default.layout = renderPersistentAdminLayout;
        }
        return page;
    },
    setup({ el, App, props }) {
        const RootApp = (propsObj) => {
            const [websiteInfo, setWebsiteInfo] = useState(
                () =>
                    propsObj.initialPage?.props?.websiteInfo || {
                        websiteName: 'Png101',
                        tagline: 'Discover and download free, high-resolution transparent PNG images for your creative projects.',
                        contactEmail: 'contact@png101.com',
                        companyName: 'Png101',
                    }
            );
            const initialUploadLimits = propsObj.initialPage?.props?.uploadLimits || null;
            const [currentUrl, setCurrentUrl] = useState(
                () => propsObj.initialPage?.url || (typeof window !== 'undefined' ? window.location.pathname : '/')
            );
            const [currentComponent, setCurrentComponent] = useState(
                () => propsObj.initialPage?.component || ''
            );
            const [bonusToolsNav, setBonusToolsNav] = useState(
                () => propsObj.initialPage?.props?.bonusToolsNav || {}
            );
            const [editorNav, setEditorNav] = useState(
                () => propsObj.initialPage?.props?.editorNav || {}
            );
            const [colorPickerDefaults, setColorPickerDefaults] = useState(() =>
                sanitizeColorPickerDefaults(propsObj.initialPage?.props?.colorPickerDefaults)
            );

            useEffect(() => {
                const syncRangeEl = (el) => {
                    if (!el || el.tagName !== 'INPUT' || el.type !== 'range') return;
                    const min = el.min !== '' ? Number(el.min) : 0;
                    const max = el.max !== '' ? Number(el.max) : 100;
                    const val = Number(el.value);
                    const pct = max > min && Number.isFinite(val)
                        ? Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100))
                        : 0;
                    const formatted = `${pct.toFixed(2)}%`;
                    if (el.dataset.rangePct !== formatted) {
                        el.dataset.rangePct = formatted;
                        el.style.setProperty('--range-pct', formatted);
                    }
                };
                const syncAllRanges = () => {
                    document.querySelectorAll('input[type="range"]').forEach(syncRangeEl);
                };
                let rafId = 0;
                const scheduleSync = () => {
                    if (rafId) return;
                    rafId = requestAnimationFrame(() => {
                        rafId = 0;
                        syncAllRanges();
                    });
                };

                syncAllRanges();
                const onDirectInput = (e) => syncRangeEl(e.target);
                document.addEventListener('input', onDirectInput, true);
                document.addEventListener('change', onDirectInput, true);
                document.addEventListener('pointerup', scheduleSync, true);
                document.addEventListener('click', scheduleSync, true);
                document.addEventListener('keyup', scheduleSync, true);

                const observer = new MutationObserver(scheduleSync);
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['value', 'min', 'max'],
                });

                return () => {
                    if (rafId) cancelAnimationFrame(rafId);
                    document.removeEventListener('input', onDirectInput, true);
                    document.removeEventListener('change', onDirectInput, true);
                    document.removeEventListener('pointerup', scheduleSync, true);
                    document.removeEventListener('click', scheduleSync, true);
                    document.removeEventListener('keyup', scheduleSync, true);
                    observer.disconnect();
                };
            }, []);

            useEffect(() => {
                const syncPageProps = (pageObj) => {
                    if (pageObj?.props?.websiteInfo) {
                        setWebsiteInfo(pageObj.props.websiteInfo);
                    }
                    if (pageObj?.props?.bonusToolsNav) {
                        setBonusToolsNav(pageObj.props.bonusToolsNav);
                    }
                    if (pageObj?.props?.editorNav) {
                        setEditorNav(pageObj.props.editorNav);
                    }
                    if (pageObj?.props?.colorPickerDefaults) {
                        setColorPickerDefaults(sanitizeColorPickerDefaults(pageObj.props.colorPickerDefaults));
                    }
                };
                const unbindNav = router.on('navigate', (event) => {
                    const nextUrl = event?.detail?.page?.url || window.location.pathname;
                    setCurrentUrl(nextUrl);
                    if (event?.detail?.page?.component) {
                        setCurrentComponent(event.detail.page.component);
                    }
                    syncPageProps(event?.detail?.page);
                });
                const unbindSuccess = router.on('success', (event) => {
                    syncPageProps(event?.detail?.page);
                });
                const onCustomDefaults = (e) => {
                    if (e?.detail) {
                        setColorPickerDefaults(sanitizeColorPickerDefaults(e.detail));
                    }
                };
                window.addEventListener('png101:color-picker-defaults', onCustomDefaults);
                return () => {
                    unbindNav?.();
                    unbindSuccess?.();
                    window.removeEventListener('png101:color-picker-defaults', onCustomDefaults);
                };
            }, []);

            useEffect(() => {
                if (typeof document === 'undefined') return;
                const href = websiteInfo?.faviconUrl || websiteInfo?.iconUrl || '/favicon.svg';
                document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((linkEl) => {
                    if (linkEl.getAttribute('href') !== href) {
                        linkEl.setAttribute('href', href);
                    }
                });
            }, [websiteInfo?.faviconUrl, websiteInfo?.iconUrl]);

            const isEditorRoute =
                currentComponent === 'ImageEditor' ||
                currentUrl.startsWith('/image-editor') ||
                (typeof window !== 'undefined' && window.location.pathname.startsWith('/image-editor'));
            const isPublicFrontend =
                !currentUrl.startsWith('/admin') &&
                !currentUrl.startsWith('/team') &&
                !isEditorRoute &&
                currentUrl !== '/maintenance';

            return (
                <GlobalColorPickerDefaultsProvider value={colorPickerDefaults}>
                    <UploadManagerProvider initialUploadLimits={initialUploadLimits}>
                        <BulkEditProvider>
                            <div className="min-h-screen flex flex-col flex-1">
                                <div className="flex-1 flex flex-col">
                                    <App {...propsObj} />
                                </div>
                                {isPublicFrontend && (
                                    <Footer
                                        info={websiteInfo}
                                        currentUrl={currentUrl}
                                        showConverters={Boolean(bonusToolsNav?.showInPublicNav)}
                                        footerTools={Array.isArray(bonusToolsNav?.footerTools) ? bonusToolsNav.footerTools : []}
                                        editorNav={editorNav}
                                    />
                                )}
                                {isPublicFrontend && <ScrollToTopButton currentPath={currentUrl} />}
                                {isPublicFrontend && <MobileBottomNav currentPath={currentUrl} />}
                                <GlobalBulkEditSidebar />
                                <FloatingUploadTracker />
                                {!isEditorRoute && <Toaster position="top-right" richColors />}
                            </div>
                        </BulkEditProvider>
                    </UploadManagerProvider>
                </GlobalColorPickerDefaultsProvider>
            );
        };

        createRoot(el).render(<RootApp {...props} />);
    },
    progress: {
        color: '#3b82f6',
        showSpinner: false,
    },
});
