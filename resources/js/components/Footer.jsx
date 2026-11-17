import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronDown, Mail, Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandMark';

export default function Footer({ info = {}, currentUrl = '', showConverters = false, footerTools = [], editorNav = {} }) {
    const showConvertersInNav = Boolean(showConverters);
    const showEditorInFooter = Boolean(editorNav?.showInFooter);
    const editorNavLabel = editorNav?.navLabel || 'Image Editor';
    const activeFooterTools = Array.isArray(footerTools) ? footerTools.slice(0, 5) : [];
    const hasToolsColumn = activeFooterTools.length > 0;
    const pathname = currentUrl || (typeof window !== 'undefined' ? window.location.pathname : '');

    const [openSection, setOpenSection] = useState(null);

    if (
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/team') ||
        pathname?.startsWith('/image-editor') ||
        pathname === '/maintenance'
    ) {
        return null;
    }

    const currentYear = new Date().getFullYear();
    const siteName = info.websiteName || 'Png101';

    const sections = [
        {
            id: 'explore',
            title: 'Explore',
            links: [
                { name: 'Home', href: '/' },
                { name: 'Latest Uploads', href: '/latest' },
                { name: 'Collections', href: '/collections' },
                { name: 'Tags (A–Z)', href: '/tags', accent: true },
                ...(showConvertersInNav ? [{ name: 'Image Converters', href: '/tools/convert' }] : []),
                ...(showEditorInFooter ? [{ name: editorNavLabel, href: '/image-editor', badge: true }] : []),
            ],
        },
        ...(hasToolsColumn
            ? [
                  {
                      id: 'tools',
                      title: 'Tools',
                      links: [
                          ...activeFooterTools.map((tool) => ({
                              name: tool.shortTitle || tool.title,
                              href: tool.href,
                          })),
                          { name: 'All Tools →', href: '/tools', accent: true },
                      ],
                  },
              ]
            : []),
        {
            id: 'company',
            title: 'Company & Legal',
            links: [
                { name: 'About Us', href: '/about-us' },
                { name: 'Contact Us', href: '/contact-us' },
                { name: 'Terms of Service', href: '/terms-of-service' },
                { name: 'Privacy Policy', href: '/privacy-policy' },
                { name: 'DMCA Policy', href: '/dmca-policy' },
            ],
        },
    ];

    const toggleMobileSection = (id) => {
        setOpenSection((prev) => (prev === id ? null : id));
    };

    const BrandMark = (
        <Link href="/" className="inline-flex items-center group shrink-0">
            <BrandLogo websiteInfo={info} siteName={siteName} size="footer" />
        </Link>
    );

    const renderFooterLink = (link, compact = false) => (
        <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-1.5 transition-colors ${
                compact ? 'text-xs py-1' : 'text-xs lg:text-sm py-0.5'
            } ${
                link.accent
                    ? 'font-semibold text-primary-glow/90 hover:text-primary-glow'
                    : 'text-foreground/65 hover:text-primary-glow'
            }`}
        >
            {link.badge && <Sparkles className="w-3 h-3 text-primary-glow shrink-0" />}
            <span className="truncate">{link.name}</span>
        </Link>
    );

    return (
        <footer
            data-testid="site-footer"
            className="mt-auto relative border-t border-card-border bg-card-bg/85 backdrop-blur-xl text-foreground pb-20 md:pb-0 overflow-hidden"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow/40 to-transparent"
            />

            <div className="w-full px-4 sm:px-8 md:px-10 lg:px-16 py-6 md:py-8 lg:py-10">
                {/* PHONE (< md): Ultra-Compact Brand Strip + Collapsible Accordion Sections */}
                <div className="md:hidden space-y-4">
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            {BrandMark}
                            {info.contactEmail && (
                                <a
                                    href={`mailto:${info.contactEmail}`}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/70 border border-card-border text-[11px] font-medium text-foreground/75 hover:text-primary-glow hover:border-primary-glow/50 transition-colors max-w-full"
                                >
                                    <Mail className="w-3 h-3 text-primary-glow shrink-0" />
                                    <span className="truncate">{info.contactEmail}</span>
                                </a>
                            )}
                        </div>
                        {info.tagline && (
                            <p className="text-xs text-foreground/60 leading-relaxed line-clamp-2">
                                {info.tagline}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5" data-testid="footer-mobile-accordions">
                        {sections.map((section) => {
                            const isOpen = openSection === section.id;
                            return (
                                <div
                                    key={section.id}
                                    className="rounded-xl border border-card-border/80 bg-background/40 overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        data-testid={`footer-accordion-btn-${section.id}`}
                                        aria-expanded={isOpen}
                                        onClick={() => toggleMobileSection(section.id)}
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-background/60 transition-colors"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                                            {section.title}
                                        </span>
                                        <span className="inline-flex items-center gap-2 text-[10px] font-medium text-foreground/45">
                                            <span>{section.links.length}</span>
                                            <ChevronDown
                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                                    isOpen ? 'rotate-180 text-primary-glow' : ''
                                                }`}
                                            />
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div
                                            data-testid={`footer-accordion-panel-${section.id}`}
                                            className="px-3.5 pb-3 pt-1 border-t border-card-border/60 grid grid-cols-2 gap-x-3 gap-y-1.5"
                                        >
                                            {section.links.map((link) => renderFooterLink(link, true))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TABLET (md .. < lg): Compact Horizontal Brand Header + Balanced Columns */}
                <div className="hidden md:block lg:hidden space-y-6">
                    <div className="flex items-center justify-between gap-6 pb-5 border-b border-card-border/80">
                        <div className="space-y-1.5 min-w-0">
                            {BrandMark}
                            {info.tagline && (
                                <p className="text-xs text-foreground/60 max-w-md leading-relaxed line-clamp-2">
                                    {info.tagline}
                                </p>
                            )}
                        </div>
                        {info.contactEmail && (
                            <a
                                href={`mailto:${info.contactEmail}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/70 border border-card-border text-xs font-medium text-foreground/75 hover:text-primary-glow hover:border-primary-glow/50 transition-colors shrink-0"
                            >
                                <Mail className="w-3.5 h-3.5 text-primary-glow" />
                                <span>{info.contactEmail}</span>
                            </a>
                        )}
                    </div>

                    <div className={`grid gap-6 ${hasToolsColumn ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {sections.map((section) => (
                            <div key={section.id} className="space-y-2.5 min-w-0">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">
                                    {section.title}
                                </h3>
                                <ul className="space-y-1.5">
                                    {section.links.map((link) => (
                                        <li key={link.href}>{renderFooterLink(link, false)}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DESKTOP (>= lg): Asymmetric Brand Column + Structured Link Columns */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-8 pb-8">
                    <div className={`${hasToolsColumn ? 'lg:col-span-5' : 'lg:col-span-6'} space-y-3.5`}>
                        {BrandMark}
                        {info.tagline && (
                            <p className="text-sm text-foreground/60 max-w-md leading-relaxed">
                                {info.tagline}
                            </p>
                        )}
                        {info.contactEmail && (
                            <div>
                                <a
                                    href={`mailto:${info.contactEmail}`}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/70 border border-card-border text-xs font-medium text-foreground/75 hover:text-primary-glow hover:border-primary-glow/50 transition-colors"
                                >
                                    <Mail className="w-3.5 h-3.5 text-primary-glow" />
                                    <span>{info.contactEmail}</span>
                                </a>
                            </div>
                        )}
                    </div>

                    <div
                        className={`${
                            hasToolsColumn ? 'lg:col-span-7 grid-cols-3' : 'lg:col-span-6 grid-cols-2'
                        } grid gap-8`}
                    >
                        {sections.map((section) => (
                            <div key={section.id} className="space-y-3 min-w-0">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                                    {section.title}
                                </h3>
                                <ul className="space-y-2">
                                    {section.links.map((link) => (
                                        <li key={link.href}>{renderFooterLink(link, false)}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Slim Bottom Utility Bar */}
                <div className="mt-4 md:mt-6 pt-4 md:pt-5 border-t border-card-border/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-foreground/55">
                    <p className="text-center sm:text-left">
                        &copy; {currentYear} {info.companyName || siteName}. All rights reserved.
                    </p>
                    <div className="hidden sm:flex items-center gap-3 md:pr-12">
                        <Link href="/privacy-policy" className="hover:text-primary-glow transition-colors">
                            Privacy
                        </Link>
                        <span aria-hidden="true" className="text-foreground/25">·</span>
                        <Link href="/terms-of-service" className="hover:text-primary-glow transition-colors">
                            Terms
                        </Link>
                        <span aria-hidden="true" className="text-foreground/25">·</span>
                        <Link href="/dmca-policy" className="hover:text-primary-glow transition-colors">
                            DMCA
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
