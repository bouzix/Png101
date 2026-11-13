import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Wand2, Sun, Moon, Grid, AlertTriangle, Palette, X } from 'lucide-react';
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

const MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
    { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro' },
];

const BulkEditSidebar = ({ isOpen, onClose, selectedImages = [], onSave }) => {
    const [formsData, setFormsData] = useState([]);
    const [tagInputs, setTagInputs] = useState({});
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const [isGenerating, setIsGenerating] = useState({});
    const [activeColorPicker, setActiveColorPicker] = useState(null);
    const [customLightTemplates, setCustomLightTemplates] = useState([]);
    const [customDarkTemplates, setCustomDarkTemplates] = useState([]);
    const [templateNameInput, setTemplateNameInput] = useState({});
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

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

    useEffect(() => {
        if (isOpen) {
            fetch('/api/admin/api-keys')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const activeKey = data.find(k => k.isActive);
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
            setFormsData(
                selectedImages.map(img => ({
                    id: img.id,
                    name: img.name || img.filename || '',
                    tags: img.tags || [],
                    altText: img.altText || '',
                    description: img.description || '',
                    preview: img.path || img.previewPath,
                    luminance: img.luminance || null,
                    contrastBgDark: img.contrastBgDark || (img.luminance === 'dark' ? '#f8fafc' : null),
                    contrastBgLight: img.contrastBgLight || (img.luminance === 'light' ? '#cbd5e1' : null),
                    previewMode: img.luminance === 'light' ? 'light' : 'dark',
                }))
            );
            setTagInputs({});
        }
    }, [isOpen, selectedImages]);

    const handleAddCustomTemplate = async (type, color, name) => {
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

    const handleDeleteCustomTemplate = async (type, color) => {
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

    const compressImageToBase64 = (url, maxDimension = 800) => {
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
                resolve(canvas.toDataURL('image/webp', 0.8));
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = url;
        });
    };

    const handleAutoFill = async (id, previewUrl) => {
        setIsGenerating(prev => ({ ...prev, [id]: true }));
        try {
            const base64 = await compressImageToBase64(previewUrl);
            const res = await fetch('/api/images/generate-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, model: selectedModel }),
            });
            const metadata = await res.json();
            if (!res.ok) {
                throw new Error(metadata.error || 'Failed to generate metadata');
            }

            setFormsData(prev =>
                prev.map(item =>
                    item.id === id
                        ? {
                              ...item,
                              name: metadata.title || item.name,
                              altText: metadata.altText || item.altText,
                              description: metadata.description || item.description,
                              tags: metadata.tags || item.tags,
                          }
                        : item
                )
            );
            toast.success('AI Metadata generated successfully!');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to generate metadata. Check API key or Rate Limits.');
        } finally {
            setIsGenerating(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleInputChange = (id, field, value) => {
        setFormsData(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleTagInput = (id, value) => {
        setTagInputs(prev => ({ ...prev, [id]: value }));
    };

    const handleTagKeyDown = (id, e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const input = tagInputs[id] || '';
            const newTag = input.trim();
            if (newTag) {
                setFormsData(prev =>
                    prev.map(item => {
                        if (item.id === id && !item.tags.includes(newTag)) {
                            return { ...item, tags: [...item.tags, newTag] };
                        }
                        return item;
                    })
                );
                setTagInputs(prev => ({ ...prev, [id]: '' }));
            }
        }
    };

    const removeTag = (id, tagToRemove) => {
        setFormsData(prev =>
            prev.map(item =>
                item.id === id ? { ...item, tags: item.tags.filter(t => t !== tagToRemove) } : item
            )
        );
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
            contrastBgLight: data.contrastBgLight,
        }));
        onSave(updates);
    };

    const cyclePreviewMode = (id, current) => {
        const next = current === 'dark' ? 'light' : current === 'light' ? 'checker' : 'dark';
        handleInputChange(id, 'previewMode', next);
    };

    const getPreviewStyle = (item) => {
        if (item.previewMode === 'dark') {
            const isDarkClash = item.luminance === 'dark' && item.contrastBgDark !== 'none';
            const bg = isDarkClash ? item.contrastBgDark || '#f8fafc' : '#0f172a';
            return {
                backgroundColor: bg,
                borderColor: isDarkClash ? '#e2e8f0' : '#1e293b',
            };
        }
        if (item.previewMode === 'light') {
            const isLightClash = item.luminance === 'light' && item.contrastBgLight !== 'none';
            const bg = isLightClash ? item.contrastBgLight || '#cbd5e1' : '#ffffff';
            return {
                backgroundColor: bg,
                borderColor: isLightClash ? '#94a3b8' : '#e2e8f0',
            };
        }
        return {
            backgroundImage:
                'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
        };
    };

    const renderContrastSection = (data, type) => {
        const isDark = type === 'dark';
        const field = isDark ? 'contrastBgDark' : 'contrastBgLight';
        const presets = isDark ? FIXED_DARK_PRESETS : FIXED_LIGHT_PRESETS;
        const customTemplates = isDark ? customDarkTemplates : customLightTemplates;
        const currentValue = data[field];
        const defaultHex = isDark ? '#f8fafc' : '#cbd5e1';
        const isFixed = presets.some(p => p.color.toLowerCase() === (currentValue || '').toLowerCase());
        const isSavedCustom = customTemplates.some(c => c.color.toLowerCase() === (currentValue || '').toLowerCase());
        const isCustomActive = Boolean(currentValue && currentValue !== 'none' && !isFixed && !isSavedCustom);
        const pickerOpen = activeColorPicker?.id === data.id && activeColorPicker?.type === type;
        const nameKey = `${data.id}_${type}`;

        return (
            <div className="bg-card-bg border border-card-border rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{isDark ? 'Dark Graphic Contrast Alert' : 'Light Graphic Contrast Alert'}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 shrink-0">
                        {isDark ? 'Dark Mode Issue' : 'Light Mode Issue'}
                    </span>
                </div>

                <p className="text-xs text-foreground/70 leading-relaxed">
                    {isDark
                        ? 'This image is dark/black and will blend into Dark Mode. Choose a contrast background for Dark Mode:'
                        : 'This image is white/light and will blend into Light Mode. Choose a contrast background for Light Mode:'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                    {presets.map(preset => {
                        const isSelected = (currentValue || defaultHex).toLowerCase() === preset.color.toLowerCase();
                        return (
                            <button
                                key={preset.color}
                                type="button"
                                onClick={() => {
                                    handleInputChange(data.id, field, preset.color);
                                    handleInputChange(data.id, 'previewMode', type);
                                    if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                    isSelected
                                        ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                        : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <span className="w-3 h-3 rounded-full border border-card-border shrink-0" style={{ backgroundColor: preset.color }} />
                                <span>{preset.name}</span>
                            </button>
                        );
                    })}

                    {customTemplates.map(customTmpl => {
                        const isSelected = (currentValue || '').toLowerCase() === customTmpl.color.toLowerCase();
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
                                        handleInputChange(data.id, field, customTmpl.color);
                                        handleInputChange(data.id, 'previewMode', type);
                                        if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                                    }}
                                    className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 cursor-pointer"
                                >
                                    <span className="w-3 h-3 rounded-full border border-card-border shrink-0" style={{ backgroundColor: customTmpl.color }} />
                                    <span className="truncate max-w-[90px]">{customTmpl.name}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleDeleteCustomTemplate(type, customTmpl.color);
                                    }}
                                    className="pr-2 pl-1 py-1.5 text-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() =>
                            setActiveColorPicker(prev =>
                                prev?.id === data.id && prev?.type === type ? null : { id: data.id, type }
                            )
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isCustomActive
                                ? 'border-primary-glow bg-primary-glow/15 text-foreground ring-1 ring-primary-glow font-bold'
                                : 'border-card-border bg-background text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <Palette className="w-3.5 h-3.5 text-primary-glow shrink-0" />
                        <span>Custom</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleInputChange(data.id, field, 'none');
                            handleInputChange(data.id, 'previewMode', type);
                            if (activeColorPicker?.id === data.id) setActiveColorPicker(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            currentValue === 'none'
                                ? 'border-red-500 bg-red-500/15 text-red-500 dark:text-red-300 ring-1 ring-red-500 font-bold'
                                : 'border-card-border bg-background text-foreground/60 hover:text-foreground'
                        }`}
                    >
                        None
                    </button>
                </div>

                {pickerOpen && (
                    <div className="p-3 bg-background border border-card-border rounded-xl space-y-3">
                        <HexColorPicker
                            color={currentValue && currentValue !== 'none' ? currentValue : defaultHex}
                            onChange={color => {
                                handleInputChange(data.id, field, color);
                                handleInputChange(data.id, 'previewMode', type);
                            }}
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Template name (optional)"
                                value={templateNameInput[nameKey] || ''}
                                onChange={e => setTemplateNameInput(prev => ({ ...prev, [nameKey]: e.target.value }))}
                                className="flex-1 bg-card-bg border border-card-border text-xs px-2.5 py-1.5 rounded-lg text-foreground"
                            />
                            <button
                                type="button"
                                disabled={isSavingTemplate}
                                onClick={() =>
                                    handleAddCustomTemplate(
                                        type,
                                        currentValue && currentValue !== 'none' ? currentValue : defaultHex,
                                        templateNameInput[nameKey]
                                    )
                                }
                                className="px-3 py-1.5 bg-primary-glow text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                                Save Preset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-card-bg border-l border-card-border shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-background/50 backdrop-blur-sm">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Edit Details</h3>
                    <p className="text-sm text-foreground/60">{selectedImages.length} items selected</p>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="bg-card-bg border border-card-border text-foreground text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary-glow cursor-pointer"
                    >
                        {MODELS.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={onClose}
                    className="text-foreground/40 hover:text-foreground transition-colors p-2 hover:bg-white/5 rounded-full cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {formsData.map(data => {
                    const isTagsLimitExceeded = data.tags.length > MAX_TAGS;

                    return (
                        <div key={data.id} className="bg-background border border-card-border rounded-xl p-5 space-y-5 shadow-sm">
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative">
                                    <div
                                        className="w-36 h-36 rounded-xl border flex items-center justify-center p-3 relative overflow-hidden transition-all duration-200 shadow-md"
                                        style={getPreviewStyle(data)}
                                    >
                                        <img src={data.preview} alt="" className="max-w-full max-h-full object-contain select-none" />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => cyclePreviewMode(data.id, data.previewMode)}
                                        className="absolute -left-2 -top-2 bg-card-bg/95 hover:bg-card-bg border border-card-border text-foreground p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                                        title={`Current preview: ${data.previewMode} mode`}
                                    >
                                        {data.previewMode === 'dark' ? (
                                            <Moon className="w-3.5 h-3.5 text-blue-400" />
                                        ) : data.previewMode === 'light' ? (
                                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                                        ) : (
                                            <Grid className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAutoFill(data.id, data.preview)}
                                        disabled={isGenerating[data.id]}
                                        className="absolute -right-2 -top-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-2 rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 disabled:opacity-50 cursor-pointer"
                                        title="Auto-fill with AI"
                                    >
                                        {isGenerating[data.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {data.luminance === 'dark' && renderContrastSection(data, 'dark')}
                            {data.luminance === 'light' && renderContrastSection(data, 'light')}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1.5">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={e => handleInputChange(data.id, 'name', e.target.value)}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow text-sm font-medium"
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
                                        onChange={e => handleInputChange(data.id, 'altText', e.target.value)}
                                        className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow text-sm"
                                        placeholder="Describe image for accessibility"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={e => handleInputChange(data.id, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg focus:outline-none focus:border-primary-glow text-sm resize-none"
                                    placeholder="Detailed description..."
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider">Tags</label>
                                    <span className={`text-xs font-medium ${isTagsLimitExceeded ? 'text-red-500' : 'text-foreground/40'}`}>
                                        {data.tags.length}/{MAX_TAGS}
                                    </span>
                                </div>
                                <div className={`w-full bg-card-bg border ${isTagsLimitExceeded ? 'border-red-500/50' : 'border-card-border'} rounded-lg p-3 flex flex-wrap gap-2 items-center min-h-[42px]`}>
                                    {data.tags.map(tag => (
                                        <span key={tag} className="bg-primary-glow/20 text-primary-glow text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-primary-glow/20">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(data.id, tag)} className="hover:text-white transition-colors cursor-pointer">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInputs[data.id] || ''}
                                        onChange={e => handleTagInput(data.id, e.target.value)}
                                        onKeyDown={e => handleTagKeyDown(data.id, e)}
                                        onPaste={e => {
                                            e.preventDefault();
                                            const pastedText = e.clipboardData.getData('text');
                                            const newTags = pastedText
                                                .split(',')
                                                .map(t => t.trim())
                                                .filter(t => t.length > 0);
                                            if (newTags.length > 0) {
                                                setFormsData(prev =>
                                                    prev.map(item => {
                                                        if (item.id === data.id) {
                                                            const uniqueNewTags = newTags.filter(t => !item.tags.includes(t));
                                                            return { ...item, tags: [...item.tags, ...uniqueNewTags] };
                                                        }
                                                        return item;
                                                    })
                                                );
                                            }
                                        }}
                                        placeholder={data.tags.length === 0 ? 'Add tags...' : ''}
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
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm font-medium">
                        Maximum {MAX_TAGS} tags allowed per image.
                    </div>
                )}
                <button
                    onClick={handleSaveAll}
                    disabled={hasValidationErrors}
                    className="w-full py-4 px-8 bg-primary-glow hover:bg-primary-glow/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                    SAVE ALL CHANGES ({selectedImages.length})
                </button>
            </div>
        </div>
    );
};

export default BulkEditSidebar;

