import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import ImageCard from './ImageCard';
import TrendingCollections from './TrendingCollections';

const ImageGrid = ({
    initialImages = [],
    initialLatest = [],
    initialCategories = [],
    initialCategoryGroups = [],
}) => {
    const [images, setImages] = useState(initialImages);
    const [latestImages, setLatestImages] = useState(initialLatest);
    const [categories, setCategories] = useState(initialCategories);
    const [categoryGroups, setCategoryGroups] = useState(initialCategoryGroups);
    const [activeCategory, setActiveCategory] = useState('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialImages.length === 0 && initialLatest.length === 0 && initialCategoryGroups.length === 0) {
            fetchHomepageData();
        }
    }, []);

    const fetchHomepageData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/images/homepage');
            if (res.ok) {
                const data = await res.json();
                setLatestImages(data.latest || []);
                setCategoryGroups(data.categoryGroups || []);
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Failed to fetch homepage data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategorySelect = async (slug) => {
        setActiveCategory(slug);
        if (slug === 'all') {
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/images?category=${encodeURIComponent(slug)}&limit=12`);
            if (res.ok) {
                const data = await res.json();
                setImages(data.images || data);
            }
        } catch (error) {
            console.error('Failed to filter images:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMoreClick = (targetUrl) => {
        router.visit(targetUrl);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-20">
            {/* Category Filter Bar */}
            {categories.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
                    <button
                        onClick={() => handleCategorySelect('all')}
                        className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all cursor-pointer ${
                            activeCategory === 'all'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                : 'bg-tag-bg text-tag-text border border-tag-border hover:bg-tag-bg-hover'
                        }`}
                    >
                        All Categories
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.slug)}
                            className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all cursor-pointer ${
                                activeCategory === cat.slug
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                    : 'bg-tag-bg text-tag-text border border-tag-border hover:bg-tag-bg-hover'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Filtered View */}
            {activeCategory !== 'all' ? (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-foreground capitalize">
                            {categories.find((c) => c.slug === activeCategory)?.name || activeCategory} PNGs
                        </h2>
                        <button
                            onClick={() => handleCategorySelect('all')}
                            className="text-xs font-medium text-blue-500 hover:underline cursor-pointer"
                        >
                            Back to Overview
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-foreground/5 animate-pulse border border-card-border" />
                            ))}
                        </div>
                    ) : images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                            {images.map((img, idx) => (
                                <ImageCard key={img.id} image={img} priority={idx < 4} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-text">
                            No images found in this category yet.
                        </div>
                    )}

                    <div className="mt-10 flex justify-center">
                        <Link
                            href={`/search?category=${encodeURIComponent(activeCategory)}`}
                            className="more-btn-glow px-8 py-3 rounded-full text-sm font-bold text-white cursor-pointer"
                        >
                            Explore More {categories.find((c) => c.slug === activeCategory)?.name || ''}
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-16">
                    {/* Latest PNGs Section */}
                    {latestImages.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                                    Latest Transparent PNGs
                                </h2>
                                <Link
                                    href="/latest"
                                    className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
                                >
                                    View all &rarr;
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                                {latestImages.map((img, idx) => (
                                    <ImageCard key={img.id} image={img} priority={idx < 4} />
                                ))}
                            </div>
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => handleMoreClick('/latest')}
                                    className="more-btn-glow px-8 py-2.5 rounded-full text-xs md:text-sm font-bold text-white cursor-pointer"
                                >
                                    View More Latest PNGs
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Trending Collections Section */}
                    <TrendingCollections />

                    {/* Category Showcase Sections */}
                    {categoryGroups.map((group) => (
                        <section key={group.category.id}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                                    {group.category.name}
                                </h2>
                                <Link
                                    href={`/search?category=${encodeURIComponent(group.category.slug)}`}
                                    className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
                                >
                                    View all &rarr;
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                                {group.images.map((img) => (
                                    <ImageCard key={img.id} image={img} />
                                ))}
                            </div>
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => handleMoreClick(`/search?category=${encodeURIComponent(group.category.slug)}`)}
                                    className="more-btn-glow px-8 py-2.5 rounded-full text-xs md:text-sm font-bold text-white cursor-pointer"
                                >
                                    Explore {group.category.name}
                                </button>
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageGrid;

