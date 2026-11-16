import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
    Users,
    UserPlus,
    Mail,
    Lock,
    Shield,
    Check,
    Trash2,
    Edit3,
    Send,
    Copy,
    ExternalLink,
    Eye,
    EyeOff,
    Server,
    ChevronDown,
    ChevronUp,
    X,
    Sparkles,
    CheckCircle2,
    Clock,
    UserCheck,
    ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../Layouts/AdminLayout';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';

export default function TeamPage() {
    const [members, setMembers] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create Member Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(true);
    const [selectedPermissions, setSelectedPermissions] = useState([
        'upload_images',
        'edit_images',
        'delete_images',
        'view_analytics',
        'export_analytics',
    ]);
    const [submitting, setSubmitting] = useState(false);

    // Invite Result Banner/Modal
    const [inviteSummary, setInviteSummary] = useState(null);

    // Edit Member Modal State
    const [editingMember, setEditingMember] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editPermissions, setEditPermissions] = useState([]);
    const [editIsActive, setEditIsActive] = useState(true);
    const [editSendEmail, setEditSendEmail] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    // SMTP Config State
    const [showSmtp, setShowSmtp] = useState(false);
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
    const [testEmailTo, setTestEmailTo] = useState('');
    const [sendingTestEmail, setSendingTestEmail] = useState(false);

    // Confirm Delete State
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/team');
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    toast.error('Only the Super Admin can access Team settings.');
                } else {
                    const err = await res.json().catch(() => ({}));
                    toast.error(err.error || 'Failed to load team settings');
                }
                setLoading(false);
                return;
            }
            const data = await res.json();
            setMembers(data.members || []);
            setAvailablePermissions(data.availablePermissions || []);
            if (data.smtp) {
                setSmtp(data.smtp);
            }
        } catch (error) {
            console.error('Failed to fetch team data:', error);
            toast.error('Failed to load team settings');
        } finally {
            setLoading(false);
        }
    };

    const generateRandomPassword = (setter) => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        let pass = '';
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setter(pass);
    };

    const togglePermission = (key, list, setter) => {
        if (list.includes(key)) {
            setter(list.filter((k) => k !== key));
        } else {
            setter([...list, key]);
        }
    };

    const handleCreateMember = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            toast.error('Please provide both an email and a password.');
            return;
        }
        if (selectedPermissions.length === 0) {
            toast.error('Please select at least one permission for this team member.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim() || email.split('@')[0],
                    email: email.trim(),
                    password: password.trim(),
                    permissions: selectedPermissions,
                    sendInvite: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to create team member');
                return;
            }

            setMembers((prev) => [data.member, ...prev]);
            setInviteSummary({
                name: data.member.name,
                email: data.member.email,
                passwordPlain: password.trim(),
                loginUrl: data.loginUrl || `${window.location.origin}/team/login`,
                mode: data.emailResult?.mode || 'manual_only',
                previewUrl: data.emailResult?.previewUrl,
                error: data.emailResult?.error,
            });

            setName('');
            setEmail('');
            setPassword('');
            toast.success(`Team member ${data.member.email} created & invited!`);
        } catch (error) {
            console.error('Create member error:', error);
            toast.error('Network error while creating team member');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (member) => {
        setEditingMember(member);
        setEditName(member.name);
        setEditEmail(member.email);
        setEditPassword('');
        setEditPermissions(member.permissions || []);
        setEditIsActive(member.isActive);
        setEditSendEmail(false);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingMember) return;

        setSavingEdit(true);
        try {
            if (editSendEmail && editPassword.trim()) {
                await fetch('/api/admin/team', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingMember.id,
                        name: editName,
                        email: editEmail,
                        permissions: editPermissions,
                        isActive: editIsActive,
                    }),
                });

                const res = await fetch('/api/admin/team', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'resend_invite',
                        id: editingMember.id,
                        password: editPassword.trim(),
                    }),
                });
                const data = await res.json();
                if (res.ok && data.member) {
                    setMembers((prev) =>
                        prev.map((m) => (m.id === editingMember.id ? data.member : m))
                    );
                    setInviteSummary({
                        name: data.member.name,
                        email: data.member.email,
                        passwordPlain: editPassword.trim(),
                        loginUrl: data.loginUrl || `${window.location.origin}/team/login`,
                        mode: data.emailResult?.mode || 'manual_only',
                        previewUrl: data.emailResult?.previewUrl,
                        error: data.emailResult?.error,
                    });
                    toast.success('Updated team member & sent new invite email!');
                    setEditingMember(null);
                } else {
                    toast.error(data.error || 'Failed to resend invite');
                }
            } else {
                const res = await fetch('/api/admin/team', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingMember.id,
                        name: editName,
                        email: editEmail,
                        password: editPassword.trim() || undefined,
                        permissions: editPermissions,
                        isActive: editIsActive,
                    }),
                });
                const data = await res.json();
                if (res.ok && data.member) {
                    setMembers((prev) =>
                        prev.map((m) => (m.id === editingMember.id ? data.member : m))
                    );
                    toast.success('Team member updated successfully');
                    setEditingMember(null);
                } else {
                    toast.error(data.error || 'Failed to update team member');
                }
            }
        } catch (error) {
            console.error('Update member error:', error);
            toast.error('Failed to update team member');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/team?id=${deleteTarget.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
                toast.success(`Removed ${deleteTarget.email} from team`);
            } else {
                toast.error('Failed to delete team member');
            }
        } catch {
            toast.error('Failed to delete team member');
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleSaveSmtp = async (e) => {
        e.preventDefault();
        setSavingSmtp(true);
        try {
            const res = await fetch('/api/admin/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_smtp',
                    ...smtp,
                }),
            });
            if (res.ok) {
                toast.success('SMTP email settings saved!');
                setShowSmtp(false);
            } else {
                toast.error('Failed to save SMTP settings');
            }
        } catch {
            toast.error('Failed to save SMTP settings');
        } finally {
            setSavingSmtp(false);
        }
    };

    const applyMailpitPreset = () => {
        setSmtp((prev) => ({
            ...prev,
            host: '127.0.0.1',
            port: 1025,
            secure: false,
            user: '',
            pass: '',
            fromEmail: prev.fromEmail || 'noreply@png101.local',
            fromName: prev.fromName || 'Png101 Local',
        }));
        if (!testEmailTo) {
            setTestEmailTo('team-test@png101.local');
        }
        toast.info('Mailpit preset loaded (127.0.0.1:1025). Click Save or Send Test Email.');
    };

    const handleSendTestEmail = async () => {
        const target = testEmailTo.trim();
        if (!target) {
            toast.error('Enter a recipient email address first');
            return;
        }
        setSendingTestEmail(true);
        try {
            // Persist current form fields first so unsaved changes (e.g. Mailpit preset) are tested
            const saveRes = await fetch('/api/admin/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_smtp',
                    ...smtp,
                }),
            });
            if (!saveRes.ok) {
                toast.error('Failed to save SMTP settings before testing');
                return;
            }

            const res = await fetch('/api/admin/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'test_smtp',
                    to: target,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Test email sent to ${target}`);
            } else {
                toast.error(data.error || 'Failed to send test email');
            }
        } catch {
            toast.error('Failed to send test email');
        } finally {
            setSendingTestEmail(false);
        }
    };

    const copyInviteToClipboard = (summary) => {
        const text = `Png101 Team Login Invite\nLogin URL: ${summary.loginUrl}\nEmail: ${summary.email}\nPassword: ${summary.passwordPlain}`;
        navigator.clipboard.writeText(text);
        toast.success('Invite credentials copied to clipboard!');
    };

    const getPermissionLabel = (key) => {
        return availablePermissions.find((p) => p.key === key)?.label || key;
    };

    const groupedPermissions = {
        'Assets & Catalog': availablePermissions.filter((p) => p.group === 'Assets & Catalog'),
        Analytics: availablePermissions.filter((p) => p.group === 'Analytics'),
        Settings: availablePermissions.filter((p) => p.group === 'Settings'),
    };

    const activeMembersCount = members.filter((m) => m.isActive).length;
    const inactiveMembersCount = members.length - activeMembersCount;
    const isSmtpConfigured = Boolean(smtp.host);

    return (
        <AdminLayout>
            <Head title="Team Management - Png101 Admin" />
            <div className="space-y-6 pb-20">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                            <Users className="w-7 h-7 text-primary-glow shrink-0" />
                            <span>Team Management</span>
                        </h1>
                        <p className="text-foreground/60 text-sm">
                            Create team accounts, assign granular permissions, and send login credentials via email.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                        <a
                            href="/team/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-lg bg-card-bg hover:text-primary-glow text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center gap-1.5 transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-primary-glow" />
                            <span>Team Login Page</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => setShowSmtp(!showSmtp)}
                            className={`h-8 px-3 rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                showSmtp
                                    ? 'bg-primary-glow text-white'
                                    : 'bg-card-bg text-foreground/80 hover:text-primary-glow'
                            }`}
                        >
                            <Server className="w-3.5 h-3.5" />
                            <span>SMTP Email Settings</span>
                            {showSmtp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Primary Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Team Members"
                        value={members.length}
                        subtitle={`${activeMembersCount} active · ${inactiveMembersCount} deactivated`}
                        icon={<Users className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Active Accounts"
                        value={activeMembersCount}
                        subtitle={
                            members.length > 0
                                ? `${Math.round((activeMembersCount / members.length) * 100)}% operational readiness`
                                : 'No accounts active'
                        }
                        icon={<UserCheck className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Permission Scopes"
                        value={availablePermissions.length}
                        subtitle="Granular role access enforced"
                        icon={<ShieldCheck className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Email Delivery Engine"
                        value={isSmtpConfigured ? 'Configured' : 'Not Configured'}
                        subtitle={
                            isSmtpConfigured
                                ? `${smtp.host}:${smtp.port || 587}${smtp.user ? '' : ' (No Auth / Mailpit)'}`
                                : 'Manual copy mode until SMTP is saved'
                        }
                        icon={<Server className="w-6 h-6" />}
                    />
                </div>

                {/* Collapsible SMTP Email Configuration Card */}
                {showSmtp && (
                    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden animate-in fade-in duration-200">
                        <div className="p-6 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    <Server className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">SMTP Email Server Settings</h2>
                                    <p className="text-xs text-foreground/60">
                                        Configure production SMTP (port 465 SSL / 587 TLS) or local Laragon Mailpit (127.0.0.1:1025, leave user/pass blank).
                                    </p>
                                </div>
                            </div>
                            <div className="p-1 bg-card-header-bg border border-card-border rounded-xl self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={applyMailpitPreset}
                                    className="h-7 px-2.5 rounded-lg bg-card-bg hover:text-purple-400 text-xs font-bold text-foreground/80 shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Use Local Mailpit (127.0.0.1:1025)</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveSmtp} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                        SMTP Host
                                    </label>
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                        <input
                                            type="text"
                                            value={smtp.host}
                                            onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                                            placeholder="smtp.gmail.com"
                                            className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                        SMTP Port
                                    </label>
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                        <input
                                            type="number"
                                            value={smtp.port}
                                            onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                                            placeholder="587"
                                            className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end pb-1">
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl w-full">
                                        <label className="h-8 px-3 rounded-lg bg-card-bg shadow-sm flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={smtp.secure}
                                                onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
                                                className="w-3.5 h-3.5 rounded accent-blue-500"
                                            />
                                            <span>Use SSL/TLS (Port 465)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                        SMTP Username
                                    </label>
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                        <input
                                            type="text"
                                            value={smtp.user}
                                            onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                                            placeholder="your-email@gmail.com"
                                            className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                        SMTP Password / App Password
                                    </label>
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                        <input
                                            type="password"
                                            value={smtp.pass}
                                            onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                                            placeholder="••••••••••••••••"
                                            className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                        Sender Name
                                    </label>
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                        <input
                                            type="text"
                                            value={smtp.fromName}
                                            onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
                                            placeholder="Png101 Admin"
                                            className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                        Sender Email
                                    </label>
                                    <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                        <input
                                            type="email"
                                            value={smtp.fromEmail}
                                            onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                                            placeholder="noreply@png101.com"
                                            className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-card-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex flex-1 items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl max-w-md">
                                    <input
                                        type="email"
                                        value={testEmailTo}
                                        onChange={(e) => setTestEmailTo(e.target.value)}
                                        placeholder="test@png101.local (Send Test Email)"
                                        className="flex-1 h-7 rounded-lg bg-card-bg px-2.5 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendTestEmail}
                                        disabled={sendingTestEmail || !smtp.host}
                                        className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all whitespace-nowrap"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {sendingTestEmail ? 'Sending...' : 'Send Test'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-end md:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowSmtp(false)}
                                        className="h-7 px-3 rounded-lg bg-card-bg text-xs font-bold text-foreground/70 hover:text-foreground shadow-sm cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingSmtp}
                                        className="h-7 px-3.5 rounded-lg bg-primary-glow hover:bg-primary-glow/90 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                                    >
                                        {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Invite Summary Banner */}
                {inviteSummary && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative animate-in fade-in duration-200">
                        <button
                            onClick={() => setInviteSummary(null)}
                            className="absolute top-4 right-4 text-foreground/50 hover:text-foreground cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        Invite Ready for {inviteSummary.name} ({inviteSummary.email})
                                    </h3>
                                    <p className="text-xs text-foreground/70 mt-0.5">
                                        {inviteSummary.mode === 'smtp'
                                            ? 'Invite email was sent directly via your SMTP server!'
                                            : inviteSummary.mode === 'test_preview'
                                                ? 'Sent via test email server (since no production SMTP host is configured yet). Click "Preview Invite Email" below to view the exact email!'
                                                : `Could not reach SMTP server (${inviteSummary.error || 'not configured'}). You can copy the credentials below directly:`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-background/80 p-4 rounded-xl border border-card-border text-xs">
                                    <div>
                                        <span className="text-foreground/50 block mb-0.5">Team Login URL</span>
                                        <span className="font-mono text-primary-glow font-semibold break-all">
                                            {inviteSummary.loginUrl}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-foreground/50 block mb-0.5">Email</span>
                                        <span className="font-mono text-foreground font-semibold">
                                            {inviteSummary.email}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-foreground/50 block mb-0.5">Password</span>
                                        <span className="font-mono text-emerald-400 font-bold">
                                            {inviteSummary.passwordPlain}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => copyInviteToClipboard(inviteSummary)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copy Credentials
                                    </button>
                                    {inviteSummary.previewUrl && (
                                        <a
                                            href={inviteSummary.previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card-bg hover:bg-white/10 text-primary-glow border border-primary-glow/30 text-xs font-bold transition-all"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Preview Invite Email in Browser
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Card 1: Add & Invite New Team Member */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-card-border flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Add &amp; Invite Team Member</h2>
                            <p className="text-xs text-foreground/60">
                                Create credentials for a new team member, choose what they can access, and send their invite email.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateMember} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                                    Member Name
                                </label>
                                <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Sarah (Content Editor)"
                                        className="w-full h-8 rounded-lg bg-card-bg px-3 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-glow/60 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                                    Email Address *
                                </label>
                                <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <div className="relative h-8 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                                        <Mail className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="member@example.com"
                                            className="w-full h-full bg-transparent text-xs font-medium text-foreground focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70">
                                        Password *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => generateRandomPassword(setPassword)}
                                        className="text-[11px] font-bold text-primary-glow hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Generate
                                    </button>
                                </div>
                                <div className="p-1 bg-card-header-bg border border-card-border rounded-xl">
                                    <div className="relative h-8 rounded-lg bg-card-bg shadow-sm flex items-center px-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary-glow/60 transition-all">
                                        <Lock className="w-3.5 h-3.5 text-foreground/45 shrink-0 pointer-events-none" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Create password"
                                            className="w-full h-full bg-transparent text-xs font-mono text-foreground focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-foreground/45 hover:text-foreground cursor-pointer shrink-0"
                                        >
                                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Selector */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-primary-glow" />
                                    <span className="text-sm font-bold text-foreground">
                                        Assign Permissions ({selectedPermissions.length} selected)
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1 p-1 bg-card-header-bg rounded-xl border border-card-border">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedPermissions([
                                                'upload_images',
                                                'edit_images',
                                                'delete_images',
                                                'view_analytics',
                                                'export_analytics',
                                            ])
                                        }
                                        className="h-7 px-2.5 rounded-lg bg-card-bg text-xs font-bold shadow-sm transition-all text-foreground/75 hover:text-primary-glow cursor-pointer"
                                    >
                                        Uploader + Analytics
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedPermissions(['upload_images', 'edit_images', 'delete_images'])
                                        }
                                        className="h-7 px-2.5 rounded-lg bg-card-bg text-xs font-bold shadow-sm transition-all text-foreground/75 hover:text-primary-glow cursor-pointer"
                                    >
                                        Images Only
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedPermissions(availablePermissions.map((p) => p.key))
                                        }
                                        className="h-7 px-2.5 rounded-lg bg-card-bg text-xs font-bold shadow-sm transition-all text-primary-glow hover:bg-primary-glow hover:text-white cursor-pointer"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPermissions([])}
                                        className="h-7 px-2.5 rounded-lg bg-card-bg text-xs font-bold shadow-sm transition-all text-foreground/55 hover:text-foreground cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {['Assets & Catalog', 'Analytics', 'Settings'].map((groupName) => (
                                    <div key={groupName} className="space-y-2.5">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                                            {groupName}
                                        </h3>
                                        <div className="space-y-2">
                                            {groupedPermissions[groupName].map((perm) => {
                                                const checked = selectedPermissions.includes(perm.key);
                                                return (
                                                    <div
                                                        key={perm.key}
                                                        onClick={() =>
                                                            togglePermission(
                                                                perm.key,
                                                                selectedPermissions,
                                                                setSelectedPermissions
                                                            )
                                                        }
                                                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                            checked
                                                                ? 'bg-primary-glow/10 border-primary-glow/40 shadow-sm'
                                                                : 'bg-background/50 border-card-border hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                                                                checked
                                                                    ? 'bg-primary-glow border-primary-glow text-white'
                                                                    : 'border-foreground/30 bg-transparent'
                                                            }`}
                                                        >
                                                            {checked && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-foreground">
                                                                {perm.label}
                                                            </p>
                                                            <p className="text-[11px] text-foreground/50 leading-snug mt-0.5">
                                                                {perm.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-card-border">
                            <p className="text-xs text-foreground/50">
                                Note: Team members cannot access this Team Management page or modify administrator privileges.
                            </p>
                            <div className="p-1 bg-card-header-bg border border-card-border rounded-xl self-end sm:self-auto">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="h-8 px-4 rounded-lg bg-primary-glow hover:bg-blue-600 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{submitting ? 'Creating & Sending Invite...' : 'Create Member & Send Invite'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Card 2: Existing Team Members List */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-card-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    Team Members ({members.length})
                                </h2>
                                <p className="text-xs text-foreground/60">
                                    Manage active team accounts, modify their permissions, or revoke access at any time.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-card-border">
                        {loading ? (
                            <div className="p-12 text-center text-foreground/40 text-sm">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto mb-3"></div>
                                Loading team members...
                            </div>
                        ) : members.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users className="w-10 h-10 text-foreground/20 mx-auto mb-2" />
                                <p className="text-sm text-foreground/50">No team members added yet.</p>
                                <p className="text-xs text-foreground/30 mt-1">
                                    Use the form above to invite your first team member.
                                </p>
                            </div>
                        ) : (
                            members.map((member) => {
                                const initials =
                                    member.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .substring(0, 2)
                                        .toUpperCase() || member.email[0].toUpperCase();

                                return (
                                    <div
                                        key={member.id}
                                        className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-start sm:items-center gap-4 flex-1">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-primary-glow/30 flex items-center justify-center text-primary-glow font-bold text-sm shrink-0 shadow-inner">
                                                {initials}
                                            </div>

                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <span className="text-base font-bold text-foreground">
                                                        {member.name}
                                                    </span>
                                                    <span className="text-xs font-mono text-foreground/60 bg-background px-2.5 py-0.5 rounded-md border border-card-border">
                                                        {member.email}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                                            member.isActive
                                                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${
                                                                member.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                                                            }`}
                                                        />
                                                        {member.isActive ? 'Active' : 'Deactivated'}
                                                    </span>
                                                    {member.lastLoginAt ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
                                                            <Clock className="w-3.5 h-3.5 text-foreground/40" />
                                                            {new Date(member.lastLoginAt).toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-foreground/35">Never logged in</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {member.permissions && member.permissions.length > 0 ? (
                                                        member.permissions.map((permKey) => (
                                                            <span
                                                                key={permKey}
                                                                className="px-2.5 py-0.5 rounded-md bg-primary-glow/10 text-primary-glow border border-primary-glow/20 text-xs font-medium"
                                                            >
                                                                {getPermissionLabel(permKey)}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-amber-400/80">
                                                            No permissions assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 p-1 bg-card-header-bg border border-card-border rounded-xl self-end lg:self-center shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(member)}
                                                className="h-7 px-2.5 rounded-lg bg-card-bg hover:text-primary-glow text-foreground/80 shadow-sm text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 text-primary-glow" />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(member)}
                                                className="h-7 px-2.5 rounded-lg bg-card-bg hover:bg-red-500/20 text-red-400 shadow-sm text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Remove</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Edit Team Member Modal */}
                {editingMember && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                        <div className="bg-card-bg border border-card-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8">
                            <div className="p-6 border-b border-card-border flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        Edit Team Member &mdash; {editingMember.email}
                                    </h3>
                                    <p className="text-xs text-foreground/60">
                                        Update permissions, account status, or reset password &amp; resend invite.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingMember(null)}
                                    className="text-foreground/50 hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-background"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-foreground/70 mb-1.5">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-bold uppercase text-foreground/70">
                                                New Password (Optional)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => generateRandomPassword(setEditPassword)}
                                                className="text-[11px] font-bold text-primary-glow hover:underline cursor-pointer"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={editPassword}
                                            onChange={(e) => setEditPassword(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-background border border-card-border">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={editIsActive}
                                            onChange={(e) => setEditIsActive(e.target.checked)}
                                            className="w-4 h-4 rounded accent-emerald-500"
                                        />
                                        <span>Account Active (Allow Login)</span>
                                    </label>

                                    {editPassword.trim() && (
                                        <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-primary-glow">
                                            <input
                                                type="checkbox"
                                                checked={editSendEmail}
                                                onChange={(e) => setEditSendEmail(e.target.checked)}
                                                className="w-4 h-4 rounded accent-blue-500"
                                            />
                                            <span>Also email new password &amp; invite to {editEmail}</span>
                                        </label>
                                    )}
                                </div>

                                {/* Permissions Grid */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                        Permissions ({editPermissions.length} selected)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {availablePermissions.map((perm) => {
                                            const checked = editPermissions.includes(perm.key);
                                            return (
                                                <div
                                                    key={perm.key}
                                                    onClick={() =>
                                                        togglePermission(perm.key, editPermissions, setEditPermissions)
                                                    }
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                        checked
                                                            ? 'bg-primary-glow/10 border-primary-glow/40 shadow-sm'
                                                            : 'bg-background/50 border-card-border hover:border-white/20'
                                                    }`}
                                                >
                                                    <div
                                                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                                                            checked
                                                                ? 'bg-primary-glow border-primary-glow text-white'
                                                                : 'border-foreground/30 bg-transparent'
                                                        }`}
                                                    >
                                                        {checked && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">{perm.label}</p>
                                                        <p className="text-[11px] text-foreground/50">{perm.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-card-border">
                                    <button
                                        type="button"
                                        onClick={() => setEditingMember(null)}
                                        className="px-4 py-2.5 rounded-xl border border-card-border text-sm text-foreground/70 hover:text-foreground cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingEdit}
                                        className="px-6 py-2.5 rounded-xl bg-primary-glow hover:bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-primary-glow/20 cursor-pointer disabled:opacity-50 transition-all hover:-translate-y-0.5"
                                    >
                                        {savingEdit ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={Boolean(deleteTarget)}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDeleteMember}
                    title="Remove Team Member"
                    message={`Are you sure you want to remove ${deleteTarget?.name} (${deleteTarget?.email})? They will immediately lose access to the dashboard.`}
                    confirmText="Yes, Remove Member"
                    cancelText="Cancel"
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
