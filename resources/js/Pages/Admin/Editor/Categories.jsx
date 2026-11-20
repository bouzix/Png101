import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { FolderTree, Maximize2, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../../Layouts/AdminLayout';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function EditorCategoriesAdmin({ initialCategories = [], initialPresets = [] }) {
    const [categories, setCategories] = useState(initialCategories);
    const [presets, setPresets] = useState(initialPresets);

    const [catForm, setCatForm] = useState({ name: '', description: '', icon: 'Sparkles' });
    const [presetForm, setPresetForm] = useState({ name: '', groupName: 'Social', width: 1080, height: 1080 });
    const [savingCat, setSavingCat] = useState(false);
    const [savingPreset, setSavingPreset] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!catForm.name.trim()) return;
        setSavingCat(true);
        try {
            const res = await fetch('/api/admin/editor/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(catForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add category');
            setCategories((prev) => [...prev, { ...data.category, templates_count: 0 }]);
            setCatForm({ name: '', description: '', icon: 'Sparkles' });
            toast.success('Category added');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingCat(false);
        }
    };

    const handleToggleCategory = async (cat) => {
        try {
            const res = await fetch(`/api/admin/editor/categories/${cat.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !cat.isActive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...data.category } : c)));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteCategory = (cat) => {
        setPendingDelete({ type: 'category', item: cat });
    };

    const handleAddPreset = async (e) => {
        e.preventDefault();
        if (!presetForm.name.trim()) return;
        setSavingPreset(true);
        try {
            const res = await fetch('/api/admin/editor/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(presetForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create preset');
            setPresets((prev) => [...prev, data.preset]);
            setPresetForm({ name: '', groupName: 'Social', width: 1080, height: 1080 });
            toast.success('Canvas size preset added');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingPreset(false);
        }
    };

    const handleTogglePreset = async (preset) => {
        try {
            const res = await fetch(`/api/admin/editor/presets/${preset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !preset.isActive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setPresets((prev) => prev.map((p) => (p.id === preset.id ? data.preset : p)));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeletePreset = (preset) => {
        setPendingDelete({ type: 'preset', item: preset });
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        const { type, item } = pendingDelete;
        try {
            if (type === 'category') {
                const res = await fetch(`/api/admin/editor/categories/${item.id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Delete failed');
                setCategories((prev) => prev.filter((c) => c.id !== item.id));
                toast.success('Category removed');
            } else {
                const res = await fetch(`/api/admin/editor/presets/${item.id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Delete failed');
                setPresets((prev) => prev.filter((p) => p.id !== item.id));
                toast.success('Preset removed');
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <AdminLayout>
            <Head title="Categories & Canvas Presets" />
            <div className="w-full space-y-6 xl:space-y-8 animate-in fade-in duration-300">
                <div>
                    <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
                        <FolderTree className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0" />
                        <span>Categories &amp; Canvas Presets</span>
                    </h1>
                    <p className="hidden xl:block text-sm text-foreground/55 mt-1">
                        Organize editor templates by category and configure one-click document dimension presets.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Template Categories */}
                    <GlassCard className="p-5 space-y-4 shadow-none">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <FolderTree className="w-4 h-4 text-blue-500" />
                                <span>Template Categories ({categories.length})</span>
                            </h2>
                        </div>

                        <form onSubmit={handleAddCategory} className="space-y-2.5 p-3.5 rounded-xl bg-card-header-bg border border-card-border">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    required
                                    value={catForm.name}
                                    onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Category name (e.g. Posters)"
                                    className="sm:col-span-2 h-8 px-3 rounded-lg bg-card-bg border border-card-border/70 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:border-primary-glow/60"
                                />
                                <button
                                    type="submit"
                                    disabled={savingCat}
                                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                </button>
                            </div>
                            <input
                                type="text"
                                value={catForm.description}
                                onChange={(e) => setCatForm((s) => ({ ...s, description: e.target.value }))}
                                placeholder="Short description (optional)"
                                className="w-full h-8 px-3 rounded-lg bg-card-bg border border-card-border/70 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:border-primary-glow/60"
                            />
                        </form>

                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-foreground/[0.025] border border-card-border">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                            <span>{cat.name}</span>
                                            <span className="text-[10px] font-mono text-foreground/45">/{cat.slug}</span>
                                        </div>
                                        {cat.description && (
                                            <div className="text-[11px] text-foreground/55 truncate">{cat.description}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCategory(cat)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                                                cat.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-foreground/10 text-foreground/50'
                                            }`}
                                        >
                                            {cat.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            <span>{cat.isActive ? 'Active' : 'Hidden'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCategory(cat)}
                                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-500 cursor-pointer"
                                            title="Delete category"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Canvas Presets */}
                    <GlassCard className="p-5 space-y-4 shadow-none">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Maximize2 className="w-4 h-4 text-indigo-500" />
                                <span>Canvas Size Presets ({presets.length})</span>
                            </h2>
                        </div>

                        <form onSubmit={handleAddPreset} className="space-y-2.5 p-3.5 rounded-xl bg-foreground/[0.03] border border-card-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    required
                                    value={presetForm.name}
                                    onChange={(e) => setPresetForm((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Preset name (e.g. LinkedIn Banner)"
                                    className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-xs text-foreground"
                                />
                                <input
                                    type="text"
                                    value={presetForm.groupName}
                                    onChange={(e) => setPresetForm((s) => ({ ...s, groupName: e.target.value }))}
                                    placeholder="Group (Social, Video, Print...)"
                                    className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-xs text-foreground"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="number"
                                    min={32}
                                    max={8192}
                                    required
                                    value={presetForm.width}
                                    onChange={(e) => setPresetForm((s) => ({ ...s, width: Number(e.target.value) }))}
                                    placeholder="Width"
                                    className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-xs text-foreground font-mono"
                                />
                                <input
                                    type="number"
                                    min={32}
                                    max={8192}
                                    required
                                    value={presetForm.height}
                                    onChange={(e) => setPresetForm((s) => ({ ...s, height: Number(e.target.value) }))}
                                    placeholder="Height"
                                    className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-xs text-foreground font-mono"
                                />
                                <button
                                    type="submit"
                                    disabled={savingPreset}
                                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Preset</span>
                                </button>
                            </div>
                        </form>

                        <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                            {presets.map((preset) => (
                                <div key={preset.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-foreground/[0.025] border border-card-border">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-foreground truncate">{preset.name}</div>
                                        <div className="text-[11px] text-foreground/55 font-mono">
                                            {preset.width} × {preset.height} px · {preset.groupName}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePreset(preset)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                                preset.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-foreground/10 text-foreground/50'
                                            }`}
                                        >
                                            {preset.isActive ? 'Active' : 'Hidden'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePreset(preset)}
                                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-500 cursor-pointer"
                                            title="Delete preset"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            <ConfirmDialog
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                title={pendingDelete?.type === 'category' ? 'Delete Category' : 'Delete Canvas Preset'}
                message={
                    pendingDelete
                        ? `Delete ${pendingDelete.type} "${pendingDelete.item.name}"? This cannot be undone.`
                        : ''
                }
                confirmText="Delete"
            />
        </AdminLayout>
    );
}
