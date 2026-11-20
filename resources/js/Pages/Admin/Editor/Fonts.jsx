import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Type, Plus, Upload, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../../Layouts/AdminLayout';
import { GlassCard } from '../../../components/ui/GlassCard';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function EditorFontsAdmin({ initialFonts = [] }) {
    const [fonts, setFonts] = useState(initialFonts);
    const [googleFamily, setGoogleFamily] = useState('');
    const [googleWeights, setGoogleWeights] = useState('400,600,700');
    const [customFamily, setCustomFamily] = useState('');
    const [customFile, setCustomFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [pendingDeleteFont, setPendingDeleteFont] = useState(null);

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `/editor-fonts.css?v=${Date.now()}`;
        document.head.appendChild(link);
        return () => link.remove();
    }, [fonts.length]);

    const handleAddGoogleFont = async (e) => {
        e.preventDefault();
        if (!googleFamily.trim()) return;
        setBusy(true);
        try {
            const res = await fetch('/api/admin/editor/fonts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'google',
                    family: googleFamily.trim(),
                    weights: googleWeights,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add font');
            setFonts((prev) => [...prev, data.font]);
            setGoogleFamily('');
            toast.success(`Added Google Font "${data.font.family}"`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleUploadCustomFont = async (e) => {
        e.preventDefault();
        if (!customFamily.trim() || !customFile) {
            toast.error('Please enter a font family name and choose a font file.');
            return;
        }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('source', 'custom');
            fd.append('family', customFamily.trim());
            fd.append('file', customFile);
            const res = await fetch('/api/admin/editor/fonts', {
                method: 'POST',
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setFonts((prev) => [...prev, data.font]);
            setCustomFamily('');
            setCustomFile(null);
            toast.success(`Uploaded custom font "${data.font.family}"`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleToggle = async (font) => {
        try {
            const res = await fetch(`/api/admin/editor/fonts/${font.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !font.isActive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setFonts((prev) => prev.map((f) => (f.id === font.id ? data.font : f)));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = (font) => {
        setPendingDeleteFont(font);
    };

    const confirmDeleteFont = async () => {
        if (!pendingDeleteFont) return;
        try {
            const res = await fetch(`/api/admin/editor/fonts/${pendingDeleteFont.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setFonts((prev) => prev.filter((f) => f.id !== pendingDeleteFont.id));
            toast.success('Font removed');
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <AdminLayout>
            <Head title="Fonts & Brand Assets" />
            <div className="w-full space-y-6 xl:space-y-8 animate-in fade-in duration-300">
                <div>
                    <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
                        <Type className="w-6 h-6 sm:w-7 sm:h-7 text-primary-glow shrink-0" />
                        <span>Fonts &amp; Brand Typography</span>
                    </h1>
                    <p className="hidden xl:block text-sm text-foreground/55 mt-1">
                        Curate Google Fonts or upload custom brand `.woff2`, `.ttf`, or `.otf` font files loaded automatically in the canvas studio.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add Google Font */}
                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Add Google Font</h2>
                        <form onSubmit={handleAddGoogleFont} className="space-y-3 p-3.5 rounded-xl bg-card-header-bg border border-card-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    required
                                    value={googleFamily}
                                    onChange={(e) => setGoogleFamily(e.target.value)}
                                    placeholder="Exact Google Font name (e.g. Syne)"
                                    className="h-8 px-3 rounded-lg bg-card-bg border border-card-border/70 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:border-primary-glow/60"
                                />
                                <input
                                    type="text"
                                    value={googleWeights}
                                    onChange={(e) => setGoogleWeights(e.target.value)}
                                    placeholder="Weights (e.g. 400,600,700)"
                                    className="h-8 px-3 rounded-lg bg-card-bg border border-card-border/70 text-xs font-mono text-foreground shadow-sm focus:outline-none focus:border-primary-glow/60"
                                />
                            </div>
                            <div className="inline-flex items-center p-1 bg-card-bg border border-card-border rounded-xl">
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="h-7 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-primary-glow hover:bg-blue-600 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Enable Google Font</span>
                                </button>
                            </div>
                        </form>
                    </GlassCard>

                    {/* Upload Custom Font */}
                    <GlassCard className="p-5 space-y-3 shadow-none">
                        <h2 className="text-sm font-bold text-foreground">Upload Custom Brand Font (.woff2 / .ttf / .otf)</h2>
                        <form onSubmit={handleUploadCustomFont} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                    type="text"
                                    required
                                    value={customFamily}
                                    onChange={(e) => setCustomFamily(e.target.value)}
                                    placeholder="Brand Font Name"
                                    className="px-3 py-2 rounded-xl bg-input-bg border border-input-border text-xs text-foreground"
                                />
                                <input
                                    type="file"
                                    accept=".woff2,.woff,.ttf,.otf"
                                    onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                                    className="px-2.5 py-1.5 rounded-xl bg-input-bg border border-input-border text-xs text-foreground file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-500/15 file:text-blue-500 file:text-[11px] file:font-bold"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Custom Font</span>
                            </button>
                        </form>
                    </GlassCard>
                </div>

                {/* Font List */}
                <GlassCard className="p-5 space-y-3 shadow-none">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-foreground">Configured Fonts ({fonts.length})</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fonts.map((font) => (
                            <div key={font.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-foreground/[0.025] border border-card-border">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-foreground truncate" style={{ fontFamily: `'${font.family}', sans-serif` }}>
                                            {font.family}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            font.source === 'custom'
                                                ? 'bg-indigo-500/15 text-indigo-500'
                                                : 'bg-blue-500/15 text-blue-500'
                                        }`}>
                                            {font.source}
                                        </span>
                                    </div>
                                    <div className="text-xs text-foreground/60 mt-1 truncate" style={{ fontFamily: `'${font.family}', sans-serif` }}>
                                        The quick brown fox jumps over transparent PNG art — 0123456789
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(font)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                                            font.isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-foreground/10 text-foreground/50'
                                        }`}
                                    >
                                        {font.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        <span>{font.isActive ? 'Active' : 'Disabled'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(font)}
                                        className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-500 cursor-pointer"
                                        title="Delete font"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            <ConfirmDialog
                isOpen={Boolean(pendingDeleteFont)}
                onClose={() => setPendingDeleteFont(null)}
                onConfirm={confirmDeleteFont}
                title="Remove Font"
                message={pendingDeleteFont ? `Remove font "${pendingDeleteFont.family}" from the editor?` : ''}
                confirmText="Remove"
            />
        </AdminLayout>
    );
}
