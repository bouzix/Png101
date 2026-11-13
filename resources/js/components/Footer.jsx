import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Footer() {
    const { url, props } = usePage();
    const websiteInfo = props?.websiteInfo;
    const pathname = url.split('?')[0];

    if (pathname.startsWith('/admin') || pathname.startsWith('/team')) {
        return null;
    }

    const siteName = websiteInfo?.siteName || 'Png101';
    const logoPath = websiteInfo?.logoPath || '/assets/logo.png';
    const logoWidth = websiteInfo?.logoWidth || 120;
    const logoHeight = websiteInfo?.logoHeight || 36;
    const description = websiteInfo?.description || 'Free High-Resolution Transparent PNG Images for designers and creators.';

    const footerLinks = [
        { name: 'About Us', href: '/about-us' },
        { name: 'Contact Us', href: '/contact-us' },
        { name: 'Terms of Service', href: '/terms-of-service' },
        { name: 'Privacy Policy', href: '/privacy-policy' },
        { name: 'DMCA Policy', href: '/dmca-policy' },
    ];

    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-card-border bg-card-bg/60 backdrop-blur-md transition-colors duration-300 mt-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-8 border-b border-card-border">
                    {/* Brand & Tagline */}
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <img
                                src={logoPath}
                                alt={`${siteName} Logo`}
                                style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }}
                                className="object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>
                        <p className="text-xs text-muted-text max-w-xs text-center md:text-left">
                            {description}
                        </p>
                    </div>

                    {/* Legal & Info Navigation */}
                    <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                        {footerLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors ${
                                    pathname === link.href
                                        ? 'text-primary-glow'
                                        : 'text-foreground/70 hover:text-foreground'
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Bottom Copyright */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-text">
                    <p>&copy; {currentYear} {siteName}. All rights reserved.</p>
                    <p className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>100% Free Transparent PNGs</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}

