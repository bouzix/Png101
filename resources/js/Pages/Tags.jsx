import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import { Hash, Tag as TagIcon } from 'lucide-react';

export default function Tags({ tags = [] }) {
    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            <Head title="Explore PNG Tags & Keywords" />
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-wider mb-4">
                        <TagIcon className="w-3.5 h-3.5" />
                        Browse by Topic
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                        Popular PNG Tags
                    </h1>
                    <p className="text-muted-text text-sm md:text-base">
                        Explore transparent PNGs organized by the most searched and popular keywords across our catalog.
                    </p>
                </div>

                {tags.length > 0 ? (
                    <div className="bg-card-bg border border-card-border rounded-3xl p-6 md:p-10 shadow-xl">
                        <div className="flex flex-wrap gap-3 justify-center">
                            {tags.map((item, idx) => {
                                const tagName = typeof item === 'string' ? item : item.name;
                                const count = typeof item === 'object' ? item.count : null;
                                return (
                                    <Link
                                        key={idx}
                                        href={`/search?q=${encodeURIComponent(tagName)}`}
                                        className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tag-bg hover:bg-blue-600 text-tag-text hover:text-white border border-tag-border hover:border-blue-500 transition-all duration-200 shadow-sm"
                                    >
                                        <Hash className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                                        <span className="text-sm font-medium capitalize">{tagName}</span>
                                        {count !== null && (
                                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-foreground/10 group-hover:bg-white/20">
                                                {count}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-24 text-muted-text">
                        No tags indexed yet.
                    </div>
                )}
            </div>
        </main>
    );
}

