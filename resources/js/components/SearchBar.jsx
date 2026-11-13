import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

const SearchBar = ({ initialValue = '', onSearch }) => {
    const [query, setQuery] = useState(initialValue);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(query);
        } else {
            const trimmed = query.trim();
            if (trimmed) {
                router.visit(`/search?q=${encodeURIComponent(trimmed)}`);
            } else {
                router.visit('/search');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto my-6 px-4">
            <div className="relative group">
                <div className="relative flex items-center bg-input-bg border border-input-border rounded-full px-6 py-3.5 shadow-xl focus-within:border-blue-500 transition-colors">
                    <svg className="w-5 h-5 text-slate-400 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search transparent PNGs (e.g., laptop, abstract, cat, flower...)"
                        className="w-full bg-transparent text-input-text placeholder-slate-500 focus:outline-none text-sm md:text-base"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                if (onSearch) onSearch('');
                            }}
                            className="text-slate-500 hover:text-foreground mr-2"
                        >
                            ✕
                        </button>
                    )}
                    <button
                        type="submit"
                        className="ml-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-transform active:scale-95 shadow-md"
                    >
                        Search
                    </button>
                </div>
            </div>
        </form>
    );
};

export default SearchBar;

