import React from 'react';
import { Head, router } from '@inertiajs/react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import KeywordList from '@/components/KeywordList';
import ImageGrid from '@/components/ImageGrid';

export default function Home({
    latestImages = [],
    categories = [],
    categoryGroups = [],
    websiteInfo = {},
}) {
    const keywords = categories.map((c) => c.name);
    const siteName = websiteInfo?.siteName || 'Png101';

    const handleSearch = (query) => {
        const trimmed = query.trim();
        if (trimmed) {
            router.visit(`/search?q=${encodeURIComponent(trimmed)}`);
        } else {
            router.visit('/search');
        }
    };

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            <Head title={`${siteName} - Free Transparent PNG Images`} />
            <Header />

            <div className="relative overflow-hidden">
                {/* Decorative Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-20 right-1/4 w-[400px] h-[300px] bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />

                <Hero />
                <SearchBar onSearch={handleSearch} />
                <KeywordList keywords={keywords} />
            </div>

            <ImageGrid
                initialLatest={latestImages}
                initialCategories={categories}
                initialCategoryGroups={categoryGroups}
            />
        </main>
    );
}

