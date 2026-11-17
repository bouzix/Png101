import React from 'react';
import { Head } from '@inertiajs/react';
import Header from '@/components/Header';
import RichTextContent from '@/components/legal/RichTextContent';

export default function DmcaPolicy({ websiteInfo = {}, legalContent = null }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        websiteUrl: websiteInfo.websiteUrl || 'https://png101.com',
        companyName: websiteInfo.companyName || 'Png101',
        dmcaEmail: websiteInfo.dmcaEmail || websiteInfo.contactEmail || 'dmca@png101.com',
        contactEmail: websiteInfo.contactEmail || 'contact@png101.com',
        address: websiteInfo.address || '',
    };

    const content = legalContent || {
        badge: 'Copyright Compliance',
        title: 'DMCA Policy & Takedown Notice',
        subtitle: `Intellectual Property Protection for ${info.websiteName} (${info.websiteUrl})`,
        sections: [],
    };

    const sections = Array.isArray(content.sections) ? content.sections : [];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`DMCA Policy - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-16">
                <div className="mb-10">
                    {content.badge && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                            {content.badge}
                        </span>
                    )}
                    <h1 className="text-4xl font-bold text-foreground mb-3">
                        {content.title || 'DMCA Policy & Takedown Notice'}
                    </h1>
                    {content.subtitle && (
                        <p className="text-sm text-foreground/60">{content.subtitle}</p>
                    )}
                </div>

                <div className="bg-transparent border-0 p-0 sm:bg-card-bg sm:border sm:border-card-border sm:rounded-2xl sm:p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed">
                    {sections.map((section, idx) => (
                        <section key={section.id || idx} className="space-y-3">
                            {section.heading && (
                                <h2 className="text-xl font-bold text-foreground">
                                    {section.heading}
                                </h2>
                            )}
                            {section.showContactCard ? (
                                <div className="bg-background border border-card-border rounded-xl p-6 space-y-2">
                                    {section.bodyHtml && (
                                        <RichTextContent
                                            html={section.bodyHtml}
                                            className="text-foreground font-semibold"
                                        />
                                    )}
                                    <p>
                                        <strong>DMCA Email:</strong>{' '}
                                        <a
                                            href={`mailto:${info.dmcaEmail}`}
                                            className="text-primary-glow hover:underline font-medium"
                                        >
                                            {info.dmcaEmail}
                                        </a>
                                    </p>
                                    <p>
                                        <strong>General Support Email:</strong>{' '}
                                        <a
                                            href={`mailto:${info.contactEmail}`}
                                            className="text-primary-glow hover:underline"
                                        >
                                            {info.contactEmail}
                                        </a>
                                    </p>
                                    {info.address && (
                                        <p>
                                            <strong>Address:</strong> {info.address}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <RichTextContent html={section.bodyHtml} />
                            )}
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
}
