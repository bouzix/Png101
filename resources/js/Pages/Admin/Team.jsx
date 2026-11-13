import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, ShieldCheck, Send, Server } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import StatCard from '@/components/ui/StatCard';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminTeam() {
    const [members, setMembers] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState(['upload', 'files', 'categories', 'collections']);
    const [submitting, setSubmitting] = useState(false);

    // SMTP config
    const [smtp, setSmtp] = useState({
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        fromEmail: 'noreply@png101.com',
        fromName: 'Png101 Admin',
    });
    const [savingSmtp, setSavingSmtp] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/team');
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
                setAvailablePermissions(data.availablePermissions || []);
                if (data.smtp) setSmtp(data.smtp);
            }
        } catch {
            toast.error('Failed to load team');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMember = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    permissions: selectedPermissions,
                    sendInvite: true,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Team member "${data.member.name}" created!`);
                setName('');
                setEmail('');
                setPassword('');
                fetchTeam();
            } else {
                toast.error(data.error || 'Failed to create member');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (member) => {
        try {
            const res = await fetch('/api/admin/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: member.id, isActive: !member.isActive }),
            });
            if (res.ok) {
                toast.success(!member.isActive ? 'Member activated' : 'Member deactivated');
                fetchTeam();
            }
        } catch {
            toast.error('Failed to update member');
        }
    };

    const handleDeleteMember = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/team?id=${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Member deleted');
                fetchTeam();
            }
        } catch {
            toast.error('Failed to delete member');
        }
        setDeleteTarget(null);
    };

    const handleSaveSmtp = async (e) => {
        e.preventDefault();
        setSavingSmtp(true);
        try {
            const res = await fetch('/api/admin/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_smtp', ...smtp }),
            });
            if (res.ok) {
                toast.success('SMTP configuration saved');
            } else {
                toast.error('Failed to save SMTP');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSavingSmtp(false);
        }
    };

    const togglePerm = (key) => {
        setSelectedPermissions(prev => (prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]));
    };

    return (
        <AdminLayout>
            <Head title="Team Management - Png101 Admin" />
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Team Management</h2>
                    <p className="text-sm text-foreground/60 mt-1">Create team member accounts with granular permissions</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatCard title="Team Members" value={members.length} icon={<Users className="w-6 h-6" />} />
                    <StatCard title="Active Accounts" value={members.filter(m => m.isActive).length} icon={<ShieldCheck className="w-6 h-6" />} />
                    <StatCard title="Available Roles" value={availablePermissions.length} icon={<UserPlus className="w-6 h-6" />} />
                </div>

                {/* Add Member Form */}
                <form onSubmit={handleCreateMember} className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-5 shadow-xl">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary-glow" />
                        Add New Team Member
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Full Name"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email Address *"
                            required
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Initial Password *"
                            required
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                    </div>

                    {availablePermissions.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-foreground/70 mb-2">Permissions</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {availablePermissions.map(perm => {
                                    const key = typeof perm === 'string' ? perm : perm.key;
                                    const label = typeof perm === 'string' ? perm : perm.label;
                                    const checked = selectedPermissions.includes(key);
                                    return (
                                        <label
                                            key={key}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                                                checked
                                                    ? 'border-primary-glow bg-primary-glow/10 text-foreground'
                                                    : 'border-card-border bg-background text-foreground/70'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePerm(key)}
                                                className="rounded text-primary-glow"
                                            />
                                            <span>{label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-glow hover:bg-primary-glow/90 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Creating...' : 'Create & Send Invite'}
                    </button>
                </form>

                {/* Members List */}
                <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-5 border-b border-card-border">
                        <h3 className="font-bold text-foreground">Existing Team Members</h3>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-foreground/50">Loading team...</div>
                    ) : members.length > 0 ? (
                        <div className="divide-y divide-card-border">
                            {members.map(m => (
                                <div key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">{m.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {m.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground/60">{m.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleActive(m)}
                                            className="px-3 py-1.5 rounded-lg border border-card-border text-xs font-semibold hover:bg-foreground/5 cursor-pointer"
                                        >
                                            {m.isActive ? 'Suspend' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(m)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 text-center text-foreground/50">No team members yet.</div>
                    )}
                </div>

                {/* SMTP Configuration */}
                <form onSubmit={handleSaveSmtp} className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-xl">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Server className="w-5 h-5 text-primary-glow" />
                        SMTP Email Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={smtp.host}
                            onChange={e => setSmtp({ ...smtp, host: e.target.value })}
                            placeholder="SMTP Host (e.g., smtp.gmail.com)"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="number"
                            value={smtp.port}
                            onChange={e => setSmtp({ ...smtp, port: Number(e.target.value) })}
                            placeholder="Port (587)"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="text"
                            value={smtp.user}
                            onChange={e => setSmtp({ ...smtp, user: e.target.value })}
                            placeholder="SMTP Username"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="password"
                            value={smtp.pass}
                            onChange={e => setSmtp({ ...smtp, pass: e.target.value })}
                            placeholder="SMTP Password"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="email"
                            value={smtp.fromEmail}
                            onChange={e => setSmtp({ ...smtp, fromEmail: e.target.value })}
                            placeholder="From Email (noreply@png101.com)"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                        <input
                            type="text"
                            value={smtp.fromName}
                            onChange={e => setSmtp({ ...smtp, fromName: e.target.value })}
                            placeholder="From Name (Png101 Admin)"
                            className="bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={savingSmtp}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                    >
                        {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
                    </button>
                </form>

                <ConfirmDialog
                    isOpen={Boolean(deleteTarget)}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDeleteMember}
                    title="Delete Team Member"
                    message={`Remove "${deleteTarget?.name}" from your team?`}
                    confirmText="Delete"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}

