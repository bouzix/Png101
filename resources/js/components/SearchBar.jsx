import React, { useState } from 'react';
import { router } from '@inertiajs/react';

const SearchBar = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.visit(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-2xl relative group">
      <div className="absolute -inset-1 bg-primary-glow rounded-full opacity-25 group-hover:opacity-50 blur transition duration-200"></div>
      <div className="relative">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PNG Images..."
            className="w-full bg-card-bg/80 border border-primary-glow/30 text-foreground px-6 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-glow/50 focus:border-primary-glow shadow-[0_0_15px_rgba(59,130,246,0.1)] focus:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all duration-300 placeholder-slate-500"
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-glow/70 hover:text-primary-glow transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;
