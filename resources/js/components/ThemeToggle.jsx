import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);

        if (nextTheme === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        }

        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: nextTheme } }));
    };

    if (!mounted) {
        return (
            <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-foreground/10 animate-pulse" />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 hover:border-primary-glow/40 transition-all duration-300 cursor-pointer overflow-hidden"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                <Sun
                    className={`w-5 h-5 text-amber-500 transition-all duration-500 absolute ${
                        theme === 'dark'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 rotate-90 scale-0'
                    }`}
                />
                <Moon
                    className={`w-5 h-5 text-blue-600 transition-all duration-500 absolute ${
                        theme === 'light'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 -rotate-90 scale-0'
                    }`}
                />
            </div>

            <div className="absolute inset-0 bg-primary-glow/0 group-hover:bg-primary-glow/5 transition-colors duration-300 pointer-events-none" />
        </button>
    );
}

