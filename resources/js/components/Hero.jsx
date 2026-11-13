import React from 'react';
import { usePage } from '@inertiajs/react';

const Hero = () => {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo;
    const headline = websiteInfo?.heroHeadline || 'Discover Millions of Free Transparent PNGs';
    const subheadline = websiteInfo?.heroSubheadline || 'High-resolution cut-out assets ready for your next creative project. No backgrounds, just pure quality.';

    return (
        <div className="flex flex-col items-center text-center pt-16 pb-8 px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
                <span className="text-foreground">
                    {headline}
                </span>
            </h1>

            <p className="text-muted-text max-w-2xl text-sm md:text-base font-light">
                {subheadline}
            </p>
        </div>
    );
};

export default Hero;

