import React from 'react';
import Header from '../components/Header';
import { getWebsiteInfo } from '@/lib/website-info';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    const info = await getWebsiteInfo();
    return {
        title: `Terms of Service - ${info.websiteName}`,
        description: `Read the Terms of Service for using ${info.websiteName} and downloading our transparent PNG assets.`,
    };
}

export default async function TermsOfServicePage() {
    const info = await getWebsiteInfo();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header siteName={info.websiteName} />

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-10">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Legal Agreement
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">Terms of Service</h1>
                    <p className="text-sm text-foreground/60">
                        Effective Status: Active &bull; Governed by the laws of {info.country}
                    </p>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed shadow-xl">
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
                        <p>
                            Welcome to <strong>{info.websiteName}</strong> (<a href={info.websiteUrl} className="text-primary-glow hover:underline">{info.websiteUrl}</a>), operated by <strong>{info.companyName}</strong>. By accessing, browsing, or downloading any PNG images or materials from our website, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the website immediately.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. License &amp; Permitted Use of PNG Assets</h2>
                        <p>
                            {info.websiteName} provides transparent PNG images, illustrations, icons, and cutouts for creative, educational, and design reference purposes. Subject to your compliance with these Terms:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You may download and use PNG images from {info.websiteName} for personal, educational, and non-commercial creative projects.</li>
                            <li>You may modify, resize, crop, or combine downloaded PNG assets into derivative creative compositions.</li>
                            <li>Some assets featured on {info.websiteName} may depict third-party trademarks, logos, or characters. Such assets remain the intellectual property of their respective copyright/trademark holders and are provided strictly for editorial or personal reference unless you obtain independent authorization.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Prohibited Conduct</h2>
                        <p>When using {info.websiteName}, you agree not to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Redistribute, resell, sublicense, or bundle raw PNG files from {info.websiteName} on competing stock image websites or asset marketplaces.</li>
                            <li>Use automated scrapers, bots, crawlers, or bulk-harvesting tools to download assets in a manner that places excessive load on our servers.</li>
                            <li>Hotlink directly to image files hosted on {info.websiteName} servers from external websites.</li>
                            <li>Use any downloaded image in a defamatory, unlawful, deceptive, or infringing manner.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Intellectual Property Rights</h2>
                        <p>
                            The compilation, layout, search technology, branding, and original content on {info.websiteName} are owned by <strong>{info.companyName}</strong>. If you believe any content hosted on {info.websiteName} infringes upon your copyright or intellectual property rights, please review our <a href="/dmca-policy" className="text-primary-glow hover:underline">DMCA Policy</a> or email our copyright team at <a href={`mailto:${info.dmcaEmail}`} className="text-primary-glow hover:underline">{info.dmcaEmail}</a>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">5. Disclaimer of Warranties</h2>
                        <p>
                            All PNG images, metadata, and services on {info.websiteName} are provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express or implied. {info.companyName} does not warrant that downloaded files will be free of errors, nor does it guarantee that third-party rights clearances have been obtained for identifiable brands, people, or properties depicted in user-submitted or indexed images.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">6. Limitation of Liability</h2>
                        <p>
                            To the fullest extent permitted by applicable law in <strong>{info.country}</strong>, {info.companyName} and its operators, affiliates, and contributors shall not be liable for any indirect, incidental, consequential, or punitive damages arising out of your access to, use of, or inability to use {info.websiteName} or any downloaded assets.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">7. Governing Law &amp; Changes to Terms</h2>
                        <p>
                            These Terms of Service are governed by and construed in accordance with the laws of <strong>{info.country}</strong>. We reserve the right to update or modify these Terms at any time without prior notice. Continued use of {info.websiteName} constitutes acceptance of the revised Terms.
                        </p>
                    </section>

                    <section className="space-y-3 pt-4 border-t border-card-border">
                        <h2 className="text-xl font-bold text-foreground">8. Contact Information</h2>
                        <p>
                            If you have any questions regarding these Terms of Service, please contact <strong>{info.companyName}</strong> at{' '}
                            <a href={`mailto:${info.contactEmail}`} className="text-primary-glow hover:underline font-medium">
                                {info.contactEmail}
                            </a>.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}

