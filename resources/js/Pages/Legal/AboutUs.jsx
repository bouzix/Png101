import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import RichTextContent from '@/components/legal/RichTextContent';
import { Sparkles, Download, Search, ShieldCheck } from 'lucide-react';

const ICON_MAP = {
    sparkles: <Sparkles className="w-6 h-6 text-primary-glow" />,
    search: <Search className="w-6 h-6 text-primary-glow" />,
    download: <Download className="w-6 h-6 text-primary-glow" />,
    'shield-check': <ShieldCheck className="w-6 h-6 text-primary-glow" />,
};

function renderHighlightedTitle(title, websiteName) {
    const text = String(title || `About ${websiteName}`);
    const target = String(websiteName || '');
    if (!target) return text;
    const idx = text.toLowerCase().indexOf(target.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + target.length);
    const after = text.slice(idx + target.length);
    return (
        <>
            {before}
            <span className="text-primary-glow">{match}</span>
            {after}
        </>
    );
}

export default function AboutUs({ websiteInfo = {}, legalContent = null }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        tagline: websiteInfo.tagline || 'Discover and download free, high-resolution transparent PNG images for your creative projects.',
        websiteUrl: websiteInfo.websiteUrl || 'https://png101.com',
        companyName: websiteInfo.companyName || 'Png101',
        foundedYear: websiteInfo.foundedYear || '2025',
        contactEmail: websiteInfo.contactEmail || 'contact@png101.com',
    };

    const content = legalContent || {
        heroBadge: `Established ${info.foundedYear}`,
        heroTitle: `About ${info.websiteName}`,
        heroSubtitle: info.tagline,
        missionTitle: 'Our Mission',
        missionBodyHtml: `<p>Founded in <strong>${info.foundedYear}</strong> by <strong>${info.companyName}</strong>, <strong>${info.websiteName}</strong> (<a href="${info.websiteUrl}">${info.websiteUrl}</a>) was built with a simple goal: to save designers, students, content creators, and developers hours of time spent hunting for clean, transparent PNG images.</p><p>Too often, searching for a transparent PNG leads to fake checkerboard backgrounds, low-resolution thumbnails, or endlessly gated download pages. At ${info.websiteName}, we focus on speed, clarity, and quality—organizing high-resolution transparent cutouts with accurate titles, descriptions, and searchable tags.</p>`,
        highlights: [
            {
                id: 'transparent-pngs',
                icon: 'sparkles',
                title: 'True Transparent PNGs',
                descriptionHtml: `<p>Every image on ${info.websiteName} is curated for clean alpha-channel transparency so you can drop assets directly into your designs without tedious background removal.</p>`,
            },
            {
                id: 'smart-tagging',
                icon: 'search',
                title: 'Smart Tagging & Fast Search',
                descriptionHtml: '<p>Our library is organized with rich keywords and categories so designers, marketers, educators, and creators can find the exact cutout they need in seconds.</p>',
            },
            {
                id: 'instant-downloads',
                icon: 'download',
                title: 'Instant, Hassle-Free Downloads',
                descriptionHtml: '<p>No mandatory sign-ups or complicated workflows—just browse, preview high-resolution dimensions, and download with a single click.</p>',
            },
            {
                id: 'quality-care',
                icon: 'shield-check',
                title: 'Quality & Community Care',
                descriptionHtml: `<p>Operated by ${info.companyName}, we continuously expand our catalog while respecting creators and responding promptly to community feedback.</p>`,
            },
        ],
        ctaTitle: 'Have a question or suggestion?',
        ctaSubtitleHtml: `<p>We love hearing from our community. Reach out anytime at <a href="mailto:${info.contactEmail}">${info.contactEmail}</a>.</p>`,
        ctaPrimaryText: 'Contact Us',
        ctaSecondaryText: 'Browse PNGs',
    };

    const highlights = Array.isArray(content.highlights) ? content.highlights : [];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`About Us - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-16 space-y-16">
                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    {content.heroBadge && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            {content.heroBadge}
                        </span>
                    )}
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                        {renderHighlightedTitle(content.heroTitle, info.websiteName)}
                    </h1>
                    {content.heroSubtitle && (
                        <p className="text-lg text-foreground/70 leading-relaxed">
                            {content.heroSubtitle}
                        </p>
                    )}
                </div>

                {/* Story Card */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-6 text-foreground/80 leading-relaxed">
                    <h2 className="text-2xl font-bold text-foreground">{content.missionTitle}</h2>
                    <RichTextContent html={content.missionBodyHtml} />
                </div>

                {/* Feature Grid */}
                {highlights.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {highlights.map((item, idx) => (
                            <div
                                key={item.id || `${item.title}-${idx}`}
                                className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-3 hover:border-primary-glow/40 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary-glow/10 border border-primary-glow/20 flex items-center justify-center">
                                    {ICON_MAP[item.icon] || ICON_MAP.sparkles}
                                </div>
                                <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                                <RichTextContent
                                    html={item.descriptionHtml}
                                    className="text-sm text-foreground/70 leading-relaxed"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA Card */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                    <div className="space-y-2 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-foreground">{content.ctaTitle}</h2>
                        <RichTextContent
                            html={content.ctaSubtitleHtml}
                            className="text-foreground/60 text-sm"
                        />
                    </div>
                    <div className="flex items-center justify-center gap-2.5 sm:gap-4 shrink-0">
                        <Link
                            href="/contact-us"
                            className="px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-base whitespace-nowrap bg-primary-glow text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-primary-glow/20"
                        >
                            {content.ctaPrimaryText || 'Contact Us'}
                        </Link>
                        <Link
                            href="/"
                            className="px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-base whitespace-nowrap bg-background border border-card-border text-foreground font-semibold rounded-xl hover:border-primary-glow/50 transition-colors"
                        >
                            {content.ctaSecondaryText || 'Browse PNGs'}
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
