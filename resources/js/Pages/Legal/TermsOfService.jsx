import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import Header from '@/components/Header';

export default function TermsOfService() {
    const { props } = usePage();
    const info = props?.websiteInfo || {};
    const siteName = info.websiteName || info.siteName || 'Png101';
    const companyName = info.companyName || siteName;
    const websiteUrl = info.websiteUrl || 'https://png101.com';

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Terms of Service - ${siteName}`} />
            <Header />

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-10">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Legal Agreement
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">Terms of Service</h1>
                    <p className="text-sm text-foreground/60">
                        Effective for {siteName} ({websiteUrl})
                    </p>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed shadow-xl">
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using <strong>{siteName}</strong>, operated by <strong>{companyName}</strong>, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. License &amp; Permitted Use</h2>
                        <p>
                            Transparent PNG assets provided on {siteName} are available for personal, educational, and creative design projects unless otherwise noted. You may not redistribute, resell, or repackage our catalog as a competing stock image service without prior written permission.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Prohibited Conduct</h2>
                        <p>
                            You agree not to use automated scrapers, bots, or bulk hotlinking scripts that place excessive load on our servers or bypass download controls.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Disclaimer of Warranties</h2>
                        <p>
                            All materials on {siteName} are provided &ldquo;as is&rdquo; without warranties of any kind, either express or implied. {companyName} reserves the right to modify or remove content at any time.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}

