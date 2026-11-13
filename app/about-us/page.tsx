import React from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import { getWebsiteInfo } from '@/lib/website-info';
import type { Metadata } from 'next';
import { Sparkles, Download, Search, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    const info = await getWebsiteInfo();
    return {
        title: `About Us - ${info.websiteName}`,
        description: `Learn more about ${info.websiteName} — ${info.tagline}`,
    };
}

export default async function AboutUsPage() {
    const info = await getWebsiteInfo();

    const highlights = [
        {
            icon: <Sparkles className="w-6 h-6 text-primary-glow" />,
            title: 'True Transparent PNGs',
            description: `Every image on ${info.websiteName} is curated for clean alpha-channel transparency so you can drop assets directly into your designs without tedious background removal.`,
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
            description: `Operated by ${info.companyName}, we continuously expand our catalog while respecting creators and responding promptly to community feedback.`,
        },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header siteName={info.websiteName} />

            <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                        Established {info.foundedYear}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                        About <span className="text-primary-glow">{info.websiteName}</span>
                    </h1>
                    <p className="text-lg text-foreground/70 leading-relaxed">
                        {info.tagline}
                    </p>
                </div>

                {/* Story Card */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-6 text-foreground/80 leading-relaxed shadow-xl">
                    <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
                    <p>
                        Founded in <strong>{info.foundedYear}</strong> by <strong>{info.companyName}</strong>, <strong>{info.websiteName}</strong> (<a href={info.websiteUrl} className="text-primary-glow hover:underline">{info.websiteUrl}</a>) was built with a simple goal: to save designers, students, content creators, and developers hours of time spent hunting for clean, transparent PNG images.
                    </p>
                    <p>
                        Too often, searching for a transparent PNG leads to fake checkerboard backgrounds, low-resolution thumbnails, or endlessly gated download pages. At {info.websiteName}, we focus on speed, clarity, and quality—organizing high-resolution transparent cutouts with accurate titles, descriptions, and searchable tags.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {highlights.map((item) => (
                        <div
                            key={item.title}
                            className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-3 shadow-lg hover:border-primary-glow/40 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary-glow/10 border border-primary-glow/20 flex items-center justify-center">
                                {item.icon}
                            </div>
                            <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                            <p className="text-sm text-foreground/70 leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CTA Card */}
                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                    <div className="space-y-2 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-foreground">Have a question or suggestion?</h2>
                        <p className="text-foreground/60 text-sm">
                            We love hearing from our community. Reach out anytime at{' '}
                            <a href={`mailto:${info.contactEmail}`} className="text-primary-glow hover:underline font-medium">
                                {info.contactEmail}
                            </a>.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/contact-us"
                            className="px-6 py-3 bg-primary-glow text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-primary-glow/20"
                        >
                            Contact Us
                        </Link>
                        <Link
                            href="/"
                            className="px-6 py-3 bg-background border border-card-border text-foreground font-semibold rounded-xl hover:border-primary-glow/50 transition-colors"
                        >
                            Browse PNGs
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}

