import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import AdminLayout from '../../../Layouts/AdminLayout';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import {
    Key,
    Plus,
    Eye,
    EyeOff,
    Copy,
    Check,
    Pencil,
    Trash2,
    CheckCircle2,
    Zap,
    Sparkles,
    Cpu,
    ShieldCheck,
} from 'lucide-react';
import { StatCard } from '../../../components/ui/StatCard';

const MODEL_VERSIONS = [
    {
        version: '2.5',
        label: '2.5',
        pillClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        selectedBtnClass: 'bg-blue-500/20 text-blue-400 border-blue-500 ring-1 ring-blue-500/40',
    },
    {
        version: '3.0',
        label: '3.0',
        pillClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        selectedBtnClass: 'bg-purple-500/20 text-purple-400 border-purple-500 ring-1 ring-purple-500/40',
    },
    {
        version: '3.8',
        label: '3.8',
        pillClass: 'bg-red-500/15 text-red-400 border-red-500/30',
        selectedBtnClass: 'bg-red-500/20 text-red-400 border-red-500 ring-1 ring-red-500/40',
    },
];

function getVersionStyle(version) {
    return MODEL_VERSIONS.find((m) => m.version === version) || MODEL_VERSIONS[0];
}

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleKeys, setVisibleKeys] = useState({});
    const [copiedId, setCopiedId] = useState(null);
    const [activatingId, setActivatingId] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        key: '',
        modelVersion: '2.5',
        isActive: false,
    });
    const [saving, setSaving] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const fetchApiKeys = async () => {
        try {
            const res = await fetch('/api/admin/api-keys');
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data);
            } else {
                toast.error('Failed to load API keys');
            }
        } catch (error) {
            console.error('Error fetching API keys:', error);
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApiKeys();
    }, []);

    const toggleVisibility = (id) => {
        setVisibleKeys((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const maskKey = (key) => {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
    };

    const handleCopy = (id, keyText) => {
        navigator.clipboard.writeText(keyText);
        setCopiedId(id);
        toast.success('API key copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openAddModal = () => {
        setEditingKey(null);
        setFormData({
            name: '',
            key: '',
            modelVersion: '2.5',
            isActive: apiKeys.length === 0,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingKey(item);
        setFormData({
            name: item.name,
            key: item.key,
            modelVersion: item.modelVersion || '2.5',
            isActive: item.isActive,
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.key.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            if (editingKey) {
                const res = await fetch(`/api/admin/api-keys/${editingKey.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (res.ok) {
                    toast.success('API key updated successfully');
                    setIsModalOpen(false);
                    fetchApiKeys();
                } else {
                    const data = await res.json();
                    toast.error(data.error || 'Failed to update API key');
                }
            } else {
                const res = await fetch('/api/admin/api-keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (res.ok) {
                    toast.success('API key created successfully');
                    setIsModalOpen(false);
                    fetchApiKeys();
                } else {
                    const data = await res.json();
                    toast.error(data.error || 'Failed to create API key');
                }
            }
        } catch (error) {
            console.error('Error saving API key:', error);
            toast.error('An error occurred while saving the API key');
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async (item) => {
        if (item.isActive) return;
        setActivatingId(item.id);
        try {
            const res = await fetch(`/api/admin/api-keys/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
            });
            if (res.ok) {
                toast.success(`"${item.name}" is now the active API key`);
                fetchApiKeys();
            } else {
                toast.error('Failed to activate API key');
            }
        } catch (error) {
            console.error('Error activating API key:', error);
            toast.error('An error occurred while activating API key');
        } finally {
            setActivatingId(null);
        }
    };

    const handleDelete = (item) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete API Key',
            message: `Are you sure you want to delete "${item.name}"?${
                item.isActive ? ' This key is currently active!' : ''
            } This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/api-keys/${item.id}`, {
                        method: 'DELETE',
                    });
                    if (res.ok) {
                        toast.success('API key deleted successfully');
                        fetchApiKeys();
                    } else {
                        toast.error('Failed to delete API key');
                    }
                } catch (error) {
                    console.error('Error deleting API key:', error);
                    toast.error('An error occurred while deleting API key');
                }
            },
        });
    };

    const activeKey = apiKeys.find((k) => k.isActive);
    const activeKeyCount = apiKeys.filter((k) => k.isActive).length;
    const standbyCount = apiKeys.length - activeKeyCount;

    return (
        <AdminLayout>
            <Head title="API Keys Vault - Png101 Admin" />
            <div className="space-y-6 pb-24">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                            <Key className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>API Keys Vault</span>
                        </h1>
                        <p className="text-foreground/60 text-sm">
                            Manage Google Generative AI keys, toggle active credentials, and select supported Gemini model versions.
                        </p>
                    </div>

                    <div className="inline-flex items-center p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                        <button
                            onClick={openAddModal}
                            className="h-8 inline-flex items-center gap-2 px-3.5 bg-primary-glow hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add New Key</span>
                        </button>
                    </div>
                </div>

                {/* Primary Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Active AI Engine"
                        value={activeKey ? activeKey.name : 'None Assigned'}
                        subtitle={
                            activeKey
                                ? `Gemini ${activeKey.modelVersion} active in production`
                                : 'Assign an active key for automated tagging'
                        }
                        icon={<Zap className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Stored Keys"
                        value={apiKeys.length}
                        subtitle={`${activeKeyCount} active · ${standbyCount} standby failovers`}
                        icon={<Key className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Model Support"
                        value="3 Profiles"
                        subtitle="Gemini 2.5, 3.0 & 3.8 selectable"
                        icon={<Sparkles className="w-6 h-6" />}
                    />
                    <StatCard
                        title="AI Engine Health"
                        value={activeKey ? 'Operational' : 'Action Required'}
                        subtitle={activeKey ? 'Ready for auto-tagging & metadata' : 'No active credentials'}
                        icon={<ShieldCheck className="w-6 h-6" />}
                    />
                </div>

                {/* Table Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-card-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Configured API Keys ({apiKeys.length})</h2>
                                <p className="text-xs text-foreground/60">
                                    Exact credentials utilized when analyzing PNG images and generating AI tags.
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto mb-3"></div>
                            <p className="text-foreground/60 text-sm">Loading API keys vault...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-background/50 text-foreground/70 uppercase text-xs font-bold border-b border-card-border">
                                    <tr>
                                        <th className="px-6 py-4">Key Name &amp; Engine</th>
                                        <th className="px-6 py-4">Key Value</th>
                                        <th className="px-6 py-4">Added Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                    {apiKeys.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-foreground/40">
                                                <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                                                    <div className="p-3 rounded-2xl bg-card-bg border border-card-border">
                                                        <Key className="w-8 h-8 text-foreground/30" />
                                                    </div>
                                                    <p className="text-base font-bold text-foreground">No API keys added yet</p>
                                                    <p className="text-xs text-foreground/50 leading-relaxed">
                                                        Click &ldquo;Add New Key&rdquo; to store and activate your first Google Generative AI credentials.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        apiKeys.map((item) => {
                                            const isVisible = Boolean(visibleKeys[item.id]);
                                            const isCopied = copiedId === item.id;
                                            const isActivating = activatingId === item.id;
                                            const versionStyle = getVersionStyle(item.modelVersion);

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`hover:bg-white/[0.02] transition-colors ${
                                                        item.isActive ? 'bg-emerald-500/[0.04]' : ''
                                                    }`}
                                                >
                                                    <td className="px-6 py-4 font-medium text-foreground">
                                                        <div className="flex flex-wrap items-center gap-2.5">
                                                            <span className="font-bold text-sm text-foreground">
                                                                {item.name}
                                                            </span>

                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${versionStyle.pillClass}`}
                                                                title={`Gemini ${versionStyle.label}`}
                                                            >
                                                                Gemini {versionStyle.label}
                                                            </span>

                                                            {item.isActive && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                    Active Engine
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <code className="font-mono text-xs px-3 py-1.5 rounded-lg bg-background border border-card-border text-foreground/80">
                                                                {isVisible ? item.key : maskKey(item.key)}
                                                            </code>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleVisibility(item.id)}
                                                                className="p-1.5 text-foreground/50 hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                                                                title={isVisible ? 'Hide Key' : 'Reveal Key'}
                                                            >
                                                                {isVisible ? (
                                                                    <EyeOff className="w-4 h-4" />
                                                                ) : (
                                                                    <Eye className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(item.id, item.key)}
                                                                className="p-1.5 text-foreground/50 hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                                                                title="Copy Key"
                                                            >
                                                                {isCopied ? (
                                                                    <Check className="w-4 h-4 text-emerald-400" />
                                                                ) : (
                                                                    <Copy className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 text-xs text-foreground/60">
                                                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {item.isActive ? (
                                                                <button
                                                                    type="button"
                                                                    disabled
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    In Production
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleActivate(item)}
                                                                    disabled={isActivating}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-glow/10 text-primary-glow hover:bg-primary-glow hover:text-white border border-primary-glow/30 transition-all cursor-pointer hover:-translate-y-0.5 disabled:opacity-50"
                                                                    title="Activate this API key"
                                                                >
                                                                    <Zap className="w-3.5 h-3.5" />
                                                                    {isActivating ? 'Activating...' : 'Activate'}
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(item)}
                                                                className="p-2 text-foreground/60 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all cursor-pointer"
                                                                title="Edit Key"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(item)}
                                                                className="p-2 text-foreground/60 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all cursor-pointer"
                                                                title="Delete Key"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Add / Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between pb-4 border-b border-card-border mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-primary-glow/10 text-primary-glow">
                                        <Key className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-lg font-bold text-foreground">
                                        {editingKey ? 'Edit API Key' : 'Add New API Key'}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-foreground/40 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-background cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Key Name / Friendly Label *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full bg-background border border-card-border text-foreground px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                        placeholder="e.g. Production Gemini Key"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        API Key Value *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.key}
                                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                        required
                                        className="w-full bg-background border border-card-border text-foreground px-4 py-2.5 rounded-xl font-mono text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                        placeholder="AIzaSy..."
                                    />
                                </div>

                                {/* Model Version Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                        Select Model Version
                                    </label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {MODEL_VERSIONS.map((item) => {
                                            const isSelected = formData.modelVersion === item.version;
                                            return (
                                                <button
                                                    key={item.version}
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({ ...formData, modelVersion: item.version })
                                                    }
                                                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                                        isSelected
                                                            ? item.selectedBtnClass
                                                            : 'bg-background border-card-border text-foreground/60 hover:text-foreground hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${item.pillClass}`}
                                                    >
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[11px]">Gemini {item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="w-4 h-4 text-primary-glow bg-background border-card-border rounded accent-blue-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-medium text-foreground/80">
                                            Set as currently active production key
                                        </span>
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-card-border">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2.5 px-4 bg-background hover:bg-white/5 text-foreground/70 font-semibold text-xs rounded-xl border border-card-border transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-2.5 px-4 bg-primary-glow hover:bg-blue-600 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-primary-glow/20 disabled:opacity-50 cursor-pointer"
                                    >
                                        {saving ? 'Saving...' : 'Save API Key'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText="Yes, Delete"
                    cancelText="Cancel"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
