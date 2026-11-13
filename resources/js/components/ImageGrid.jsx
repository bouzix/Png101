import React, { useEffect, useState } from 'react';
import ImageCard from './ImageCard';
import { Link } from '@inertiajs/react';
import { slugify } from '@/lib/utils';
import TrendingCollections from './TrendingCollections';
import { useIsDesktopXl } from '@/hooks/useIsDesktopXl';

const ImageGrid = () => {
    const isDesktopXl = useIsDesktopXl();
    const popularLimit = isDesktopXl ? 14 : 12;
    const latestLimit = isDesktopXl ? 28 : 24;
    const [popularImages, setPopularImages] = useState([]);
    const [latestImages, setLatestImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/images/homepage')
            .then((res) => res.json())
            .then((data) => {
                setPopularImages(Array.isArray(data.popularImages) ? data.popularImages : []);
                setLatestImages(Array.isArray(data.latestImages) ? data.latestImages : []);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load homepage images', err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="w-full px-6 sm:px-10 md:px-16 pb-24 space-y-20">
            {/* Section 1: Most Popular Images This Week (Max 15, refreshed every 24h) */}
            <section>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 pb-4 border-b border-card-border">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full bg-primary-glow shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                Most Popular Images
                            </h2>
                            <p className="text-xs text-foreground/50 mt-0.5">
                                Top downloaded and trending transparent PNGs this week
                            </p>
                        </div>
                    </div>
                    {!loading && popularImages.length > 0 && (
                        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400 text-xs font-semibold select-none shadow-sm">
                            <div className="ring-container">
                                <div className="ringring"></div>
                                <div className="circle"></div>
                            </div>
                            <span>Trending</span>
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                    {loading ? (
                        Array.from({ length: popularLimit }).map((_, i) => <ImageCard key={`pop-skel-${i}`} />)
                    ) : popularImages.length > 0 ? (
                        popularImages.slice(0, popularLimit).map((img) => (
                            <Link
                                key={img.id}
                                href={`/images/${img.id}-${slugify(img.name || img.filename || '')}`}
                            >
                                <ImageCard
                                    src={img.thumbPath || img.path}
                                    luminance={img.luminance}
                                    contrastBgDark={img.contrastBgDark}
                                    contrastBgLight={img.contrastBgLight}
                                />
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center text-foreground/40 py-10">
                            No images found.
                        </div>
                    )}
                </div>
            </section>

            {/* Trending Collections Section (Last 7 Days) */}
            <TrendingCollections />

            {/* Section 2: Latest Uploaded Images (Max 30 + "More" button) */}
            <section>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 pb-4 border-b border-card-border">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full bg-primary-glow shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                Latest Uploaded Images
                            </h2>
                            <p className="text-xs text-foreground/50 mt-0.5">
                                Freshly added high-resolution PNGs and brand logos
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/latest"
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow hover:underline group"
                    >
                        <span>View all uploads</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                    {loading ? (
                        Array.from({ length: popularLimit }).map((_, i) => <ImageCard key={`lat-skel-${i}`} />)
                    ) : latestImages.length > 0 ? (
                        latestImages.slice(0, latestLimit).map((img) => (
                            <Link
                                key={img.id}
                                href={`/images/${img.id}-${slugify(img.name || img.filename || '')}`}
                            >
                                <ImageCard
                                    src={img.thumbPath || img.path}
                                    luminance={img.luminance}
                                    contrastBgDark={img.contrastBgDark}
                                    contrastBgLight={img.contrastBgLight}
                                />
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center text-foreground/40 py-10">
                            No images found.
                        </div>
                    )}
                </div>

                {!loading && latestImages.length > 0 && (
                    <div className="mt-12 flex justify-center">
                        <Link
                            href="/latest"
                            className="more-btn-glow inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-card-bg hover:bg-primary-glow text-foreground hover:text-white font-bold text-sm tracking-wide transition-all duration-300 group cursor-pointer"
                        >
                            <span>More</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                />
                            </svg>
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
};

export default ImageGrid;
