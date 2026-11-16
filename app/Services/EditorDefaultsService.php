<?php

namespace App\Services;

use App\Models\EditorCanvasPreset;
use App\Models\EditorFont;
use App\Models\EditorTemplate;
use App\Models\EditorTemplateCategory;
use App\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class EditorDefaultsService
{
    public const SEEDED_KEY = 'editor_defaults_seeded_v1';

    public static function ensureSeeded(): void
    {
        try {
            if (!Schema::hasTable('EditorTemplateCategory')) {
                return;
            }

            if (EditorTemplateCategory::count() === 0) {
                self::seedCategories();
            }

            if (EditorCanvasPreset::count() === 0) {
                self::seedPresets();
            }

            if (EditorFont::count() === 0) {
                self::seedFonts();
            }

            // Only seed starter templates once so admins who delete all templates aren't force-repopulated
            $alreadySeeded = Setting::find(self::SEEDED_KEY);
            if (!$alreadySeeded && EditorTemplate::count() === 0) {
                self::seedStarterTemplates();
                Setting::updateOrCreate(['key' => self::SEEDED_KEY], ['value' => '1']);
            }
        } catch (\Throwable $e) {
            // Silently ignore if tables aren't migrated yet
        }
    }

    public static function seedCategories(): void
    {
        $cats = [
            ['name' => 'Social Media', 'slug' => 'social-media', 'description' => 'Instagram posts, stories, reels covers, and social graphics.', 'icon' => 'Share2', 'sortOrder' => 1],
            ['name' => 'YouTube & Streaming', 'slug' => 'youtube-streaming', 'description' => 'Thumbnails, channel banners, overlays, and stream badges.', 'icon' => 'Youtube', 'sortOrder' => 2],
            ['name' => 'Marketing & Flyers', 'slug' => 'marketing-flyers', 'description' => 'Promo banners, sale announcements, and event flyers.', 'icon' => 'Megaphone', 'sortOrder' => 3],
            ['name' => 'Stickers & Badges', 'slug' => 'stickers-badges', 'description' => 'Transparent cutout PNG stickers, labels, and badges.', 'icon' => 'Sticker', 'sortOrder' => 4],
            ['name' => 'Presentations', 'slug' => 'presentations', 'description' => '16:9 slide decks, title cards, and pitch graphics.', 'icon' => 'Presentation', 'sortOrder' => 5],
            ['name' => 'E-Commerce', 'slug' => 'e-commerce', 'description' => 'Product hero cards, discount badges, and store banners.', 'icon' => 'ShoppingBag', 'sortOrder' => 6],
        ];

        foreach ($cats as $cat) {
            EditorTemplateCategory::updateOrCreate(
                ['slug' => $cat['slug']],
                array_merge($cat, ['isActive' => true])
            );
        }
    }

    public static function seedPresets(): void
    {
        $presets = [
            ['name' => 'Square Canvas', 'groupName' => 'Social', 'width' => 1080, 'height' => 1080, 'icon' => 'Square', 'sortOrder' => 1],
            ['name' => 'Instagram Story / Reel', 'groupName' => 'Social', 'width' => 1080, 'height' => 1920, 'icon' => 'Smartphone', 'sortOrder' => 2],
            ['name' => 'Instagram Portrait', 'groupName' => 'Social', 'width' => 1080, 'height' => 1350, 'icon' => 'RectangleVertical', 'sortOrder' => 3],
            ['name' => 'YouTube Thumbnail', 'groupName' => 'Video', 'width' => 1280, 'height' => 720, 'icon' => 'Play', 'sortOrder' => 4],
            ['name' => 'Full HD Slide (16:9)', 'groupName' => 'Presentation', 'width' => 1920, 'height' => 1080, 'icon' => 'Monitor', 'sortOrder' => 5],
            ['name' => 'X / Twitter Header', 'groupName' => 'Social', 'width' => 1500, 'height' => 500, 'icon' => 'Image', 'sortOrder' => 6],
            ['name' => 'Facebook / OG Banner', 'groupName' => 'Web', 'width' => 1200, 'height' => 630, 'icon' => 'Globe', 'sortOrder' => 7],
            ['name' => 'Pinterest Pin', 'groupName' => 'Social', 'width' => 1000, 'height' => 1500, 'icon' => 'Pin', 'sortOrder' => 8],
            ['name' => 'Poster / Flyer', 'groupName' => 'Print', 'width' => 1414, 'height' => 2000, 'icon' => 'FileText', 'sortOrder' => 9],
            ['name' => 'Sticker / Icon HD', 'groupName' => 'Print', 'width' => 1024, 'height' => 1024, 'icon' => 'Sticker', 'sortOrder' => 10],
        ];

        foreach ($presets as $p) {
            EditorCanvasPreset::create(array_merge($p, ['isActive' => true]));
        }
    }

    public static function seedFonts(): void
    {
        $fonts = [
            ['family' => 'Inter', 'source' => 'google', 'weights' => ['400', '500', '600', '700', '800'], 'sortOrder' => 1],
            ['family' => 'Plus Jakarta Sans', 'source' => 'google', 'weights' => ['500', '700', '800'], 'sortOrder' => 2],
            ['family' => 'Poppins', 'source' => 'google', 'weights' => ['400', '600', '700', '800'], 'sortOrder' => 3],
            ['family' => 'Montserrat', 'source' => 'google', 'weights' => ['500', '700', '900'], 'sortOrder' => 4],
            ['family' => 'Bebas Neue', 'source' => 'google', 'weights' => ['400'], 'sortOrder' => 5],
            ['family' => 'Playfair Display', 'source' => 'google', 'weights' => ['600', '700', '800'], 'sortOrder' => 6],
            ['family' => 'Oswald', 'source' => 'google', 'weights' => ['500', '700'], 'sortOrder' => 7],
            ['family' => 'Pacifico', 'source' => 'google', 'weights' => ['400'], 'sortOrder' => 8],
            ['family' => 'Space Grotesk', 'source' => 'google', 'weights' => ['500', '700'], 'sortOrder' => 9],
            ['family' => 'JetBrains Mono', 'source' => 'google', 'weights' => ['400', '700'], 'sortOrder' => 10],
        ];

        foreach ($fonts as $f) {
            $encodedFamily = str_replace(' ', '+', $f['family']);
            $weightsStr = implode(';', $f['weights']);
            $url = "https://fonts.googleapis.com/css2?family={$encodedFamily}:wght@{$weightsStr}&display=swap";
            EditorFont::create([
                'family' => $f['family'],
                'source' => 'google',
                'weights' => $f['weights'],
                'googleImportUrl' => $url,
                'isActive' => true,
                'sortOrder' => $f['sortOrder'],
            ]);
        }
    }

    private static function makeSvgThumb(string $bg, string $accent, string $title, string $subtitle, int $w, int $h): string
    {
        $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        $s = htmlspecialchars($subtitle, ENT_QUOTES, 'UTF-8');
        $dim = "{$w}×{$h}";
        $svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='400' height='300'>"
            . "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='{$bg}'/><stop offset='100%' stop-color='{$accent}'/></linearGradient></defs>"
            . "<rect width='400' height='300' rx='18' fill='url(#g)'/>"
            . "<circle cx='330' cy='58' r='52' fill='rgba(255,255,255,0.14)'/>"
            . "<circle cx='70' cy='250' r='70' fill='rgba(255,255,255,0.10)'/>"
            . "<rect x='30' y='34' width='86' height='24' rx='12' fill='rgba(255,255,255,0.22)'/>"
            . "<text x='73' y='50' text-anchor='middle' font-family='sans-serif' font-size='11' font-weight='700' fill='#ffffff'>{$dim}</text>"
            . "<text x='32' y='152' font-family='sans-serif' font-size='26' font-weight='800' fill='#ffffff'>{$t}</text>"
            . "<text x='32' y='184' font-family='sans-serif' font-size='14' font-weight='600' fill='rgba(255,255,255,0.85)'>{$s}</text>"
            . "</svg>";
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    public static function seedStarterTemplates(): void
    {
        $cats = EditorTemplateCategory::all()->keyBy('slug');

        $templates = [
            [
                'title' => 'Flash Sale Promo Square',
                'slug' => 'flash-sale-promo-square',
                'description' => 'High-contrast gradient social promo card ready for transparent PNG product cutouts.',
                'categoryId' => $cats->get('social-media')?->id,
                'width' => 1080,
                'height' => 1080,
                'presetLabel' => 'Square Canvas',
                'isFeatured' => true,
                'tags' => ['sale', 'promo', 'instagram', 'square'],
                'thumbnailPath' => self::makeSvgThumb('#1d4ed8', '#7c3aed', 'BIG FLASH SALE', 'DROP YOUR PNG HERE', 1080, 1080),
                'pagesJson' => [[
                    'id' => 'page-1',
                    'name' => 'Promo Front',
                    'width' => 1080,
                    'height' => 1080,
                    'background' => '#0f172a',
                    'fabricJson' => [
                        'version' => '6.0.0',
                        'background' => '#0f172a',
                        'objects' => [
                            [
                                'type' => 'Circle',
                                'left' => 680,
                                'top' => -140,
                                'radius' => 300,
                                'fill' => '#3b82f6',
                                'opacity' => 0.28,
                                'layerId' => 'l-bg-orb-1',
                                'layerName' => 'Accent Glow Orb',
                            ],
                            [
                                'type' => 'Rect',
                                'left' => 90,
                                'top' => 96,
                                'width' => 270,
                                'height' => 62,
                                'rx' => 31,
                                'ry' => 31,
                                'fill' => '#f59e0b',
                                'layerId' => 'l-badge-pill',
                                'layerName' => 'Limited Tag Pill',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 116,
                                'top' => 112,
                                'width' => 220,
                                'text' => 'LIMITED OFFER',
                                'fontSize' => 24,
                                'fontFamily' => 'Montserrat',
                                'fontWeight' => '800',
                                'fill' => '#0f172a',
                                'textAlign' => 'center',
                                'layerId' => 'l-badge-text',
                                'layerName' => 'Badge Copy',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 90,
                                'top' => 200,
                                'width' => 900,
                                'text' => "UP TO 50% OFF\nPNG STUDIO",
                                'fontSize' => 112,
                                'fontFamily' => 'Bebas Neue',
                                'fontWeight' => '700',
                                'fill' => '#ffffff',
                                'lineHeight' => 1.0,
                                'layerId' => 'l-headline',
                                'layerName' => 'Main Headline',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 90,
                                'top' => 455,
                                'width' => 760,
                                'text' => 'Search any transparent PNG on the left rail and drop it right here.',
                                'fontSize' => 34,
                                'fontFamily' => 'Inter',
                                'fontWeight' => '500',
                                'fill' => '#94a3b8',
                                'layerId' => 'l-sub',
                                'layerName' => 'Subtitle Copy',
                            ],
                            [
                                'type' => 'Rect',
                                'left' => 90,
                                'top' => 915,
                                'width' => 340,
                                'height' => 78,
                                'rx' => 18,
                                'ry' => 18,
                                'fill' => '#2563eb',
                                'layerId' => 'l-cta-btn',
                                'layerName' => 'CTA Button Shape',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 110,
                                'top' => 936,
                                'width' => 300,
                                'text' => 'SHOP NOW →',
                                'fontSize' => 30,
                                'fontFamily' => 'Poppins',
                                'fontWeight' => '700',
                                'fill' => '#ffffff',
                                'textAlign' => 'center',
                                'layerId' => 'l-cta-text',
                                'layerName' => 'CTA Text',
                            ],
                        ],
                    ],
                ]],
            ],
            [
                'title' => 'Bold YouTube Click Thumbnail',
                'slug' => 'bold-youtube-click-thumbnail',
                'description' => '1280×720 gaming/creator thumbnail layout with punchy impact typography.',
                'categoryId' => $cats->get('youtube-streaming')?->id,
                'width' => 1280,
                'height' => 720,
                'presetLabel' => 'YouTube Thumbnail',
                'isFeatured' => true,
                'tags' => ['youtube', 'thumbnail', 'creator', 'video'],
                'thumbnailPath' => self::makeSvgThumb('#dc2626', '#f97316', 'HOW TO DESIGN', 'YOUTUBE 1280×720', 1280, 720),
                'pagesJson' => [[
                    'id' => 'page-1',
                    'name' => 'Thumbnail',
                    'width' => 1280,
                    'height' => 720,
                    'background' => '#18181b',
                    'fabricJson' => [
                        'version' => '6.0.0',
                        'background' => '#18181b',
                        'objects' => [
                            [
                                'type' => 'Rect',
                                'left' => -40,
                                'top' => 320,
                                'width' => 720,
                                'height' => 190,
                                'angle' => -4,
                                'rx' => 24,
                                'ry' => 24,
                                'fill' => '#ef4444',
                                'layerId' => 'l-yt-banner',
                                'layerName' => 'Red Impact Ribbon',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 64,
                                'top' => 95,
                                'width' => 740,
                                'text' => 'NEXT-LEVEL',
                                'fontSize' => 128,
                                'fontFamily' => 'Bebas Neue',
                                'fontWeight' => '800',
                                'fill' => '#ffffff',
                                'layerId' => 'l-yt-title1',
                                'layerName' => 'Top Headline',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 64,
                                'top' => 335,
                                'width' => 640,
                                'text' => 'PNG ASSETS',
                                'fontSize' => 116,
                                'fontFamily' => 'Bebas Neue',
                                'fontWeight' => '800',
                                'fill' => '#fef08a',
                                'angle' => -4,
                                'layerId' => 'l-yt-title2',
                                'layerName' => 'Highlight Headline',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 64,
                                'top' => 560,
                                'width' => 640,
                                'text' => 'ADD CHARACTER OR PRODUCT PNG ON RIGHT →',
                                'fontSize' => 28,
                                'fontFamily' => 'Inter',
                                'fontWeight' => '700',
                                'fill' => '#e4e4e7',
                                'layerId' => 'l-yt-hint',
                                'layerName' => 'Placement Cue',
                            ],
                        ],
                    ],
                ]],
            ],
            [
                'title' => 'Minimal Product Spotlight Card',
                'slug' => 'minimal-product-spotlight-card',
                'description' => 'Clean bright showcase card ideal for e-commerce mockups and social feeds.',
                'categoryId' => $cats->get('e-commerce')?->id,
                'width' => 1080,
                'height' => 1350,
                'presetLabel' => 'Instagram Portrait',
                'isFeatured' => true,
                'tags' => ['ecommerce', 'product', 'minimal', 'card'],
                'thumbnailPath' => self::makeSvgThumb('#0f766e', '#0ea5e9', 'NEW ARRIVAL', 'CLEAN PRODUCT CARD', 1080, 1350),
                'pagesJson' => [[
                    'id' => 'page-1',
                    'name' => 'Showcase',
                    'width' => 1080,
                    'height' => 1350,
                    'background' => '#f8fafc',
                    'fabricJson' => [
                        'version' => '6.0.0',
                        'background' => '#f8fafc',
                        'objects' => [
                            [
                                'type' => 'Circle',
                                'left' => 210,
                                'top' => 280,
                                'radius' => 330,
                                'fill' => '#e0f2fe',
                                'layerId' => 'l-prod-circle',
                                'layerName' => 'Product Stage Circle',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 90,
                                'top' => 92,
                                'width' => 900,
                                'text' => 'CURATED COLLECTION · 2026',
                                'fontSize' => 26,
                                'fontFamily' => 'Space Grotesk',
                                'fontWeight' => '700',
                                'fill' => '#0284c7',
                                'textAlign' => 'center',
                                'layerId' => 'l-prod-kicker',
                                'layerName' => 'Collection Kicker',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 90,
                                'top' => 1020,
                                'width' => 900,
                                'text' => 'Minimal Studio Showcase',
                                'fontSize' => 64,
                                'fontFamily' => 'Playfair Display',
                                'fontWeight' => '700',
                                'fill' => '#0f172a',
                                'textAlign' => 'center',
                                'layerId' => 'l-prod-head',
                                'layerName' => 'Headline',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 150,
                                'top' => 1135,
                                'width' => 780,
                                'text' => 'Place your cutout PNG inside the soft stage circle above and customize colors.',
                                'fontSize' => 30,
                                'fontFamily' => 'Inter',
                                'fontWeight' => '400',
                                'fill' => '#475569',
                                'textAlign' => 'center',
                                'layerId' => 'l-prod-desc',
                                'layerName' => 'Description',
                            ],
                        ],
                    ],
                ]],
            ],
            [
                'title' => 'Transparent Die-Cut Sticker Pack',
                'slug' => 'transparent-die-cut-sticker-pack',
                'description' => 'Transparent canvas starter tailored for die-cut PNG stickers with crisp outlines.',
                'categoryId' => $cats->get('stickers-badges')?->id,
                'width' => 1024,
                'height' => 1024,
                'presetLabel' => 'Sticker / Icon HD',
                'isFeatured' => false,
                'tags' => ['sticker', 'transparent', 'badge', 'png'],
                'thumbnailPath' => self::makeSvgThumb('#4f46e5', '#ec4899', 'DIE-CUT STICKER', 'TRANSPARENT CANVAS', 1024, 1024),
                'pagesJson' => [[
                    'id' => 'page-1',
                    'name' => 'Sticker Artboard',
                    'width' => 1024,
                    'height' => 1024,
                    'background' => null,
                    'fabricJson' => [
                        'version' => '6.0.0',
                        'objects' => [
                            [
                                'type' => 'Circle',
                                'left' => 112,
                                'top' => 112,
                                'radius' => 400,
                                'fill' => '#6366f1',
                                'stroke' => '#ffffff',
                                'strokeWidth' => 28,
                                'layerId' => 'l-stk-badge',
                                'layerName' => 'Sticker Base Circle',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 180,
                                'top' => 430,
                                'width' => 664,
                                'text' => '100% ORIGINAL',
                                'fontSize' => 86,
                                'fontFamily' => 'Montserrat',
                                'fontWeight' => '900',
                                'fill' => '#ffffff',
                                'textAlign' => 'center',
                                'layerId' => 'l-stk-txt',
                                'layerName' => 'Sticker Label',
                            ],
                        ],
                    ],
                ]],
            ],
            [
                'title' => 'Story Announcement Vertical',
                'slug' => 'story-announcement-vertical',
                'description' => 'Multi-slide 1080×1920 vertical story deck with intro & call-to-action pages.',
                'categoryId' => $cats->get('social-media')?->id,
                'width' => 1080,
                'height' => 1920,
                'presetLabel' => 'Instagram Story / Reel',
                'isFeatured' => false,
                'tags' => ['story', 'reel', 'vertical', 'multipage'],
                'thumbnailPath' => self::makeSvgThumb('#7c3aed', '#2563eb', 'STORY DECK', '2-PAGE VERTICAL', 1080, 1920),
                'pagesJson' => [
                    [
                        'id' => 'page-1',
                        'name' => 'Story Cover',
                        'width' => 1080,
                        'height' => 1920,
                        'background' => '#1e1b4b',
                        'fabricJson' => [
                            'version' => '6.0.0',
                            'background' => '#1e1b4b',
                            'objects' => [
                                [
                                    'type' => 'Textbox',
                                    'left' => 90,
                                    'top' => 280,
                                    'width' => 900,
                                    'text' => "FRESH DROP\nTHIS WEEKEND",
                                    'fontSize' => 112,
                                    'fontFamily' => 'Plus Jakarta Sans',
                                    'fontWeight' => '800',
                                    'fill' => '#ffffff',
                                    'layerId' => 'l-st-h1',
                                    'layerName' => 'Cover Title',
                                ],
                                [
                                    'type' => 'Rect',
                                    'left' => 90,
                                    'top' => 1520,
                                    'width' => 900,
                                    'height' => 110,
                                    'rx' => 55,
                                    'ry' => 55,
                                    'fill' => '#a855f7',
                                    'layerId' => 'l-st-pill',
                                    'layerName' => 'Swipe Up Pill',
                                ],
                                [
                                    'type' => 'Textbox',
                                    'left' => 90,
                                    'top' => 1552,
                                    'width' => 900,
                                    'text' => 'TAP LINK TO EXPLORE ↑',
                                    'fontSize' => 36,
                                    'fontFamily' => 'Inter',
                                    'fontWeight' => '700',
                                    'fill' => '#ffffff',
                                    'textAlign' => 'center',
                                    'layerId' => 'l-st-cta',
                                    'layerName' => 'Cover CTA',
                                ],
                            ],
                        ],
                    ],
                    [
                        'id' => 'page-2',
                        'name' => 'Details Slide',
                        'width' => 1080,
                        'height' => 1920,
                        'background' => '#0f172a',
                        'fabricJson' => [
                            'version' => '6.0.0',
                            'background' => '#0f172a',
                            'objects' => [
                                [
                                    'type' => 'Textbox',
                                    'left' => 90,
                                    'top' => 240,
                                    'width' => 900,
                                    'text' => '02 · KEY HIGHLIGHTS',
                                    'fontSize' => 42,
                                    'fontFamily' => 'Space Grotesk',
                                    'fontWeight' => '700',
                                    'fill' => '#38bdf8',
                                    'layerId' => 'l-st2-kicker',
                                    'layerName' => 'Slide Kicker',
                                ],
                                [
                                    'type' => 'Textbox',
                                    'left' => 90,
                                    'top' => 340,
                                    'width' => 900,
                                    'text' => 'Customize every slide or export all pages as one ZIP.',
                                    'fontSize' => 76,
                                    'fontFamily' => 'Plus Jakarta Sans',
                                    'fontWeight' => '800',
                                    'fill' => '#ffffff',
                                    'layerId' => 'l-st2-body',
                                    'layerName' => 'Slide Headline',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Widescreen Pitch Deck Title',
                'slug' => 'widescreen-pitch-deck-title',
                'description' => '1920×1080 modern presentation cover with crisp typographic hierarchy.',
                'categoryId' => $cats->get('presentations')?->id,
                'width' => 1920,
                'height' => 1080,
                'presetLabel' => 'Full HD Slide (16:9)',
                'isFeatured' => false,
                'tags' => ['presentation', 'slide', '16:9', 'pitch'],
                'thumbnailPath' => self::makeSvgThumb('#0284c7', '#1e40af', 'CREATIVE DECK', 'WIDESCREEN 16:9', 1920, 1080),
                'pagesJson' => [[
                    'id' => 'page-1',
                    'name' => 'Title Slide',
                    'width' => 1920,
                    'height' => 1080,
                    'background' => '#0b1120',
                    'fabricJson' => [
                        'version' => '6.0.0',
                        'background' => '#0b1120',
                        'objects' => [
                            [
                                'type' => 'Rect',
                                'left' => 140,
                                'top' => 180,
                                'width' => 140,
                                'height' => 12,
                                'rx' => 6,
                                'ry' => 6,
                                'fill' => '#38bdf8',
                                'layerId' => 'l-deck-rule',
                                'layerName' => 'Accent Bar',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 140,
                                'top' => 240,
                                'width' => 1360,
                                'text' => "Visual Design\nMade Effortless",
                                'fontSize' => 132,
                                'fontFamily' => 'Plus Jakarta Sans',
                                'fontWeight' => '800',
                                'fill' => '#ffffff',
                                'lineHeight' => 1.05,
                                'layerId' => 'l-deck-title',
                                'layerName' => 'Slide Title',
                            ],
                            [
                                'type' => 'Textbox',
                                'left' => 140,
                                'top' => 610,
                                'width' => 1120,
                                'text' => 'Combine transparent PNG illustrations, photography frames, and vector brand assets in seconds.',
                                'fontSize' => 42,
                                'fontFamily' => 'Inter',
                                'fontWeight' => '400',
                                'fill' => '#94a3b8',
                                'layerId' => 'l-deck-sub',
                                'layerName' => 'Slide Subtitle',
                            ],
                        ],
                    ],
                ]],
            ],
        ];

        foreach ($templates as $tpl) {
            EditorTemplate::create([
                'title' => $tpl['title'],
                'slug' => Str::slug($tpl['slug']),
                'description' => $tpl['description'],
                'categoryId' => $tpl['categoryId'],
                'width' => $tpl['width'],
                'height' => $tpl['height'],
                'presetLabel' => $tpl['presetLabel'],
                'pagesJson' => $tpl['pagesJson'],
                'thumbnailPath' => $tpl['thumbnailPath'],
                'tags' => $tpl['tags'],
                'isFeatured' => $tpl['isFeatured'],
                'status' => 'published',
                'usageCount' => 0,
                'createdBy' => 'System Starter',
            ]);
        }
    }
}
