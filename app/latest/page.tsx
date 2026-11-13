import React from 'react';
import Header from '../components/Header';
import LatestImagesClient from './LatestImagesClient';
import { getWebsiteInfo } from '@/lib/website-info';

export const dynamic = 'force-dynamic';

export default async function LatestUploadsPage() {
    const websiteInfo = await getWebsiteInfo();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Header siteName={websiteInfo.websiteName} />

            <main className="container mx-auto px-4 py-10 max-w-6xl">
                <div className="text-center mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                        Latest Uploaded Images
                    </h1>
                </div>

                <LatestImagesClient />
            </main>
        </div>
    );
}

