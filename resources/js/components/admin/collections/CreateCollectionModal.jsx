import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Sparkles,
    Tag,
    Hand,
    Plus,
    X,
    Loader2,
    Eye,
    Layers,
    Check,
    Palette,
    Upload,
    Image as ImageIcon,
    RotateCcw,
    Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import AssetPickerModal from './AssetPickerModal';
import HeroBannerCustomizer from './HeroBannerCustomizer';
import StudioSelect from '@/components/ui/StudioSelect';

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'our', 'are',
    'was', 'were', 'have', 'has', 'had', 'will', 'can', 'all', 'any', 'into',
    'onto', 'over', 'under', 'by', 'of', 'in', 'on', 'to', 'at', 'is', 'it',
    'as', 'be', 'or', 'an', 'a', 'not', 'but', 'so', 'if', 'up', 'out', 'about',
    'who', 'what', 'when', 'where', 'why', 'how', 'which', 'their', 'there',
    'these', 'those', 'more', 'most', 'some', 'such', 'no', 'nor', 'too', 'very',
    'just', 'also', 'than', 'then', 'now', 'here', 'free', 'download', 'high',
    'quality', 'resolution', 'transparent', 'background', 'backgrounds',
    'collection', 'collections', 'pack', 'packs', 'bundle', 'bundles', 'set',
    'sets', 'image', 'images', 'png', 'pngs', 'file', 'files', 'graphic',
    'graphics', 'asset', 'assets', 'best', 'new', 'great', 'perfect', 'use',
]);

function stemWord(word) {
    if (!word || word.length <= 3) return word;
    if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
    if (word.endsWith('es') && word.length > 4 && /(shes|ches|xes|zes|ses)$/.test(word)) {
        return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
        return word.slice(0, -1);
    }
    if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
    return word;
}

function extractTokens(text) {
    if (!text || typeof text !== 'string') return [];
    const rawTokens = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/[\s-]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

    const unique = [];
    const seen = new Set();
    for (const token of rawTokens) {
        if (!seen.has(token)) {
            seen.add(token);
            unique.push({ raw: token, stem: stemWord(token) });
        }
    }
    return unique;
}

