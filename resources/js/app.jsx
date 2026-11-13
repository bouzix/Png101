import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from 'sonner';
import Footer from './components/Footer';

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
            const url = propsObj.initialPage?.url || '';
            const hideFooter =
                url.startsWith('/admin') ||
                url.startsWith('/team') ||
                url === '/maintenance';

            return (
                <div className="min-h-screen flex flex-col flex-1">
                    <div className="flex-1 flex flex-col">
                        <App {...propsObj} />
                    </div>
                    {!hideFooter && <Footer info={websiteInfo} currentUrl={url} />}
                    <Toaster position="bottom-right" richColors />
                </div>
            );
        };

        createRoot(el).render(<RootApp {...props} />);
    },
    progress: {
        color: '#3b82f6',
        showSpinner: false,
    },
});
