import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import Header from '@/components/Header';

export default function DmcaPolicy() {
    const { props } = usePage();
    const info = props?.websiteInfo || {};
    const siteName = info.websiteName || info.siteName || 'Png101';
    const companyName = info.companyName || siteName;
    const websiteUrl = info.websiteUrl || 'https://png101.com';
    const dmcaEmail = info.dmcaEmail || info.supportEmail || 'dmca@png101.com';

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`DMCA Policy - ${siteName}`} />
            <Header />

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-10">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Copyright Compliance
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">DMCA Policy &amp; Takedown Notice</h1>
                    <p className="text-sm text-foreground/60">
                        Intellectual Property Protection for {siteName} ({websiteUrl})
                    </p>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed shadow-xl">
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Respect for Intellectual Property</h2>
                        <p>
                            <strong>{siteName}</strong> (<a href={websiteUrl} className="text-primary-glow hover:underline">{websiteUrl}</a>), operated by <strong>{companyName}</strong>, respects the intellectual property rights of artists, photographers, designers, and copyright holders worldwide and complies with the Digital Millennium Copyright Act (17 U.S.C. &sect; 512).
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. How to Submit a DMCA Takedown Request</h2>
                        <p>To expedite removal of allegedly infringing material, please include:</p>
                        <ol className="list-decimal pl-6 space-y-2">
                            <li><strong>Identification of the Copyrighted Work</strong> claimed to have been infringed.</li>
                            <li><strong>Exact URL(s) on {siteName}</strong> of the image page(s) you request to have removed.</li>
                            <li><strong>Your Contact Details:</strong> Full legal name, mailing address, phone number, and email address.</li>
                            <li><strong>Good-Faith Statement</strong> that the disputed use is not authorized by the copyright owner.</li>
                            <li><strong>Signature</strong> (electronic or physical) of the copyright owner or authorized agent.</li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Designated Copyright Agent</h2>
                        <p>
                            Please send DMCA notices to:{' '}
                            <a href={`mailto:${dmcaEmail}`} className="text-primary-glow hover:underline font-semibold">
                                {dmcaEmail}
                            </a>
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}

