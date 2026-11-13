import React from 'react';
import { usePage } from '@inertiajs/react';
import SearchBar from './SearchBar';
import KeywordList from './KeywordList';
import ThemeToggle from './ThemeToggle';

const Hero = ({ siteName }) => {
    const { props } = usePage();
    const resolvedSiteName = siteName || props?.websiteInfo?.websiteName || 'Png101';

    return (
        <div id="home-hero" className="relative flex flex-col items-center justify-center py-20 px-4 bg-background">
            {/* Theme Toggle in Top Right of Hero */}
            <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20">
                <ThemeToggle />
            </div>

            <div className="mb-8 flex items-center gap-3">
                {/* Placeholder Logo Icon */}
                <div className="w-8 h-8 bg-primary-glow/20 rounded-lg flex items-center justify-center border border-primary-glow/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary-glow">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-wide">{resolvedSiteName}</h1>
            </div>
            <SearchBar />
            <KeywordList />
        </div>
    );
};

export default Hero;
