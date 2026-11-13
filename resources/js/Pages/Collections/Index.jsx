import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import { Layers, ArrowRight, Star } from 'lucide-react';

function CollectionCard({ collection, isHero = false }) {
    return (
        <Link
            href={`/collections/${collection.slug}`}
            className={`group rounded-xl border bg-card-bg overflow-hidden shadow-xl hover:border-primary-glow/50 hover:shadow-primary-glow/10 transition-all duration-300 flex flex-col hover:-translate-y-1 ${
                isHero
                    ? 'border-amber-500/30 ring-1 ring-amber-500/15'
                    : 'border-card-border'
            }`}
        >
            {/* Visual Collage Stage */}
            <div
                className="relative h-48 w-full bg-foreground/[0.02] border-b border-card-border overflow-hidden p-3"
                style={{
                    backgroundImage:
                        'linear-gradient(45deg, #80808012 25%, transparent 25%), linear-gradient(-45deg, #80808012 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808012 75%), linear-gradient(-45deg, transparent 75%, #80808012 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                }}
            >
                {collection.previewImages && collection.previewImages.length > 0 ? (
                    <div className="h-full w-full grid grid-cols-2 gap-2">
                        {collection.previewImages.slice(0, 4).map((img, idx) => (
                            <div
                                key={img.id || idx}
                                className="relative h-full w-full rounded-lg bg-card-bg/80 backdrop-blur-sm border border-card-border/80 p-2 flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={img.path}
                                    alt=""
                                    className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        ))}
                    </div>
                ) : collection.coverImagePath ? (
                    <div className="h-full w-full flex items-center justify-center p-3">
                        <img
                            src={collection.coverImagePath}
                            alt={collection.name}
                            className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-foreground/30">
                        <Layers className="w-8 h-8 mb-1" />
                        <span className="text-xs">Collection</span>
                    </div>
                )}

                {collection.isFeatured && (
                    <div className="absolute top-3 left-3">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-md">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>Featured</span>
                        </span>
                    </div>
                )}

                <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-lg bg-card-bg/90 border border-card-border backdrop-blur-md text-foreground text-xs font-bold shadow-md">
                        {collection.imageCount} PNG{collection.imageCount === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            {/* Information Section */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary-glow transition-colors line-clamp-1">
                        {collection.name}
                    </h3>

                    {collection.description && (
                        <p className="text-xs text-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
                            {collection.description}
                        </p>
                    )}

                    {Array.isArray(collection.tagRules) && collection.tagRules.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {collection.tagRules.slice(0, 3).map((t) => (
                                <span
                                    key={t}
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-tag-bg text-tag-text border border-tag-border"
                                >
                                    #{t}
                                </span>
                            ))}
                            {collection.tagRules.length > 3 && (
                                <span className="text-[11px] font-medium px-1.5 py-0.5 text-foreground/40">
                                    +{collection.tagRules.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-card-border flex items-center justify-between text-xs font-bold text-primary-glow group-hover:text-blue-400 transition-colors">
                    <span>Explore Pack</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </Link>
    );
}

export default function CollectionsIndex({ collections = [], websiteInfo = {} }) {
    const siteName = websiteInfo?.websiteName || 'Png101';
    const featuredCollections = collections.filter((c) => c.isFeatured);
    const standardCollections = collections.filter((c) => !c.isFeatured);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <Head title={`Curated PNG Collections & Clipart Packs - ${siteName}`} />
            <Header siteName={siteName} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
                {/* Hero Header Banner */}
                <div className="text-center max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-glow/10 border border-primary-glow/20 text-primary-glow text-xs font-bold tracking-wide">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Curated Design Packs</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                        Themed PNG Collections
                    </h1>

                    <p className="text-sm sm:text-base text-foreground/60 leading-relaxed max-w-2xl mx-auto">
                        Explore handpicked packs and automated tag collections of premium transparent PNG graphics. Browse holiday clipart, matching icon kits, and aesthetic designs.
                    </p>
                </div>

                {/* Featured Collections Section */}
                {featuredCollections.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-card-border">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                                Featured Collections
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {featuredCollections.map((col) => (
                                <CollectionCard key={col.id} collection={col} isHero={true} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Collections Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-card-border">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-5 rounded-full bg-primary-glow shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                                All Collections ({collections.length})
                            </h2>
                        </div>
                    </div>

                    {collections.length === 0 ? (
                        <div className="py-24 text-center border border-dashed border-card-border rounded-xl p-8 bg-card-bg shadow-xl">
                            <Layers className="w-12 h-12 mx-auto mb-3 text-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No collections published yet</h3>
                            <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto">
                                Check back soon as fresh seasonal collections and graphic kits are added.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(featuredCollections.length > 0 ? standardCollections : collections).map(
                                (col) => (
                                    <CollectionCard key={col.id} collection={col} />
                                )
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