export default function CreateCollectionModal({ isOpen, onClose, onSuccess }) {
    const [mode, setMode] = useState('smart');
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('published');
    const [isFeatured, setIsFeatured] = useState(false);

    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [ruleMatchMode, setRuleMatchMode] = useState('any');
    const [smartType, setSmartType] = useState('smart_dynamic');
    const [previewMatchCount, setPreviewMatchCount] = useState(null);
    const [previewSampleImages, setPreviewSampleImages] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const [selectedImageIds, setSelectedImageIds] = useState([]);
    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);

    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);

    const [heroImagePath, setHeroImagePath] = useState('');
    const [heroBgColor, setHeroBgColor] = useState('');
    const [heroTextColor, setHeroTextColor] = useState('');
    const [coverImagePath, setCoverImagePath] = useState('');
    const [cardBgImagePath, setCardBgImagePath] = useState('');
    const [cardBgColor, setCardBgColor] = useState('');
    const [cardTextColor, setCardTextColor] = useState('');
    const [trendingCardImagePath, setTrendingCardImagePath] = useState('');
    const [pickerTargetField, setPickerTargetField] = useState(null);

    const [catalogImages, setCatalogImages] = useState([]);
    const [allLibraryTags, setAllLibraryTags] = useState([]);
    const [isTagInputFocused, setIsTagInputFocused] = useState(false);
    const [highlightedAutoIdx, setHighlightedAutoIdx] = useState(0);
    const tagInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            resetForm();
            fetchCatalogAndTags();
        }
    }, [isOpen]);

    const resetForm = () => {
        setName('');
        setSlug('');
        setDescription('');
        setStatus('published');
        setIsFeatured(false);
        setTags([]);
        setTagInput('');
        setRuleMatchMode('any');
        setSmartType('smart_dynamic');
        setPreviewMatchCount(null);
        setPreviewSampleImages([]);
        setSelectedImageIds([]);
        setAiPrompt('');
        setHeroImagePath('');
        setHeroBgColor('');
        setHeroTextColor('');
        setCoverImagePath('');
        setCardBgImagePath('');
        setCardBgColor('');
        setCardTextColor('');
        setTrendingCardImagePath('');
        setPickerTargetField(null);
        setIsTagInputFocused(false);
        setHighlightedAutoIdx(0);
    };

    const fetchCatalogAndTags = async () => {
        try {
            const res = await fetch('/api/images?status=published');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setCatalogImages(data);
                    const counts = new Map();
                    data.forEach((img) => {
                        if (Array.isArray(img.tags)) {
                            img.tags.forEach((t) => {
                                if (typeof t === 'string' && t.trim()) {
                                    const clean = t.trim().toLowerCase();
                                    counts.set(clean, (counts.get(clean) || 0) + 1);
                                }
                            });
                        }
                    });
                    const sorted = Array.from(counts.entries())
                        .map(([tag, count]) => ({ tag, count }))
                        .sort((a, b) => b.count - a.count);
                    setAllLibraryTags(sorted);
                }
            }
        } catch (e) {
            console.error('Failed to load catalog tags:', e);
        }
    };

    // Compute smart contextual tag scores based on Collection Name, Description, and already-selected tags
    const contextualTagData = useMemo(() => {
        const nameTokens = extractTokens(name);
        const descTokens = extractTokens(description);
        const nameLower = name.trim().toLowerCase();
        const descLower = description.trim().toLowerCase();
        const hasContext = nameTokens.length > 0 || descTokens.length > 0 || tags.length > 0;

        const scoreMap = new Map();
        const reasonMap = new Map();

        if (!hasContext) {
            return {
                hasContext: false,
                scoreMap,
                reasonMap,
                suggestions: allLibraryTags.slice(0, 14).map((item) => ({
                    ...item,
                    isContextual: false,
                    reason: null,
                })),
            };
        }

        const addScore = (tag, pts, reason) => {
            if (!tag) return;
            scoreMap.set(tag, (scoreMap.get(tag) || 0) + pts);
            if (reason && !reasonMap.has(tag)) {
                reasonMap.set(tag, reason);
            }
        };

        // 1. Direct & stem matching against library tags from Collection Name & Description
        for (const { tag } of allLibraryTags) {
            const tagStem = stemWord(tag);

            if (nameLower && nameLower.length >= 3 && nameLower.includes(tag)) {
                addScore(tag, 130, 'Matches name');
            }
            for (const nt of nameTokens) {
                if (tag === nt.raw || tagStem === nt.stem) {
                    addScore(tag, 120, 'Matches name');
                } else if (
                    (nt.raw.length >= 3 && tag.includes(nt.raw)) ||
                    (nt.stem.length >= 3 && tag.includes(nt.stem)) ||
                    (tag.length >= 3 && nt.raw.includes(tag))
                ) {
                    addScore(tag, 65, 'Related to name');
                }
            }

            if (descLower && descLower.length >= 3 && descLower.includes(tag)) {
                addScore(tag, 80, 'Matches description');
            }
            for (const dt of descTokens) {
                if (tag === dt.raw || tagStem === dt.stem) {
                    addScore(tag, 75, 'Matches description');
                } else if (
                    (dt.raw.length >= 3 && tag.includes(dt.raw)) ||
                    (dt.stem.length >= 3 && tag.includes(dt.stem)) ||
                    (tag.length >= 3 && dt.raw.includes(tag))
                ) {
                    addScore(tag, 40, 'Related to description');
                }
            }
        }

        // 2. Semantic co-occurrence from catalog images that match Name, Description, or selected tags
        const selectedTagSet = new Set(tags);
        for (const img of catalogImages) {
            const imgTags = Array.isArray(img.tags)
                ? img.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
                : [];
            if (imgTags.length === 0) continue;

            const imgText = `${img.name || ''} ${img.filename || ''} ${img.description || ''} ${
                img.altText || ''
            }`.toLowerCase();

            let imgRelevance = 0;

            for (const nt of nameTokens) {
                if (
                    imgTags.some((t) => t === nt.raw || stemWord(t) === nt.stem || t.includes(nt.stem))
                ) {
                    imgRelevance += 30;
                } else if (nt.stem.length >= 3 && imgText.includes(nt.stem)) {
                    imgRelevance += 18;
                }
            }

            for (const dt of descTokens) {
                if (
                    imgTags.some((t) => t === dt.raw || stemWord(t) === dt.stem || t.includes(dt.stem))
                ) {
                    imgRelevance += 18;
                } else if (dt.stem.length >= 3 && imgText.includes(dt.stem)) {
                    imgRelevance += 10;
                }
            }

            for (const st of selectedTagSet) {
                if (imgTags.includes(st)) {
                    imgRelevance += 25;
                }
            }

            if (imgRelevance > 0) {
                for (const t of imgTags) {
                    addScore(t, imgRelevance, 'Co-occurs in matching PNGs');
                }
            }
        }

        // 3. Also surface high-value keywords directly typed in Collection Name / Description even if new
        const libraryTagMap = new Map(allLibraryTags.map((item) => [item.tag, item.count]));
        for (const nt of nameTokens) {
            if (!libraryTagMap.has(nt.raw) && nt.raw.length >= 3) {
                addScore(nt.raw, 45, 'From collection name');
            }
            if (nt.stem !== nt.raw && libraryTagMap.has(nt.stem)) {
                addScore(nt.stem, 110, 'Matches name');
            }
        }
        for (const dt of descTokens) {
            if (!libraryTagMap.has(dt.raw) && dt.raw.length >= 3) {
                addScore(dt.raw, 25, 'From description');
            }
        }

        // Build ranked suggestion list
        const candidateSet = new Set([
            ...allLibraryTags.map((i) => i.tag),
            ...Array.from(scoreMap.keys()),
        ]);

        const scoredCandidates = Array.from(candidateSet).map((tag) => {
            const count = libraryTagMap.get(tag) || 0;
            const contextScore = scoreMap.get(tag) || 0;
            return {
                tag,
                count,
                contextScore,
                isContextual: contextScore > 0,
                reason: reasonMap.get(tag) || null,
            };
        });

        scoredCandidates.sort((a, b) => {
            if (b.contextScore !== a.contextScore) return b.contextScore - a.contextScore;
            return b.count - a.count;
        });

        // Prefer contextual matches; fill remaining slots with popular library tags if needed
        const contextualMatches = scoredCandidates.filter((c) => c.contextScore > 0);
        const finalSuggestions =
            contextualMatches.length >= 6
                ? contextualMatches.slice(0, 14)
                : scoredCandidates.slice(0, 14);

        return {
            hasContext: contextualMatches.length > 0,
            scoreMap,
            reasonMap,
            suggestions: finalSuggestions,
        };
    }, [name, description, tags, catalogImages, allLibraryTags]);

    // Smart Autocomplete matches as the user types in the tag input box
    const autocompleteOptions = useMemo(() => {
        const q = tagInput.trim().toLowerCase().replace(/^#/, '');
        const selectedSet = new Set(tags);

        if (!q) {
            // When input is empty but focused, show top unselected contextual suggestions
            if (!contextualTagData.hasContext) return [];
            return contextualTagData.suggestions
                .filter((item) => !selectedSet.has(item.tag) && item.isContextual)
                .slice(0, 6);
        }

        const qStem = stemWord(q);
        const matches = [];

        for (const { tag, count } of allLibraryTags) {
            if (selectedSet.has(tag)) continue;
            const startsWith = tag.startsWith(q);
            const includes = tag.includes(q) || (qStem.length >= 3 && tag.includes(qStem));
            if (!startsWith && !includes) continue;

            const contextScore = contextualTagData.scoreMap.get(tag) || 0;
            const rankScore =
                (tag === q ? 10000 : 0) +
                (startsWith ? 2000 : 500) +
                contextScore * 5 +
                count;

            matches.push({
                tag,
                count,
                startsWith,
                isContextual: contextScore > 0,
                reason: contextualTagData.reasonMap.get(tag) || null,
                rankScore,
            });
        }

        matches.sort((a, b) => b.rankScore - a.rankScore);
        return matches.slice(0, 8);
    }, [tagInput, tags, allLibraryTags, contextualTagData]);

    // Inline ghost completion if the top autocomplete option starts with what the user typed
    const inlineGhostSuffix = useMemo(() => {
        const raw = tagInput.trim().toLowerCase();
        if (!raw || autocompleteOptions.length === 0) return '';
        const top = autocompleteOptions[highlightedAutoIdx] || autocompleteOptions[0];
        if (top && top.tag.startsWith(raw) && top.tag.length > raw.length) {
            return top.tag.slice(raw.length);
        }
        return '';
    }, [tagInput, autocompleteOptions, highlightedAutoIdx]);

    useEffect(() => {
        setHighlightedAutoIdx(0);
    }, [tagInput]);

    const handleNameChange = (val) => {
        setName(val);
        const derived = val
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setSlug(derived);
    };

    useEffect(() => {
        if (tags.length === 0) {
            setPreviewMatchCount(null);
            setPreviewSampleImages([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoadingPreview(true);
            try {
                const res = await fetch('/api/collections/preview-tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tags, mode: ruleMatchMode }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setPreviewMatchCount(data.count);
                    setPreviewSampleImages(data.sampleImages || []);
                }
            } catch (e) {
                console.error('Failed to preview tag matches:', e);
            } finally {
                setLoadingPreview(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [tags, ruleMatchMode]);

    const addTag = (raw) => {
        const clean = raw.trim().toLowerCase();
        if (clean && !tags.includes(clean)) {
            setTags((prev) => [...prev, clean]);
        }
        setTagInput('');
    };

    const removeTag = (t) => {
        setTags((prev) => prev.filter((item) => item !== t));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'ArrowDown' && autocompleteOptions.length > 0) {
            e.preventDefault();
            setIsTagInputFocused(true);
            setHighlightedAutoIdx((prev) => (prev + 1) % autocompleteOptions.length);
            return;
        }
        if (e.key === 'ArrowUp' && autocompleteOptions.length > 0) {
            e.preventDefault();
            setIsTagInputFocused(true);
            setHighlightedAutoIdx((prev) =>
                prev - 1 < 0 ? autocompleteOptions.length - 1 : prev - 1
            );
            return;
        }
        if (e.key === 'Tab' && tagInput.trim() && autocompleteOptions.length > 0) {
            e.preventDefault();
            const chosen = autocompleteOptions[highlightedAutoIdx] || autocompleteOptions[0];
            if (chosen) {
                addTag(chosen.tag);
            }
            return;
        }
        if (e.key === 'Escape') {
            setIsTagInputFocused(false);
            return;
        }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
            return;
        }
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (
                e.key === 'Enter' &&
                isTagInputFocused &&
                tagInput.trim() &&
                autocompleteOptions.length > 0 &&
                highlightedAutoIdx >= 0 &&
                autocompleteOptions[highlightedAutoIdx]
            ) {
                addTag(autocompleteOptions[highlightedAutoIdx].tag);
            } else if (tagInput.trim()) {
                addTag(tagInput);
            }
        }
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
            toast.error('Please enter a topic or concept for the AI');
            return;
        }

        setAiGenerating(true);
        try {
            const res = await fetch('/api/collections/generate-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate collection with AI');
            }

            setName(data.name || '');
            setSlug(data.slug || '');
            setDescription(data.description || '');
            setTags(data.tags || []);
            setRuleMatchMode('any');
            setPreviewMatchCount(data.matchCount ?? null);
            setPreviewSampleImages(data.sampleImages || []);
            setMode('smart');
            toast.success('Collection drafted by Gemini AI!');
        } catch (e) {
            toast.error(e.message || 'AI generation failed');
        } finally {
            setAiGenerating(false);
        }
    };

    const handlePickCatalogHero = (ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const targetId = ids[ids.length - 1];
        const match = catalogImages.find((i) => i.id === targetId);
        if (match?.path) {
            const field = pickerTargetField || 'heroImagePath';
            if (field === 'cardBgImagePath') setCardBgImagePath(match.path);
            else if (field === 'coverImagePath') setCoverImagePath(match.path);
            else if (field === 'trendingCardImagePath') setTrendingCardImagePath(match.path);
            else setHeroImagePath(match.path);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Collection name is required');
            return;
        }

        if (mode === 'smart' && tags.length === 0) {
            toast.error('Please add at least one tag for the smart collection rule');
            return;
        }

        if (mode === 'manual' && selectedImageIds.length === 0) {
            toast.error('Please select at least one image for manual collections');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                slug: slug.trim() || undefined,
                description: description.trim() || null,
                status,
                isFeatured,
                coverImagePath: coverImagePath.trim() || null,
                heroImagePath: heroImagePath.trim() || null,
                heroBgColor: heroBgColor.trim() || null,
                heroTextColor: heroTextColor.trim() || null,
                cardBgImagePath: cardBgImagePath.trim() || null,
                cardBgColor: cardBgColor.trim() || null,
                cardTextColor: cardTextColor.trim() || null,
                trendingCardImagePath: trendingCardImagePath.trim() || null,
            };

            if (mode === 'smart') {
                payload.type = smartType;
                payload.tagRules = tags;
                payload.ruleMatchMode = ruleMatchMode;
            } else {
                payload.type = 'manual';
                payload.imageIds = selectedImageIds;
            }

            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create collection');
            }

            toast.success(`Collection "${data.name || name}" created successfully!`);
            onSuccess();
            onClose();
        } catch (e) {
            toast.error(e.message || 'Failed to create collection');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-card-border bg-card-header-bg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Create New Collection</h3>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Bundle transparent PNGs by holiday, aesthetic, or automated tag rules.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-3 border-b border-card-border bg-card-bg/50">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-card-header-bg border border-card-border rounded-xl text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setMode('smart')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                                mode === 'smart'
                                    ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                    : 'text-foreground/60 hover:text-foreground'
                            }`}
                        >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Smart Tag Rules</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                                mode === 'manual'
                                    ? 'bg-primary-glow text-white shadow-md shadow-primary-glow/30'
                                    : 'text-foreground/60 hover:text-foreground'
                            }`}
                        >
                            <Hand className="w-3.5 h-3.5" />
                            <span>Manual Curated</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('ai')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                                mode === 'ai'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                    : 'text-foreground/60 hover:text-foreground'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Assistant</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {mode === 'ai' && (
                        <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-3 shadow-lg">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Sparkles className="w-4 h-4" />
                                <h4 className="text-xs font-bold uppercase tracking-wider">
                                    Gemini AI Collection Curator
                                </h4>
                            </div>
                            <p className="text-xs text-foreground/70 leading-relaxed">
                                Enter a theme or holiday (e.g. <em>&ldquo;Christmas winter clipart, bells and snowflakes&rdquo;</em>). Gemini will craft the title, SEO description, and resolve all matching tags in your catalog.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g. Christmas, winter holidays, santa, snow..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGenerateWithAi();
                                        }
                                    }}
                                    className="flex-1 bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-purple-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleGenerateWithAi}
                                    disabled={aiGenerating}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {aiGenerating ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Curating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Generate</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                Collection Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g. Christmas Clipart Pack"
                                required
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="christmas-clipart-pack"
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary-glow transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                    Status
                                </label>
                                <StudioSelect
                                    aria-label="Collection status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="published">Published (Visible on site)</option>
                                    <option value="draft">Draft (Admin only)</option>
                                </StudioSelect>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Short engaging description for search engines and visitors..."
                                className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary-glow resize-none"
                            />
                        </div>
                    </div>

                    {mode === 'smart' && (
                        <div className="p-5 rounded-xl border border-primary-glow/20 bg-primary-glow/5 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-primary-glow flex items-center gap-1.5">
                                    <Tag className="w-4 h-4" />
                                    <span>Included Tags for Auto-Matching</span>
                                </label>
                                <span className="text-[11px] text-foreground/50">Press Enter or comma to add</span>
                            </div>

                            <div className="relative">
                                <div
                                    onClick={() => tagInputRef.current?.focus()}
                                    className="flex flex-wrap items-center gap-2 p-2.5 bg-input-bg border border-input-border rounded-xl min-h-[48px] focus-within:border-primary-glow transition-colors cursor-text"
                                >
                                    {tags.map((t) => (
                                        <span
                                            key={t}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-tag-bg text-tag-text border border-tag-border text-xs font-semibold"
                                        >
                                            #{t}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeTag(t);
                                                }}
                                                className="text-foreground/50 hover:text-red-400 cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}

                                    <div className="relative flex-1 min-w-[160px] flex items-center">
                                        {inlineGhostSuffix && isTagInputFocused && (
                                            <div
                                                aria-hidden="true"
                                                className="absolute inset-y-0 left-0 flex items-center pointer-events-none text-sm select-none overflow-hidden whitespace-pre"
                                            >
                                                <span className="opacity-0">{tagInput}</span>
                                                <span className="text-foreground/35">{inlineGhostSuffix}</span>
                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-primary-glow/15 border border-primary-glow/30 text-[10px] font-bold text-primary-glow">
                                                    Tab ↹
                                                </span>
                                            </div>
                                        )}
                                        <input
                                            ref={tagInputRef}
                                            type="text"
                                            value={tagInput}
                                            onFocus={() => setIsTagInputFocused(true)}
                                            onChange={(e) => {
                                                setTagInput(e.target.value);
                                                setIsTagInputFocused(true);
                                            }}
                                            onKeyDown={handleTagKeyDown}
                                            onBlur={() => {
                                                setIsTagInputFocused(false);
                                                if (tagInput.trim()) {
                                                    addTag(tagInput);
                                                }
                                            }}
                                            placeholder={
                                                tags.length === 0
                                                    ? "Type tag (auto-completes with Tab/Enter)..."
                                                    : 'Add another tag...'
                                            }
                                            className="w-full bg-transparent text-sm text-foreground focus:outline-none py-1 relative z-10"
                                        />
                                    </div>
                                </div>

                                {/* Smart Autocomplete Dropdown */}
                                {isTagInputFocused &&
                                    (tagInput.trim().length > 0 || autocompleteOptions.length > 0) && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-card-bg border border-card-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="px-3 py-1.5 bg-card-header-bg border-b border-card-border flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                                                <span className="flex items-center gap-1.5">
                                                    <Sparkles className="w-3 h-3 text-primary-glow" />
                                                    {tagInput.trim()
                                                        ? 'Smart Tag Autocomplete'
                                                        : 'Recommended from Name & Description'}
                                                </span>
                                                <span>↑↓ Navigate · Tab / Enter Select</span>
                                            </div>

                                            {autocompleteOptions.length > 0 ? (
                                                <div className="max-h-52 overflow-y-auto divide-y divide-card-border/50">
                                                    {autocompleteOptions.map((item, idx) => {
                                                        const isHighlighted = idx === highlightedAutoIdx;
                                                        return (
                                                            <button
                                                                key={item.tag}
                                                                type="button"
                                                                onMouseEnter={() => setHighlightedAutoIdx(idx)}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    addTag(item.tag);
                                                                }}
                                                                className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                                                                    isHighlighted
                                                                        ? 'bg-primary-glow/15 text-foreground'
                                                                        : 'hover:bg-foreground/5 text-foreground/80'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="font-bold text-primary-glow">
                                                                        #{item.tag}
                                                                    </span>
                                                                    {item.isContextual && (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary-glow/15 text-primary-glow border border-primary-glow/30">
                                                                            <Sparkles className="w-2.5 h-2.5" />
                                                                            {item.reason || 'Matches theme'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[11px] font-medium text-foreground/50 shrink-0">
                                                                    {item.count > 0
                                                                        ? `${item.count} PNG${
                                                                              item.count === 1 ? '' : 's'
                                                                          }`
                                                                        : 'New tag'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        addTag(tagInput);
                                                    }}
                                                    className="w-full px-3.5 py-2.5 text-left flex items-center justify-between text-xs text-foreground/80 hover:bg-primary-glow/10 cursor-pointer"
                                                >
                                                    <span>
                                                        Add custom tag{' '}
                                                        <strong className="text-primary-glow">
                                                            #{tagInput.trim().toLowerCase()}
                                                        </strong>
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-foreground/45">
                                                        Press Enter
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                            </div>

                            {contextualTagData.suggestions.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/60 flex items-center gap-1.5">
                                            {contextualTagData.hasContext ? (
                                                <>
                                                    <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
                                                    <span className="text-primary-glow">
                                                        Smart Tag Suggestions (from Name & Description):
                                                    </span>
                                                </>
                                            ) : (
                                                <span>Frequent Library Tags (type a Name or Description for smart suggestions):</span>
                                            )}
                                        </span>

                                        {contextualTagData.hasContext &&
                                            contextualTagData.suggestions.some(
                                                (s) => s.isContextual && !tags.includes(s.tag)
                                            ) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const toAdd = contextualTagData.suggestions
                                                            .filter((s) => s.isContextual && !tags.includes(s.tag))
                                                            .slice(0, 6)
                                                            .map((s) => s.tag);
                                                        if (toAdd.length > 0) {
                                                            setTags((prev) =>
                                                                Array.from(new Set([...prev, ...toAdd]))
                                                            );
                                                        }
                                                    }}
                                                    className="text-[11px] font-bold text-primary-glow hover:underline cursor-pointer"
                                                >
                                                    + Add Top Matches
                                                </button>
                                            )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {contextualTagData.suggestions.map(({ tag, count, isContextual, reason }) => {
                                            const isSelected = tags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => (isSelected ? removeTag(tag) : addTag(tag))}
                                                    title={
                                                        reason
                                                            ? `${reason} (${count} matching PNGs in library)`
                                                            : `${count} PNGs in library`
                                                    }
                                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                                                        isSelected
                                                            ? 'bg-primary-glow text-white border-primary-glow shadow-sm'
                                                            : isContextual
                                                            ? 'bg-primary-glow/10 border-primary-glow/35 text-primary-glow hover:bg-primary-glow/20 hover:border-primary-glow'
                                                            : 'bg-card-bg border-card-border text-foreground/70 hover:text-foreground hover:border-primary-glow/50'
                                                    }`}
                                                >
                                                    {isSelected ? (
                                                        <Check className="w-3 h-3" />
                                                    ) : isContextual ? (
                                                        <Sparkles className="w-3 h-3 text-primary-glow" />
                                                    ) : (
                                                        <span>+</span>
                                                    )}
                                                    <span>{tag}</span>
                                                    {count > 0 && (
                                                        <span className="text-[10px] opacity-65">({count})</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-primary-glow/10">
                                <div>
                                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                        Match Logic
                                    </label>
                                    <StudioSelect
                                        aria-label="Tag match logic"
                                        value={ruleMatchMode}
                                        onChange={(e) => setRuleMatchMode(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="any">Match ANY tag (broadest, OR)</option>
                                        <option value="all">Match ALL tags (strict, AND)</option>
                                    </StudioSelect>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                                        Sync Behavior
                                    </label>
                                    <StudioSelect
                                        aria-label="Collection sync behavior"
                                        value={smartType}
                                        onChange={(e) => setSmartType(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="smart_dynamic">Live Dynamic (auto-includes new uploads)</option>
                                        <option value="smart_snapshot">Snapshot (one-time freeze)</option>
                                    </StudioSelect>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-card-bg border border-card-border flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <Eye className="w-4 h-4 text-primary-glow" />
                                    <span className="text-xs font-semibold text-foreground">
                                        {loadingPreview ? (
                                            'Calculating matching graphics...'
                                        ) : previewMatchCount !== null ? (
                                            <>
                                                Matches{' '}
                                                <strong className="text-primary-glow font-bold text-sm">
                                                    {previewMatchCount}
                                                </strong>{' '}
                                                published graphics in catalog
                                            </>
                                        ) : (
                                            'Add tags above to preview live match count'
                                        )}
                                    </span>
                                </div>

                                {previewSampleImages.length > 0 && (
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {previewSampleImages.slice(0, 4).map((img, i) => (
                                            <img
                                                key={img.id || i}
                                                src={img.path}
                                                alt=""
                                                className="inline-block h-7 w-7 rounded-full ring-2 ring-card-bg object-contain bg-foreground/5 p-0.5"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {mode === 'manual' && (
                        <div className="p-5 rounded-xl border border-card-border bg-card-header-bg/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        Hand-Pick Images
                                    </h4>
                                    <p className="text-xs text-foreground/60 mt-0.5">
                                        {selectedImageIds.length} images selected from library
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAssetPickerOpen(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Browse Library</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Optional Hero Banner & Recommendation Card Customization */}
                    <HeroBannerCustomizer
                        collectionId={null}
                        collectionName={name}
                        imageCount={mode === 'smart' ? previewMatchCount || 0 : selectedImageIds.length}
                        heroImagePath={heroImagePath}
                        setHeroImagePath={setHeroImagePath}
                        heroBgColor={heroBgColor}
                        setHeroBgColor={setHeroBgColor}
                        heroTextColor={heroTextColor}
                        setHeroTextColor={setHeroTextColor}
                        coverImagePath={coverImagePath}
                        setCoverImagePath={setCoverImagePath}
                        fallbackThumbnailPath={previewSampleImages[0]?.path || ''}
                        cardBgImagePath={cardBgImagePath}
                        setCardBgImagePath={setCardBgImagePath}
                        cardBgColor={cardBgColor}
                        setCardBgColor={setCardBgColor}
                        cardTextColor={cardTextColor}
                        setCardTextColor={setCardTextColor}
                        trendingCardImagePath={trendingCardImagePath}
                        setTrendingCardImagePath={setTrendingCardImagePath}
                        previewImages={previewSampleImages}
                        onOpenLibraryPicker={(field) => setPickerTargetField(field || 'heroImagePath')}
                    />

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="isFeatured"
                            checked={isFeatured}
                            onChange={(e) => setIsFeatured(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-card-border focus:ring-primary-glow"
                        />
                        <label htmlFor="isFeatured" className="text-xs font-semibold text-foreground cursor-pointer">
                            Feature this collection on the homepage and top banner
                        </label>
                    </div>
                </div>

                <div className="p-5 border-t border-card-border flex items-center justify-between bg-card-header-bg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-card-border hover:bg-white/5 text-foreground transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Create Collection</span>
                    </button>
                </div>
            </div>

            <AssetPickerModal
                isOpen={isAssetPickerOpen}
                onClose={() => setIsAssetPickerOpen(false)}
                initialSelectedIds={selectedImageIds}
                onConfirm={(ids) => setSelectedImageIds(ids)}
            />

            <AssetPickerModal
                isOpen={Boolean(pickerTargetField)}
                onClose={() => setPickerTargetField(null)}
                onConfirm={handlePickCatalogHero}
                title="Pick Image from Library"
            />
        </div>
    );
}

