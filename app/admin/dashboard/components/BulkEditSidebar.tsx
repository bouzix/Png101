'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { generateImageMetadata } from '@/app/actions/generate-meta';
import { Loader2, Sparkles, Wand2, Sun, Moon, Grid, AlertTriangle, Palette, X, Plus, Trash2, Check } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

const FIXED_DARK_PRESETS = [
    { name: 'Slate 50', color: '#f8fafc' },
    { name: 'Slate 100', color: '#f1f5f9' },
    { name: 'Slate 200', color: '#e2e8f0' },
    { name: 'Slate 300', color: '#cbd5e1' },
];

const FIXED_LIGHT_PRESETS = [
    { name: 'Slate 300', color: '#cbd5e1' },
    { name: 'Slate 600', color: '#475569' },
    { name: 'Slate 900', color: '#0f172a' },
    { name: 'Slate 950', color: '#020617' },
];

interface BulkEditSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedImages: {
        id: string;
        filename: string;
        path: string;
        tags?: string[];
        altText?: string;
        description?: string;
        categoryIds?: string[];
        luminance?: string | null;
        contrastBgDark?: string | null;
        contrastBgLight?: string | null;
    }[];
    onSave: (updates: {
        id: string;
        name: string;
        tags: string[];
        altText?: string;
        description?: string;
        categoryIds?: string[];
        contrastBgDark?: string | null;
        contrastBgLight?: string | null;
    }[]) => void;
}

interface ImageFormData {
    id: string;
    name: string;
    tags: string[];
    altText: string;
    description: string;
    preview: string;
    luminance?: string | null;
    contrastBgDark?: string | null;
    contrastBgLight?: string | null;
    previewMode: 'dark' | 'light' | 'checker';
}

interface ContrastCustomTemplate {
    name: string;
    color: string;
}

