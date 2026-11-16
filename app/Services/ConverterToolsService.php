<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\ToolUsageLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ConverterToolsService
{
    public const SETTING_KEY = 'bonus_converter_tools_v1';

    /**
     * Toggle groups managed in Admin -> Tools.
     * Bidirectional extension pairs share one `key` so a single switch toggles both SEO pages.
     */
    public static function getGroupCatalog(): array
    {
        return [
            [
                'key' => 'png-webp',
                'label' => 'PNG ⇄ WebP',
                'isPair' => true,
                'category' => 'converters',
                'description' => 'Bidirectional lossless-capable PNG to WebP and WebP to PNG conversion with transparency.',
                'slugs' => ['png-to-webp', 'webp-to-png'],
            ],
            [
                'key' => 'jpg-webp',
                'label' => 'JPG ⇄ WebP',
                'isPair' => true,
                'category' => 'converters',
                'description' => 'Bidirectional JPG to WebP compression and WebP to universal JPG conversion.',
                'slugs' => ['jpg-to-webp', 'webp-to-jpg'],
            ],
            [
                'key' => 'png-jpg',
                'label' => 'PNG ⇄ JPG',
                'isPair' => true,
                'category' => 'converters',
                'description' => 'Bidirectional PNG to JPG (with custom background fill) and JPG to PNG conversion.',
                'slugs' => ['png-to-jpg', 'jpg-to-png'],
            ],
            [
                'key' => 'png-avif',
                'label' => 'PNG ⇄ AVIF',
                'isPair' => true,
                'category' => 'converters',
                'description' => 'Next-gen AVIF encoding from PNG and lossless AVIF to PNG extraction.',
                'slugs' => ['png-to-avif', 'avif-to-png'],
            ],
            [
                'key' => 'jpg-avif',
                'label' => 'JPG ⇄ AVIF',
                'isPair' => true,
                'category' => 'converters',
                'description' => 'Ultra-compact JPG to AVIF conversion and AVIF to universal JPG decoding.',
                'slugs' => ['jpg-to-avif', 'avif-to-jpg'],
            ],
            [
                'key' => 'svg-png',
                'label' => 'SVG → PNG',
                'isPair' => false,
                'category' => 'converters',
                'description' => 'Render crisp high-DPI transparent PNGs from vector SVG files at 1x–4x resolution.',
                'slugs' => ['svg-to-png'],
            ],
            [
                'key' => 'png-ico',
                'label' => 'PNG → ICO Favicon',
                'isPair' => false,
                'category' => 'converters',
                'description' => 'Bundle multi-resolution 16px, 32px, 48px, and 256px frames into a Windows/web .ico file.',
                'slugs' => ['png-to-ico'],
            ],
            [
                'key' => 'image-compressor',
                'label' => 'Compress Image',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Shrink PNG, JPG, and WebP file sizes in-browser with live byte savings comparison.',
                'slugs' => ['image-compressor'],
            ],
            [
                'key' => 'image-resizer',
                'label' => 'Resize Image',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Resize PNG, JPG, and WebP images by exact pixel dimensions and fit mode.',
                'slugs' => ['image-resizer'],
            ],
            [
                'key' => 'remove-background',
                'label' => 'Remove Background',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Turn solid white, dark, or colored backgrounds transparent with eyedropper & edge smoothing.',
                'slugs' => ['remove-background'],
            ],
            [
                'key' => 'favicon-maker',
                'label' => 'ICO Favicon Maker',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Build multi-size .ico files plus Apple/Android PNG icons, site.webmanifest & HTML tags from any image.',
                'slugs' => ['favicon-maker'],
            ],
            [
                'key' => 'app-icon-generator',
                'label' => 'App Icon Pack Generator',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Export full iOS, Android mipmap, and PWA icon ZIP bundles from one square logo.',
                'slugs' => ['app-icon-generator'],
            ],
            [
                'key' => 'round-image-corners',
                'label' => 'Round Corners & Circle Crop',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Create circular avatars or rounded-corner transparent PNGs with optional border rings.',
                'slugs' => ['round-image-corners'],
            ],
            [
                'key' => 'watermark-images',
                'label' => 'Batch Logo Watermark',
                'isPair' => false,
                'category' => 'utilities',
                'description' => 'Stamp a transparent PNG logo or tiled watermark across batch images.',
                'slugs' => ['watermark-images'],
            ],
            [
                'key' => 'image-to-base64',
                'label' => 'Image ⇄ Base64 / Data URI',
                'isPair' => false,
                'category' => 'developer',
                'description' => 'Encode images into Base64, Data URI, CSS url(), and HTML snippets or decode Base64 back to image.',
                'slugs' => ['image-to-base64'],
            ],
            [
                'key' => 'svg-optimizer',
                'label' => 'SVG Cleaner & JSX',
                'isPair' => false,
                'category' => 'developer',
                'description' => 'Strip Figma/Illustrator SVG bloat, inspect byte savings, and convert SVG into clean React JSX.',
                'slugs' => ['svg-optimizer'],
            ],
            [
                'key' => 'image-color-palette',
                'label' => 'Color Palette Extractor',
                'isPair' => false,
                'category' => 'developer',
                'description' => 'Extract dominant colors as HEX, RGB, HSL, CSS variables, Tailwind config & WCAG contrast checks.',
                'slugs' => ['image-color-palette'],
            ],
            [
                'key' => 'image-metadata-remover',
                'label' => 'EXIF & Metadata Remover',
                'isPair' => false,
                'category' => 'developer',
                'description' => 'Inspect camera/GPS/EXIF tags and download clean privacy-safe images stripped of metadata.',
                'slugs' => ['image-metadata-remover'],
            ],
        ];
    }

    /**
     * Build the canonical public URL for a tool based on its category.
     */
    public static function getToolUrl(string $slug, ?string $category = null): string
    {
        if ($category === null) {
            $all = self::getAllToolDefinitions();
            $category = $all[$slug]['category'] ?? 'utilities';
        }

        return $category === 'converters'
            ? '/tools/convert/' . $slug
            : '/tools/' . $slug;
    }

    /**
     * Dedicated SEO-optimized pages (all processing happens privately client-side in the browser).
     */
    public static function getAllToolDefinitions(): array
    {
        return [
            'png-to-webp' => [
                'slug' => 'png-to-webp',
                'pairKey' => 'png-webp',
                'reverseSlug' => 'webp-to-png',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'PNG',
                'toFormat' => 'WebP',
                'accept' => 'image/png,.png',
                'targetMime' => 'image/webp',
                'targetExt' => 'webp',
                'supportsTransparency' => true,
                'supportsQuality' => true,
                'defaultQuality' => 88,
                'shortTitle' => 'PNG to WebP',
                'title' => 'PNG to WebP Converter',
                'shortDesc' => 'Convert transparent PNGs into lightweight WebP images without losing crisp edges.',
                'seoTitle' => 'PNG to WebP Converter Free Online — Keep Transparency',
                'seoDescription' => 'Convert PNG to WebP online in seconds directly in your browser. Preserve full alpha transparency and cut image size by up to 70% with zero server uploads.',
                'howToSteps' => [
                    'Drop one or more PNG files into the converter workspace.',
                    'Let the browser convert your PNGs automatically while keeping your original pixel dimensions and alpha transparency.',
                    'Download each WebP image individually or save the entire batch as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Universal lossless editing standard with crisp alpha transparency, ideal as a master design file.',
                    'targetPros' => '25%–70% smaller payloads with full alpha channel support and faster Core Web Vitals on websites.',
                ],
                'faqs' => [
                    ['q' => 'Does PNG to WebP keep transparent backgrounds?', 'a' => 'Yes. WebP natively supports 8-bit alpha transparency, so cutouts, logos, and icons remain cleanly transparent.'],
                    ['q' => 'Are my PNG files uploaded to a server?', 'a' => 'No. Conversion runs 100% locally inside your browser using the Canvas API, keeping private assets on your device.'],
                    ['q' => 'Does PNG to WebP preserve my original image dimensions?', 'a' => 'Yes. All format converters preserve the exact width and height of the uploaded PNG by default. If you need custom dimensions, use our Resize Image utility.'],
                    ['q' => 'Can I convert multiple PNG files at once?', 'a' => 'Yes. Drop a batch of PNGs and export them individually or in one ZIP archive.'],
                    ['q' => 'Why should I convert PNG to WebP for websites?', 'a' => 'WebP typically reduces transparent graphic file sizes compared to PNG while maintaining crisp edges, improving Core Web Vitals and page load speed.'],
                ],
                'relatedSlugs' => ['webp-to-png', 'jpg-to-webp', 'image-compressor', 'png-to-avif'],
            ],
            'webp-to-png' => [
                'slug' => 'webp-to-png',
                'pairKey' => 'png-webp',
                'reverseSlug' => 'png-to-webp',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'WebP',
                'toFormat' => 'PNG',
                'accept' => 'image/webp,.webp',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'WebP to PNG',
                'title' => 'WebP to PNG Converter',
                'shortDesc' => 'Turn WebP files into universally compatible lossless PNGs with transparent pixels intact.',
                'seoTitle' => 'WebP to PNG Converter Online — Lossless & Transparent',
                'seoDescription' => 'Convert WebP images to lossless PNG instantly in your browser. Ideal for Photoshop, Canva, Office apps, and design workflows while keeping transparency.',
                'howToSteps' => [
                    'Select or drag your WebP files into the dropzone.',
                    'Wait a moment as your WebP files convert locally at lossless quality and original dimensions.',
                    'Click Download PNG or Download All (.zip) immediately.',
                ],
                'comparison' => [
                    'sourcePros' => 'Tiny web-first format great for websites, though some desktop editors and legacy apps still reject .webp uploads.',
                    'targetPros' => 'Lossless PNG compatibility across every design suite, CMS, presentation deck, and print workflow.',
                ],
                'faqs' => [
                    ['q' => 'Why convert WebP back to PNG?', 'a' => 'Many desktop editors, older Word or PowerPoint versions, and print/marketplace workflows accept PNG reliably while rejecting .webp files.'],
                    ['q' => 'Is WebP to PNG lossless?', 'a' => 'Yes, exported PNG pixels are encoded losslessly with full alpha transparency and original dimensions preserved.'],
                    ['q' => 'Does WebP to PNG work with animated or transparent WebP images?', 'a' => 'Static transparent WebP images keep their full transparent background cleanly. Animated WebP files export their first frame as a crisp PNG.'],
                    ['q' => 'Can I batch convert a folder of WebP files to PNG?', 'a' => 'Yes. Select or drag multiple WebP files at once and download all converted PNGs bundled inside a single ZIP file.'],
                    ['q' => 'Are my WebP images uploaded to any cloud server?', 'a' => 'No. Everything converts privately in browser memory without sending images over the network.'],
                ],
                'relatedSlugs' => ['png-to-webp', 'webp-to-jpg', 'remove-background', 'image-resizer'],
            ],
            'jpg-to-webp' => [
                'slug' => 'jpg-to-webp',
                'pairKey' => 'jpg-webp',
                'reverseSlug' => 'webp-to-jpg',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'JPG',
                'toFormat' => 'WebP',
                'accept' => 'image/jpeg,.jpg,.jpeg',
                'targetMime' => 'image/webp',
                'targetExt' => 'webp',
                'supportsTransparency' => false,
                'supportsQuality' => true,
                'defaultQuality' => 84,
                'shortTitle' => 'JPG to WebP',
                'title' => 'JPG to WebP Converter',
                'shortDesc' => 'Shrink JPG photos into fast-loading WebP assets for better PageSpeed and SEO scores.',
                'seoTitle' => 'JPG to WebP Converter Online — Boost Web Speed Free',
                'seoDescription' => 'Convert JPG and JPEG photos to modern WebP format directly in your browser. Cut page weight and improve Core Web Vitals with batch export.',
                'howToSteps' => [
                    'Upload one or multiple JPG / JPEG photos.',
                    'Wait a moment while each photo converts locally at default high quality and original size.',
                    'Inspect byte savings and download individually or as a ZIP pack.',
                ],
                'comparison' => [
                    'sourcePros' => 'Decades-old camera standard supported everywhere, but produces larger web downloads.',
                    'targetPros' => 'Superior predictive coding reduces photo weight roughly 25%–35% smaller than equivalent JPGs.',
                ],
                'faqs' => [
                    ['q' => 'How much smaller is WebP compared to JPG?', 'a' => 'WebP commonly saves 25%–40% in file size compared to standard JPEG images while preserving crisp visual detail.'],
                    ['q' => 'Will converting JPG to WebP change my image resolution?', 'a' => 'No. The converter keeps your uploaded width and height intact so layouts and aspect ratios never shift.'],
                    ['q' => 'Can I customize compression strength further?', 'a' => 'This converter uses a balanced default quality for fast results. If you want fine-grained quality sliders, try our Image Compressor tool.'],
                    ['q' => 'Does batch JPG to WebP work on mobile?', 'a' => 'Yes, everything runs cleanly in Chrome, Safari, Firefox, and Edge on mobile, tablet, and desktop.'],
                    ['q' => 'Do WebP images help SEO and Lighthouse scores?', 'a' => 'Yes. Serving next-gen WebP assets lowers image payload and Largest Contentful Paint (LCP) times on Google PageSpeed Insights.'],
                ],
                'relatedSlugs' => ['webp-to-jpg', 'png-to-webp', 'jpg-to-avif', 'image-compressor'],
            ],
            'webp-to-jpg' => [
                'slug' => 'webp-to-jpg',
                'pairKey' => 'jpg-webp',
                'reverseSlug' => 'jpg-to-webp',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'WebP',
                'toFormat' => 'JPG',
                'accept' => 'image/webp,.webp',
                'targetMime' => 'image/jpeg',
                'targetExt' => 'jpg',
                'supportsTransparency' => false,
                'supportsQuality' => true,
                'defaultQuality' => 90,
                'shortTitle' => 'WebP to JPG',
                'title' => 'WebP to JPG Converter',
                'shortDesc' => 'Convert WebP images into universal JPGs with customizable matte background color.',
                'seoTitle' => 'WebP to JPG Converter Online — Fast & Private',
                'seoDescription' => 'Convert WebP to standard JPG/JPEG right in your browser with custom quality and background fill controls. No uploads or signups required.',
                'howToSteps' => [
                    'Drop your WebP files into the upload area.',
                    'The converter automatically renders your WebP into standard JPG at original dimensions (with a clean white fill behind any transparent areas).',
                    'Download your universal JPG images individually or as a ZIP archive.',
                ],
                'comparison' => [
                    'sourcePros' => 'Compact web delivery format.',
                    'targetPros' => '100% universal compatibility for email attachments, forms, print kiosks, and social uploads.',
                ],
                'faqs' => [
                    ['q' => 'What happens if my WebP has a transparent background?', 'a' => 'Since JPG does not support transparency, the converter automatically composites transparent regions onto a clean solid white background.'],
                    ['q' => 'Why convert WebP to JPG?', 'a' => 'JPG works everywhere—email clients, legacy CMS platforms, photo printers, social forms, and Windows/macOS viewers that still stumble on .webp files.'],
                    ['q' => 'Are image dimensions preserved during conversion?', 'a' => 'Yes, every converted JPG matches the original WebP width and height pixel-for-pixel.'],
                    ['q' => 'Can I convert dozens of WebP images together?', 'a' => 'Yes. Drop multiple files at once and grab all resulting JPGs in one ZIP download.'],
                    ['q' => 'Is my privacy protected when converting WebP to JPG?', 'a' => 'Completely. Your files are decoded and re-encoded inside your local browser tab and never touch our servers.'],
                ],
                'relatedSlugs' => ['jpg-to-webp', 'webp-to-png', 'png-to-jpg', 'image-resizer'],
            ],
            'png-to-jpg' => [
                'slug' => 'png-to-jpg',
                'pairKey' => 'png-jpg',
                'reverseSlug' => 'jpg-to-png',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'PNG',
                'toFormat' => 'JPG',
                'accept' => 'image/png,.png',
                'targetMime' => 'image/jpeg',
                'targetExt' => 'jpg',
                'supportsTransparency' => false,
                'supportsQuality' => true,
                'defaultQuality' => 90,
                'shortTitle' => 'PNG to JPG',
                'title' => 'PNG to JPG Converter',
                'shortDesc' => 'Flatten transparent PNGs cleanly onto white, black, or any custom background JPG.',
                'seoTitle' => 'PNG to JPG Converter Online — Custom Background Fill',
                'seoDescription' => 'Convert large PNG screenshots or transparent PNG assets into lightweight JPGs with white, dark, or custom hex background color directly in browser.',
                'howToSteps' => [
                    'Drop PNG files into the browser converter.',
                    'The converter automatically flattens transparent pixels onto a crisp white canvas and preserves original dimensions.',
                    'Download flattened JPG files one-by-one or as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Sharp lossless graphics and transparent cutouts, often heavy for photo-rich screenshots.',
                    'targetPros' => 'Dramatically smaller photographic uploads compatible with every form and portal.',
                ],
                'faqs' => [
                    ['q' => 'What happens to transparent areas when converting PNG to JPG?', 'a' => 'Because JPG does not support transparency, transparent pixels are cleanly filled with a crisp white background automatically.'],
                    ['q' => 'Will converting PNG to JPG make my file smaller?', 'a' => 'Yes. For detailed photos, screenshots, and gradients, JPG files are typically 50%–80% smaller than lossless PNGs.'],
                    ['q' => 'Does PNG to JPG change my image dimensions?', 'a' => 'No. Your converted JPG files retain the exact pixel width and height of the uploaded PNGs.'],
                    ['q' => 'Can I convert a batch of PNG screenshots to JPG?', 'a' => 'Yes. Drop multiple PNG files at once and export every JPG together in a single ZIP download.'],
                    ['q' => 'Are my images uploaded or stored on a server?', 'a' => 'Never. All PNG to JPG flattening runs locally inside your browser using the Canvas API.'],
                ],
                'relatedSlugs' => ['jpg-to-png', 'png-to-webp', 'image-compressor', 'remove-background'],
            ],
            'jpg-to-png' => [
                'slug' => 'jpg-to-png',
                'pairKey' => 'png-jpg',
                'reverseSlug' => 'png-to-jpg',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'JPG',
                'toFormat' => 'PNG',
                'accept' => 'image/jpeg,.jpg,.jpeg',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'JPG to PNG',
                'title' => 'JPG to PNG Converter',
                'shortDesc' => 'Convert JPG photos into clean lossless PNGs ready for editing or background removal.',
                'seoTitle' => 'JPG to PNG Converter Free Online — Lossless Export',
                'seoDescription' => 'Convert JPG and JPEG photos to lossless PNG instantly in your browser. Ideal preparation step for transparent cutouts, overlays, and UI design.',
                'howToSteps' => [
                    'Add one or more JPG/JPEG images into the dropzone.',
                    'Wait briefly while the browser encodes lossless PNG files at your original pixel dimensions.',
                    'Export lossless PNG files individually or as a ZIP archive.',
                ],
                'comparison' => [
                    'sourcePros' => 'Efficient lossy storage for photos.',
                    'targetPros' => 'Lossless pixel format that prevents repeated re-compression artifacts during editing and supports alpha channels.',
                ],
                'faqs' => [
                    ['q' => 'Does converting JPG to PNG automatically remove the background?', 'a' => 'JPG files do not store an alpha channel, so PNG preserves the full frame. To strip a solid background afterwards, use our Remove Background tool.'],
                    ['q' => 'Why is my exported PNG larger than the original JPG?', 'a' => 'JPG uses lossy compression while PNG uses lossless compression, so saving pixels without additional loss typically increases file size—ideal before editing or layering graphics.'],
                    ['q' => 'Does converting JPG to PNG restore lost JPEG compression quality?', 'a' => 'No tool can recreate discarded detail from an existing JPG, but saving as PNG prevents any further generation loss when re-saving or editing.'],
                    ['q' => 'Can I resize the converted PNG afterwards?', 'a' => 'Yes. All format converters preserve original uploaded dimensions by default; if you need custom pixel sizes, use our Resize Image utility.'],
                    ['q' => 'Is there a daily limit on how many JPGs I can convert?', 'a' => 'No. Everything converts locally on your computer with zero server limits or watermarks.'],
                ],
                'relatedSlugs' => ['png-to-jpg', 'remove-background', 'png-to-ico', 'image-resizer'],
            ],
            'png-to-avif' => [
                'slug' => 'png-to-avif',
                'pairKey' => 'png-avif',
                'reverseSlug' => 'avif-to-png',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'PNG',
                'toFormat' => 'AVIF',
                'accept' => 'image/png,.png',
                'targetMime' => 'image/avif',
                'targetExt' => 'avif',
                'supportsTransparency' => true,
                'supportsQuality' => true,
                'defaultQuality' => 75,
                'shortTitle' => 'PNG to AVIF',
                'title' => 'PNG to AVIF Converter',
                'shortDesc' => 'Encode next-gen ultra-small AVIF images from transparent PNGs right inside your browser.',
                'seoTitle' => 'PNG to AVIF Converter Online — Next-Gen Compression',
                'seoDescription' => 'Convert PNG to AVIF privately in your browser. Keep alpha transparency at dramatically smaller file sizes than WebP and PNG.',
                'howToSteps' => [
                    'Drop your PNG assets into the workspace.',
                    'Wait while your browser encodes each PNG to AVIF at default quality and original dimensions.',
                    'Convert & download AVIF files directly in-browser or as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Lossless universal format with larger byte size.',
                    'targetPros' => 'AV1-based modern compression delivering up to 50% smaller files than WebP while keeping alpha transparency.',
                ],
                'faqs' => [
                    ['q' => 'Which browsers support PNG to AVIF conversion locally?', 'a' => 'All modern browsers including Chrome, Firefox, Edge, and Safari convert PNG to AVIF locally in-browser using hardware or WebAssembly codecs with zero server uploads.'],
                    ['q' => 'Does AVIF keep transparent PNG backgrounds?', 'a' => 'Yes. AVIF supports alpha channels, preserving crisp transparent cutouts, icons, and overlays from your PNG files.'],
                    ['q' => 'Is AVIF smaller than WebP and PNG?', 'a' => 'In most web graphics and rich imagery, AVIF achieves noticeably smaller files than both PNG and WebP at similar perceptual quality.'],
                    ['q' => 'Will PNG to AVIF change the resolution of my graphics?', 'a' => 'No. Your exported AVIF assets retain the exact pixel dimensions of the original PNG upload.'],
                    ['q' => 'Are my assets sent to an external API for AVIF encoding?', 'a' => 'No. Encoding happens strictly inside your local browser session so private UI and brand files stay safe.'],
                ],
                'relatedSlugs' => ['avif-to-png', 'png-to-webp', 'jpg-to-avif', 'image-compressor'],
            ],
            'avif-to-png' => [
                'slug' => 'avif-to-png',
                'pairKey' => 'png-avif',
                'reverseSlug' => 'png-to-avif',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'AVIF',
                'toFormat' => 'PNG',
                'accept' => 'image/avif,.avif',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'AVIF to PNG',
                'title' => 'AVIF to PNG Converter',
                'shortDesc' => 'Decode AVIF images back into widely supported lossless transparent PNG files.',
                'seoTitle' => 'AVIF to PNG Converter Online — Keep Transparency',
                'seoDescription' => 'Convert AVIF images to lossless PNG effortlessly in your browser. Open and edit AVIF downloads in any editor while retaining alpha transparency.',
                'howToSteps' => [
                    'Upload your .avif files into the converter.',
                    'The browser decodes each AVIF frame automatically at full native resolution.',
                    'Download clean lossless PNG output individually or as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Compact next-gen web format.',
                    'targetPros' => 'Universally accepted by Figma, Photoshop, CMS dashboards, and office software.',
                ],
                'faqs' => [
                    ['q' => 'Does AVIF to PNG retain transparent pixels?', 'a' => 'Yes, any transparent alpha channel stored inside the AVIF file transfers cleanly into the output PNG.'],
                    ['q' => 'Why do many apps reject .avif files?', 'a' => 'While browsers love AVIF, older design suites, Microsoft Office apps, PDF tools, and CMS upload forms often require classic PNG or JPG files.'],
                    ['q' => 'Does AVIF to PNG keep HDR or color accuracy cleanly?', 'a' => 'Your image is rendered into standard sRGB Canvas pixels for maximum cross-device and design-tool compatibility.'],
                    ['q' => 'Can I convert a whole batch of AVIF images at once?', 'a' => 'Yes. Drag multiple .avif images in together and download a single ZIP containing all lossless PNGs.'],
                    ['q' => 'Do you store uploaded AVIF files on a server?', 'a' => 'No. All decoding and PNG encoding happens offline in your browser memory.'],
                ],
                'relatedSlugs' => ['png-to-avif', 'avif-to-jpg', 'webp-to-png', 'image-resizer'],
            ],
            'jpg-to-avif' => [
                'slug' => 'jpg-to-avif',
                'pairKey' => 'jpg-avif',
                'reverseSlug' => 'avif-to-jpg',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'JPG',
                'toFormat' => 'AVIF',
                'accept' => 'image/jpeg,.jpg,.jpeg',
                'targetMime' => 'image/avif',
                'targetExt' => 'avif',
                'supportsTransparency' => false,
                'supportsQuality' => true,
                'defaultQuality' => 72,
                'shortTitle' => 'JPG to AVIF',
                'title' => 'JPG to AVIF Converter',
                'shortDesc' => 'Convert JPG photographs to hyper-compressed AVIF assets for maximum web speed.',
                'seoTitle' => 'JPG to AVIF Converter Free Online — Ultra Compression',
                'seoDescription' => 'Convert JPG to AVIF online directly in your browser. Achieve cutting-edge image compression ratios without uploading files.',
                'howToSteps' => [
                    'Select or drop JPG images into the dropzone.',
                    'Wait a moment while the browser encodes each JPG into modern AVIF at default quality and original dimensions.',
                    'Download optimized AVIF files immediately or save the whole batch as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Universal camera format.',
                    'targetPros' => 'Dramatic byte reduction for hero banners, galleries, and e-commerce thumbnails.',
                ],
                'faqs' => [
                    ['q' => 'How much smaller is AVIF compared to JPG?', 'a' => 'At comparable visual quality, AVIF files are commonly 40%–65% smaller than JPG originals.'],
                    ['q' => 'Do all modern browsers display AVIF images?', 'a' => 'Yes. Chrome, Firefox, Safari, and Edge all support displaying AVIF images natively on desktop and mobile.'],
                    ['q' => 'Will converting JPG to AVIF resize my photos?', 'a' => 'No. The converter keeps your uploaded width and height intact so high-res photos remain full size.'],
                    ['q' => 'Can I convert a full gallery of JPG photos to AVIF?', 'a' => 'Yes. Drop multiple JPG files at once and download all converted AVIF files together in one ZIP package.'],
                    ['q' => 'Are my photos uploaded to any server during conversion?', 'a' => 'No. All AVIF compression happens directly on your device inside browser memory.'],
                ],
                'relatedSlugs' => ['avif-to-jpg', 'jpg-to-webp', 'png-to-avif', 'image-compressor'],
            ],
            'avif-to-jpg' => [
                'slug' => 'avif-to-jpg',
                'pairKey' => 'jpg-avif',
                'reverseSlug' => 'jpg-to-avif',
                'category' => 'converters',
                'mode' => 'convert',
                'fromFormat' => 'AVIF',
                'toFormat' => 'JPG',
                'accept' => 'image/avif,.avif',
                'targetMime' => 'image/jpeg',
                'targetExt' => 'jpg',
                'supportsTransparency' => false,
                'supportsQuality' => true,
                'defaultQuality' => 90,
                'shortTitle' => 'AVIF to JPG',
                'title' => 'AVIF to JPG Converter',
                'shortDesc' => 'Convert modern AVIF images into universal JPGs with selectable background fill.',
                'seoTitle' => 'AVIF to JPG Converter Online — Fast In-Browser Decode',
                'seoDescription' => 'Convert AVIF images to standard JPG/JPEG locally inside your browser. Choose quality and solid fill color with instant download.',
                'howToSteps' => [
                    'Drop .avif files onto the converter.',
                    'Let the browser convert each image to universal JPG at original dimensions (with a white fill behind any transparent areas).',
                    'Download universal JPG files individually or zipped.',
                ],
                'comparison' => [
                    'sourcePros' => 'Ultra-efficient delivery format.',
                    'targetPros' => 'Compatible with older devices, print services, and messaging apps.',
                ],
                'faqs' => [
                    ['q' => 'Does AVIF to JPG preserve image sharpness and dimensions?', 'a' => 'Yes. Your JPG exports keep the full original pixel width and height at crisp high quality so photos remain sharp everywhere.'],
                    ['q' => 'What happens if the uploaded AVIF has transparency?', 'a' => 'Since JPEG does not support alpha transparency, transparent pixels automatically render over a clean solid white background.'],
                    ['q' => 'When should I convert AVIF to JPG instead of PNG?', 'a' => 'Choose JPG for photographs and product shots where small file sizes and universal support in email, printing, or older apps matter most.'],
                    ['q' => 'Can I batch convert multiple AVIF files at once?', 'a' => 'Yes. Drop multiple AVIF files together and grab all output JPGs inside a single ZIP archive.'],
                    ['q' => 'Is this AVIF to JPG converter private?', 'a' => 'Yes. Conversion happens entirely offline in your browser without uploading your files to remote servers.'],
                ],
                'relatedSlugs' => ['jpg-to-avif', 'avif-to-png', 'webp-to-jpg', 'image-resizer'],
            ],
            'svg-to-png' => [
                'slug' => 'svg-to-png',
                'pairKey' => 'svg-png',
                'reverseSlug' => null,
                'category' => 'converters',
                'mode' => 'svg-to-png',
                'fromFormat' => 'SVG',
                'toFormat' => 'PNG',
                'accept' => 'image/svg+xml,.svg',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'SVG to PNG',
                'title' => 'SVG to PNG Converter',
                'shortDesc' => 'Rasterize crisp vector SVG logos and icons into custom pixel dimensions or 1x–8x transparent PNGs.',
                'seoTitle' => 'SVG to PNG Converter — Custom Dimensions & High-Res Scale',
                'seoDescription' => 'Convert SVG vector files into ultra-sharp, transparent PNG images at any custom width/height or 1x–8x scale, globally or per file, directly in your browser.',
                'howToSteps' => [
                    'Choose global scale (1x–8x), target width, or exact pixel dimensions—or drop your SVG vector graphics directly into the box.',
                    'Adjust dimensions across the whole batch at once, or customize individual SVG output sizes directly on each card in List or Grid view.',
                    'Export crisp transparent PNGs immediately or download the entire batch as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Infinite resolution mathematical vectors.',
                    'targetPros' => 'Ready-to-upload transparent raster PNGs accepted by social networks, email signatures, and presentation decks.',
                ],
                'faqs' => [
                    ['q' => 'Does SVG to PNG preserve transparent backgrounds?', 'a' => 'Yes. Empty canvas regions outside your SVG paths stay 100% transparent in the exported PNG.'],
                    ['q' => 'Can I choose exact output dimensions for my PNGs?', 'a' => 'Yes. Use the Global Output Dimensions bar to scale all SVGs (1x–8x), set a uniform width, or set exact pixel dimensions—or edit width and height per image directly inside each card in List or Grid view.'],
                    ['q' => 'What if my SVG fails to render properly?', 'a' => 'Make sure your SVG includes explicit width/height or a valid viewBox attribute and uses embedded paths rather than external linked images.'],
                    ['q' => 'Can I batch convert a whole icon set from SVG to PNG?', 'a' => 'Yes. Upload multiple SVG icons at once and download every PNG in one convenient ZIP archive.'],
                    ['q' => 'Are proprietary brand SVGs sent to a server?', 'a' => 'No. SVG rasterization runs 100% locally in your browser so vector source files never leave your computer.'],
                ],
                'relatedSlugs' => ['png-to-ico', 'png-to-webp', 'image-resizer', 'remove-background'],
            ],
            'png-to-ico' => [
                'slug' => 'png-to-ico',
                'pairKey' => 'png-ico',
                'reverseSlug' => null,
                'category' => 'converters',
                'mode' => 'ico',
                'fromFormat' => 'PNG',
                'toFormat' => 'ICO',
                'accept' => 'image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg',
                'targetMime' => 'image/x-icon',
                'targetExt' => 'ico',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'PNG to ICO',
                'title' => 'PNG to ICO Favicon Converter',
                'shortDesc' => 'Generate all standard ICO sizes (16×16, 24×24, 32×32, 48×48, 64×64, 128×128, 256×256) plus a multi-size .ico in a ready-to-download ZIP.',
                'seoTitle' => 'PNG to ICO Converter Online — All Standard ICO Sizes ZIP Pack',
                'seoDescription' => 'Convert PNG to all standard ICO icon dimensions (16×16, 24×24, 32×32, 48×48, 64×64, 128×128, and 256×256 px) plus a multi-resolution .ico bundled in a clean ZIP.',
                'howToSteps' => [
                    'Upload one or multiple square PNG logos or icons (transparent backgrounds stay transparent).',
                    'Your browser automatically renders all standard ICO sizes (16×16, 24×24, 32×32, 48×48, 64×64, 128×128, and 256×256 px) plus a combined multi-size .ico.',
                    'Download the individual ICO files, download a complete ZIP pack per image, or export every icon together via Batch Download ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Clean square transparent PNG artwork.',
                    'targetPros' => 'Complete ZIP bundle of named single-size .ico files (16×16 through 256×256) plus a multi-frame .ico.',
                ],
                'faqs' => [
                    ['q' => 'Which ICO dimensions are generated from each PNG?', 'a' => 'Every uploaded PNG produces named .ico files for 16×16, 24×24, 32×32, 48×48, 64×64, 128×128, and 256×256 px, plus a combined multi-resolution .ico file inside one ZIP.'],
                    ['q' => 'Can I download all sizes together or pick a single ICO size?', 'a' => 'Yes! Click Download ZIP on any item (or Download All .zip for batch uploads) to grab every size named by dimension, or click any individual size badge to download just that resolution.'],
                    ['q' => 'What size PNG works best for converting to ICO?', 'a' => 'A clean square 256x256 or 512x512 PNG gives the sharpest downscaled frames across browser tabs, toolbars, desktop shortcuts, and high-DPI Explorer views.'],
                    ['q' => 'Does the .ico output keep my transparent logo background?', 'a' => 'Yes. All generated .ico files preserve your 8-bit PNG alpha channel transparency so icons look crisp on both light and dark themes.'],
                    ['q' => 'What is the difference between PNG to ICO and ICO Favicon Maker?', 'a' => 'PNG to ICO outputs all standard Windows and browser ICO dimensions cleanly named in a ZIP, while ICO Favicon Maker adds Apple Touch, Android Chrome, corner rounding, padding, and a site.webmanifest file.'],
                ],
                'relatedSlugs' => ['svg-to-png', 'image-resizer', 'png-to-webp', 'remove-background'],
            ],
            'image-compressor' => [
                'slug' => 'image-compressor',
                'pairKey' => 'image-compressor',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'compress',
                'fromFormat' => 'Any Image',
                'toFormat' => 'Optimized',
                'accept' => 'image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif',
                'targetMime' => 'auto',
                'targetExt' => 'auto',
                'supportsTransparency' => true,
                'supportsQuality' => true,
                'defaultQuality' => 78,
                'shortTitle' => 'Compress Image',
                'title' => 'Image Compressor & Optimizer',
                'shortDesc' => 'Reduce PNG, JPG, and WebP file weight rapidly in-browser with exact byte savings.',
                'seoTitle' => 'Free Online Image Compressor — Shrink PNG, JPG & WebP',
                'seoDescription' => 'Compress JPG, WebP, and PNG images directly inside your browser with live before/after file size metrics and batch ZIP downloads.',
                'howToSteps' => [
                    'Drop PNG, JPG, or WebP images (single or bulk batch).',
                    'Adjust quality level and optional max-width cap.',
                    'Review KB saved per file and download optimized images.',
                ],
                'comparison' => [
                    'sourcePros' => 'Unoptimized camera or export files that slow down web pages.',
                    'targetPros' => 'Fast-loading assets with balanced visual sharpness and smaller storage footprint.',
                ],
                'faqs' => [
                    ['q' => 'How can I compress PNGs most effectively?', 'a' => 'Keep PNG output for pure lossless cutouts, or switch target format to WebP inside the tool to keep transparency at ~60% smaller size.'],
                    ['q' => 'Will compressing an image change its dimensions?', 'a' => 'Only if you enable a Max Width limit. Leaving the max width empty preserves your exact uploaded pixel resolution.'],
                    ['q' => 'What quality setting gives the best balance for photos?', 'a' => 'Setting quality between 75 and 85 on JPG or WebP usually reduces file size by 40%–70% with virtually imperceptible visual change.'],
                    ['q' => 'Can I see how many kilobytes were saved before downloading?', 'a' => 'Yes. Each processed file reports its original size, compressed size, and exact percentage saved side-by-side.'],
                    ['q' => 'Does image compression upload my photos to a server?', 'a' => 'No. Compression runs 100% inside your browser tab so sensitive screenshots and client photos stay completely private.'],
                ],
                'relatedSlugs' => ['png-to-webp', 'jpg-to-webp', 'image-resizer', 'png-to-avif'],
            ],
            'image-resizer' => [
                'slug' => 'image-resizer',
                'pairKey' => 'image-resizer',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'resize',
                'fromFormat' => 'Image',
                'toFormat' => 'Custom Size',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.svg,.avif,.bmp',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => true,
                'defaultQuality' => 92,
                'shortTitle' => 'Resize Image',
                'title' => 'Image Resizer',
                'shortDesc' => 'Resize PNG, JPG, and WebP images cleanly by exact custom pixel width, height, and fit mode.',
                'seoTitle' => 'Free Online Image Resizer — Custom Width & Height',
                'seoDescription' => 'Resize PNG, JPG, and WebP images directly in your browser using custom pixel width, height, and Contain, Cover, or Stretch fit modes.',
                'howToSteps' => [
                    'Load an image from your device (or click "Open in Tools" from a catalog PNG).',
                    'Enter exact target Width × Height and choose a fit mode (Contain, Cover, or Stretch).',
                    'Export in PNG, WebP, or JPG instantly.',
                ],
                'comparison' => [
                    'sourcePros' => 'Original aspect ratio & dimensions.',
                    'targetPros' => 'Exact pixel dimensions tailored for websites, documents, thumbnails, and storefronts.',
                ],
                'faqs' => [
                    ['q' => 'What fit modes are supported?', 'a' => 'Choose Contain (preserve entire artwork centered), Cover (fill exact target dimensions cleanly), or Stretch.'],
                    ['q' => 'Can I resize images while keeping the original aspect ratio?', 'a' => 'Yes. Enable aspect-ratio lock or choose Contain mode so your artwork never looks squished or distorted.'],
                    ['q' => 'Does resizing keep transparent PNG backgrounds?', 'a' => 'Yes. When exporting as PNG or WebP, transparent pixels and transparent Contain padding remain cleanly transparent.'],
                    ['q' => 'Can I resize multiple images to the same dimensions in one batch?', 'a' => 'Yes. Drop a batch of images, set your target width and height once, and download all resized outputs together in a ZIP.'],
                    ['q' => 'Will enlarging a small image add new detail?', 'a' => 'Upscaling raster images uses smooth browser interpolation, though for logos we recommend starting with an SVG or high-resolution PNG whenever possible.'],
                ],
                'relatedSlugs' => ['image-compressor', 'png-to-webp', 'svg-to-png', 'remove-background'],
            ],
            'remove-background' => [
                'slug' => 'remove-background',
                'pairKey' => 'remove-background',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'bg-remove',
                'fromFormat' => 'Any BG',
                'toFormat' => 'Transparent PNG',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.bmp',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'Remove Background',
                'title' => 'AI & Solid Background Remover to Transparent PNG',
                'shortDesc' => 'Remove complex photo backgrounds or solid backdrops into transparent PNG cutouts using Browser AI, Server AI, or Solid Color Key.',
                'seoTitle' => 'AI Background Remover Online — Make Transparent PNG Free',
                'seoDescription' => 'Remove complex photo backgrounds or solid backdrops cleanly using AI segmentation or instant color-key flood-fill, then download a transparent PNG.',
                'howToSteps' => [
                    'Choose an enabled cutout engine (Browser AI, Server AI, or Solid Color Key) and drop any photo, portrait, product shot, or logo.',
                    'Wait a moment for AI cutout segmentation (or click to sample a solid background color and tune Tolerance & Edge Feathering).',
                    'Drag the before/after divider across the checkerboard preview to inspect the cutout and download your transparent PNG.',
                ],
                'comparison' => [
                    'sourcePros' => 'Photos with busy scenes, products, portraits, or graphics on solid boxes.',
                    'targetPros' => 'Clean alpha-channel transparent PNG ready for websites, thumbnails, and layered designs.',
                ],
                'faqs' => [
                    ['q' => 'What is the difference between Browser AI, Server AI, and Solid Color Key?', 'a' => 'Browser AI and Server AI use neural segmentation models for complex photos, people, hair, and products. Solid Color Key runs instant flood-fill and chroma keying for logos or icons on flat backgrounds.'],
                    ['q' => 'How do I remove a white background without jagged edges?', 'a' => 'Increase Tolerance slightly until faint anti-aliased fringes disappear, then add 1px–3px of Edge Feathering for smooth transparent borders.'],
                    ['q' => 'Can I pick a custom background color instead of white?', 'a' => 'Yes. Switch to Solid Color Key mode and click directly anywhere on the live canvas preview with the eyedropper to sample green screen, black, gray, or brand colors.'],
                    ['q' => 'Can I verify transparency before downloading the PNG?', 'a' => 'Yes. Drag the interactive before/after comparison line over the checkerboard preview to inspect edges and catch stray pixels right away.'],
                    ['q' => 'Are my images processed privately?', 'a' => 'Browser AI and Solid Color Key run 100% locally inside your browser with zero uploads. If Server AI mode is selected, images are processed on the application server and discarded immediately after returning the PNG.'],
                ],
                'relatedSlugs' => ['jpg-to-png', 'png-to-webp', 'favicon-maker', 'round-image-corners'],
            ],
            'favicon-maker' => [
                'slug' => 'favicon-maker',
                'pairKey' => 'favicon-maker',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'favicon-pack',
                'fromFormat' => 'Any Image',
                'toFormat' => 'ICO + Pack',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.svg,.avif,.bmp',
                'targetMime' => 'image/x-icon',
                'targetExt' => 'ico',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'ICO Favicon Maker',
                'title' => 'ICO Favicon Maker & Web Icon Pack Generator',
                'shortDesc' => 'Generate multi-size .ico favicons plus Apple, Android Chrome PNGs, webmanifest & HTML tags from any image.',
                'seoTitle' => 'ICO Favicon Maker Free Online — Complete Website Favicon Pack',
                'seoDescription' => 'Create a multi-resolution favicon.ico plus Apple Touch Icon, Android Chrome icons, site.webmanifest, and HTML head link tags from any PNG, JPG, WebP, or SVG.',
                'howToSteps' => [
                    'Drop any square or rectangular logo (PNG, JPG, WebP, or SVG).',
                    'Customize background fill, safe padding, corner radius, and embedded ICO frame sizes.',
                    'Download favicon.ico alone or grab the complete developer ZIP bundle with HTML snippet.',
                ],
                'comparison' => [
                    'sourcePros' => 'Single logo or brand mark in any image format.',
                    'targetPros' => 'Complete cross-browser favicon kit ready for Google Search, Safari/iOS, Chrome/Android & Windows.',
                ],
                'faqs' => [
                    ['q' => 'How is ICO Favicon Maker different from PNG to ICO?', 'a' => 'PNG to ICO converts PNGs directly into an .ico file with one step. ICO Favicon Maker accepts any image format, lets you tune padding/rounding/fill, and builds an entire ZIP package with Apple, Android, webmanifest, and HTML code.'],
                    ['q' => 'Which favicon sizes are included in the generated pack?', 'a' => 'Your ZIP includes a multi-resolution favicon.ico (16, 32, 48px plus optional 64/128/256px), favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png (180x180), and Android Chrome 192x192 & 512x512 icons.'],
                    ['q' => 'What happens if I upload a rectangular or non-square logo?', 'a' => 'The generator centers your artwork inside a clean square canvas automatically without stretching, and lets you add safe inner padding, rounded corners, or a custom background fill.'],
                    ['q' => 'Does it generate the HTML tags and site.webmanifest file too?', 'a' => 'Yes. Alongside every icon file, the tool outputs a ready-to-paste HTML head snippet and a pre-configured site.webmanifest JSON file.'],
                    ['q' => 'Does Google Search require a specific favicon size?', 'a' => 'Google recommends multiples of 48px (such as 48x48, 96x96, or 192x192) on a stable URL—all of which are packaged neatly in your download.'],
                ],
                'relatedSlugs' => ['png-to-ico', 'app-icon-generator', 'svg-to-png', 'round-image-corners'],
            ],
            'app-icon-generator' => [
                'slug' => 'app-icon-generator',
                'pairKey' => 'app-icon-generator',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'app-icons',
                'fromFormat' => 'Logo',
                'toFormat' => 'iOS / Android / PWA',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.svg,.avif',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'App Icon Pack',
                'title' => 'iOS, Android & PWA App Icon Pack Generator',
                'shortDesc' => 'Export all iOS App Store, Android mipmap, and PWA manifest icon sizes into one structured ZIP.',
                'seoTitle' => 'App Icon Generator Free — iOS, Android Mipmap & PWA ZIP',
                'seoDescription' => 'Generate every required iOS, Android mipmap, and PWA app icon resolution from a single logo privately inside your browser.',
                'howToSteps' => [
                    'Upload a high-resolution logo (1024×1024 or SVG recommended).',
                    'Choose iOS, Android, and PWA targets plus optional background fill, padding, and rounding.',
                    'Download the ready-to-drop ZIP bundle organized by platform folders.',
                ],
                'comparison' => [
                    'sourcePros' => 'One master app icon artwork.',
                    'targetPros' => 'All 20+ platform-specific resolutions named and organized cleanly inside folders.',
                ],
                'faqs' => [
                    ['q' => 'Does App Icon Generator include Android mipmap folders?', 'a' => 'Yes, exports place ic_launcher.png into mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi, and Play Store 512px paths automatically.'],
                    ['q' => 'What iOS App Store icon sizes are generated?', 'a' => 'The iOS folder exports all standard Xcode sizes up to the 1024x1024 App Store Marketing icon cleanly without alpha issues when background fill is enabled.'],
                    ['q' => 'Can I export PWA manifest icons alongside mobile icons?', 'a' => 'Yes. Check the PWA target to include 192x192, 512x512, and maskable icon assets ready for web app manifests.'],
                    ['q' => 'What input image resolution works best?', 'a' => 'Upload a square 1024x1024 PNG or crisp SVG vector so smaller 48px and 72px icons stay razor-sharp without upscaling blur.'],
                    ['q' => 'Do unreleased app icons get uploaded anywhere?', 'a' => 'No. All icon resizing and ZIP bundling executes strictly in your browser so pre-launch brand assets remain confidential.'],
                ],
                'relatedSlugs' => ['favicon-maker', 'round-image-corners', 'image-resizer', 'svg-to-png'],
            ],
            'round-image-corners' => [
                'slug' => 'round-image-corners',
                'pairKey' => 'round-image-corners',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'round-corners',
                'fromFormat' => 'Image',
                'toFormat' => 'Rounded PNG',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.svg,.avif,.bmp',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'Round Corners',
                'title' => 'Circle Avatar & Rounded Corner Image Maker',
                'shortDesc' => 'Turn logos, UI cards, or portraits into circle avatars or rounded transparent PNGs with optional border.',
                'seoTitle' => 'Round Image Corners & Circle Cropper Online Free — Transparent PNG',
                'seoDescription' => 'Make circle avatars or rounded corner images online with transparent outer corners, border thickness, and live preview directly in your browser.',
                'howToSteps' => [
                    'Drop any JPG, PNG, WebP, or SVG image.',
                    'Toggle full Circle Crop or adjust Corner Radius & optional border color.',
                    'Download your transparent-corner PNG immediately.',
                ],
                'comparison' => [
                    'sourcePros' => 'Sharp rectangular photo, screenshot, or icon.',
                    'targetPros' => 'Crisp anti-aliased rounded or circular PNG with true alpha transparency.',
                ],
                'faqs' => [
                    ['q' => 'Will the corners outside the rounded frame stay transparent?', 'a' => 'Yes! The exported file uses PNG alpha transparency unless you intentionally pick a solid outer backdrop color.'],
                    ['q' => 'How do I make a perfect circle profile avatar?', 'a' => 'Switch on the Circle Crop toggle to clip a centered square circle regardless of whether your uploaded image is portrait or landscape.'],
                    ['q' => 'Can I add a colored border ring around my circle or rounded card?', 'a' => 'Yes. Pick a border thickness in pixels and choose any custom hex border color with crisp anti-aliased rendering.'],
                    ['q' => 'Can I round corners on screenshots and UI mockups?', 'a' => 'Yes. Adjust the Corner Radius slider gently (16px–40px) to give blog post screenshots and product mockups a polished card finish.'],
                    ['q' => 'Are my portraits or private screenshots sent to any server?', 'a' => 'No. Canvas clipping and PNG generation happen locally inside your browser tab.'],
                ],
                'relatedSlugs' => ['watermark-images', 'favicon-maker', 'remove-background', 'image-resizer'],
            ],
            'watermark-images' => [
                'slug' => 'watermark-images',
                'pairKey' => 'watermark-images',
                'reverseSlug' => null,
                'category' => 'utilities',
                'mode' => 'watermark',
                'fromFormat' => 'Batch Images',
                'toFormat' => 'Watermarked',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.bmp',
                'targetMime' => 'image/png',
                'targetExt' => 'png',
                'supportsTransparency' => true,
                'supportsQuality' => true,
                'defaultQuality' => 90,
                'shortTitle' => 'Watermark Images',
                'title' => 'Batch PNG Logo & Text Watermark Tool',
                'shortDesc' => 'Overlay a transparent PNG logo or custom watermark text across multiple photos with opacity & tile controls.',
                'seoTitle' => 'Add Logo or Text Watermark to Images Online — Batch & Private',
                'seoDescription' => 'Protect photos and mockups with a custom PNG logo or text watermark in corner or tiled positions across multiple files right inside your browser.',
                'howToSteps' => [
                    'Upload one or more target images into the dropzone.',
                    'Choose a transparent PNG watermark image or custom text, then tune scale, opacity & anchor corner or tiling.',
                    'Apply across your batch and download individually or as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Unmarked portfolio images or product shots.',
                    'targetPros' => 'Branded visuals with clean alpha-blended logo marks or protective tiled watermarks.',
                ],
                'faqs' => [
                    ['q' => 'Can I use a transparent PNG logo as my watermark?', 'a' => 'Yes, upload any transparent PNG (such as assets from Png101) and adjust its scale, opacity, margin, and corner or diagonal tile placement.'],
                    ['q' => 'Can I watermark dozens of product photos at once?', 'a' => 'Yes. Drop multiple target photos into the workspace, configure your logo or text watermark once, and export all files in one ZIP archive.'],
                    ['q' => 'What watermark layouts are supported?', 'a' => 'Place your watermark cleanly in any corner, dead center, or repeated across a full diagonal protective tile pattern.'],
                    ['q' => 'Can I add custom text instead of a logo image?', 'a' => 'Yes. Switch to Text Watermark mode to enter your brand handle, URL, or copyright text with custom color, font size, and transparency.'],
                    ['q' => 'Are unwatermarked original photos uploaded anywhere?', 'a' => 'No. Client proofs and original photography stay strictly inside your browser while rendering watermarks locally.'],
                ],
                'relatedSlugs' => ['image-compressor', 'image-resizer', 'remove-background', 'image-metadata-remover'],
            ],
            'image-to-base64' => [
                'slug' => 'image-to-base64',
                'pairKey' => 'image-to-base64',
                'reverseSlug' => null,
                'category' => 'developer',
                'mode' => 'base64',
                'fromFormat' => 'Image',
                'toFormat' => 'Base64 / URI',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.svg,.ico,.gif',
                'targetMime' => 'text/plain',
                'targetExt' => 'txt',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'Image to Base64',
                'title' => 'Image to Base64 & Data URI Converter (Two-Way)',
                'shortDesc' => 'Encode images to Data URI, CSS url(), or HTML snippets—or decode Base64 strings back into downloadable files.',
                'seoTitle' => 'Image to Base64 & Base64 to Image Converter Free Online',
                'seoDescription' => 'Convert PNG, SVG, JPG, or WebP to Base64 strings, CSS url() data URIs, and HTML tags, or paste Base64 back to preview and download the image.',
                'howToSteps' => [
                    'Drop an image file (or switch to Decode mode to paste any Base64 / Data URI string).',
                    'Inspect exact Base64 payload size alongside CSS and HTML code snippets.',
                    'Click Copy to grab ready-to-use Data URI, CSS, HTML, or raw Base64.',
                ],
                'comparison' => [
                    'sourcePros' => 'Binary image asset.',
                    'targetPros' => 'Inline Base64 string ready for emails, JSON fixtures, CSS icons & single-file HTML.',
                ],
                'faqs' => [
                    ['q' => 'Can I convert Base64 back into an image file?', 'a' => 'Yes! Use the Base64 → Image tab to paste raw Base64 or a data:image/* URI, preview it, and download it.'],
                    ['q' => 'What code formats are generated alongside the Base64 string?', 'a' => 'One drop produces the raw Base64 payload, a complete data:image/... URI, an HTML <img> tag, and a CSS background-image: url(...) rule ready to copy.'],
                    ['q' => 'When should developers inline an image as Base64?', 'a' => 'Inlining tiny icons (<4 KB), email signature logos, or single-file HTML/SVG exports eliminates an extra HTTP request—just avoid Base64 for large photos since encoding adds ~33% text overhead.'],
                    ['q' => 'Which image formats can I encode to Base64?', 'a' => 'PNG, JPG, WebP, SVG, ICO, and GIF files are all supported directly inside your browser.'],
                    ['q' => 'Is any uploaded image or pasted Base64 string logged on a server?', 'a' => 'No. Base64 encoding and decoding happen instantaneously in local JavaScript memory with zero network transfer.'],
                ],
                'relatedSlugs' => ['svg-optimizer', 'image-color-palette', 'favicon-maker', 'image-compressor'],
            ],
            'svg-optimizer' => [
                'slug' => 'svg-optimizer',
                'pairKey' => 'svg-optimizer',
                'reverseSlug' => null,
                'category' => 'developer',
                'mode' => 'svg-optimize',
                'fromFormat' => 'SVG',
                'toFormat' => 'Min SVG / JSX',
                'accept' => 'image/svg+xml,.svg',
                'targetMime' => 'image/svg+xml',
                'targetExt' => 'svg',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'SVG Cleaner & JSX',
                'title' => 'SVG Optimizer, Code Cleaner & React JSX Converter',
                'shortDesc' => 'Strip Figma/Illustrator SVG bloat, track byte savings, and convert SVG icons directly into React JSX.',
                'seoTitle' => 'SVG Optimizer & SVG to React JSX Converter Free Online',
                'seoDescription' => 'Minify SVG files by removing editor metadata, comments, and bloat right in your browser, preview live savings, and export clean SVG or React JSX components.',
                'howToSteps' => [
                    'Upload an .svg file or paste raw SVG code.',
                    'Toggle cleanup options (strip metadata/comments, remove fixed width/height, convert to React JSX).',
                    'Copy the cleaned markup or download the optimized .svg file.',
                ],
                'comparison' => [
                    'sourcePros' => 'Raw Illustrator/Figma export with XML bloat & kebab-case attributes.',
                    'targetPros' => 'Lightweight web SVG or camelCased React JSX component ready to paste.',
                ],
                'faqs' => [
                    ['q' => 'What does Convert to React JSX change?', 'a' => 'It converts attributes like class, stroke-width, stroke-linecap, fill-rule, and clip-path into camelCased JSX props automatically.'],
                    ['q' => 'What editor bloat does the SVG Optimizer remove?', 'a' => 'It safely strips XML prologs, comments, Adobe Illustrator / Figma / Inkscape proprietary metadata, empty groups, and redundant whitespace.'],
                    ['q' => 'Can I paste raw SVG markup instead of uploading a .svg file?', 'a' => 'Yes. Paste any <svg>...</svg> snippet directly into the editor pane to minify it and inspect byte savings in real time.'],
                    ['q' => 'Why remove fixed width and height attributes from inline web SVGs?', 'a' => 'Stripping hardcoded width/height while keeping viewBox lets CSS utility classes (like Tailwind w-6 h-6) scale the vector icon cleanly without distortion.'],
                    ['q' => 'Will optimizing an SVG change how my icon looks?', 'a' => 'Your visual output stays identical—plus a live side-by-side preview lets you verify every vector path before copying or downloading.'],
                ],
                'relatedSlugs' => ['svg-to-png', 'image-to-base64', 'image-color-palette', 'favicon-maker'],
            ],
            'image-color-palette' => [
                'slug' => 'image-color-palette',
                'pairKey' => 'image-color-palette',
                'reverseSlug' => null,
                'category' => 'developer',
                'mode' => 'palette',
                'fromFormat' => 'Image',
                'toFormat' => 'HEX / CSS / TW',
                'accept' => 'image/*,.png,.jpg,.jpeg,.webp,.svg,.avif,.bmp',
                'targetMime' => 'text/css',
                'targetExt' => 'css',
                'supportsTransparency' => true,
                'supportsQuality' => false,
                'defaultQuality' => 100,
                'shortTitle' => 'Color Palette',
                'title' => 'Color Palette & Design Tokens Extractor',
                'shortDesc' => 'Extract dominant colors from any image and copy HEX, RGB, HSL, CSS variables, or Tailwind config + WCAG contrast.',
                'seoTitle' => 'Extract Color Palette from Image — CSS Variables & Tailwind Tokens',
                'seoDescription' => 'Upload any logo, UI screenshot, or photo to extract dominant brand colors as HEX, RGB, HSL, CSS custom properties, and Tailwind tokens in seconds.',
                'howToSteps' => [
                    'Drop any image or logo into the palette analyzer.',
                    'Adjust how many swatches (4–12) to extract.',
                    'Click any swatch to copy HEX/RGB/HSL or copy the full CSS / Tailwind token snippet.',
                ],
                'comparison' => [
                    'sourcePros' => 'Visual brand inspiration, mockup, or photograph.',
                    'targetPros' => 'Copy-ready CSS :root tokens, Tailwind keys & contrast-checked HEX values.',
                ],
                'faqs' => [
                    ['q' => 'Does it ignore transparent background pixels when analyzing PNG logos?', 'a' => 'Yes! Only visible non-transparent pixels are sampled so logo colors stay accurate.'],
                    ['q' => 'What developer code formats can I export from the palette?', 'a' => 'Copy individual HEX, RGB, or HSL color values with one click, or copy an entire ready-to-use CSS :root variable block or Tailwind theme colors snippet.'],
                    ['q' => 'How many dominant colors can I extract?', 'a' => 'Adjust the swatch count slider anywhere from 4 to 12 dominant colors to capture both primary brand shades and subtle accent tones.'],
                    ['q' => 'Does the tool check text contrast accessibility?', 'a' => 'Yes. Each color swatch computes WCAG contrast ratios against light and dark text so UI designers know immediately which pairs pass AA/AAA readability.'],
                    ['q' => 'Can I extract colors from confidential brand mockups privately?', 'a' => 'Yes. All pixel clustering and color quantization happens locally in your browser Canvas without uploading your files.'],
                ],
                'relatedSlugs' => ['image-to-base64', 'svg-optimizer', 'remove-background', 'round-image-corners'],
            ],
            'image-metadata-remover' => [
                'slug' => 'image-metadata-remover',
                'pairKey' => 'image-metadata-remover',
                'reverseSlug' => null,
                'category' => 'developer',
                'mode' => 'metadata-strip',
                'fromFormat' => 'Image + EXIF',
                'toFormat' => 'Clean Image',
                'accept' => 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
                'targetMime' => 'auto',
                'targetExt' => 'auto',
                'supportsTransparency' => true,
                'supportsQuality' => true,
                'defaultQuality' => 92,
                'shortTitle' => 'EXIF Remover',
                'title' => 'EXIF & Image Metadata Inspector / Remover',
                'shortDesc' => 'Inspect camera, software, timestamp & GPS EXIF tags and download clean privacy-safe copies.',
                'seoTitle' => 'EXIF Metadata Viewer & Stripper Online — Remove GPS & Camera Info',
                'seoDescription' => 'Check images for hidden EXIF camera model, timestamps, and GPS coordinates, then strip all metadata privately in your browser before sharing.',
                'howToSteps' => [
                    'Drop one or more JPG, PNG, or WebP images into the privacy inspector.',
                    'Review detected EXIF, GPS, and embedded text chunk metadata.',
                    'Download clean, metadata-stripped copies individually or as a ZIP.',
                ],
                'comparison' => [
                    'sourcePros' => 'Raw photo carrying camera model, lens, software, or GPS location tags.',
                    'targetPros' => 'Clean raster pixel output with zero personal EXIF, XMP, or IPTC headers.',
                ],
                'faqs' => [
                    ['q' => 'How does browser EXIF stripping keep files private?', 'a' => 'Inspection and Canvas re-encoding happen strictly on your device—no image bytes ever leave your browser.'],
                    ['q' => 'What hidden data can photos contain before stripping?', 'a' => 'Smartphone and DSLR JPGs often embed GPS latitude/longitude coordinates, capture timestamps, camera make/model, lens serial tags, and editing software history.'],
                    ['q' => 'Can I see which EXIF or GPS tags exist inside my image before removing them?', 'a' => 'Yes. Dropping an image immediately parses and displays detected EXIF, GPS, camera, and text chunk metadata so you know exactly what was removed.'],
                    ['q' => 'Does stripping metadata reduce visual photo quality?', 'a' => 'Clean raster output keeps your exact visual framing and transparent PNG alpha channels intact with high-quality encoding—minus every hidden metadata block.'],
                    ['q' => 'Can I clean multiple photos in one batch before uploading online?', 'a' => 'Yes. Drag multiple JPG, PNG, or WebP files at once and download all privacy-scrubbed copies together in one ZIP archive.'],
                ],
                'relatedSlugs' => ['image-compressor', 'watermark-images', 'jpg-to-webp', 'image-to-base64'],
            ],
        ];
    }

    public static function bgRemoverDefaults(): array
    {
        return [
            'engines' => [
                'solid' => true,
                'browser_ai' => true,
                'server_ai' => false,
            ],
            'defaultEngine' => 'browser_ai',
            'browserAiModel' => 'isnet_fp16',
            'serverAiMode' => 'cli',
            'serverAiPythonPath' => '',
            'serverAiServiceUrl' => 'http://127.0.0.1:8001/remove-background',
            'serverAiApiKey' => '',
            'serverAiTimeout' => 180,
            'serverAiVerifySsl' => true,
            'serverAiModel' => 'isnet-general-use',
            'serverAiAlphaMatting' => false,
            'maxUploadMb' => 15,
        ];
    }

    public static function normalizeBgRemoverSettings(?array $input, ?array $fallback = null): array
    {
        $base = $fallback ?? self::bgRemoverDefaults();
        $in = is_array($input) ? $input : [];
        $inEngines = is_array($in['engines'] ?? null) ? $in['engines'] : [];

        $engines = [
            'solid' => array_key_exists('solid', $inEngines)
                ? (bool) $inEngines['solid']
                : (bool) ($base['engines']['solid'] ?? true),
            'browser_ai' => array_key_exists('browser_ai', $inEngines)
                ? (bool) $inEngines['browser_ai']
                : (bool) ($base['engines']['browser_ai'] ?? true),
            'server_ai' => array_key_exists('server_ai', $inEngines)
                ? (bool) $inEngines['server_ai']
                : (bool) ($base['engines']['server_ai'] ?? true),
        ];

        // Ensure at least one engine remains available to visitors
        if (!$engines['solid'] && !$engines['browser_ai'] && !$engines['server_ai']) {
            $engines['solid'] = true;
        }

        $requestedDefault = (string) ($in['defaultEngine'] ?? ($base['defaultEngine'] ?? 'browser_ai'));
        $allowedEngines = ['browser_ai', 'server_ai', 'solid'];
        if (!in_array($requestedDefault, $allowedEngines, true) || empty($engines[$requestedDefault])) {
            $requestedDefault = 'solid';
            foreach ($allowedEngines as $candidate) {
                if (!empty($engines[$candidate])) {
                    $requestedDefault = $candidate;
                    break;
                }
            }
        }

        $browserModels = ['isnet_quint8', 'isnet_fp16', 'isnet'];
        $browserAiModel = (string) ($in['browserAiModel'] ?? ($base['browserAiModel'] ?? 'isnet_fp16'));
        if (!in_array($browserAiModel, $browserModels, true)) {
            $browserAiModel = 'isnet_fp16';
        }

        $serverAiMode = (string) ($in['serverAiMode'] ?? ($base['serverAiMode'] ?? 'cli'));
        if (!in_array($serverAiMode, ['cli', 'http'], true)) {
            $serverAiMode = 'cli';
        }

        $serverModels = ['u2netp', 'u2net', 'isnet-general-use', 'birefnet-general-lite', 'birefnet-general', 'u2net_human_seg'];
        $serverAiModel = (string) ($in['serverAiModel'] ?? ($base['serverAiModel'] ?? 'isnet-general-use'));
        if (!in_array($serverAiModel, $serverModels, true)) {
            $serverAiModel = 'isnet-general-use';
        }

        $pythonPath = array_key_exists('serverAiPythonPath', $in)
            ? trim(substr((string) $in['serverAiPythonPath'], 0, 400))
            : (string) ($base['serverAiPythonPath'] ?? '');

        $serviceUrl = array_key_exists('serverAiServiceUrl', $in)
            ? trim(substr((string) $in['serverAiServiceUrl'], 0, 400))
            : (string) ($base['serverAiServiceUrl'] ?? 'http://127.0.0.1:8001/remove-background');
        if ($serviceUrl === '') {
            $serviceUrl = 'http://127.0.0.1:8001/remove-background';
        }

        $apiKey = array_key_exists('serverAiApiKey', $in)
            ? trim(substr((string) $in['serverAiApiKey'], 0, 255))
            : (string) ($base['serverAiApiKey'] ?? '');

        $serverTimeout = array_key_exists('serverAiTimeout', $in)
            ? (int) $in['serverAiTimeout']
            : (int) ($base['serverAiTimeout'] ?? 180);
        $serverTimeout = max(15, min(600, $serverTimeout));

        $verifySsl = array_key_exists('serverAiVerifySsl', $in)
            ? (bool) $in['serverAiVerifySsl']
            : (bool) ($base['serverAiVerifySsl'] ?? true);

        $alphaMatting = array_key_exists('serverAiAlphaMatting', $in)
            ? (bool) $in['serverAiAlphaMatting']
            : (bool) ($base['serverAiAlphaMatting'] ?? false);

        $maxUploadMb = array_key_exists('maxUploadMb', $in)
            ? (int) $in['maxUploadMb']
            : (int) ($base['maxUploadMb'] ?? 15);
        $maxUploadMb = max(1, min(50, $maxUploadMb));

        return [
            'engines' => $engines,
            'defaultEngine' => $requestedDefault,
            'browserAiModel' => $browserAiModel,
            'serverAiMode' => $serverAiMode,
            'serverAiPythonPath' => $pythonPath,
            'serverAiServiceUrl' => $serviceUrl,
            'serverAiApiKey' => $apiKey,
            'serverAiTimeout' => $serverTimeout,
            'serverAiVerifySsl' => $verifySsl,
            'serverAiModel' => $serverAiModel,
            'serverAiAlphaMatting' => $alphaMatting,
            'maxUploadMb' => $maxUploadMb,
        ];
    }

    /**
     * Build authentication headers when calling a remote Server AI HTTP endpoint.
     *
     * @return array<string, string>
     */
    public static function buildBgRemoverServiceHeaders(array $bgConfig): array
    {
        $apiKey = trim((string) ($bgConfig['serverAiApiKey'] ?? ''));
        if ($apiKey === '') {
            return [];
        }

        return [
            'X-API-Key' => $apiKey,
            'Authorization' => 'Bearer ' . $apiKey,
        ];
    }

    public static function resolvePythonExecutable(?string $configured = null): string
    {
        $trimmed = trim((string) $configured);
        if ($trimmed !== '') {
            return $trimmed;
        }

        $winVenv = base_path('python-ai' . DIRECTORY_SEPARATOR . '.venv' . DIRECTORY_SEPARATOR . 'Scripts' . DIRECTORY_SEPARATOR . 'python.exe');
        if (is_file($winVenv)) {
            return $winVenv;
        }

        $unixVenv = base_path('python-ai' . DIRECTORY_SEPARATOR . '.venv' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'python');
        if (is_file($unixVenv)) {
            return $unixVenv;
        }

        return PHP_OS_FAMILY === 'Windows' ? 'python' : 'python3';
    }

    /**
     * Build environment variables required by Python/rembg subprocesses.
     *
     * On Windows web servers (Apache, FastCGI, Laragon, Herd), php.ini's
     * variables_order=GPCS causes Symfony Process to filter out OS env vars
     * missing from $_SERVER (such as SystemRoot), breaking Winsock with
     * "[WinError 10106] The requested service provider could not be loaded".
     *
     * @return array<string, string>
     */
    public static function pythonProcessEnv(): array
    {
        $modelsDir = storage_path('app' . DIRECTORY_SEPARATOR . 'rembg-models');
        $cacheDir = storage_path('app' . DIRECTORY_SEPARATOR . 'rembg-cache');
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0775, true);
        }

        $readVar = static function (string $name): ?string {
            $val = getenv($name);
            if (is_string($val) && $val !== '') {
                return $val;
            }
            if (!empty($_SERVER[$name]) && is_string($_SERVER[$name])) {
                return $_SERVER[$name];
            }
            $upper = strtoupper($name);
            if (!empty($_SERVER[$upper]) && is_string($_SERVER[$upper])) {
                return $_SERVER[$upper];
            }
            return null;
        };

        $env = [
            'U2NET_HOME' => $modelsDir,
            'NUMBA_CACHE_DIR' => $cacheDir,
            'MPLCONFIGDIR' => $cacheDir,
        ];

        $tmpDir = $readVar('TMP') ?? $readVar('TEMP') ?? sys_get_temp_dir();
        if (is_string($tmpDir) && $tmpDir !== '') {
            $env['TEMP'] = $tmpDir;
            $env['TMP'] = $tmpDir;
        }

        if ($path = $readVar('PATH')) {
            $env['PATH'] = $path;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $systemRoot = $readVar('SystemRoot') ?? $readVar('WINDIR') ?? (is_dir('C:\\Windows') ? 'C:\\Windows' : null);
            if ($systemRoot !== null) {
                $env['SystemRoot'] = $systemRoot;
                $env['WINDIR'] = $readVar('WINDIR') ?? $systemRoot;
            }

            if ($comspec = $readVar('COMSPEC')) {
                $env['COMSPEC'] = $comspec;
            }
            if ($pathext = $readVar('PATHEXT')) {
                $env['PATHEXT'] = $pathext;
            }
            foreach (['USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'HOME'] as $dirVar) {
                $val = $readVar($dirVar);
                if ($val !== null) {
                    $env[$dirVar] = $val;
                }
            }
            $env['USERPROFILE'] ??= $cacheDir;
            $env['HOME'] ??= $env['USERPROFILE'];
            $env['LOCALAPPDATA'] ??= $cacheDir;
            $env['APPDATA'] ??= $cacheDir;
        } elseif ($home = $readVar('HOME')) {
            $env['HOME'] = $home;
        }

        return $env;
    }

    public static function getBgRemoverDiagnostics(?array $config = null): array
    {
        $cfg = $config ?? (self::getSettings()['bgRemover'] ?? self::bgRemoverDefaults());
        $winVenv = base_path('python-ai' . DIRECTORY_SEPARATOR . '.venv' . DIRECTORY_SEPARATOR . 'Scripts' . DIRECTORY_SEPARATOR . 'python.exe');
        $unixVenv = base_path('python-ai' . DIRECTORY_SEPARATOR . '.venv' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'python');
        $hasLocalVenv = is_file($winVenv) || is_file($unixVenv);
        $modelsDir = storage_path('app' . DIRECTORY_SEPARATOR . 'rembg-models');
        $cachedModels = [];
        if (is_dir($modelsDir)) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($modelsDir, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $fileInfo) {
                if ($fileInfo->isFile() && str_ends_with($fileInfo->getFilename(), '.onnx')) {
                    $cachedModels[] = $fileInfo->getFilename();
                }
            }
            $cachedModels = array_values(array_unique($cachedModels));
            sort($cachedModels);
        }

        return [
            'detectedPython' => self::resolvePythonExecutable($cfg['serverAiPythonPath'] ?? ''),
            'hasLocalVenv' => $hasLocalVenv,
            'scriptExists' => is_file(base_path('python-ai' . DIRECTORY_SEPARATOR . 'remove_bg.py')),
            'modelsDir' => $modelsDir,
            'cachedModels' => $cachedModels,
        ];
    }

    public static function getPublicBgRemoverConfig(): array
    {
        $settings = self::getSettings();
        $bg = $settings['bgRemover'] ?? self::bgRemoverDefaults();

        return [
            'engines' => $bg['engines'],
            'defaultEngine' => $bg['defaultEngine'],
            'browserAiModel' => $bg['browserAiModel'],
            'maxUploadMb' => $bg['maxUploadMb'],
        ];
    }

    public static function defaults(): array
    {
        $pairStates = [];
        foreach (self::getGroupCatalog() as $group) {
            $pairStates[$group['key']] = true;
        }

        return [
            'globalEnabled' => true,
            'includeInSitemap' => true,
            'showInPublicNav' => true,
            'enableCatalogHandoff' => false,
            'pairStates' => $pairStates,
            'bgRemover' => self::bgRemoverDefaults(),
        ];
    }

    public static function getSettings(): array
    {
        $defaults = self::defaults();
        try {
            $row = Setting::find(self::SETTING_KEY);
            if ($row) {
                $decoded = json_decode((string) $row->value, true);
                if (is_array($decoded)) {
                    $pairStates = $defaults['pairStates'];
                    if (is_array($decoded['pairStates'] ?? null)) {
                        foreach ($pairStates as $key => $defaultVal) {
                            if (array_key_exists($key, $decoded['pairStates'])) {
                                $pairStates[$key] = (bool) $decoded['pairStates'][$key];
                            } elseif ($key === 'remove-background' && array_key_exists('remove-solid-background', $decoded['pairStates'])) {
                                $pairStates[$key] = (bool) $decoded['pairStates']['remove-solid-background'];
                            }
                        }
                    }

                    return [
                        'globalEnabled' => array_key_exists('globalEnabled', $decoded)
                            ? (bool) $decoded['globalEnabled']
                            : $defaults['globalEnabled'],
                        'includeInSitemap' => array_key_exists('includeInSitemap', $decoded)
                            ? (bool) $decoded['includeInSitemap']
                            : $defaults['includeInSitemap'],
                        'showInPublicNav' => array_key_exists('showInPublicNav', $decoded)
                            ? (bool) $decoded['showInPublicNav']
                            : $defaults['showInPublicNav'],
                        'enableCatalogHandoff' => array_key_exists('enableCatalogHandoff', $decoded)
                            ? (bool) $decoded['enableCatalogHandoff']
                            : $defaults['enableCatalogHandoff'],
                        'pairStates' => $pairStates,
                        'bgRemover' => self::normalizeBgRemoverSettings(
                            is_array($decoded['bgRemover'] ?? null) ? $decoded['bgRemover'] : [],
                            $defaults['bgRemover']
                        ),
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Fallback safely to defaults
        }

        return $defaults;
    }

    public static function saveSettings(array $input): array
    {
        $current = self::getSettings();
        $nextPairs = $current['pairStates'];

        if (isset($input['pairStates']) && is_array($input['pairStates'])) {
            foreach ($nextPairs as $key => $oldVal) {
                if (array_key_exists($key, $input['pairStates'])) {
                    $nextPairs[$key] = (bool) $input['pairStates'][$key];
                }
            }
        }

        $next = [
            'globalEnabled' => array_key_exists('globalEnabled', $input)
                ? (bool) $input['globalEnabled']
                : $current['globalEnabled'],
            'includeInSitemap' => array_key_exists('includeInSitemap', $input)
                ? (bool) $input['includeInSitemap']
                : $current['includeInSitemap'],
            'showInPublicNav' => array_key_exists('showInPublicNav', $input)
                ? (bool) $input['showInPublicNav']
                : $current['showInPublicNav'],
            'enableCatalogHandoff' => array_key_exists('enableCatalogHandoff', $input)
                ? (bool) $input['enableCatalogHandoff']
                : $current['enableCatalogHandoff'],
            'pairStates' => $nextPairs,
            'bgRemover' => array_key_exists('bgRemover', $input) && is_array($input['bgRemover'])
                ? self::normalizeBgRemoverSettings($input['bgRemover'], $current['bgRemover'] ?? self::bgRemoverDefaults())
                : ($current['bgRemover'] ?? self::bgRemoverDefaults()),
        ];

        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($next)]
        );

        return $next;
    }

    public static function isToolEnabled(string $slug): bool
    {
        $all = self::getAllToolDefinitions();
        if (!isset($all[$slug])) {
            return false;
        }
        $settings = self::getSettings();
        if (empty($settings['globalEnabled'])) {
            return false;
        }

        $pairKey = $all[$slug]['pairKey'];
        return !empty($settings['pairStates'][$pairKey]);
    }

    public static function getEnabledTools(): array
    {
        $settings = self::getSettings();
        if (empty($settings['globalEnabled'])) {
            return [];
        }

        $all = self::getAllToolDefinitions();
        $enabled = [];
        foreach ($all as $slug => $tool) {
            if (!empty($settings['pairStates'][$tool['pairKey']])) {
                $tool['url'] = self::getToolUrl($slug, $tool['category'] ?? null);
                $enabled[$slug] = $tool;
            }
        }

        return $enabled;
    }

    public static function getToolForPublic(string $slug): ?array
    {
        if (!self::isToolEnabled($slug)) {
            return null;
        }

        $all = self::getAllToolDefinitions();
        $tool = $all[$slug];
        $enabledMap = self::getEnabledTools();

        $related = [];
        foreach ($tool['relatedSlugs'] ?? [] as $relSlug) {
            if (isset($enabledMap[$relSlug])) {
                $related[] = [
                    'slug' => $enabledMap[$relSlug]['slug'],
                    'url' => $enabledMap[$relSlug]['url'],
                    'shortTitle' => $enabledMap[$relSlug]['shortTitle'] ?? $enabledMap[$relSlug]['title'],
                    'title' => $enabledMap[$relSlug]['title'],
                    'fromFormat' => $enabledMap[$relSlug]['fromFormat'],
                    'toFormat' => $enabledMap[$relSlug]['toFormat'],
                    'shortDesc' => $enabledMap[$relSlug]['shortDesc'],
                ];
            }
        }

        $reverseAvailable = !empty($tool['reverseSlug']) && isset($enabledMap[$tool['reverseSlug']]);

        $extra = [];
        if (($tool['mode'] ?? '') === 'bg-remove') {
            $extra['bgRemoverConfig'] = self::getPublicBgRemoverConfig();
        }

        return array_merge($tool, $extra, [
            'url' => self::getToolUrl($slug, $tool['category'] ?? null),
            'reverseAvailable' => $reverseAvailable,
            'reverseUrl' => $reverseAvailable ? $enabledMap[$tool['reverseSlug']]['url'] : null,
            'reverseTitle' => $reverseAvailable ? ($enabledMap[$tool['reverseSlug']]['shortTitle'] ?? $enabledMap[$tool['reverseSlug']]['title']) : null,
            'relatedTools' => $related,
        ]);
    }

    public static function getPublicUiFlags(): array
    {
        $settings = self::getSettings();
        $globalEnabled = !empty($settings['globalEnabled']);
        $anyGroupEnabled = $globalEnabled && in_array(true, $settings['pairStates'], true);

        return [
            'toolsActive' => $anyGroupEnabled,
            'showInPublicNav' => $anyGroupEnabled && !empty($settings['showInPublicNav']),
            'enableCatalogHandoff' => $anyGroupEnabled && !empty($settings['enableCatalogHandoff']),
            'footerTools' => $anyGroupEnabled ? self::getFooterTools(5) : [],
            'megaMenuGenres' => ($anyGroupEnabled && !empty($settings['showInPublicNav'])) ? self::getMegaMenuGenres() : [],
        ];
    }

    /**
     * Group active tools into extensible genres for the desktop header super-menu dropdown.
     */
    public static function getMegaMenuGenres(): array
    {
        $enabled = self::getEnabledTools();
        if (empty($enabled)) {
            return [];
        }

        $genreDefinitions = [
            'converters' => [
                'id' => 'image-converters',
                'title' => 'Image Converters',
                'href' => '/tools/convert',
            ],
            'utilities' => [
                'id' => 'image-utilities',
                'title' => 'Image Utilities',
                'href' => '/tools/utilities',
            ],
            'developer' => [
                'id' => 'developer-tools',
                'title' => 'Developer Tools',
                'href' => '/tools/devtools',
            ],
        ];

        $genres = [];
        foreach ($genreDefinitions as $catKey => $meta) {
            $items = [];
            foreach ($enabled as $slug => $tool) {
                if (($tool['category'] ?? '') === $catKey) {
                    $items[] = [
                        'slug' => $slug,
                        'href' => $tool['url'] ?? self::getToolUrl($slug, $catKey),
                        'shortTitle' => $tool['shortTitle'] ?? $tool['title'],
                        'title' => $tool['title'],
                        'fromFormat' => $tool['fromFormat'],
                        'toFormat' => $tool['toFormat'],
                    ];
                }
            }

            if (!empty($items)) {
                $genres[] = array_merge($meta, ['tools' => $items]);
            }
        }

        return $genres;
    }

    /**
     * Return top N most popular currently active tools, filling remaining slots randomly from active tools.
     */
    public static function getFooterTools(int $limit = 5): array
    {
        $enabled = self::getEnabledTools();
        if (empty($enabled)) {
            return [];
        }

        $popularSlugs = [];
        try {
            if (Schema::hasTable('ToolUsageLog')) {
                $since = Carbon::now()->subDays(30);
                $rows = ToolUsageLog::query()
                    ->where('createdAt', '>=', $since)
                    ->select(
                        'toolSlug',
                        DB::raw("SUM(CASE WHEN eventType = 'convert' THEN 1 ELSE 0 END) as conversions"),
                        DB::raw('COUNT(*) as hits')
                    )
                    ->groupBy('toolSlug')
                    ->orderByDesc('conversions')
                    ->orderByDesc('hits')
                    ->get();

                foreach ($rows as $row) {
                    $slug = (string) $row->toolSlug;
                    if (isset($enabled[$slug]) && ((int) $row->conversions > 0 || (int) $row->hits > 0)) {
                        $popularSlugs[] = $slug;
                    }
                    if (count($popularSlugs) >= $limit) {
                        break;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fall through to random active tools
        }

        $selectedSlugs = array_slice($popularSlugs, 0, $limit);
        if (count($selectedSlugs) < $limit) {
            $remainingSlugs = array_values(array_diff(array_keys($enabled), $selectedSlugs));
            shuffle($remainingSlugs);
            foreach ($remainingSlugs as $slug) {
                $selectedSlugs[] = $slug;
                if (count($selectedSlugs) >= $limit) {
                    break;
                }
            }
        }

        return array_map(fn ($slug) => [
            'slug' => $slug,
            'shortTitle' => $enabled[$slug]['shortTitle'] ?? $enabled[$slug]['title'],
            'title' => $enabled[$slug]['title'],
            'href' => $enabled[$slug]['url'] ?? self::getToolUrl($slug, $enabled[$slug]['category'] ?? null),
        ], $selectedSlugs);
    }

    public static function getSitemapPaths(): array
    {
        $settings = self::getSettings();
        if (empty($settings['globalEnabled']) || empty($settings['includeInSitemap'])) {
            return [];
        }

        $enabled = self::getEnabledTools();
        if (empty($enabled)) {
            return [];
        }

        $paths = [
            ['path' => '/tools', 'priority' => '0.8', 'changefreq' => 'weekly'],
        ];

        $categoryHubs = [
            'converters' => '/tools/convert',
            'utilities' => '/tools/utilities',
            'developer' => '/tools/devtools',
        ];
        foreach ($categoryHubs as $cat => $hubPath) {
            foreach ($enabled as $tool) {
                if (($tool['category'] ?? '') === $cat) {
                    $paths[] = ['path' => $hubPath, 'priority' => '0.8', 'changefreq' => 'weekly'];
                    break;
                }
            }
        }

        foreach ($enabled as $slug => $tool) {
            $paths[] = [
                'path' => $tool['url'] ?? self::getToolUrl($slug, $tool['category'] ?? null),
                'priority' => '0.7',
                'changefreq' => 'weekly',
            ];
        }

        return $paths;
    }

    public static function trackUsage(string $slug, string $eventType = 'view', int $filesCount = 1, int $inputBytes = 0, int $outputBytes = 0, ?string $deviceType = null): void
    {
        $all = self::getAllToolDefinitions();
        if (!isset($all[$slug])) {
            return;
        }
        $normalizedType = $eventType === 'convert' ? 'convert' : 'view';

        try {
            if (!Schema::hasTable('ToolUsageLog')) {
                return;
            }
            ToolUsageLog::create([
                'toolSlug' => $slug,
                'eventType' => $normalizedType,
                'filesCount' => max(1, min($filesCount, 500)),
                'inputBytes' => max(0, $inputBytes),
                'outputBytes' => max(0, $outputBytes),
                'deviceType' => $deviceType ? substr($deviceType, 0, 32) : 'desktop',
            ]);
        } catch (\Throwable $e) {
            // Never disrupt user-facing conversion UX
        }
    }

    public static function getAnalyticsSummary(int $days = 30): array
    {
        $empty = [
            'days' => $days,
            'totalViews' => 0,
            'totalConversions' => 0,
            'totalFilesConverted' => 0,
            'totalBytesSaved' => 0,
            'bySlug' => [],
            'leaderboard' => [],
        ];

        try {
            if (!Schema::hasTable('ToolUsageLog')) {
                return $empty;
            }

            $since = Carbon::now()->subDays($days);
            $rows = ToolUsageLog::query()
                ->where('createdAt', '>=', $since)
                ->select(
                    'toolSlug',
                    'eventType',
                    DB::raw('COUNT(*) as eventCount'),
                    DB::raw('SUM(filesCount) as filesSum'),
                    DB::raw('SUM(inputBytes) as inputSum'),
                    DB::raw('SUM(outputBytes) as outputSum')
                )
                ->groupBy('toolSlug', 'eventType')
                ->get();

            $allTools = self::getAllToolDefinitions();
            $bySlug = [];
            $totalViews = 0;
            $totalConversions = 0;
            $totalFiles = 0;
            $totalInput = 0;
            $totalOutput = 0;

            foreach ($rows as $row) {
                $slug = (string) $row->toolSlug;
                if ($slug === 'remove-solid-background') {
                    $slug = 'remove-background';
                }
                if (!isset($bySlug[$slug])) {
                    $bySlug[$slug] = [
                        'slug' => $slug,
                        'url' => self::getToolUrl($slug, $allTools[$slug]['category'] ?? null),
                        'shortTitle' => $allTools[$slug]['shortTitle'] ?? ($allTools[$slug]['title'] ?? $slug),
                        'title' => $allTools[$slug]['title'] ?? $slug,
                        'views' => 0,
                        'conversions' => 0,
                        'filesConverted' => 0,
                        'inputBytes' => 0,
                        'outputBytes' => 0,
                        'bytesSaved' => 0,
                    ];
                }

                if ($row->eventType === 'convert') {
                    $cnt = (int) $row->eventCount;
                    $files = (int) $row->filesSum;
                    $inB = (int) $row->inputSum;
                    $outB = (int) $row->outputSum;
                    $bySlug[$slug]['conversions'] += $cnt;
                    $bySlug[$slug]['filesConverted'] += $files;
                    $bySlug[$slug]['inputBytes'] += $inB;
                    $bySlug[$slug]['outputBytes'] += $outB;
                    $bySlug[$slug]['bytesSaved'] += max(0, $inB - $outB);

                    $totalConversions += $cnt;
                    $totalFiles += $files;
                    $totalInput += $inB;
                    $totalOutput += $outB;
                } else {
                    $cnt = (int) $row->eventCount;
                    $bySlug[$slug]['views'] += $cnt;
                    $totalViews += $cnt;
                }
            }

            $leaderboard = array_values($bySlug);
            usort($leaderboard, function ($a, $b) {
                if ($a['conversions'] !== $b['conversions']) {
                    return $b['conversions'] <=> $a['conversions'];
                }
                return $b['views'] <=> $a['views'];
            });

            return [
                'days' => $days,
                'totalViews' => $totalViews,
                'totalConversions' => $totalConversions,
                'totalFilesConverted' => $totalFiles,
                'totalBytesSaved' => max(0, $totalInput - $totalOutput),
                'bySlug' => $bySlug,
                'leaderboard' => array_slice($leaderboard, 0, 15),
            ];
        } catch (\Throwable $e) {
            return $empty;
        }
    }

    public static function getAdminPayload(): array
    {
        $settings = self::getSettings();
        $allTools = self::getAllToolDefinitions();
        $analytics = self::getAnalyticsSummary(30);

        $groups = array_map(function ($group) use ($settings, $allTools, $analytics) {
            $pages = [];
            $groupViews = 0;
            $groupConversions = 0;
            foreach ($group['slugs'] as $slug) {
                $def = $allTools[$slug] ?? null;
                if (!$def) {
                    continue;
                }
                $stats = $analytics['bySlug'][$slug] ?? ['views' => 0, 'conversions' => 0, 'filesConverted' => 0, 'bytesSaved' => 0];
                $groupViews += $stats['views'];
                $groupConversions += $stats['conversions'];
                $pages[] = [
                    'slug' => $slug,
                    'url' => self::getToolUrl($slug, $def['category'] ?? null),
                    'shortTitle' => $def['shortTitle'] ?? $def['title'],
                    'title' => $def['title'],
                    'fromFormat' => $def['fromFormat'],
                    'toFormat' => $def['toFormat'],
                    'views' => $stats['views'],
                    'conversions' => $stats['conversions'],
                ];
            }

            return [
                'key' => $group['key'],
                'label' => $group['label'],
                'isPair' => $group['isPair'],
                'category' => $group['category'],
                'description' => $group['description'],
                'enabled' => !empty($settings['pairStates'][$group['key']]),
                'pages' => $pages,
                'views30d' => $groupViews,
                'conversions30d' => $groupConversions,
            ];
        }, self::getGroupCatalog());

        return [
            'settings' => $settings,
            'groups' => $groups,
            'analytics' => $analytics,
            'bgRemoverDiagnostics' => self::getBgRemoverDiagnostics($settings['bgRemover'] ?? null),
        ];
    }
}
