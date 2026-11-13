'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Globe, Mail, Building2, Save, CheckCircle2, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

export default function SettingsPage() {
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
            .then((res) => res.json())
            .then((data) => {
                setFormData({
                    websiteName: data.websiteName || '',
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
            .catch((err) => {
                console.error('Error loading website info:', err);
                toast.error('Failed to load settings');
                setLoading(false);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/admin/website-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success('General settings & website info saved successfully');
            } else {
                toast.error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving website info:', error);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="py-16 text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-glow mx-auto"></div>
                <p className="text-foreground/60 text-sm">Loading general website configuration...</p>
            </div>
        );
    }

    const hasLegalEmails = Boolean(formData.contactEmail && formData.dmcaEmail);

    return (
        <div className="space-y-6 pb-24">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">General Settings</h1>
                    <p className="text-foreground/60 text-sm">
                        Configure global brand metadata, public contact gateways, and organization legal attributes.
                    </p>
                </div>

                {formData.websiteUrl && (
                    <a
                        href={formData.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg hover:bg-white/5 border border-card-border hover:border-primary-glow/50 text-xs font-bold text-foreground/80 hover:text-foreground transition-all shadow-lg self-start sm:self-auto"
                    >
                        <ExternalLink className="w-4 h-4 text-primary-glow" />
                        Visit Live Website
                    </a>
                )}
            </div>

            {/* Primary Stat Cards Grid (Analytics Inspired) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Brand Identity"
                    value={formData.websiteName || 'PNG Finder'}
                    subtitle={formData.tagline ? 'Tagline & description active' : 'Default brand title in use'}
                    icon={<Globe className="w-6 h-6" />}
                />
                <StatCard
                    title="Canonical URL"
                    value={formData.websiteUrl ? 'Configured' : 'Missing'}
                    subtitle={formData.websiteUrl || 'Please specify base URL'}
                    icon={<CheckCircle2 className="w-6 h-6" />}
                />
                <StatCard
                    title="Legal & Contact Gateways"
                    value={hasLegalEmails ? 'Operational' : 'Incomplete'}
                    subtitle={
                        formData.contactEmail
                            ? `${formData.contactEmail} · DMCA ready`
                            : 'Contact & DMCA emails required'
                    }
                    icon={<Mail className="w-6 h-6" />}
                />
                <StatCard
                    title="Company Entity"
                    value={formData.companyName || 'Not Specified'}
                    subtitle={
                        formData.country
                            ? `${formData.country}${formData.foundedYear ? ` · Est. ${formData.foundedYear}` : ''}`
                            : 'Legal jurisdiction pending'
                    }
                    icon={<Building2 className="w-6 h-6" />}
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Brand & Identity Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-card-border flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mt-0.5">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Brand &amp; Website Identity</h2>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Core branding details displayed in the browser tab, header, hero, footer, and informational pages.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Website Name / Title *
                            </label>
                            <input
                                type="text"
                                value={formData.websiteName}
                                onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })}
                                required
                                placeholder="e.g. PNG Finder"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Website Canonical URL *
                            </label>
                            <input
                                type="url"
                                value={formData.websiteUrl}
                                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                                required
                                placeholder="e.g. https://png-finder.com"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground font-mono text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Website Tagline &amp; Short Overview
                            </label>
                            <textarea
                                rows={3}
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                placeholder="Discover and download free, high-resolution transparent PNG images for creative, educational, and commercial designs."
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all resize-none leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact & Support Emails Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-card-border flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Contact &amp; Support Channels</h2>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Public and legal email addresses displayed across the Contact Us, DMCA Takedown, Privacy Policy, and Terms of Service documents.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                General Support Email *
                            </label>
                            <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                required
                                placeholder="contact@png-finder.com"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                DMCA / Copyright Officer Email *
                            </label>
                            <input
                                type="email"
                                value={formData.dmcaEmail}
                                onChange={(e) => setFormData({ ...formData, dmcaEmail: e.target.value })}
                                required
                                placeholder="dmca@png-finder.com"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Organization & Legal Details Card */}
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-card-border flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Organization &amp; Legal Entity</h2>
                            <p className="text-xs text-foreground/60 mt-0.5">
                                Legal entity information populated into dynamic policy disclaimers and footer rights.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Company / Legal Name
                            </label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                placeholder="e.g. PNG Finder LLC"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Country / Jurisdiction
                            </label>
                            <input
                                type="text"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                placeholder="e.g. United States"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Founded Year
                            </label>
                            <input
                                type="text"
                                value={formData.foundedYear}
                                onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                                placeholder="e.g. 2026"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">
                                Physical / Mailing Notice Address (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Optional mailing address for formal written notifications"
                                className="w-full px-4 py-2.5 bg-background border border-card-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Save Changes Bar */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-card-bg border border-card-border shadow-lg">
                    <p className="text-xs text-foreground/50">
                        Changes update automatically across header, footer, SEO metadata, and legal policies.
                    </p>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-glow hover:bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-glow/20 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
