import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import ImageCard from '@/components/ImageCard';
import CollectionCarouselSlider from '@/components/collections/CollectionCarouselSlider';
import { slugify } from '@/lib/utils';
import {
    Layers,
    Share2,
    Check,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CollectionShow({
    collection,
    initialImages = [],
    total = 0,
    relatedCollections = [],
    sliderConfig = {},
    websiteInfo = {},
}) {
    const siteName = websiteInfo?.websiteName || 'Png101';
    const [images] = useState(initialImages);
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Collection URL copied to clipboard!');
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <Head title={`${collection?.name || 'Collection'} PNG Collection - ${siteName}`} />
            <Header siteName={siteName} />

            <main className="flex-1 w-full px-6 sm:px-10 md:px-16 py-8">
                <div className="space-y-10 pb-16">
                    {/* Breadcrumb Navigation */}
                    <nav className="flex items-center gap-2 text-xs text-foreground/50">
                        <Link href="/" className="hover:text-foreground transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link href="/collections" className="hover:text-foreground transition-colors">
                            Collections
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-foreground/90 font-semibold truncate max-w-xs">
                            {collection.name}
                        </span>
                    </nav>

                    {/* Collection Hero Banner Card */}
                    <div
                        style={
                            collection?.heroBgColor
                                ? { backgroundColor: collection.heroBgColor }
                                : undefined
                        }
                        className="relative h-[150px] flex items-center rounded-2xl border border-card-border bg-card-bg px-6 sm:px-10 shadow-xl overflow-hidden"
                    >
                        {!collection?.heroBgColor && (
                            <>
                                <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary-glow/10 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                            </>
                        )}

                        {/* Optional Right-Side Hero Cover Photo (always pinned to right at fixed height/size across all screens) */}
                        {collection?.heroImagePath && (
                            <div className="absolute inset-y-0 right-0 pointer-events-none select-none flex items-center justify-end">
                                <img
                                    src={collection.heroImagePath}
                                    alt=""
                                    className="h-full w-auto max-w-none object-contain object-right shrink-0"
                                />
                            </div>
                        )}

                        <div className="relative z-10 w-full flex items-center justify-between gap-4">
                            <h1
                                style={
                                    collection?.heroTextColor
                                        ? { color: collection.heroTextColor }
                                        : undefined
                                }
                                className="text-3xl sm:text-5xl md:text-6xl font-black uppercase text-foreground tracking-tight truncate"
                            >
                                {collection.name}
                            </h1>

                            <button
                                type="button"
                                onClick={handleShare}
                                className="px-4 py-2.5 rounded-xl bg-card-bg/90 backdrop-blur-md hover:bg-card-bg border border-card-border hover:border-primary-glow/50 text-foreground text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shrink-0 w-fit"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Link Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-3.5 h-3.5 text-primary-glow" />
                                        <span>Share Collection</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Graphics Grid Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-card-border">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1.5 h-6 rounded-full bg-primary-glow shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">
                                        Graphics in this Pack ({total})
                                    </h2>
                                    <p className="text-xs text-foreground/50 mt-0.5">
                                        Click any graphic for dimensions, high-res previews, and instant download
                                    </p>
                                </div>
                            </div>
                        </div>

                        {images.length === 0 ? (
                            <div className="py-20 text-center border border-dashed border-card-border rounded-xl p-8 bg-card-bg shadow-xl">
                                <Layers className="w-10 h-10 mx-auto mb-2 text-foreground/30" />
                                <p className="text-sm font-bold text-foreground">No graphics in this collection currently</p>
                                <p className="text-xs text-foreground/60 mt-1">Check back soon as assets are added.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                                {images.map((img) => (
                                    <Link
                                        key={img.id}
                                        href={`/images/${img.id}-${slugify(img.name || img.filename || '')}`}
                                        className="group block"
                                    >
                                        <ImageCard
                                            src={img.thumbPath || img.path}
                                            luminance={img.luminance}
                                            contrastBgDark={img.contrastBgDark}
                                            contrastBgLight={img.contrastBgLight}
                                        />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* More Collections Recommendation (Single-Row Smooth Draggable & Auto-Scrolling Slider) */}
                    {sliderConfig?.enabled !== false && relatedCollections.length > 0 && (
                        <div className="pt-10 border-t border-card-border">
                            <CollectionCarouselSlider
                                collections={relatedCollections}
                                sliderConfig={sliderConfig}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
