<?php

namespace App\Services;

use App\Models\Setting;

class LegalPagesService
{
    public const SETTING_KEY = 'custom_legal_pages_v1';

    public const PAGE_KEYS = [
        'aboutUs',
        'contactUs',
        'termsOfService',
        'privacyPolicy',
        'dmcaPolicy',
    ];

    public static function defaults(): array
    {
        return [
            'aboutUs' => [
                'heroBadge' => 'Established {{foundedYear}}',
                'heroTitle' => 'About {{websiteName}}',
                'heroSubtitle' => '{{tagline}}',
                'missionTitle' => 'Our Mission',
                'missionBodyHtml' => '<p>Founded in <strong>{{foundedYear}}</strong> by <strong>{{companyName}}</strong>, <strong>{{websiteName}}</strong> (<a href="{{websiteUrl}}">{{websiteUrl}}</a>) was built with a simple goal: to save designers, students, content creators, and developers hours of time spent hunting for clean, transparent PNG images.</p><p>Too often, searching for a transparent PNG leads to fake checkerboard backgrounds, low-resolution thumbnails, or endlessly gated download pages. At {{websiteName}}, we focus on speed, clarity, and quality—organizing high-resolution transparent cutouts with accurate titles, descriptions, and searchable tags.</p>',
                'highlights' => [
                    [
                        'id' => 'transparent-pngs',
                        'icon' => 'sparkles',
                        'title' => 'True Transparent PNGs',
                        'descriptionHtml' => '<p>Every image on {{websiteName}} is curated for clean alpha-channel transparency so you can drop assets directly into your designs without tedious background removal.</p>',
                    ],
                    [
                        'id' => 'smart-tagging',
                        'icon' => 'search',
                        'title' => 'Smart Tagging & Fast Search',
                        'descriptionHtml' => '<p>Our library is organized with rich keywords and categories so designers, marketers, educators, and creators can find the exact cutout they need in seconds.</p>',
                    ],
                    [
                        'id' => 'instant-downloads',
                        'icon' => 'download',
                        'title' => 'Instant, Hassle-Free Downloads',
                        'descriptionHtml' => '<p>No mandatory sign-ups or complicated workflows—just browse, preview high-resolution dimensions, and download with a single click.</p>',
                    ],
                    [
                        'id' => 'quality-care',
                        'icon' => 'shield-check',
                        'title' => 'Quality & Community Care',
                        'descriptionHtml' => '<p>Operated by {{companyName}}, we continuously expand our catalog while respecting creators and responding promptly to community feedback.</p>',
                    ],
                ],
                'ctaTitle' => 'Have a question or suggestion?',
                'ctaSubtitleHtml' => '<p>We love hearing from our community. Reach out anytime at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>',
                'ctaPrimaryText' => 'Contact Us',
                'ctaSecondaryText' => 'Browse PNGs',
            ],
            'contactUs' => [
                'heroBadge' => 'Get in Touch',
                'heroTitle' => 'Contact Us',
                'heroSubtitleHtml' => '<p>Have questions, feedback, or need assistance with an image on <strong>{{websiteName}}</strong>? Reach out to us using the details or form below.</p>',
                'supportTitle' => 'General Support & Inquiries',
                'supportDescriptionHtml' => '<p>For questions, partnerships, or feedback about {{websiteName}}:</p>',
                'dmcaTitle' => 'DMCA & Copyright Notices',
                'dmcaDescriptionHtml' => '<p>For copyright or takedown requests (see our <a href="/dmca-policy">DMCA Policy</a>):</p>',
                'orgTitle' => 'Organization Info',
                'orgNoteHtml' => '',
                'formTitle' => 'Send Us a Message',
                'formSubtitleHtml' => '<p>Fill out the form below to compose a message directly to <strong>{{contactEmail}}</strong>.</p>',
                'submitButtonText' => 'Send Message',
            ],
            'termsOfService' => [
                'badge' => 'Legal Agreement',
                'title' => 'Terms of Service',
                'subtitle' => 'Effective Status: Active • Governed by the laws of {{country}}',
                'sections' => [
                    [
                        'id' => 'acceptance',
                        'heading' => '1. Acceptance of Terms',
                        'bodyHtml' => '<p>Welcome to <strong>{{websiteName}}</strong> (<a href="{{websiteUrl}}">{{websiteUrl}}</a>), operated by <strong>{{companyName}}</strong>. By accessing, browsing, or downloading any PNG images or materials from our website, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the website immediately.</p>',
                    ],
                    [
                        'id' => 'license',
                        'heading' => '2. License & Permitted Use of PNG Assets',
                        'bodyHtml' => '<p>{{websiteName}} provides transparent PNG images, illustrations, icons, and cutouts for creative, educational, and design reference purposes. Subject to your compliance with these Terms:</p><ul><li>You may download and use PNG images from {{websiteName}} for personal, educational, and non-commercial creative projects.</li><li>You may modify, resize, crop, or combine downloaded PNG assets into derivative creative compositions.</li><li>Some assets featured on {{websiteName}} may depict third-party trademarks, logos, or characters. Such assets remain the intellectual property of their respective copyright/trademark holders and are provided strictly for editorial or personal reference unless you obtain independent authorization.</li></ul>',
                    ],
                    [
                        'id' => 'prohibited',
                        'heading' => '3. Prohibited Conduct',
                        'bodyHtml' => '<p>When using {{websiteName}}, you agree not to:</p><ul><li>Redistribute, resell, sublicense, or bundle raw PNG files from {{websiteName}} on competing stock image websites or asset marketplaces.</li><li>Use automated scrapers, bots, crawlers, or bulk-harvesting tools to download assets in a manner that places excessive load on our servers.</li><li>Hotlink directly to image files hosted on {{websiteName}} servers from external websites.</li><li>Use any downloaded image in a defamatory, unlawful, deceptive, or infringing manner.</li></ul>',
                    ],
                    [
                        'id' => 'ip',
                        'heading' => '4. Intellectual Property Rights',
                        'bodyHtml' => '<p>The compilation, layout, search technology, branding, and original content on {{websiteName}} are owned by <strong>{{companyName}}</strong>. If you believe any content hosted on {{websiteName}} infringes upon your copyright or intellectual property rights, please review our <a href="/dmca-policy">DMCA Policy</a> or email our copyright team at <a href="mailto:{{dmcaEmail}}">{{dmcaEmail}}</a>.</p>',
                    ],
                    [
                        'id' => 'warranties',
                        'heading' => '5. Disclaimer of Warranties',
                        'bodyHtml' => '<p>All PNG images, metadata, and services on {{websiteName}} are provided on an “AS IS” and “AS AVAILABLE” basis without warranties of any kind, whether express or implied. {{companyName}} does not warrant that downloaded files will be free of errors, nor does it guarantee that third-party rights clearances have been obtained for identifiable brands, people, or properties depicted in user-submitted or indexed images.</p>',
                    ],
                    [
                        'id' => 'liability',
                        'heading' => '6. Limitation of Liability',
                        'bodyHtml' => '<p>To the fullest extent permitted by applicable law in <strong>{{country}}</strong>, {{companyName}} and its operators, affiliates, and contributors shall not be liable for any indirect, incidental, consequential, or punitive damages arising out of your access to, use of, or inability to use {{websiteName}} or any downloaded assets.</p>',
                    ],
                    [
                        'id' => 'governing-law',
                        'heading' => '7. Governing Law & Changes to Terms',
                        'bodyHtml' => '<p>These Terms of Service are governed by and construed in accordance with the laws of <strong>{{country}}</strong>. We reserve the right to update or modify these Terms at any time without prior notice. Continued use of {{websiteName}} constitutes acceptance of the revised Terms.</p>',
                    ],
                    [
                        'id' => 'contact',
                        'heading' => '8. Contact Information',
                        'bodyHtml' => '<p>If you have any questions regarding these Terms of Service, please contact <strong>{{companyName}}</strong> at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>',
                    ],
                ],
            ],
            'privacyPolicy' => [
                'badge' => 'Data & Privacy',
                'title' => 'Privacy Policy',
                'subtitle' => 'Operated by {{companyName}} • {{websiteUrl}}',
                'sections' => [
                    [
                        'id' => 'intro',
                        'heading' => '1. Introduction',
                        'bodyHtml' => '<p>At <strong>{{websiteName}}</strong> (<a href="{{websiteUrl}}">{{websiteUrl}}</a>), operated by <strong>{{companyName}}</strong>, we respect your privacy and are committed to protecting any information collected while you browse and download transparent PNG images on our platform. This Privacy Policy explains what data we collect, why we collect it, and how it is handled.</p>',
                    ],
                    [
                        'id' => 'info-collected',
                        'heading' => '2. Information We Collect',
                        'bodyHtml' => '<p>You can browse and download PNG images on {{websiteName}} without creating an account. We collect minimal, non-identifying technical data to keep our service fast and reliable:</p><ul><li><strong>Download &amp; Usage Analytics:</strong> When you download a PNG asset, we record aggregate analytics such as general device category (desktop, mobile, or tablet), approximate country derived from IP geolocation, and download timestamps to understand popular assets.</li><li><strong>Preferences &amp; Local Storage:</strong> We store your visual theme preference (such as dark or light mode) locally in your browser so your experience remains consistent across visits.</li><li><strong>Direct Communications:</strong> If you contact us via email at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>, we receive your email address and any details you choose to include in your message.</li></ul>',
                    ],
                    [
                        'id' => 'how-used',
                        'heading' => '3. How We Use Information',
                        'bodyHtml' => '<p>We use the information we collect solely to:</p><ul><li>Deliver, optimize, and maintain our PNG search and download infrastructure.</li><li>Analyze aggregate traffic trends and popular image categories.</li><li>Detect and prevent automated abuse, scraping, or security threats.</li><li>Respond to support inquiries, feedback, or copyright notifications.</li></ul>',
                    ],
                    [
                        'id' => 'cookies',
                        'heading' => '4. Cookies & Third-Party Scripts',
                        'bodyHtml' => '<p>{{websiteName}} may use essential cookies or third-party analytics and advertising scripts to measure site performance and support free image hosting. You may disable cookies at any time through your browser settings without losing the ability to search and download PNG files.</p>',
                    ],
                    [
                        'id' => 'security',
                        'heading' => '5. Data Sharing & Security',
                        'bodyHtml' => '<p>We do not sell, rent, or trade your personal information to third parties. Aggregate, non-identifiable usage statistics may be used internally to improve our catalog. We implement industry-standard security controls to safeguard our database and servers.</p>',
                    ],
                    [
                        'id' => 'rights',
                        'heading' => '6. Your Privacy Rights',
                        'bodyHtml' => '<p>Depending on your location (including residents of {{country}}, the European Economic Area, or California), you may have the right to request access to, correction of, or deletion of any personal data you have submitted to us. To exercise these rights, please email us at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>',
                    ],
                    [
                        'id' => 'contact',
                        'heading' => '7. Contact Us About Privacy',
                        'bodyHtml' => '<p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact <strong>{{companyName}}</strong> at <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>',
                    ],
                ],
            ],
            'dmcaPolicy' => [
                'badge' => 'Copyright Compliance',
                'title' => 'DMCA Policy & Takedown Notice',
                'subtitle' => 'Intellectual Property Protection for {{websiteName}} ({{websiteUrl}})',
                'sections' => [
                    [
                        'id' => 'respect-ip',
                        'heading' => '1. Respect for Intellectual Property',
                        'bodyHtml' => '<p><strong>{{websiteName}}</strong> (<a href="{{websiteUrl}}">{{websiteUrl}}</a>), operated by <strong>{{companyName}}</strong>, respects the intellectual property rights of artists, photographers, designers, and copyright holders worldwide and complies with the Digital Millennium Copyright Act (17 U.S.C. § 512) and applicable international copyright laws.</p><p>If you believe that any PNG image or material available on {{websiteName}} infringes upon a copyright that you own or are authorized to enforce, please submit a written takedown notice to our Designated Copyright Agent using the instructions below.</p>',
                    ],
                    [
                        'id' => 'submit-request',
                        'heading' => '2. How to Submit a DMCA Takedown Request',
                        'bodyHtml' => '<p>To expedite the removal of allegedly infringing material, please include the following information in your written notification:</p><ol><li><strong>Identification of the Copyrighted Work:</strong> A clear description of the copyrighted work you claim has been infringed, or a link to an authorized original version of the work.</li><li><strong>Exact URL(s) on {{websiteName}}:</strong> The specific URL(s) of the image page(s) on {{websiteName}} that you are requesting to have removed so we can locate the exact asset quickly.</li><li><strong>Your Contact Details:</strong> Your full legal name, organization (if applicable), mailing address, telephone number, and a valid email address.</li><li><strong>Good-Faith Statement:</strong> A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li><li><strong>Accuracy &amp; Authority Statement:</strong> A statement made under penalty of perjury that the information in your notification is accurate and that you are the copyright owner or authorized to act on behalf of the owner.</li><li><strong>Signature:</strong> Your physical or electronic signature (typing your full legal name at the bottom of your email suffices as an electronic signature).</li></ol>',
                    ],
                    [
                        'id' => 'agent-contact',
                        'heading' => '3. Designated Copyright Agent Contact',
                        'bodyHtml' => '<p>{{companyName}} — Copyright &amp; DMCA Agent</p>',
                        'showContactCard' => true,
                    ],
                    [
                        'id' => 'review-timeline',
                        'heading' => '4. Prompt Removal & Review Timeline',
                        'bodyHtml' => '<p>Upon receipt of a valid and complete DMCA notice at <a href="mailto:{{dmcaEmail}}">{{dmcaEmail}}</a>, our team will promptly review the claim and remove or disable access to the specified PNG asset—typically within 24 to 72 business hours.</p>',
                    ],
                ],
            ],
        ];
    }

