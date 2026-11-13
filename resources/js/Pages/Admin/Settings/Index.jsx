import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { toast } from 'sonner';
import { Globe, Save, ExternalLink, Building2, Mail } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import SettingsNav from '@/components/admin/SettingsNav';

export default function SettingsIndex() {
    const [formData, setFormData] = useState({
        websiteName: '',
        websiteUrl: '',
        tagline: '',
        contactEmail: '',
        dmcaEmail: '',
        companyName: '',
        country: '',
        address: '',
        foundedYear: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/website-info')
            .then(res => res.json())
            .then(data => {
                setFormData({
                    websiteName: data.websiteName || 'Png101',
                    websiteUrl: data.websiteUrl || '',
                    tagline: data.tagline || '',
                    contactEmail: data.contactEmail || '',
                    dmcaEmail: data.dmcaEmail || '',
                    companyName: data.companyName || '',
                    country: data.country || '',
                    address: data.address || '',
                    foundedYear: data.foundedYear || '',
                });
                setLoading(false);
            })
            .catch(() => {
                toast.error('Failed to load settings');
                setLoading(false);
            });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/website-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                toast.success('General settings saved successfully');
            } else {
                toast.error('Failed to save settings');
            }
        } catch {
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="General Settings - Png101 Admin" />
            <div className="max-w-5xl mx-auto">
                <SettingsNav />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">General Settings</h1>
                        <p className="text-sm text-foreground/60">
                            Configure global brand metadata, public contact gateways, and organization legal attributes.
                        </p>
                    </div>
                    {formData.websiteUrl && (
                        <a
                            href={formData.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card-bg border border-card-border text-xs font-bold text-foreground/80 hover:text-foreground"
                        >
                            <ExternalLink className="w-4 h-4 text-primary-glow" />
                            Visit Live Site
                        </a>
                    )}
                </div>

                {loading ? (
                    <div className="py-16 text-center text-foreground/50">Loading settings...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary-glow" />
                                Brand Identity
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Website Name</label>
                                    <input
                                        type="text"
                                        value={formData.websiteName}
                                        onChange={e => setFormData({ ...formData, websiteName: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Website URL</label>
                                    <input
                                        type="url"
                                        value={formData.websiteUrl}
                                        onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Tagline / Description</label>
                                <textarea
                                    rows={2}
                                    value={formData.tagline}
                                    onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                                    className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                />
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary-glow" />
                                Contact &amp; Legal Emails
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Support / Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">DMCA Email</label>
                                    <input
                                        type="email"
                                        value={formData.dmcaEmail}
                                        onChange={e => setFormData({ ...formData, dmcaEmail: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary-glow" />
                                Organization Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Company Name</label>
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Country</label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Founded Year</label>
                                    <input
                                        type="text"
                                        value={formData.foundedYear}
                                        onChange={e => setFormData({ ...formData, foundedYear: e.target.value })}
                                        className="w-full bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-glow hover:bg-primary-glow/90 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}

