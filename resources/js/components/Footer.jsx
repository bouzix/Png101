import React from 'react';
import { Link } from '@inertiajs/react';

export default function Footer({ info = {}, currentUrl = '' }) {
    const pathname = currentUrl || (typeof window !== 'undefined' ? window.location.pathname : '');

    if (
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/team') ||
        pathname === '/maintenance'
    ) {
        return null;
    }

    const currentYear = new Date().getFullYear();

    const footerLinks = [
        { name: 'About Us', href: '/about-us' },
        { name: 'Contact Us', href: '/contact-us' },
        { name: 'Terms of Service', href: '/terms-of-service' },
        { name: 'Privacy Policy', href: '/privacy-policy' },
        { name: 'DMCA Policy', href: '/dmca-policy' },
    ];

    const siteName = info.websiteName || 'Png101';

    return (
        <footer className="mt-auto border-t border-card-border bg-card-bg/80 backdrop-blur-md text-foreground">
            <div className="w-full px-6 sm:px-10 md:px-16 py-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-card-border">
                    {/* Brand Column */}
                    <div className="md:col-span-5 space-y-4">
                        <Link href="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 bg-primary-glow/20 rounded-lg flex items-center justify-center border border-primary-glow/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-primary-glow">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-foreground tracking-wide">
                                {siteName}
                            </span>
                        </Link>
                        <p className="text-sm text-foreground/60 max-w-md leading-relaxed">
                            {info.tagline}
                        </p>
                        {info.contactEmail && (
                            <p className="text-sm text-foreground/60">
                                Contact:{' '}
                                <a
                                    href={`mailto:${info.contactEmail}`}
                                    className="text-primary-glow hover:underline font-medium"
                                >
                                    {info.contactEmail}
                                </a>
                            </p>
                        )}
                    </div>

                    {/* Company & Info Links */}
                    <div className="md:col-span-3 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                            Explore &amp; Company
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link
                                    href="/"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/latest"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    Latest Uploads
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/tags"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors font-medium text-primary-glow/90"
                                >
                                    Tags Directory (A–Z)
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/about-us"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/contact-us"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal & Policies Links */}
                    <div className="md:col-span-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                            Legal &amp; Policies
                        </h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link
                                    href="/terms-of-service"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/privacy-policy"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/dmca-policy"
                                    className="text-foreground/60 hover:text-primary-glow transition-colors"
                                >
                                    DMCA Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-foreground/50">
                    <p>
                        &copy; {currentYear} {info.companyName || siteName}. All rights reserved.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                        {footerLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="hover:text-primary-glow transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
