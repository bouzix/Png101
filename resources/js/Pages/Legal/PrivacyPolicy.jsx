import React from 'react';
import { Head } from '@inertiajs/react';
import Header from '@/components/Header';
import RichTextContent from '@/components/legal/RichTextContent';

export default function PrivacyPolicy({ websiteInfo = {}, legalContent = null }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        websiteUrl: websiteInfo.websiteUrl || 'https://png101.com',
        companyName: websiteInfo.companyName || 'Png101',
    };

    const content = legalContent || {
        badge: 'Data & Privacy',
        title: 'Privacy Policy',
        subtitle: `Operated by ${info.companyName} • ${info.websiteUrl}`,
        sections: [],
    };

    const sections = Array.isArray(content.sections) ? content.sections : [];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`${content.title || 'Privacy Policy'} - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-16">
                <div className="mb-10">
                    {content.badge && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                            {content.badge}
                        </span>
                    )}
                    <h1 className="text-4xl font-bold text-foreground mb-3">
                        {content.title || 'Privacy Policy'}
                    </h1>
                    {content.subtitle && (
                        <p className="text-sm text-foreground/60">{content.subtitle}</p>
                    )}
                </div>

                <div className="bg-transparent border-0 p-0 sm:bg-card-bg sm:border sm:border-card-border sm:rounded-2xl sm:p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed">
                    {sections.map((section, idx) => {
                        const isLast = idx === sections.length - 1;
                        return (
                            <section
                                key={section.id || idx}
                                className={isLast ? 'space-y-3 pt-4 border-t border-card-border' : 'space-y-3'}
                            >
                                {section.heading && (
                                    <h2 className="text-xl font-bold text-foreground">
                                        {section.heading}
                                    </h2>
                                )}
                                <RichTextContent html={section.bodyHtml} />
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
