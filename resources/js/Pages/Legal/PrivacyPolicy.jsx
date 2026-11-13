import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import Header from '@/components/Header';

export default function PrivacyPolicy() {
    const { props } = usePage();
    const info = props?.websiteInfo || {};
    const siteName = info.websiteName || info.siteName || 'Png101';
    const companyName = info.companyName || siteName;
    const supportEmail = info.supportEmail || info.contactEmail || 'support@png101.com';

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Privacy Policy - ${siteName}`} />
            <Header />

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-10">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Your Privacy
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
                    <p className="text-sm text-foreground/60">
                        How {siteName} handles information and analytics
                    </p>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed shadow-xl">
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Information We Collect</h2>
                        <p>
                            <strong>{siteName}</strong> (operated by <strong>{companyName}</strong>) does not require account registration to browse or download PNG images. We collect minimal, anonymized usage analytics (such as search terms, image views, download counts, and device/country aggregates) to improve search quality and site performance.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. Cookies &amp; Local Storage</h2>
                        <p>
                            We use local storage to remember your preferred color theme (light or dark mode) and contrast preview preferences. Essential session cookies are used only for authenticated administrators.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Contact</h2>
                        <p>
                            If you have questions about this Privacy Policy, please contact us at{' '}
                            <a href={`mailto:${supportEmail}`} className="text-primary-glow hover:underline font-medium">
                                {supportEmail}
                            </a>.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}

