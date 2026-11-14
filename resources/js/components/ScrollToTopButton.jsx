import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton({ currentPath = '/' }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const updateVisibility = () => {
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            const isLongEnough = docHeight > winHeight * 1.45;
            const isScrolledDown = window.scrollY > 360;
            setVisible(isLongEnough && isScrolledDown);
        };

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        window.addEventListener('resize', updateVisibility, { passive: true });

        return () => {
            window.removeEventListener('scroll', updateVisibility);
            window.removeEventListener('resize', updateVisibility);
        };
    }, [currentPath]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label="Go to top"
            title="Go to top"
            className={`fixed bottom-24 right-4 md:bottom-7 md:right-7 z-40 w-11 h-11 rounded-full flex items-center justify-center bg-card-bg/90 border border-primary-glow/40 text-primary-glow hover:bg-blue-600 hover:border-blue-500 hover:text-white shadow-[0_8px_24px_rgba(37,99,235,0.28)] backdrop-blur-md transition-all duration-300 cursor-pointer ${
                visible
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
            }`}
        >
            <ArrowUp className="w-5 h-5" />
        </button>
    );
}

