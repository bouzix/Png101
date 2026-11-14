import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from 'sonner';
import Footer from './components/Footer';
import MobileBottomNav from './components/MobileBottomNav';
import ScrollToTopButton from './components/ScrollToTopButton';
import { UploadManagerProvider, FloatingUploadTracker } from './components/admin/UploadManager';

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        return pages[`./Pages/${name}.jsx`];
    },
    setup({ el, App, props }) {
        const RootApp = (propsObj) => {
            const websiteInfo = propsObj.initialPage?.props?.websiteInfo || {
                websiteName: 'Png101',
                tagline: 'Discover and download free, high-resolution transparent PNG images for your creative projects.',
                contactEmail: 'contact@png101.com',
                companyName: 'Png101',
            };
            const initialUploadLimits = propsObj.initialPage?.props?.uploadLimits || null;
            const [currentUrl, setCurrentUrl] = useState(
                () => propsObj.initialPage?.url || (typeof window !== 'undefined' ? window.location.pathname : '/')
            );

            useEffect(() => {
                return router.on('navigate', (event) => {
                    const nextUrl = event?.detail?.page?.url || window.location.pathname;
                    setCurrentUrl(nextUrl);
                });
            }, []);

            const isPublicFrontend =
                !currentUrl.startsWith('/admin') &&
                !currentUrl.startsWith('/team') &&
                currentUrl !== '/maintenance';

            return (
                <UploadManagerProvider initialUploadLimits={initialUploadLimits}>
                    <div className="min-h-screen flex flex-col flex-1">
                        <div className="flex-1 flex flex-col">
                            <App {...propsObj} />
                        </div>
                        {isPublicFrontend && <Footer info={websiteInfo} currentUrl={currentUrl} />}
                        {isPublicFrontend && <ScrollToTopButton currentPath={currentUrl} />}
                        {isPublicFrontend && <MobileBottomNav currentPath={currentUrl} />}
                        <FloatingUploadTracker />
                        <Toaster position="top-right" richColors />
                    </div>
                </UploadManagerProvider>
            );
        };

        createRoot(el).render(<RootApp {...props} />);
    },
    progress: {
        color: '#3b82f6',
        showSpinner: false,
    },
});
