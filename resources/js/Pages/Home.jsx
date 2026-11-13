import React from 'react';
import { Head } from '@inertiajs/react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ImageGrid from '@/components/ImageGrid';

export default function Home({ websiteInfo = {} }) {
    const siteName = websiteInfo?.websiteName || 'Png101';

    return (
        <main className="min-h-screen bg-background">
            <Head title={`${siteName} - Free Transparent PNG Images`} />
            <Header siteName={siteName} showOnScrollOnly={true} />
            <Hero siteName={siteName} />
            <ImageGrid />
        </main>
    );
}
