import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Key, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import SettingsNav from '@/components/admin/SettingsNav';

export default function ApiKeysSettings() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [keyVal, setKeyVal] = useState('');
    const [modelVersion, setModelVersion] = useState('gemini-2.5-flash');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/api-keys');
            if (res.ok) {
                setKeys(await res.json());
            }
        } catch {
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, key: keyVal, modelVersion, isActive }),
            });
            if (res.ok) {
                toast.success('API Key added');
                setName('');
                setKeyVal('');
                fetchKeys();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Failed to add key');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async (k) => {
        try {
            const res = await fetch(`/api/admin/api-keys/${k.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !k.isActive }),
            });
            if (res.ok) {
                toast.success('Updated API key status');
                fetchKeys();
            }
        } catch {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('API Key deleted');
                fetchKeys();
            }
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <AdminLayout>
            <Head title="API Keys - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <SettingsNav />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Gemini API Keys</h1>
                    <p className="text-sm text-foreground/60">Manage Google Gemini API keys used for AI metadata auto-fill and collection generation.</p>
                </div>

                <form onSubmit={handleCreate} className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg mb-8">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary-glow" />
                        Add New API Key
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Key Label (e.g., Production Gemini)"
                            required
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="password"
                            value={keyVal}
                            onChange={e => setKeyVal(e.target.value)}
                            placeholder="AIzaSy..."
                            required
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground font-mono"
                        />
                        <select
                            value={modelVersion}
                            onChange={e => setModelVersion(e.target.value)}
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        >
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-3.0-pro">Gemini 3.0 Pro</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="rounded text-primary-glow"
                            />
                            Set as Active Key
                        </label>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl bg-primary-glow text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                        >
                            {saving ? 'Adding...' : 'Add API Key'}
                        </button>
                    </div>
                </form>

                <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-lg">
                    {loading ? (
                        <div className="p-8 text-center text-foreground/50">Loading API keys...</div>
                    ) : keys.length > 0 ? (
                        <div className="divide-y divide-card-border">
                            {keys.map(k => (
                                <div key={k.id} className="p-5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-5 h-5 text-primary-glow" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-foreground">{k.name}</span>
                                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-foreground/5 text-foreground/60">{k.modelVersion}</span>
                                                {k.isActive && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="w-3 h-3" /> Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-mono text-foreground/40 mt-0.5">
                                                {k.key ? `${k.key.slice(0, 8)}••••••••${k.key.slice(-4)}` : '••••••••'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleActivate(k)}
                                            className="px-3 py-1.5 rounded-lg border border-card-border text-xs font-semibold hover:bg-foreground/5 cursor-pointer"
                                        >
                                            {k.isActive ? 'Disable' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(k.id)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 text-center text-foreground/50">No API keys configured yet.</div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

