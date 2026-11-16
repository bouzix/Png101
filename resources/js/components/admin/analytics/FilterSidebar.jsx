import { useState, useRef, useEffect } from 'react';
import {
    SlidersHorizontal,
    RotateCcw,
    Smartphone,
    Tablet,
    Monitor,
    Globe,
    Tag,
    ArrowUpDown,
    Hash,
    Search,
    X,
    ChevronDown,
    Check,
    LayoutGrid
} from 'lucide-react';
import { CountryFlag } from '../../ui/CountryFlag';
import StudioSelect from '../../ui/StudioSelect';

export function FilterSidebar({
    filters,
    onChange,
    onReset,
    availableCountries = [],
    availableTags = [],
    isLoading = false,
}) {
    const [countrySearch, setCountrySearch] = useState('');
    const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);

    const countryRef = useRef(null);
    const tagRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (countryRef.current && !countryRef.current.contains(e.target)) {
                setCountryDropdownOpen(false);
            }
            if (tagRef.current && !tagRef.current.contains(e.target)) {
                setTagSuggestionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCountries = availableCountries.filter(
        (c) =>
            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
            c.code.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const selectedCountryObj = availableCountries.find((c) => c.code === filters.country);

    const tagSuggestions = availableTags
        .filter(
            (t) =>
                !filters.tags.includes(t) &&
                t.toLowerCase().includes(tagInput.toLowerCase())
        )
        .slice(0, 8);

    const handleAddTag = (tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized && !filters.tags.includes(normalized)) {
            onChange({ ...filters, tags: [...filters.tags, normalized] });
        }
        setTagInput('');
        setTagSuggestionsOpen(false);
    };

    const handleRemoveTag = (tagToRemove) => {
        onChange({
            ...filters,
            tags: filters.tags.filter((t) => t !== tagToRemove),
        });
    };

    const activeFiltersCount =
        (filters.deviceType !== 'all' ? 1 : 0) +
        (filters.country !== 'all' ? 1 : 0) +
        filters.tags.length +
        (filters.minDownloads > 0 ? 1 : 0) +
        (filters.sortBy !== 'downloads_desc' ? 1 : 0);

    return (
        <aside className="w-full lg:w-[280px] shrink-0 bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-6 h-fit">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-card-border">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                        <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Filters</h3>
                        <p className="text-xs text-foreground/45">
                            {activeFiltersCount > 0 ? `${activeFiltersCount} active` : 'Refine metrics'}
                        </p>
                    </div>
                </div>
                {activeFiltersCount > 0 && (
                    <button
                        onClick={onReset}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 text-xs font-medium text-foreground/50 hover:text-primary-glow transition-colors cursor-pointer disabled:opacity-50"
                        title="Reset all filters"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                )}
            </div>

            {/* 1. Device Type */}
            <div className="flex flex-col gap-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/55 flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-primary-glow" />
                    Device Type
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl">
                    {[
                        { id: 'all', label: 'All Devices', icon: LayoutGrid },
                        { id: 'desktop', label: 'Desktop', icon: Monitor },
                        { id: 'mobile', label: 'Mobile', icon: Smartphone },
                        { id: 'tablet', label: 'Tablet', icon: Tablet },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isActive = filters.deviceType === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onChange({ ...filters, deviceType: item.id })}
                                title={item.label}
                                aria-label={item.label}
                                className={`h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-primary-glow text-white shadow-sm'
                                        : 'bg-card-bg text-foreground/65 hover:text-foreground shadow-sm'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Country */}
            <div className="flex flex-col gap-2.5" ref={countryRef}>
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/55 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    Country
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-background/60 border border-card-border text-sm text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2 truncate">
                            {filters.country === 'all' ? (
                                <span className="text-foreground/70">All Countries</span>
                            ) : (
                                <>
                                    <CountryFlag
                                        code={selectedCountryObj?.code || filters.country}
                                        name={selectedCountryObj?.name}
                                        fallback={selectedCountryObj?.flag || '🌐'}
                                    />
                                    <span className="truncate">{selectedCountryObj?.name || filters.country}</span>
                                </>
                            )}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-foreground/40 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {countryDropdownOpen && (
                        <div className="absolute z-30 mt-2 w-full bg-card-bg border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="p-2 border-b border-card-border flex items-center gap-2 bg-background/40">
                                <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
                                <input
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    placeholder="Search country..."
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-foreground/30 focus:outline-none"
                                    autoFocus
                                />
                                {countrySearch && (
                                    <button onClick={() => setCountrySearch('')} className="text-foreground/40 hover:text-foreground">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange({ ...filters, country: 'all' });
                                        setCountryDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                        filters.country === 'all'
                                            ? 'bg-primary-glow/10 text-primary-glow font-medium'
                                            : 'text-foreground/70 hover:bg-foreground/5'
                                    }`}
                                >
                                    <span>All Countries</span>
                                    {filters.country === 'all' && <Check className="w-3.5 h-3.5" />}
                                </button>
                                {filteredCountries.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-foreground/40">No countries found</div>
                                ) : (
                                    filteredCountries.map((c) => (
                                        <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => {
                                                onChange({ ...filters, country: c.code });
                                                setCountryDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                                filters.country === c.code
                                                    ? 'bg-primary-glow/10 text-primary-glow font-medium'
                                                    : 'text-foreground/70 hover:bg-foreground/5'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <CountryFlag
                                                    code={c.code}
                                                    name={c.name}
                                                    fallback={c.flag}
                                                />
                                                <span className="truncate">{c.name}</span>
                                            </span>
                                            <span className="text-[10px] text-foreground/40 ml-2 shrink-0">
                                                {c.downloads}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Tags */}
            <div className="flex flex-col gap-2.5" ref={tagRef}>
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/55 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    Tags Filter
                </label>
                <div className="relative">
                    <div className="flex items-center px-3 py-2 rounded-xl bg-background/60 border border-card-border focus-within:border-primary-glow transition-colors">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => {
                                setTagInput(e.target.value);
                                setTagSuggestionsOpen(true);
                            }}
                            onFocus={() => setTagSuggestionsOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && tagInput.trim()) {
                                    e.preventDefault();
                                    handleAddTag(tagInput);
                                }
                            }}
                            placeholder="Add tag filter..."
                            className="w-full bg-transparent text-xs text-foreground placeholder:text-foreground/30 focus:outline-none"
                        />
                    </div>

                    {tagSuggestionsOpen && tagSuggestions.length > 0 && (
                        <div className="absolute z-30 mt-1.5 w-full bg-card-bg border border-card-border rounded-xl shadow-2xl p-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {tagSuggestions.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleAddTag(t)}
                                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-foreground/80 hover:bg-primary-glow/10 hover:text-primary-glow transition-colors cursor-pointer flex items-center justify-between"
                                >
                                    <span>#{t}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {filters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {filters.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium"
                            >
                                #{tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="hover:text-white cursor-pointer ml-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Sort By */}
            <div className="flex flex-col gap-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/55 flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                    Sort By
                </label>
                <StudioSelect
                    aria-label="Sort analytics"
                    value={filters.sortBy}
                    onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
                    className="w-full"
                >
                    <option value="downloads_desc">Most Downloaded</option>
                    <option value="downloads_asc">Least Downloaded</option>
                    <option value="views_desc">Most Viewed</option>
                    <option value="conversion_desc">Highest Conversion</option>
                    <option value="recent">Most Recent</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                </StudioSelect>
            </div>

            {/* 5. Minimum Downloads */}
            <div className="flex flex-col gap-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/55 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-rose-400" />
                    Minimum Downloads
                </label>
                <input
                    type="number"
                    min={0}
                    value={filters.minDownloads || ''}
                    onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onChange({ ...filters, minDownloads: isNaN(val) || val < 0 ? 0 : val });
                    }}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2.5 rounded-xl bg-background/60 border border-card-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary-glow"
                />
            </div>

            {/* Reset All Button */}
            <button
                type="button"
                onClick={onReset}
                disabled={isLoading || activeFiltersCount === 0}
                className="w-full py-2.5 rounded-xl border border-card-border text-xs font-semibold text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All Filters
            </button>
        </aside>
    );
}

