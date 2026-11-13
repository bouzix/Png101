import React, { useState, useRef, useEffect } from 'react';

export interface CountryOption {
    code: string;
    name: string;
    downloads: number;
    flag: string;
}

interface FilterSidebarProps {
    // Filter state
    selectedTags: string[];
    sortBy: string;
    minDownloads: number;
    deviceType: 'all' | 'mobile' | 'desktop' | 'tablet';
    selectedCountry: string;

    // Available options
    availableTags: string[];
    availableCountries: CountryOption[];

    // Handlers
    onTagsChange: (tags: string[]) => void;
    onSortChange: (sort: string) => void;
    onMinDownloadsChange: (min: number) => void;
    onDeviceTypeChange: (type: 'all' | 'mobile' | 'desktop' | 'tablet') => void;
    onCountryChange: (country: string) => void;
    onResetFilters: () => void;
}

export default function FilterSidebar({
    selectedTags,
    sortBy,
    minDownloads,
    deviceType,
    selectedCountry,
    availableTags,
    availableCountries,
    onTagsChange,
    onSortChange,
    onMinDownloadsChange,
    onDeviceTypeChange,
    onCountryChange,
    onResetFilters
}: FilterSidebarProps) {
    const [tagInput, setTagInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [countryInput, setCountryInput] = useState('');
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const countryRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input
    const filteredSuggestions = availableTags.filter(tag =>
        tag.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.includes(tag)
    );

    // Filter countries based on input
    const filteredCountries = availableCountries.filter(c =>
        c.name.toLowerCase().includes(countryInput.toLowerCase()) ||
        c.code.toLowerCase().includes(countryInput.toLowerCase())
    );

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
            if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
                setShowCountryDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tag: string) => {
        if (tag && !selectedTags.includes(tag)) {
            onTagsChange([...selectedTags, tag]);
            setTagInput('');
            setShowSuggestions(false);
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            // If there's an exact match in suggestions, use it
            const exactMatch = availableTags.find(
                tag => tag.toLowerCase() === tagInput.toLowerCase()
            );
            if (exactMatch) {
                addTag(exactMatch);
            } else if (filteredSuggestions.length > 0) {
                // Otherwise use the first suggestion
                addTag(filteredSuggestions[0]);
            }
        } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
            // Remove last tag if backspace on empty input
            onTagsChange(selectedTags.slice(0, -1));
        }
    };

    const getSelectedCountryName = () => {
        if (selectedCountry === 'all') return 'All Countries';
        const country = availableCountries.find(c => c.code === selectedCountry);
        return country ? `${country.flag} ${country.name}` : selectedCountry;
    };

    return (
        <div className="w-64 flex-shrink-0 space-y-6">
            {/* Device Type Filter */}
            <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-glow">
                        <path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
                        <path fillRule="evenodd" d="M8.625 1.5a3.375 3.375 0 0 0-3.375 3.375v14.25A3.375 3.375 0 0 0 8.625 22.5h6.75a3.375 3.375 0 0 0 3.375-3.375V4.875A3.375 3.375 0 0 0 15.375 1.5h-6.75ZM10.5 3a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75A.75.75 0 0 1 10.5 3Zm-1.5 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75ZM7.5 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 18Z" clipRule="evenodd" />
                    </svg>
                    Device Type
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => onDeviceTypeChange('mobile')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${deviceType === 'mobile'
                                ? 'bg-primary-glow/20 border-primary-glow text-primary-glow shadow-[0_0_10px_rgba(var(--primary-glow-rgb),0.3)]'
                                : 'bg-card-bg border-card-border text-foreground/60 hover:text-foreground hover:border-primary-glow/50'
                            }`}
                        title="Mobile"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-1">
                            <path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
                            <path fillRule="evenodd" d="M8.625 1.5a3.375 3.375 0 0 0-3.375 3.375v14.25A3.375 3.375 0 0 0 8.625 22.5h6.75a3.375 3.375 0 0 0 3.375-3.375V4.875A3.375 3.375 0 0 0 15.375 1.5h-6.75ZM10.5 3a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75A.75.75 0 0 1 10.5 3Zm-1.5 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75ZM7.5 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 18Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-medium">Phone</span>
                    </button>
                    <button
                        onClick={() => onDeviceTypeChange('tablet')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${deviceType === 'tablet'
                                ? 'bg-primary-glow/20 border-primary-glow text-primary-glow shadow-[0_0_10px_rgba(var(--primary-glow-rgb),0.3)]'
                                : 'bg-card-bg border-card-border text-foreground/60 hover:text-foreground hover:border-primary-glow/50'
                            }`}
                        title="Tablet"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-1">
                            <path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
                            <path fillRule="evenodd" d="M8.625 1.5a3.375 3.375 0 0 0-3.375 3.375v14.25A3.375 3.375 0 0 0 8.625 22.5h6.75a3.375 3.375 0 0 0 3.375-3.375V4.875A3.375 3.375 0 0 0 15.375 1.5h-6.75ZM10.5 3a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75A.75.75 0 0 1 10.5 3Zm-1.5 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75ZM7.5 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 18Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-medium">Tablet</span>
                    </button>
                    <button
                        onClick={() => onDeviceTypeChange('desktop')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${deviceType === 'desktop'
                                ? 'bg-primary-glow/20 border-primary-glow text-primary-glow shadow-[0_0_10px_rgba(var(--primary-glow-rgb),0.3)]'
                                : 'bg-card-bg border-card-border text-foreground/60 hover:text-foreground hover:border-primary-glow/50'
                            }`}
                        title="Desktop"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-1">
                            <path fillRule="evenodd" d="M2.25 5.25a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3V15a3 3 0 0 1-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 0 1-.53 1.28h-9a.75.75 0 0 1-.53-1.28l.621-.622a2.25 2.25 0 0 0 .659-1.59V18h-3a3 3 0 0 1-3-3V5.25Zm1.5 0v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-medium">Desktop</span>
                    </button>
                    <button
                        onClick={() => onDeviceTypeChange('all')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${deviceType === 'all'
                                ? 'bg-primary-glow/20 border-primary-glow text-primary-glow shadow-[0_0_10px_rgba(var(--primary-glow-rgb),0.3)]'
                                : 'bg-card-bg border-card-border text-foreground/60 hover:text-foreground hover:border-primary-glow/50'
                            }`}
                        title="All Devices"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-1">
                            <path fillRule="evenodd" d="M2.25 6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm3.9 7.5a.75.75 0 0 0 .6.3h9a.75.75 0 0 0 .6-.3l2.25-3a.75.75 0 0 0 0-.9l-2.25-3a.75.75 0 0 0-.6-.3h-9a.75.75 0 0 0-.6.3l-2.25 3a.75.75 0 0 0 0 .9l2.25 3Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-medium">All</span>
                    </button>
                </div>
            </div>

            {/* Country Filter */}
            <div ref={countryRef} className="relative">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-glow">
                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Country
                </h3>
                <div
                    className="w-full bg-card-bg border border-card-border rounded-lg p-2 flex items-center justify-between cursor-pointer hover:border-primary-glow/50 transition-all"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                    <span className="text-sm text-foreground truncate">
                        {getSelectedCountryName()}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-foreground/40 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>

                {/* Country Dropdown */}
                {showCountryDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-card-bg border border-card-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-card-bg border-b border-card-border">
                            <input
                                type="text"
                                value={countryInput}
                                onChange={(e) => setCountryInput(e.target.value)}
                                placeholder="Search countries..."
                                className="w-full bg-background border border-card-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary-glow"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <button
                            onClick={() => {
                                onCountryChange('all');
                                setShowCountryDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-background transition-colors flex items-center justify-between ${selectedCountry === 'all' ? 'text-primary-glow font-medium' : 'text-foreground'}`}
                        >
                            <span>🌍 All Countries</span>
                        </button>
                        {filteredCountries.map(country => (
                            <button
                                key={country.code}
                                onClick={() => {
                                    onCountryChange(country.code);
                                    setShowCountryDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-background transition-colors flex items-center justify-between ${selectedCountry === country.code ? 'text-primary-glow font-medium' : 'text-foreground'}`}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <span>{country.flag}</span>
                                    <span>{country.name}</span>
                                </span>
                                <span className="text-xs text-foreground/40">{country.downloads}</span>
                            </button>
                        ))}
                        {filteredCountries.length === 0 && (
                            <div className="px-3 py-2 text-sm text-foreground/40 text-center">
                                No countries found
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tags Filter */}
            <div ref={containerRef} className="relative">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-glow">
                        <path fillRule="evenodd" d="M5.25 2.25a3 3 0 0 0-3 3v4.318a3 3 0 0 0 .879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 0 0 5.441-5.44c.758-1.16.492-2.629-.428-3.548l-9.58-9.581a3 3 0 0 0-2.122-.879H5.25ZM6.375 7.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" clipRule="evenodd" />
                    </svg>
                    Tags
                </h3>
                <div className="w-full bg-card-bg border border-card-border rounded-lg p-2 flex flex-wrap gap-2 items-center min-h-[44px] focus-within:border-primary-glow focus-within:ring-1 focus-within:ring-primary-glow/50 transition-all">
                    {selectedTags.map(tag => (
                        <span key={tag} className="bg-primary-glow text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 h-7">
                            {tag}
                            <button
                                onClick={() => removeTag(tag)}
                                className="hover:text-white/80 flex items-center justify-center"
                                type="button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                </svg>
                            </button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={tagInput}
                        onChange={(e) => {
                            setTagInput(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onKeyDown={handleTagKeyDown}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={selectedTags.length === 0 ? "Search tags..." : ""}
                        className="bg-transparent text-foreground text-sm focus:outline-none flex-1 min-w-[60px]"
                    />
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && tagInput && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card-bg border border-card-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {filteredSuggestions.map(tag => (
                            <button
                                key={tag}
                                onClick={() => addTag(tag)}
                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-background transition-colors flex items-center gap-2"
                                type="button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary-glow">
                                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm4.75 6.75a.75.75 0 0 0-1.5 0v2.546l-.943-1.048a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.114 0l2.25-2.5a.75.75 0 1 0-1.114-1.004l-.943 1.048V8.75Z" clipRule="evenodd" />
                                </svg>
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {availableTags.length === 0 && (
                    <p className="text-xs text-foreground/40 mt-2">No tags available</p>
                )}
            </div>

            {/* Sort By Filter */}
            <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-glow">
                        <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 0 1 3 3.75h14.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm0 4.5A.75.75 0 0 1 3 8.25h9.75a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 9Zm15-.75A.75.75 0 0 1 18 9v10.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 1 1 1.06-1.06l2.47 2.47V9a.75.75 0 0 1 .75-.75Zm-15 5.25a.75.75 0 0 1 .75-.75h9.75a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h5.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                    Sort By
                </h3>
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="w-full px-3 py-2 bg-card-bg border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow focus:border-transparent"
                >
                    <option value="downloads_desc">Most Downloads</option>
                    <option value="downloads_asc">Least Downloads</option>
                    <option value="views_desc">Most Page Views</option>
                    <option value="conversion_desc">Highest Conversion Rate</option>
                    <option value="recent">Most Recent</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                </select>
            </div>

            {/* Minimum Downloads Filter */}
            <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-glow">
                        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
                    </svg>
                    Minimum Downloads
                </h3>
                <input
                    type="number"
                    min="0"
                    value={minDownloads}
                    onChange={(e) => onMinDownloadsChange(parseInt(e.target.value) || 0)}
                    placeholder="e.g., 100"
                    className="w-full px-3 py-2 bg-card-bg border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow focus:border-transparent"
                />
                <p className="text-xs text-foreground/40 mt-1">Show images with at least this many downloads</p>
            </div>

            {/* Reset Filters Button */}
            <button
                onClick={onResetFilters}
                className="w-full px-4 py-2 bg-card-bg hover:bg-background border border-card-border rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
                Reset All Filters
            </button>
        </div>
    );
}
