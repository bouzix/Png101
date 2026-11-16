import React, { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Search,
    Wand2,
    ShieldCheck,
    Zap,
    Layers,
    Sparkles,
} from 'lucide-react';
import Header from '@/components/Header';

const HUB_CONFIG = {
    all: {
        sectionTitle: 'All Tools',
        heroTitle: 'Free Online Image Tools & Converters',
        heroDesc:
            'Convert image formats, compress photos, resize assets for social media, or strip solid backgrounds directly in your browser without uploading files to any server.',
        searchPlaceholder: 'Search tools (e.g. remove background, resize, webp)...',
        seoFallbackTitle: (siteName) => `Free Online Image Tools & Converters - ${siteName}`,
    },
    convert: {
        sectionTitle: 'Image Converters',
        heroTitle: 'Free Image Format Converters',
        heroDesc:
            'Convert PNG, WebP, JPG, AVIF, SVG, and ICO images directly in your browser without uploading files to any server.',
        searchPlaceholder: 'Search converter (e.g. jpg to webp, ico)...',
        seoFallbackTitle: (siteName) => `Free Online Image Format Converters - ${siteName}`,
    },
    utilities: {
        sectionTitle: 'Image Utilities',
        heroTitle: 'Free Online Image Utilities',
        heroDesc:
            'Compress, resize, crop, round corners, remove solid backgrounds, watermark batches, split grids, and generate ICO favicons or app icons directly in your browser.',
        searchPlaceholder: 'Search image utility (e.g. remove background, resize, favicon)...',
        seoFallbackTitle: (siteName) => `Free Online Image Utilities - ${siteName}`,
    },
    devtools: {
        sectionTitle: 'Developer Tools',
        heroTitle: 'Developer Image & SVG Tools',
        heroDesc:
            'Encode images to Base64 & Data URIs, clean SVGs for React JSX, extract CSS/Tailwind color palettes, and strip EXIF metadata locally in your browser.',
        searchPlaceholder: 'Search developer tool (e.g. base64, svg jsx, palette, exif)...',
        seoFallbackTitle: (siteName) => `Developer Image & SVG Tools - ${siteName}`,
    },
};

