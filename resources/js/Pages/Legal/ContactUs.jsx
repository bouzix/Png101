import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { Mail, ShieldAlert, Globe, Send } from 'lucide-react';

function ContactForm({ contactEmail, websiteName }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const mailtoSubject = encodeURIComponent(form.subject || `Inquiry from ${websiteName}`);
        const mailtoBody = encodeURIComponent(
            `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`
        );
        window.location.href = `mailto:${contactEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;
        setSubmitted(true);
        toast.success('Opening your email client with your message...');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                        Your Name
                    </label>
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                        Your Email
                    </label>
                    <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                    Subject
                </label>
                <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="General Inquiry, Feedback, or Asset Request"
                    className="w-full px-4 py-3 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">
                    Message
                </label>
                <textarea
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help you?"
                    className="w-full px-4 py-3 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/50 transition-all resize-y"
                />
            </div>

            {submitted && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    Your email client has been opened addressed to <strong>{contactEmail}</strong>. You can also email us directly anytime!
                </div>
            )}

            <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-glow text-white font-semibold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-primary-glow/20 cursor-pointer"
            >
                <Send className="w-4 h-4" />
                Send Message
            </button>
        </form>
    );
}

export default function ContactUs({ websiteInfo = {} }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        contactEmail: websiteInfo.contactEmail || 'contact@png101.com',
        dmcaEmail: websiteInfo.dmcaEmail || websiteInfo.contactEmail || 'dmca@png101.com',
        companyName: websiteInfo.companyName || 'Png101',
        country: websiteInfo.country || 'United States',
        address: websiteInfo.address || '',
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Contact Us - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-16 space-y-12">
                {/* Page Header */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                        Get in Touch
                    </span>
                    <h1 className="text-4xl font-bold text-foreground">Contact Us</h1>
                    <p className="text-foreground/60">
                        Have questions, feedback, or need assistance with an image on <strong>{info.websiteName}</strong>? Reach out to us using the details or form below.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Contact Info Sidebar */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">General Support &amp; Inquiries</h3>
                                    <p className="text-xs text-foreground/60 mt-1 mb-2">
                                        For questions, partnerships, or feedback about {info.websiteName}:
                                    </p>
                                    <a
                                        href={`mailto:${info.contactEmail}`}
                                        className="text-sm font-medium text-primary-glow hover:underline break-all"
                                    >
                                        {info.contactEmail}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">DMCA &amp; Copyright Notices</h3>
                                    <p className="text-xs text-foreground/60 mt-1 mb-2">
                                        For copyright or takedown requests (see our <Link href="/dmca-policy" className="text-primary-glow hover:underline">DMCA Policy</Link>):
                                    </p>
                                    <a
                                        href={`mailto:${info.dmcaEmail}`}
                                        className="text-sm font-medium text-primary-glow hover:underline break-all"
                                    >
                                        {info.dmcaEmail}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4 shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-foreground">Organization Info</h3>
                                    <p className="text-sm text-foreground/70">
                                        <strong>Company:</strong> {info.companyName}
                                    </p>
                                    <p className="text-sm text-foreground/70">
                                        <strong>Location:</strong> {info.country}
                                    </p>
                                    {info.address && (
                                        <p className="text-sm text-foreground/70">
                                            <strong>Address:</strong> {info.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-7 bg-card-bg border border-card-border rounded-2xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-foreground mb-2">Send Us a Message</h2>
                        <p className="text-sm text-foreground/60 mb-6">
                            Fill out the form below to compose a message directly to <strong>{info.contactEmail}</strong>.
                        </p>
                        <ContactForm contactEmail={info.contactEmail} websiteName={info.websiteName} />
                    </div>
                </div>
            </main>
        </div>
    );
}
