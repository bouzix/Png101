import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Header from '@/components/Header';
import { Sparkles, Download, Search, ShieldCheck } from 'lucide-react';

export default function AboutUs() {
    const { props } = usePage();
    const info = props?.websiteInfo || {};
    const siteName = info.websiteName || info.siteName || 'Png101';
    const tagline = info.tagline || info.description || 'Discover millions of free high-resolution transparent PNG images ready for your creative projects.';
    const companyName = info.companyName || siteName;
    const foundedYear = info.foundedYear || new Date().getFullYear();

    const highlights = [
        {
            icon: <Sparkles className="w-6 h-6 text-primary-glow" />,
            title: 'True Transparent PNGs',
            description: `Every image on ${siteName} is curated for clean alpha-channel transparency so you can drop assets directly into your designs without tedious background removal.`,
        },
        {
            icon: <Search className="w-6 h-6 text-primary-glow" />,
            title: 'Smart Tagging & Fast Search',
            description: 'Our library is organized with rich keywords and categories so designers, marketers, educators, and creators can find the exact cutout they need in seconds.',
        },
        {
            icon: <Download className="w-6 h-6 text-primary-glow" />,
            title: 'Instant, Hassle-Free Downloads',
            description: 'No mandatory sign-ups or complicated workflows—just browse, preview high-resolution dimensions, and download with a single click.',
        },
        {
            icon: <ShieldCheck className="w-6 h-6 text-primary-glow" />,
            title: 'Quality & Community Care',
            description: `Operated by ${companyName}, we continuously expand our catalog while respecting creators and responding promptly to community feedback.`,
        },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`About Us - ${siteName}`} />
            <Header />

            <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                        Established {foundedYear}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                        About <span className="text-primary-glow">{siteName}</span>
                    </h1>
                    <p className="text-lg text-foreground/70 leading-relaxed">
                        {tagline}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {highlights.map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-3 shadow-lg"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary-glow/10 border border-primary-glow/20 flex items-center justify-center">
                                {item.icon}
                            </div>
                            <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
                            <p className="text-sm text-foreground/70 leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 text-center space-y-4 shadow-xl">
                    <h2 className="text-2xl font-bold text-foreground">Ready to start creating?</h2>
                    <p className="text-sm text-foreground/70 max-w-xl mx-auto">
                        Explore thousands of free transparent PNG cutouts or reach out to our team if you have any questions.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/search"
                            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                        >
                            Browse Library
                        </Link>
                        <Link
                            href="/contact-us"
                            className="px-6 py-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-card-border text-foreground font-semibold text-sm transition-colors"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}

