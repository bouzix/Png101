import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Header from '@/components/Header';
import { Send, CheckCircle2, Mail, MapPin } from 'lucide-react';

export default function ContactUs() {
    const { props } = usePage();
    const info = props?.websiteInfo || {};
    const siteName = info.websiteName || info.siteName || 'Png101';
    const supportEmail = info.supportEmail || info.contactEmail || 'support@png101.com';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('General Inquiry');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) return;
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Contact Us - ${siteName}`} />
            <Header />

            <main className="max-w-5xl mx-auto px-6 py-16">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Get in Touch
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">Contact Us</h1>
                    <p className="text-sm text-foreground/70">
                        Have questions, feedback, or copyright inquiries? Reach out to the {siteName} team.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-2">
                            <Mail className="w-6 h-6 text-primary-glow" />
                            <h3 className="font-bold text-foreground">Email Support</h3>
                            <p className="text-xs text-muted-text">We typically respond within 24-48 hours.</p>
                            <a href={`mailto:${supportEmail}`} className="text-sm font-medium text-blue-500 hover:underline block pt-1">
                                {supportEmail}
                            </a>
                        </div>

                        <div className="bg-card-bg border border-card-border rounded-2xl p-6 space-y-2">
                            <MapPin className="w-6 h-6 text-primary-glow" />
                            <h3 className="font-bold text-foreground">Operated By</h3>
                            <p className="text-xs text-muted-text">{info.companyName || siteName}</p>
                            {info.address && <p className="text-xs text-foreground/70">{info.address}</p>}
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-card-bg border border-card-border rounded-2xl p-6 md:p-8 shadow-xl">
                        {submitted ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Message Prepared</h2>
                                <p className="text-sm text-foreground/70 max-w-md mx-auto">
                                    Thank you for reaching out! You can also send this directly to{' '}
                                    <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`} className="text-primary-glow hover:underline font-semibold">
                                        {supportEmail}
                                    </a>{' '}
                                    to open it in your email client.
                                </p>
                                <button
                                    onClick={() => {
                                        setSubmitted(false);
                                        setName('');
                                        setEmail('');
                                        setMessage('');
                                    }}
                                    className="px-5 py-2 rounded-xl bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors cursor-pointer"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Your Name *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            placeholder="Jane Doe"
                                            className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-2.5 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Email Address *</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="jane@example.com"
                                            className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-2.5 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Subject</label>
                                    <select
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-2.5 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="General Inquiry">General Inquiry</option>
                                        <option value="DMCA / Copyright">DMCA / Copyright</option>
                                        <option value="Report Broken Asset">Report Broken Asset</option>
                                        <option value="Partnership">Partnership</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Message *</label>
                                    <textarea
                                        rows={5}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        placeholder="How can we help you?"
                                        className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-2.5 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
                                >
                                    <Send className="w-4 h-4" />
                                    Send Message
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

