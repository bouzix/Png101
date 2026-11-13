import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';

export default function Tags({ groupedTags = {}, totalTagsCount = 0, websiteInfo = {} }) {
    const siteName = websiteInfo?.websiteName || 'Png101';

    const alphabetKeys = [
        '#',
        ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30 flex flex-col">
            <Head title={`All PNG Tags & Brand Directory - ${siteName}`} />
            <Header siteName={siteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-10 flex-1">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-foreground/50 flex items-center justify-center gap-1.5">
                        <Link href="/" className="hover:text-primary-glow transition-colors">Home</Link>
                        <span>/</span>
                        <span className="text-foreground/80 font-medium">Tags Directory</span>
                    </nav>

                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
                        PNG Tags &amp; Topics Directory
                    </h1>
                    <p className="text-foreground/60 max-w-2xl mx-auto text-sm">
                        Explore our complete index of {totalTagsCount} transparent PNG tags, brands, icons, and cliparts organized alphabetically.
                    </p>
                </div>

                {/* Quick Alphabet Jump Bar */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 p-3 rounded-2xl bg-card-bg border border-card-border mb-12 shadow-md">
                    {alphabetKeys.map((letter) => {
                        const hasTags = Boolean(groupedTags[letter]?.length);
                        return hasTags ? (
                            <a
                                key={letter}
                                href={`#letter-${letter}`}
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-card-header-bg hover:bg-primary-glow text-foreground hover:text-white transition-all shadow-sm"
                            >
                                {letter}
                            </a>
                        ) : (
                            <span
                                key={letter}
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-foreground/20 cursor-default select-none"
                            >
                                {letter}
                            </span>
                        );
                    })}
                </div>

                {/* Alphabetical Tag Sections */}
                <div className="space-y-12">
                    {alphabetKeys.map((letter) => {
                        const list = groupedTags[letter];
                        if (!list || list.length === 0) return null;

                        return (
                            <section key={letter} id={`letter-${letter}`} className="scroll-mt-24">
                                <div className="flex items-center gap-4 mb-4 border-b border-card-border pb-2">
                                    <span className="w-10 h-10 rounded-xl bg-primary-glow/15 text-primary-glow border border-primary-glow/30 flex items-center justify-center font-extrabold text-lg shadow-sm">
                                        {letter}
                                    </span>
                                    <span className="text-foreground/50 text-xs font-semibold uppercase tracking-wider">
                                        {list.length} {list.length === 1 ? 'Tag' : 'Tags'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {list.map(({ tag, count }) => (
                                        <Link
                                            key={tag}
                                            href={`/search?q=${encodeURIComponent(tag)}`}
                                            className="p-2.5 rounded-xl bg-card-bg hover:bg-card-header-bg border border-card-border hover:border-primary-glow/50 transition-all flex items-center justify-between text-xs group"
                                        >
                                            <span className="text-foreground group-hover:text-primary-glow font-medium capitalize truncate pr-2">
                                                {tag}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold font-mono flex-shrink-0 group-hover:bg-blue-500 shadow-sm transition-colors">
                                                {count}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