export default function ConvertHub({ seo = {}, hubMode = 'all', tools = [], preloadAsset = null }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const siteName = websiteInfo?.websiteName || 'Png101';
    const isCategoryHub = hubMode !== 'all';
    const hubMeta = HUB_CONFIG[hubMode] || HUB_CONFIG.all;

    const [searchQuery, setSearchQuery] = useState('');

    const filteredTools = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return tools.filter((tool) => {
            if (!q) return true;
            return (
                (tool.shortTitle || '').toLowerCase().includes(q) ||
                tool.title.toLowerCase().includes(q) ||
                tool.shortDesc.toLowerCase().includes(q) ||
                tool.fromFormat.toLowerCase().includes(q) ||
                tool.toFormat.toLowerCase().includes(q) ||
                tool.slug.toLowerCase().includes(q)
            );
        });
    }, [tools, searchQuery]);

    const groupedSections = useMemo(() => {
        const genreMeta = [
            { key: 'converters', title: 'Image Converters', href: '/tools/convert' },
            { key: 'utilities', title: 'Image Utilities', href: '/tools/utilities' },
            { key: 'developer', title: 'Developer Tools', href: '/tools/devtools' },
        ];

        const knownKeys = new Set(genreMeta.map((g) => g.key));
        const sections = [];

        for (const meta of genreMeta) {
            const items = filteredTools.filter((t) => t.category === meta.key);
            if (items.length > 0) {
                sections.push({ ...meta, tools: items });
            }
        }

        // Preserve extensibility for future genres (e.g. document tools)
        const extraCategories = [...new Set(filteredTools.map((t) => t.category).filter((c) => c && !knownKeys.has(c)))];
        for (const cat of extraCategories) {
            const items = filteredTools.filter((t) => t.category === cat);
            if (items.length > 0) {
                sections.push({
                    key: cat,
                    title: cat.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
                    href: null,
                    tools: items,
                });
            }
        }

        return sections;
    }, [filteredTools]);

    const buildToolHref = (tool) => {
        const basePath = tool.url || (tool.category === 'converters' ? `/tools/convert/${tool.slug}` : `/tools/${tool.slug}`);
        if (!preloadAsset?.path) return basePath;
        const params = new URLSearchParams({
            asset: preloadAsset.path,
            name: preloadAsset.name || 'png101-asset',
        });
        return `${basePath}?${params.toString()}`;
    };

    const renderToolCard = (tool) => (
        <Link
            key={tool.slug}
            href={buildToolHref(tool)}
            className="group bg-card-bg border border-card-border hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-200 hover:-translate-y-0.5"
        >
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400 text-[11px] font-bold font-mono">
                        <span>{tool.fromFormat}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{tool.toFormat}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground/45">
                        {tool.category}
                    </span>
                </div>

                <h2 className="text-base font-bold text-foreground group-hover:text-blue-500 transition-colors">
                    {tool.shortTitle || tool.title}
                </h2>

                <p className="text-xs text-foreground/65 leading-relaxed">
                    {tool.shortDesc}
                </p>
            </div>

            <div className="pt-3 border-t border-card-border/70 flex items-center justify-between text-xs font-bold text-blue-500">
                <span>Open Tool</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Head>
                <title>
                    {seo.title || hubMeta.seoFallbackTitle(siteName)}
                </title>
                <meta
                    name="description"
                    content={seo.description || 'Convert, compress, resize, and remove backgrounds in your browser.'}
                />
            </Head>

            <Header />

            <main className="flex-1 w-full px-6 sm:px-10 md:px-16 py-10 md:py-14 space-y-10">
                {isCategoryHub && (
                    <div>
                        <Link
                            href="/tools"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/60 hover:text-blue-500 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to All Tools</span>
                        </Link>
                    </div>
                )}

                {/* Hero Header */}
                <section className="max-w-4xl mx-auto text-center space-y-5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400 text-xs font-bold">
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>100% Browser-Based · Private & Instant</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                        {hubMeta.heroTitle}
                    </h1>

                    <p className="text-sm sm:text-base text-foreground/65 max-w-2xl mx-auto leading-relaxed">
                        {hubMeta.heroDesc}
                    </p>

                    {preloadAsset?.path && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold">
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <span>Pick any tool below to open &ldquo;{preloadAsset.name}&rdquo; directly!</span>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="pt-2 w-full max-w-2xl mx-auto">
                        <div className="relative w-full">
                            <Search className="w-4 h-4 text-foreground/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={hubMeta.searchPlaceholder}
                                className="w-full bg-card-bg border border-card-border rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                            />
                        </div>
                    </div>
                </section>

                {/* Converter & Utility Tool Sections */}
                {filteredTools.length === 0 ? (
                    <div className="max-w-lg mx-auto p-10 text-center bg-card-bg border border-card-border rounded-2xl space-y-2">
                        <p className="font-bold text-foreground">No matching tools found</p>
                        <p className="text-xs text-foreground/60">Try clearing your search filter.</p>
                    </div>
                ) : isCategoryHub ? (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-3 border-b border-card-border pb-3">
                            <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                {hubMeta.sectionTitle}
                            </h2>
                            <span className="text-xs font-semibold text-foreground/50">
                                {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredTools.map(renderToolCard)}
                        </div>
                    </section>
                ) : (
                    <div className="space-y-12">
                        {groupedSections.map((section) => (
                            <section key={section.key} className="space-y-5">
                                <div className="flex items-center justify-between gap-3 border-b border-card-border pb-3">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                            {section.title}
                                        </h2>
                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-500">
                                            {section.tools.length}
                                        </span>
                                    </div>
                                    {section.href && (
                                        <Link
                                            href={section.href}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline"
                                        >
                                            <span>Open {section.title}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {section.tools.map(renderToolCard)}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {/* Why Client-Side Features */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                    <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-sm font-bold text-foreground">Zero Server Uploads</h3>
                        <p className="text-xs text-foreground/65 leading-relaxed">
                            Images are decoded and re-encoded directly in your browser memory—nothing is transmitted or stored externally.
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
                        <Zap className="w-5 h-5 text-blue-500" />
                        <h3 className="text-sm font-bold text-foreground">Instant Batch Processing</h3>
                        <p className="text-xs text-foreground/65 leading-relaxed">
                            Convert multiple files simultaneously and save them individually or bundled inside a single ZIP archive.
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-card-bg border border-card-border space-y-2">
                        <Layers className="w-5 h-5 text-purple-500" />
                        <h3 className="text-sm font-bold text-foreground">Transparency &amp; Resize Ready</h3>
                        <p className="text-xs text-foreground/65 leading-relaxed">
                            Preserve alpha channels for PNG/WebP/ICO or apply custom dimensions and clean background cutouts.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