    public static function get(): array
    {
        $defaults = self::defaults();

        try {
            $record = Setting::find(self::SETTING_KEY);
            if ($record && $record->value) {
                $parsed = json_decode($record->value, true);
                if (is_array($parsed)) {
                    $result = [];
                    foreach (self::PAGE_KEYS as $key) {
                        $result[$key] = self::mergePage($defaults[$key], $parsed[$key] ?? []);
                    }
                    $result['updatedAt'] = $parsed['updatedAt'] ?? null;
                    return $result;
                }
            }
        } catch (\Throwable $e) {
            // Fall back cleanly to defaults if DB isn't ready
        }

        return $defaults;
    }

    public static function save(array $payload): array
    {
        $current = self::get();
        $defaults = self::defaults();
        $updated = [];

        foreach (self::PAGE_KEYS as $key) {
            $incoming = isset($payload[$key]) && is_array($payload[$key])
                ? $payload[$key]
                : ($current[$key] ?? $defaults[$key]);
            $updated[$key] = self::sanitizePage($key, $incoming, $defaults[$key]);
        }

        $updated['updatedAt'] = now()->toISOString();

        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($updated)]
        );

        return $updated;
    }

    public static function reset(?string $pageKey = null): array
    {
        $defaults = self::defaults();

        if ($pageKey && in_array($pageKey, self::PAGE_KEYS, true)) {
            $current = self::get();
            $current[$pageKey] = $defaults[$pageKey];
            $current['updatedAt'] = now()->toISOString();
            Setting::updateOrCreate(
                ['key' => self::SETTING_KEY],
                ['value' => json_encode($current)]
            );
            return $current;
        }

        $defaults['updatedAt'] = now()->toISOString();
        Setting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($defaults)]
        );

        return $defaults;
    }

    public static function getResolvedPage(string $pageKey, ?array $websiteInfo = null): array
    {
        $all = self::get();
        $defaults = self::defaults();
        $page = $all[$pageKey] ?? ($defaults[$pageKey] ?? []);
        $info = $websiteInfo ?? WebsiteInfoService::get();

        return self::resolvePlaceholders($page, $info);
    }

    public static function sanitizeHtml(string $html): string
    {
        $trimmed = trim($html);
        if ($trimmed === '') {
            return '';
        }

        if (!class_exists(\DOMDocument::class)) {
            return strip_tags($trimmed, '<p><br><strong><b><em><i><u><s><ul><ol><li><a><h3><h4><blockquote><code><span>');
        }

        $allowedTags = [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
            'ul', 'ol', 'li', 'a', 'h3', 'h4', 'blockquote', 'code', 'span',
        ];
        $dropWithChildren = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'textarea', 'button'];

        $prev = libxml_use_internal_errors(true);
        $dom = new \DOMDocument('1.0', 'UTF-8');
        $loaded = @$dom->loadHTML(
            '<?xml encoding="utf-8" ?><div id="legal-sanitize-root">' . $trimmed . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        if (!$loaded) {
            return strip_tags($trimmed, '<p><br><strong><b><em><i><u><s><ul><ol><li><a><h3><h4><blockquote><code><span>');
        }

        $root = $dom->getElementById('legal-sanitize-root');
        if (!$root) {
            return strip_tags($trimmed, '<p><br><strong><b><em><i><u><s><ul><ol><li><a><h3><h4><blockquote><code><span>');
        }

        $walk = function (\DOMNode $node) use (&$walk, $allowedTags, $dropWithChildren, $dom): void {
            $children = [];
            foreach ($node->childNodes as $child) {
                $children[] = $child;
            }

            foreach ($children as $child) {
                if ($child instanceof \DOMComment) {
                    $node->removeChild($child);
                    continue;
                }

                if ($child instanceof \DOMElement) {
                    $tag = strtolower($child->tagName);

                    if (in_array($tag, $dropWithChildren, true)) {
                        $node->removeChild($child);
                        continue;
                    }

                    // Normalize <div> block wrappers created by contentEditable into <p>
                    if ($tag === 'div') {
                        $p = $dom->createElement('p');
                        while ($child->firstChild) {
                            $p->appendChild($child->firstChild);
                        }
                        $node->replaceChild($p, $child);
                        $child = $p;
                        $tag = 'p';
                    }

                    $walk($child);

                    if (!in_array($tag, $allowedTags, true)) {
                        while ($child->firstChild) {
                            $node->insertBefore($child->firstChild, $child);
                        }
                        $node->removeChild($child);
                        continue;
                    }

                    // Strip unsafe attributes
                    $attrs = [];
                    foreach ($child->attributes as $attr) {
                        $attrs[] = $attr->name;
                    }
                    foreach ($attrs as $attrName) {
                        $lowerAttr = strtolower($attrName);
                        if ($tag === 'a' && $lowerAttr === 'href') {
                            $href = trim($child->getAttribute($attrName));
                            $isSafeHref = str_starts_with($href, '/')
                                || str_starts_with($href, '#')
                                || str_starts_with($href, '{{')
                                || (bool) preg_match('#^(https?://|mailto:)#i', $href);
                            if (!$isSafeHref) {
                                $child->removeAttribute($attrName);
                            }
                            continue;
                        }
                        if ($tag === 'a' && in_array($lowerAttr, ['target', 'rel', 'title'], true)) {
                            if ($lowerAttr === 'target' && $child->getAttribute($attrName) === '_blank') {
                                $child->setAttribute('rel', 'noopener noreferrer');
                            }
                            continue;
                        }
                        $child->removeAttribute($attrName);
                    }
                }
            }
        };

        $walk($root);

        $output = '';
        foreach ($root->childNodes as $child) {
            $output .= $dom->saveHTML($child);
        }

        return trim($output);
    }

    private static function mergePage(array $defaults, mixed $stored): array
    {
        if (!is_array($stored)) {
            return $defaults;
        }

        $merged = array_merge($defaults, $stored);

        if (isset($defaults['highlights'])) {
            $merged['highlights'] = is_array($stored['highlights'] ?? null)
                ? self::sanitizeHighlights($stored['highlights'], $defaults['highlights'])
                : $defaults['highlights'];
        }

        if (isset($defaults['sections'])) {
            $merged['sections'] = is_array($stored['sections'] ?? null)
                ? self::sanitizeSections($stored['sections'], $defaults['sections'])
                : $defaults['sections'];
        }

        return $merged;
    }

    private static function sanitizePage(string $key, array $incoming, array $defaultPage): array
    {
        $result = $defaultPage;

        foreach ($defaultPage as $field => $defaultValue) {
            if ($field === 'highlights') {
                $raw = is_array($incoming['highlights'] ?? null) ? $incoming['highlights'] : $defaultValue;
                $result['highlights'] = self::sanitizeHighlights($raw, $defaultValue);
                continue;
            }

            if ($field === 'sections') {
                $raw = is_array($incoming['sections'] ?? null) ? $incoming['sections'] : $defaultValue;
                $result['sections'] = self::sanitizeSections($raw, $defaultValue);
                continue;
            }

            if (!array_key_exists($field, $incoming)) {
                continue;
            }

            $value = $incoming[$field];
            if (is_bool($defaultValue)) {
                $result[$field] = (bool) $value;
            } elseif (str_ends_with($field, 'Html')) {
                $result[$field] = self::sanitizeHtml((string) $value);
            } else {
                $result[$field] = trim(strip_tags((string) $value));
            }
        }

        return $result;
    }

    private static function sanitizeHighlights(array $items, array $fallback): array
    {
        $allowedIcons = ['sparkles', 'search', 'download', 'shield-check'];
        $clean = [];

        foreach ($items as $idx => $item) {
            if (!is_array($item)) {
                continue;
            }
            $title = trim(strip_tags((string) ($item['title'] ?? '')));
            $descHtml = self::sanitizeHtml((string) ($item['descriptionHtml'] ?? ''));
            if ($title === '' && $descHtml === '') {
                continue;
            }
            $icon = (string) ($item['icon'] ?? 'sparkles');
            if (!in_array($icon, $allowedIcons, true)) {
                $icon = 'sparkles';
            }
            $id = trim(strip_tags((string) ($item['id'] ?? '')));
            $clean[] = [
                'id' => $id !== '' ? $id : ('highlight-' . ($idx + 1)),
                'icon' => $icon,
                'title' => $title,
                'descriptionHtml' => $descHtml,
            ];
        }

        return count($clean) > 0 ? $clean : $fallback;
    }

    private static function sanitizeSections(array $sections, array $fallback): array
    {
        $clean = [];

        foreach ($sections as $idx => $section) {
            if (!is_array($section)) {
                continue;
            }
            $heading = trim(strip_tags((string) ($section['heading'] ?? '')));
            $bodyHtml = self::sanitizeHtml((string) ($section['bodyHtml'] ?? ''));
            if ($heading === '' && $bodyHtml === '') {
                continue;
            }
            $id = trim(strip_tags((string) ($section['id'] ?? '')));
            $entry = [
                'id' => $id !== '' ? $id : ('section-' . ($idx + 1)),
                'heading' => $heading,
                'bodyHtml' => $bodyHtml,
            ];
            if (array_key_exists('showContactCard', $section)) {
                $entry['showContactCard'] = (bool) $section['showContactCard'];
            }
            $clean[] = $entry;
        }

        return count($clean) > 0 ? $clean : $fallback;
    }

    private static function resolvePlaceholders(mixed $node, array $info, bool $escapeForHtml = false): mixed
    {
        if (is_string($node)) {
            $rawTokens = [
                '{{websiteName}}' => (string) ($info['websiteName'] ?? 'Png101'),
                '{{websiteUrl}}' => (string) ($info['websiteUrl'] ?? 'https://png101.com'),
                '{{tagline}}' => (string) ($info['tagline'] ?? ''),
                '{{companyName}}' => (string) ($info['companyName'] ?? 'Png101'),
                '{{foundedYear}}' => (string) ($info['foundedYear'] ?? '2025'),
                '{{country}}' => (string) ($info['country'] ?? 'United States'),
                '{{contactEmail}}' => (string) ($info['contactEmail'] ?? 'contact@png101.com'),
                '{{dmcaEmail}}' => (string) ($info['dmcaEmail'] ?? ($info['contactEmail'] ?? 'dmca@png101.com')),
                '{{address}}' => (string) ($info['address'] ?? ''),
            ];
            if ($escapeForHtml) {
                $tokens = array_map(
                    static fn (string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                    $rawTokens
                );
                return strtr($node, $tokens);
            }
            return strtr($node, $rawTokens);
        }

        if (is_array($node)) {
            $out = [];
            foreach ($node as $k => $v) {
                $isHtmlKey = is_string($k) && str_ends_with($k, 'Html');
                $out[$k] = self::resolvePlaceholders($v, $info, $isHtmlKey || $escapeForHtml);
            }
            return $out;
        }

        return $node;
    }
}
