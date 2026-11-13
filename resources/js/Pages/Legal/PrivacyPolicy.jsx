import React from 'react';
import { Head } from '@inertiajs/react';
import Header from '@/components/Header';

export default function PrivacyPolicy({ websiteInfo = {} }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        websiteUrl: websiteInfo.websiteUrl || 'https://png101.com',
        companyName: websiteInfo.companyName || 'Png101',
        country: websiteInfo.country || 'United States',
        contactEmail: websiteInfo.contactEmail || 'contact@png101.com',
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Privacy Policy - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-10">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Data &amp; Privacy
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
                    <p className="text-sm text-foreground/60">
                        Operated by {info.companyName} &bull; {info.websiteUrl}
                    </p>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed shadow-xl">
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
                        <p>
                            At <strong>{info.websiteName}</strong> (<a href={info.websiteUrl} className="text-primary-glow hover:underline">{info.websiteUrl}</a>), operated by <strong>{info.companyName}</strong>, we respect your privacy and are committed to protecting any information collected while you browse and download transparent PNG images on our platform. This Privacy Policy explains what data we collect, why we collect it, and how it is handled.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
                        <p>
                            You can browse and download PNG images on {info.websiteName} without creating an account. We collect minimal, non-identifying technical data to keep our service fast and reliable:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong>Download &amp; Usage Analytics:</strong> When you download a PNG asset, we record aggregate analytics such as general device category (desktop, mobile, or tablet), approximate country derived from IP geolocation, and download timestamps to understand popular assets.
                            </li>
                            <li>
                                <strong>Preferences &amp; Local Storage:</strong> We store your visual theme preference (such as dark or light mode) locally in your browser so your experience remains consistent across visits.
                            </li>
                            <li>
                                <strong>Direct Communications:</strong> If you contact us via email at <a href={`mailto:${info.contactEmail}`} className="text-primary-glow hover:underline">{info.contactEmail}</a>, we receive your email address and any details you choose to include in your message.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. How We Use Information</h2>
                        <p>We use the information we collect solely to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Deliver, optimize, and maintain our PNG search and download infrastructure.</li>
                            <li>Analyze aggregate traffic trends and popular image categories.</li>
                            <li>Detect and prevent automated abuse, scraping, or security threats.</li>
                            <li>Respond to support inquiries, feedback, or copyright notifications.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Cookies &amp; Third-Party Scripts</h2>
                        <p>
                            {info.websiteName} may use essential cookies or third-party analytics and advertising scripts to measure site performance and support free image hosting. You may disable cookies at any time through your browser settings without losing the ability to search and download PNG files.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">5. Data Sharing &amp; Security</h2>
                        <p>
                            We do not sell, rent, or trade your personal information to third parties. Aggregate, non-identifiable usage statistics may be used internally to improve our catalog. We implement industry-standard security controls to safeguard our database and servers.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">6. Your Privacy Rights</h2>
                        <p>
                            Depending on your location (including residents of {info.country}, the European Economic Area, or California), you may have the right to request access to, correction of, or deletion of any personal data you have submitted to us. To exercise these rights, please email us at <a href={`mailto:${info.contactEmail}`} className="text-primary-glow hover:underline">{info.contactEmail}</a>.
                        </p>
                    </section>

                    <section className="space-y-3 pt-4 border-t border-card-border">
                        <h2 className="text-xl font-bold text-foreground">7. Contact Us About Privacy</h2>
                        <p>
                            If you have any questions or concerns about this Privacy Policy or our data practices, please contact <strong>{info.companyName}</strong> at{' '}
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
