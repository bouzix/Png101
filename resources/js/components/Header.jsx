import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import ThemeToggle from './ThemeToggle';
import { Search, Menu, X } from 'lucide-react';

const Header = ({ onSearchClick }) => {
    const { url, props } = usePage();
    const websiteInfo = props?.websiteInfo;
    const siteName = websiteInfo?.siteName || 'Png101';
    const logoPath = websiteInfo?.logoPath || '/assets/logo.png';
    const logoWidth = websiteInfo?.logoWidth || 160;
    const logoHeight = websiteInfo?.logoHeight || 48;
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const pathname = url.split('?')[0];

    if (pathname.startsWith('/admin') || pathname.startsWith('/team')) {
        return null;
    }

    return (
        <header className="site-header sticky top-0 z-50 w-full transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
                {/* Brand Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative flex items-center">
                        <img
                            src={logoPath}
                            alt={`${siteName} Logo`}
                            style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }}
                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link
                        href="/"
                        className={`text-sm font-medium transition-colors ${pathname === '/' ? 'text-primary-glow' : 'text-foreground/70 hover:text-foreground'}`}
                    >
                        Explore
                    </Link>
                    <Link
                        href="/collections"
                        className={`text-sm font-medium transition-colors ${pathname.startsWith('/collections') ? 'text-primary-glow' : 'text-foreground/70 hover:text-foreground'}`}
                    >
                        Collections
                    </Link>
                    <Link
                        href="/latest"
                        className={`text-sm font-medium transition-colors ${pathname === '/latest' ? 'text-primary-glow' : 'text-foreground/70 hover:text-foreground'}`}
                    >
                        Latest
                    </Link>
                    <Link
                        href="/tags"
                        className={`text-sm font-medium transition-colors ${pathname === '/tags' ? 'text-primary-glow' : 'text-foreground/70 hover:text-foreground'}`}
                    >
                        Tags
                    </Link>
                    <Link
                        href="/about-us"
                        className={`text-sm font-medium transition-colors ${pathname === '/about-us' ? 'text-primary-glow' : 'text-foreground/70 hover:text-foreground'}`}
                    >
                        About
                    </Link>
                </nav>

                {/* Action Controls */}
                <div className="flex items-center gap-3">
                    {onSearchClick && (
                        <button
                            onClick={onSearchClick}
                            className="p-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-foreground/70 hover:text-foreground transition-all cursor-pointer md:hidden"
                            aria-label="Search"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    )}

                    <ThemeToggle />

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-foreground/70 hover:text-foreground transition-all md:hidden cursor-pointer"
                        aria-label="Toggle Menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-background border-b border-card-border px-4 py-6 space-y-4 animate-fade-in">
                    <Link
                        href="/"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-base font-medium text-foreground/80 hover:text-primary-glow"
                    >
                        Explore
                    </Link>
                    <Link
                        href="/collections"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-base font-medium text-foreground/80 hover:text-primary-glow"
                    >
                        Collections
                    </Link>
                    <Link
                        href="/latest"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-base font-medium text-foreground/80 hover:text-primary-glow"
                    >
                        Latest
                    </Link>
                    <Link
                        href="/tags"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-base font-medium text-foreground/80 hover:text-primary-glow"
                    >
                        Tags
                    </Link>
                    <Link
                        href="/about-us"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-base font-medium text-foreground/80 hover:text-primary-glow"
                    >
                        About
                    </Link>
                </div>
            )}
        </header>
    );
};

export default Header;