const BulkEditSidebar = ({ isOpen, onClose, selectedImages, onSave }: BulkEditSidebarProps) => {
    const [formsData, setFormsData] = useState<ImageFormData[]>([]);
    const [tagInputs, setTagInputs] = useState<{ [key: string]: string }>({});
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
    const [isGenerating, setIsGenerating] = useState<{ [key: string]: boolean }>({});
    const [activeColorPicker, setActiveColorPicker] = useState<{ id: string; type: 'dark' | 'light' } | null>(null);
    const [customLightTemplates, setCustomLightTemplates] = useState<ContrastCustomTemplate[]>([]);
    const [customDarkTemplates, setCustomDarkTemplates] = useState<ContrastCustomTemplate[]>([]);
    const [templateNameInput, setTemplateNameInput] = useState<{ [key: string]: string }>({});
    const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/admin/contrast-templates')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data.lightCustoms)) setCustomLightTemplates(data.lightCustoms);
                    if (Array.isArray(data.darkCustoms)) setCustomDarkTemplates(data.darkCustoms);
                })
                .catch(err => console.error('Failed to load custom contrast templates:', err));
        }
    }, [isOpen]);

    const handleAddCustomTemplate = async (type: 'light' | 'dark', color: string, name?: string) => {
        if (!color || color === 'none') return;
        setIsSavingTemplate(true);
        try {
            const res = await fetch('/api/admin/contrast-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, action: 'add', color, name }),
            });
            const result = await res.json();
            if (res.ok) {
                if (type === 'light') setCustomLightTemplates(result.list);
                else setCustomDarkTemplates(result.list);
                toast.success(`Saved "${name && name.trim() ? name.trim() : color.toUpperCase()}" to templates!`);
            } else {
                toast.error(result.error || 'Failed to save template');
            }
        } catch {
            toast.error('Network error saving template');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDeleteCustomTemplate = async (type: 'light' | 'dark', color: string) => {
        try {
            const res = await fetch('/api/admin/contrast-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, action: 'delete', color }),
            });
            const result = await res.json();
            if (res.ok) {
                if (type === 'light') setCustomLightTemplates(result.list);
                else setCustomDarkTemplates(result.list);
                toast.success(`Removed ${color.toUpperCase()} from templates`);
            } else {
                toast.error(result.error || 'Failed to remove template');
            }
        } catch {
            toast.error('Network error removing template');
        }
    };

    const MODELS = [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro' },
    ];

    const compressImageToBase64 = (url: string, maxDimension = 800): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                // Export as WebP (supports transparency and compresses well under 1 MB)
                const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
                resolve(compressedDataUrl);
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = url;
        });
    };

    const handleAutoFill = async (id: string, previewUrl: string) => {
        setIsGenerating(prev => ({ ...prev, [id]: true }));
        try {
            const base64 = await compressImageToBase64(previewUrl);

            const metadata = await generateImageMetadata(base64, selectedModel);

            setFormsData(prev => prev.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        name: metadata.title || item.name,
                        altText: metadata.altText || item.altText,
                        description: metadata.description || item.description,
                        tags: metadata.tags || item.tags // Replace tags or append? User request implies autofill, usually replaces or fills empty. I will replace to be cleaner based on "autofill".
                    };
                }
                return item;
            }));
            toast.success("AI Metadata generated successfully!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to generate metadata. Check API key or Rate Limits.");
        } finally {
            setIsGenerating(prev => ({ ...prev, [id]: false }));
        }
    };




    useEffect(() => {
        if (isOpen) {
            fetch('/api/admin/api-keys')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const activeKey = data.find((k: any) => k.isActive);
                        if (activeKey) {
                            if (activeKey.modelVersion === '3.8') {
                                setSelectedModel('gemini-3.8-flash');
                            } else if (activeKey.modelVersion === '3.0') {
                                setSelectedModel('gemini-3.0-pro');
                            } else {
                                setSelectedModel('gemini-2.5-flash');
                            }
                        }
                    }
                })
                .catch(err => console.error('Failed to detect active API key model:', err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && selectedImages.length > 0) {
            // Initialize forms data from selected images
            setFormsData(selectedImages.map(img => ({
                id: img.id,
                name: img.filename, // Use filename as initial name if name not provided (or passed as filename)
                tags: img.tags || [],
                altText: img.altText || '',
                description: img.description || '',
                preview: img.path,
                luminance: img.luminance || null,
                contrastBgDark: img.contrastBgDark || (img.luminance === 'dark' ? '#f8fafc' : null),
                contrastBgLight: img.contrastBgLight || (img.luminance === 'light' ? '#cbd5e1' : null),
                previewMode: (img.luminance === 'light' ? 'light' : 'dark') as 'dark' | 'light' | 'checker'
            })));
            setTagInputs({});
        }
    }, [isOpen, selectedImages]);

    const handleInputChange = (id: string, field: keyof ImageFormData, value: any) => {
        setFormsData(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleTagInput = (id: string, value: string) => {
        setTagInputs(prev => ({ ...prev, [id]: value }));
    };

    const handleTagKeyDown = (id: string, e: React.KeyboardEvent) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const input = tagInputs[id] || '';
            const newTag = input.trim();
            if (newTag) {
                setFormsData(prev => prev.map(item => {
                    if (item.id === id && !item.tags.includes(newTag)) {
                        return { ...item, tags: [...item.tags, newTag] };
                    }
                    return item;
                }));
                setTagInputs(prev => ({ ...prev, [id]: '' }));
            }
        }
    };

    const removeTag = (id: string, tagToRemove: string) => {
        setFormsData(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, tags: item.tags.filter(t => t !== tagToRemove) };
            }
            return item;
        }));
    };

    const MAX_TAGS = 30;
    const hasValidationErrors = formsData.some(data => data.tags.length > MAX_TAGS);

    const handleSaveAll = () => {
        if (hasValidationErrors) return;

        const updates = formsData.map(data => ({
            id: data.id,
            name: data.name,
            tags: data.tags,
            altText: data.altText || undefined,
            description: data.description || undefined,
            contrastBgDark: data.contrastBgDark,
            contrastBgLight: data.contrastBgLight
        }));
        onSave(updates);
    };

    const cyclePreviewMode = (id: string, current: 'dark' | 'light' | 'checker') => {
        const next: 'dark' | 'light' | 'checker' =
            current === 'dark' ? 'light' : current === 'light' ? 'checker' : 'dark';
        handleInputChange(id, 'previewMode', next);
    };

    const getPreviewStyle = (item: ImageFormData): React.CSSProperties => {
        if (item.previewMode === 'dark') {
            const isDarkClash = item.luminance === 'dark' && item.contrastBgDark !== 'none';
            const bg = isDarkClash ? (item.contrastBgDark || '#f8fafc') : '#0f172a';
            return {
                backgroundColor: bg,
                borderColor: isDarkClash ? '#e2e8f0' : '#1e293b'
            };
        }
        if (item.previewMode === 'light') {
            const isLightClash = item.luminance === 'light' && item.contrastBgLight !== 'none';
            const bg = isLightClash ? (item.contrastBgLight || '#cbd5e1') : '#ffffff';
            return {
                backgroundColor: bg,
                borderColor: isLightClash ? '#94a3b8' : '#e2e8f0'
            };
        }
        // Checkerboard
        return {
            backgroundImage:
                'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0'
        };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-card-bg border-l border-card-border shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-background/50 backdrop-blur-sm">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Edit Details</h3>
                    <p className="text-sm text-foreground/60">{selectedImages.length} items selected</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="appearance-none bg-card-bg border border-card-border text-foreground text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary-glow pr-8 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            {MODELS.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>


                <button onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors p-2 hover:bg-white/5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {formsData.map((data, index) => {
                    const isTagsLimitExceeded = data.tags.length > MAX_TAGS;

                    return (
                        <div key={data.id} className="bg-background border border-card-border rounded-xl p-5 space-y-5 shadow-sm">
                            {/* Image Preview Area with Mode Toggle & AI Autofill */}
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative">
                                    <div
                                        className="w-36 h-36 rounded-xl border flex items-center justify-center p-3 relative overflow-hidden transition-all duration-200 shadow-md"
                                        style={getPreviewStyle(data)}
                                    >
                                        <img src={data.preview} alt="" className="max-w-full max-h-full object-contain select-none" />
                                    </div>

                                    {/* Theme Mode Toggle (Top-Left of Preview Box) */}
                                    <button
                                        type="button"
                                        onClick={() => cyclePreviewMode(data.id, data.previewMode)}
                                        className="absolute -left-2 -top-2 bg-card-bg/95 hover:bg-card-bg border border-card-border text-foreground p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                                        title={`Current preview: ${data.previewMode} mode. Click to switch.`}
                                    >
                                        {data.previewMode === 'dark' ? (
                                            <Moon className="w-3.5 h-3.5 text-blue-400" />
                                        ) : data.previewMode === 'light' ? (
                                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                                        ) : (
                                            <Grid className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                    </button>

                                    {/* AI Auto-Fill Button (Top-Right of Preview Box) */}
                                    <button
                                        type="button"
                                        onClick={() => handleAutoFill(data.id, data.preview)}
                                        disabled={isGenerating[data.id]}
                                        className="absolute -right-2 -top-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-2 rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        title="Auto-fill with AI"
                                    >
                                        {isGenerating[data.id] ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Mode Indicator & Quick Switch Pills */}
                                <div className="flex items-center gap-1.5 mt-2.5">
                                    <span className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider mr-1">Preview:</span>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange(data.id, 'previewMode', 'dark')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                            data.previewMode === 'dark'
                                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                                : 'bg-card-bg text-foreground/60 border-card-border hover:text-foreground'
                                        }`}
                                    >
                                        <Moon className="w-2.5 h-2.5" /> Dark
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange(data.id, 'previewMode', 'light')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                            data.previewMode === 'light'
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                : 'bg-card-bg text-foreground/60 border-card-border hover:text-foreground'
                                        }`}
                                    >
                                        <Sun className="w-2.5 h-2.5" /> Light
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange(data.id, 'previewMode', 'checker')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                            data.previewMode === 'checker'
                                                ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                                                : 'bg-card-bg text-foreground/60 border-card-border hover:text-foreground'
                                        }`}
                                    >
                                        <Grid className="w-2.5 h-2.5" /> Grid
                                    </button>
                                </div>
                            </div>

                            {/* Conditional Contrast Warning & Background Customizer (Only shown when an issue is detected) */}
                            {data.luminance === 'dark' && (
                                <div className="bg-card-bg border border-card-border rounded-xl p-4 space-y-3 shadow-sm animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                                            <span>Dark Graphic Contrast Alert</span>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 shrink-0">
                                            Dark Mode Issue
                                        </span>
                                    </div>

                                    <p className="text-xs text-foreground/70 leading-relaxed">
                                        This image is dark/black and will blend into Dark Mode. Choose a contrast background for Dark Mode:
                                    </p>

                                    {/* Fixed Presets + Custom Saved Templates + Custom Color + None */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {FIXED_DARK_PRESETS.map(preset => {
                                            const isSelected = (data.contrastBgDark || '#f8fafc').toLowerCase() === preset.color.toLowerCase();
                                            return (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    onClick={() => {
                                                        handleInputChange(data.id, 'contrastBgDark', preset.color);
                                                        handleInputChange(data.id, 'previewMode', 'dark');
                                                        if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                    }}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span
                                                        className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                        style={{ backgroundColor: preset.color }}
                                                    />
                                                    <span>{preset.name}</span>
                                                </button>
                                            );
                                        })}

                                        {/* User Custom Saved Templates (Max 3) */}
                                        {customDarkTemplates.map(customTmpl => {
                                            const isSelected = (data.contrastBgDark || '').toLowerCase() === customTmpl.color.toLowerCase();
                                            return (
                                                <div
                                                    key={customTmpl.color}
                                                    className={`flex items-center rounded-lg border text-xs font-medium transition-all ${
                                                        isSelected
                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleInputChange(data.id, 'contrastBgDark', customTmpl.color);
                                                            handleInputChange(data.id, 'previewMode', 'dark');
                                                            if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                        }}
                                                        className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 cursor-pointer"
                                                        title={`${customTmpl.name} (${customTmpl.color.toUpperCase()})`}
                                                    >
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                            style={{ backgroundColor: customTmpl.color }}
                                                        />
                                                        <span className="truncate max-w-[90px]">{customTmpl.name}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCustomTemplate('dark', customTmpl.color);
                                                        }}
                                                        className="pr-2 pl-1 py-1.5 text-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                                                        title={`Delete custom template "${customTmpl.name}"`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Custom Color Button with react-colorful HexColorPicker */}
                                        {(() => {
                                            const isFixed = FIXED_DARK_PRESETS.some(p => p.color.toLowerCase() === (data.contrastBgDark || '').toLowerCase());
                                            const isSavedCustom = customDarkTemplates.some(c => c.color.toLowerCase() === (data.contrastBgDark || '').toLowerCase());
                                            const isCustomActive = Boolean(data.contrastBgDark && data.contrastBgDark !== 'none' && !isFixed && !isSavedCustom);
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveColorPicker(prev =>
                                                            prev?.id === data.id && prev?.type === 'dark' ? null : { id: data.id, type: 'dark' }
                                                        )
                                                    }
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                        isCustomActive
                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                    title="Pick custom color with color picker"
                                                >
                                                    <Palette className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                    <span>Custom</span>
                                                    {isCustomActive && (
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                            style={{ backgroundColor: data.contrastBgDark! }}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })()}

                                        {/* None / Turn Off */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleInputChange(data.id, 'contrastBgDark', 'none');
                                                handleInputChange(data.id, 'previewMode', 'dark');
                                                if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                            }}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                data.contrastBgDark === 'none'
                                                    ? 'border-red-500 bg-red-500/15 text-red-500 dark:text-red-300 ring-1 ring-red-500 font-bold'
                                                    : 'border-card-border bg-background text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                            title="Do not apply contrast background (keep standard dark card)"
                                        >
                                            None (Standard Dark)
                                        </button>
                                    </div>

                                    {/* Inline react-colorful HexColorPicker for Dark Mode */}
                                    {activeColorPicker?.id === data.id && activeColorPicker?.type === 'dark' && (
                                        <div className="p-3.5 bg-background border border-card-border rounded-xl shadow-md flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Custom Dark Mode Background</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveColorPicker(null)}
                                                    className="text-foreground/50 hover:text-foreground text-xs p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <HexColorPicker
                                                color={data.contrastBgDark && data.contrastBgDark !== 'none' ? data.contrastBgDark : '#f8fafc'}
                                                onChange={(newColor) => {
                                                    handleInputChange(data.id, 'contrastBgDark', newColor);
                                                    handleInputChange(data.id, 'previewMode', 'dark');
                                                }}
                                            />

                                            <div className="flex items-center gap-2 w-full max-w-[240px]">
                                                <span
                                                    className="w-7 h-7 rounded-lg border border-card-border shrink-0 shadow-sm"
                                                    style={{ backgroundColor: data.contrastBgDark && data.contrastBgDark !== 'none' ? data.contrastBgDark : '#f8fafc' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={(data.contrastBgDark && data.contrastBgDark !== 'none' ? data.contrastBgDark : '#f8fafc').toUpperCase()}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                        handleInputChange(data.id, 'contrastBgDark', val);
                                                        handleInputChange(data.id, 'previewMode', 'dark');
                                                    }}
                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:border-primary-glow text-center font-bold"
                                                    placeholder="#HEX"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveColorPicker(null)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-primary-glow text-white text-xs font-bold hover:bg-primary-glow/90 shrink-0 cursor-pointer"
                                                >
                                                    Done
                                                </button>
                                            </div>

                                            {/* Add as Template section */}
                                            {(() => {
                                                const currentColor = (data.contrastBgDark && data.contrastBgDark !== 'none' ? data.contrastBgDark : '#f8fafc').toLowerCase();
                                                const isAlreadySaved = customDarkTemplates.some(c => c.color.toLowerCase() === currentColor);
                                                const isMaxReached = customDarkTemplates.length >= 3;
                                                const inputKey = `${data.id}_dark`;
                                                const currentNameInput = templateNameInput[inputKey] || '';

                                                return (
                                                    <div className="w-full pt-2.5 border-t border-card-border flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-[11px] text-foreground/60">
                                                                Custom Templates: <strong className="text-foreground">{customDarkTemplates.length}/3</strong>
                                                            </span>
                                                            {isAlreadySaved ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                                                                    <Check className="w-3.5 h-3.5" /> Saved as template
                                                                </span>
                                                            ) : isMaxReached ? (
                                                                <span className="text-[11px] text-amber-500 font-medium" title="Delete an existing custom template to add a new one">
                                                                    Max 3 reached (delete one first)
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        {!isAlreadySaved && !isMaxReached && (
                                                            <div className="flex items-center gap-2 w-full">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Template name (e.g. Pure White)"
                                                                    value={currentNameInput}
                                                                    maxLength={24}
                                                                    onChange={(e) => setTemplateNameInput(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary-glow font-medium"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={isSavingTemplate}
                                                                    onClick={() => {
                                                                        handleAddCustomTemplate('dark', currentColor, currentNameInput);
                                                                        setTemplateNameInput(prev => ({ ...prev, [inputKey]: '' }));
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                                                >
                                                                    {isSavingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                                    <span>Save</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {data.luminance === 'light' && (
                                <div className="bg-card-bg border border-card-border rounded-xl p-4 space-y-3 shadow-sm animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 dark:text-blue-400">
                                            <AlertTriangle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                                            <span>Light Graphic Contrast Alert</span>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 shrink-0">
                                            Light Mode Issue
                                        </span>
                                    </div>

                                    <p className="text-xs text-foreground/70 leading-relaxed">
                                        This image is white/light and will blend into Light Mode. Choose a contrast background for Light Mode:
                                    </p>

                                    {/* Fixed Presets + Custom Saved Templates + Custom Color + None */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {FIXED_LIGHT_PRESETS.map(preset => {
                                            const isSelected = (data.contrastBgLight || '#cbd5e1').toLowerCase() === preset.color.toLowerCase();
                                            return (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    onClick={() => {
                                                        handleInputChange(data.id, 'contrastBgLight', preset.color);
                                                        handleInputChange(data.id, 'previewMode', 'light');
                                                        if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                    }}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span
                                                        className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                        style={{ backgroundColor: preset.color }}
                                                    />
                                                    <span>{preset.name}</span>
                                                </button>
                                            );
                                        })}

                                        {/* User Custom Saved Templates (Max 3) */}
                                        {customLightTemplates.map(customTmpl => {
                                            const isSelected = (data.contrastBgLight || '').toLowerCase() === customTmpl.color.toLowerCase();
                                            return (
                                                <div
                                                    key={customTmpl.color}
                                                    className={`flex items-center rounded-lg border text-xs font-medium transition-all ${
                                                        isSelected
                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleInputChange(data.id, 'contrastBgLight', customTmpl.color);
                                                            handleInputChange(data.id, 'previewMode', 'light');
                                                            if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                                        }}
                                                        className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 cursor-pointer"
                                                        title={`${customTmpl.name} (${customTmpl.color.toUpperCase()})`}
                                                    >
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                            style={{ backgroundColor: customTmpl.color }}
                                                        />
                                                        <span className="truncate max-w-[90px]">{customTmpl.name}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCustomTemplate('light', customTmpl.color);
                                                        }}
                                                        className="pr-2 pl-1 py-1.5 text-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                                                        title={`Delete custom template "${customTmpl.name}"`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Custom Color Button with react-colorful HexColorPicker */}
                                        {(() => {
                                            const isFixed = FIXED_LIGHT_PRESETS.some(p => p.color.toLowerCase() === (data.contrastBgLight || '').toLowerCase());
                                            const isSavedCustom = customLightTemplates.some(c => c.color.toLowerCase() === (data.contrastBgLight || '').toLowerCase());
                                            const isCustomActive = Boolean(data.contrastBgLight && data.contrastBgLight !== 'none' && !isFixed && !isSavedCustom);
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveColorPicker(prev =>
                                                            prev?.id === data.id && prev?.type === 'light' ? null : { id: data.id, type: 'light' }
                                                        )
                                                    }
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                        isCustomActive
                                                            ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                                            : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                    title="Pick custom color with color picker"
                                                >
                                                    <Palette className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                                                    <span>Custom</span>
                                                    {isCustomActive && (
                                                        <span
                                                            className="w-3 h-3 rounded-full border border-card-border shrink-0"
                                                            style={{ backgroundColor: data.contrastBgLight! }}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })()}

                                        {/* None / Turn Off */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleInputChange(data.id, 'contrastBgLight', 'none');
                                                handleInputChange(data.id, 'previewMode', 'light');
                                                if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                            }}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                data.contrastBgLight === 'none'
                                                    ? 'border-red-500 bg-red-500/15 text-red-500 dark:text-red-300 ring-1 ring-red-500 font-bold'
                                                    : 'border-card-border bg-background text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                            title="Do not apply contrast background (keep standard light card)"
                                        >
                                            None (Standard Light)
                                        </button>
                                    </div>

                                    {/* Inline react-colorful HexColorPicker for Light Mode */}
                                    {activeColorPicker?.id === data.id && activeColorPicker?.type === 'light' && (
                                        <div className="p-3.5 bg-background border border-card-border rounded-xl shadow-md flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-bold text-foreground">Custom Light Mode Background</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveColorPicker(null)}
                                                    className="text-foreground/50 hover:text-foreground text-xs p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <HexColorPicker
                                                color={data.contrastBgLight && data.contrastBgLight !== 'none' ? data.contrastBgLight : '#cbd5e1'}
                                                onChange={(newColor) => {
                                                    handleInputChange(data.id, 'contrastBgLight', newColor);
                                                    handleInputChange(data.id, 'previewMode', 'light');
                                                }}
                                            />

                                            <div className="flex items-center gap-2 w-full max-w-[240px]">
                                                <span
                                                    className="w-7 h-7 rounded-lg border border-card-border shrink-0 shadow-sm"
                                                    style={{ backgroundColor: data.contrastBgLight && data.contrastBgLight !== 'none' ? data.contrastBgLight : '#cbd5e1' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={(data.contrastBgLight && data.contrastBgLight !== 'none' ? data.contrastBgLight : '#cbd5e1').toUpperCase()}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
                                                        handleInputChange(data.id, 'contrastBgLight', val);
                                                        handleInputChange(data.id, 'previewMode', 'light');
                                                    }}
                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:border-primary-glow text-center font-bold"
                                                    placeholder="#HEX"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveColorPicker(null)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-primary-glow text-white text-xs font-bold hover:bg-primary-glow/90 shrink-0 cursor-pointer"
                                                >
                                                    Done
                                                </button>
                                            </div>

                                            {/* Add as Template section */}
                                            {(() => {
                                                const currentColor = (data.contrastBgLight && data.contrastBgLight !== 'none' ? data.contrastBgLight : '#cbd5e1').toLowerCase();
                                                const isAlreadySaved = customLightTemplates.some(c => c.color.toLowerCase() === currentColor);
                                                const isMaxReached = customLightTemplates.length >= 3;
                                                const inputKey = `${data.id}_light`;
                                                const currentNameInput = templateNameInput[inputKey] || '';

                                                return (
                                                    <div className="w-full pt-2.5 border-t border-card-border flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-[11px] text-foreground/60">
                                                                Custom Templates: <strong className="text-foreground">{customLightTemplates.length}/3</strong>
                                                            </span>
                                                            {isAlreadySaved ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                                                                    <Check className="w-3.5 h-3.5" /> Saved as template
                                                                </span>
                                                            ) : isMaxReached ? (
                                                                <span className="text-[11px] text-amber-500 font-medium" title="Delete an existing custom template to add a new one">
                                                                    Max 3 reached (delete one first)
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        {!isAlreadySaved && !isMaxReached && (
                                                            <div className="flex items-center gap-2 w-full">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Template name (e.g. Pale Slate)"
                                                                    value={currentNameInput}
                                                                    maxLength={24}
                                                                    onChange={(e) => setTemplateNameInput(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                                                    className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary-glow font-medium"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={isSavingTemplate}
                                                                    onClick={() => {
                                                                        handleAddCustomTemplate('light', currentColor, currentNameInput);
                                                                        setTemplateNameInput(prev => ({ ...prev, [inputKey]: '' }));
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                                                                >
                                                                    {isSavingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                                    <span>Save</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Title and Alt Text */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => handleInputChange(data.id, 'name', e.target.value)}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all text-sm font-medium"
                                        placeholder="Image title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                                        Alt Text
                                    </label>
                                    <input
                                        type="text"
                                        value={data.altText}
                                        onChange={(e) => handleInputChange(data.id, 'altText', e.target.value)}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all text-sm"
                                        placeholder="Describe image for accessibility"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => handleInputChange(data.id, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all text-sm resize-none"
                                    placeholder="Detailed description..."
                                />
                            </div>



                            {/* Tags */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider">
                                        Tags
                                    </label>
                                    <span className={`text-xs font-medium ${isTagsLimitExceeded ? 'text-red-500' : 'text-foreground/40'}`}>
                                        {data.tags.length}/{MAX_TAGS}
                                    </span>
                                </div>
                                <div className={`w-full bg-card-bg border ${isTagsLimitExceeded ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-card-border'} rounded-lg p-3 flex flex-wrap gap-2 items-center min-h-[42px] transition-all`}>
                                    {data.tags.map(tag => (
                                        <span key={tag} className="bg-primary-glow/20 text-primary-glow text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-primary-glow/20">
                                            {tag}
                                            <button onClick={() => removeTag(data.id, tag)} className="hover:text-white transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInputs[data.id] || ''}
                                        onChange={(e) => handleTagInput(data.id, e.target.value)}
                                        onKeyDown={(e) => handleTagKeyDown(data.id, e)}
                                        onPaste={(e) => {
                                            e.preventDefault();
                                            const pastedText = e.clipboardData.getData('text');
                                            const newTags = pastedText
                                                .split(',')
                                                .map(t => t.trim())
                                                .filter(t => t.length > 0);

                                            if (newTags.length > 0) {
                                                setFormsData(prev => prev.map(item => {
                                                    if (item.id === data.id) {
                                                        // Add only unique tags
                                                        const uniqueNewTags = newTags.filter(t => !item.tags.includes(t));
                                                        return { ...item, tags: [...item.tags, ...uniqueNewTags] };
                                                    }
                                                    return item;
                                                }));
                                            }
                                        }}
                                        placeholder={data.tags.length === 0 ? "Add tags..." : ""}
                                        className="bg-transparent text-foreground text-sm focus:outline-none flex-1 min-w-[60px]"
                                    />
                                </div>
                                {isTagsLimitExceeded && (
                                    <p className="text-red-500 text-xs mt-1.5 font-medium">
                                        Limit exceeded. Please remove {data.tags.length - MAX_TAGS} tag(s).
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-6 border-t border-card-border bg-card-bg/95 backdrop-blur-sm space-y-4">
                {hasValidationErrors && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                        Maximum {MAX_TAGS} tags allowed per image.
                    </div>
                )}
                <button
                    onClick={handleSaveAll}
                    disabled={hasValidationErrors}
                    className="w-full py-4 px-8 bg-primary-glow hover:bg-primary-glow/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                    SAVE ALL CHANGES ({selectedImages.length})
                </button>
            </div>
        </div>
    );
};

export default BulkEditSidebar;
