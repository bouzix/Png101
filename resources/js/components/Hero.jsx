import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import SearchBar from './SearchBar';
import KeywordList from './KeywordList';
import ThemeToggle from './ThemeToggle';
import { BrandLogo } from './BrandMark';

const Hero = ({ siteName }) => {
    const { props } = usePage();
    const resolvedSiteName = siteName || props?.websiteInfo?.websiteName || 'Png101';

    return (
        <div id="home-hero" className="relative flex flex-col items-center justify-center pt-8 pb-14 md:pt-10 md:pb-16 lg:py-20 px-6 sm:px-10 md:px-16 bg-background">
            {/* Theme Toggle in Top Right of Hero (Desktop/Tablet; Mobile uses bottom pill menu) */}
            <div className="hidden md:block absolute top-5 right-6 sm:top-6 sm:right-10 md:right-16 z-20">
                <ThemeToggle />
            </div>

            <Link
                href="/"
                data-testid="hero-brand-logo"
                className="mb-8 inline-flex items-center group"
                title={resolvedSiteName}
            >
                <BrandLogo
                    websiteInfo={props?.websiteInfo}
                    siteName={resolvedSiteName}
                    size="hero"
                    asHeading={true}
                />
            </Link>
            <SearchBar />
            <KeywordList />
        </div>
    );
};

export default Hero;
