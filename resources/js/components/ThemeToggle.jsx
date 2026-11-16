import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '', size = 'md', customTooltip = false }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const updateThemeState = () => {
            const hasLightClass = document.documentElement.classList.contains('light');
            setIsDark(!hasLightClass);
        };

        updateThemeState();

        const observer = new MutationObserver(() => {
            updateThemeState();
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        window.addEventListener('theme-change', updateThemeState);
        window.addEventListener('storage', updateThemeState);

        return () => {
            observer.disconnect();
            window.removeEventListener('theme-change', updateThemeState);
            window.removeEventListener('storage', updateThemeState);
        };
    }, []);

    const toggleTheme = () => {
        const isCurrentlyLight = document.documentElement.classList.contains('light');
        const willBeDark = isCurrentlyLight;

        if (willBeDark) {
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
            try {
                localStorage.setItem('theme', 'dark');
            } catch (e) {}
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
            try {
                localStorage.setItem('theme', 'light');
            } catch (e) {}
        }

        setIsDark(willBeDark);
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { isDark: willBeDark } }));
    };

    const iconSizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl bg-card-bg/80 dark:bg-slate-900/80 hover:bg-blue-200/70 dark:hover:bg-blue-500/20 text-foreground border border-card-border hover:border-blue-500/50 transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center group ${className}`}
            title={customTooltip ? undefined : (isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode')}
            data-tooltip={customTooltip ? (isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
            aria-label="Toggle Theme"
        >
            {isDark ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    stroke="currentColor"
                    className={`${iconSizeClass} text-slate-200 group-hover:text-white group-hover:rotate-45 group-hover:scale-110 transition-all duration-300`}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                    />
                </svg>
            ) : (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    stroke="currentColor"
                    className={`${iconSizeClass} text-blue-600 group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-300`}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                    />
                </svg>
            )}
        </button>
    );
}
