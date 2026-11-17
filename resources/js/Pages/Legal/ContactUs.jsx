import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import Header from '@/components/Header';
import RichTextContent from '@/components/legal/RichTextContent';
import { toast } from 'sonner';
import { Mail, ShieldAlert, Globe, Send } from 'lucide-react';

function ContactForm({ contactEmail, websiteName, submitButtonText }) {
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-glow text-white font-semibold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-primary-glow/20 cursor-pointer"
            >
                <Send className="w-4 h-4" />
                {submitButtonText || 'Send Message'}
            </button>
        </form>
    );
}

export default function ContactUs({ websiteInfo = {}, legalContent = null }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        contactEmail: websiteInfo.contactEmail || 'contact@png101.com',
        dmcaEmail: websiteInfo.dmcaEmail || websiteInfo.contactEmail || 'dmca@png101.com',
        companyName: websiteInfo.companyName || 'Png101',
        country: websiteInfo.country || 'United States',
        address: websiteInfo.address || '',
    };

    const content = legalContent || {
        heroBadge: 'Get in Touch',
        heroTitle: 'Contact Us',
        heroSubtitleHtml: `<p>Have questions, feedback, or need assistance with an image on <strong>${info.websiteName}</strong>? Reach out to us using the details or form below.</p>`,
        supportTitle: 'General Support & Inquiries',
        supportDescriptionHtml: `<p>For questions, partnerships, or feedback about ${info.websiteName}:</p>`,
        dmcaTitle: 'DMCA & Copyright Notices',
        dmcaDescriptionHtml: '<p>For copyright or takedown requests (see our <a href="/dmca-policy">DMCA Policy</a>):</p>',
        orgTitle: 'Organization Info',
        orgNoteHtml: '',
        formTitle: 'Send Us a Message',
        formSubtitleHtml: `<p>Fill out the form below to compose a message directly to <strong>${info.contactEmail}</strong>.</p>`,
        submitButtonText: 'Send Message',
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Contact Us - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="w-full px-6 sm:px-10 md:px-16 py-16 space-y-12">
                {/* Page Header */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    {content.heroBadge && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                            {content.heroBadge}
                        </span>
                    )}
                    <h1 className="text-4xl font-bold text-foreground">{content.heroTitle}</h1>
                    <RichTextContent
                        html={content.heroSubtitleHtml}
                        className="text-foreground/60"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Contact Info Sidebar */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">{content.supportTitle}</h3>
                                    <RichTextContent
                                        html={content.supportDescriptionHtml}
                                        className="text-xs text-foreground/60 mt-1 mb-2"
                                    />
                                    <a
                                        href={`mailto:${info.contactEmail}`}
                                        className="text-sm font-medium text-primary-glow hover:underline break-all"
                                    >
                                        {info.contactEmail}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">{content.dmcaTitle}</h3>
                                    <RichTextContent
                                        html={content.dmcaDescriptionHtml}
                                        className="text-xs text-foreground/60 mt-1 mb-2"
                                    />
                                    <a
                                        href={`mailto:${info.dmcaEmail}`}
                                        className="text-sm font-medium text-primary-glow hover:underline break-all"
                                    >
                                        {info.dmcaEmail}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-primary-glow/10 text-primary-glow border border-primary-glow/20">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-foreground">{content.orgTitle}</h3>
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
                                    {content.orgNoteHtml && (
                                        <RichTextContent
                                            html={content.orgNoteHtml}
                                            className="text-xs text-foreground/65 pt-1"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div
                        data-testid="contact-form-container"
                        className="lg:col-span-7 bg-transparent border-0 p-0 shadow-none sm:bg-card-bg sm:border sm:border-card-border sm:rounded-2xl sm:p-8 sm:shadow-xl"
                    >
                        <h2 className="text-xl font-bold text-foreground mb-2">{content.formTitle}</h2>
                        <RichTextContent
                            html={content.formSubtitleHtml}
                            className="text-sm text-foreground/60 mb-6"
                        />
                        <ContactForm
                            contactEmail={info.contactEmail}
                            websiteName={info.websiteName}
                            submitButtonText={content.submitButtonText}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
