'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

export default function ContactForm({ contactEmail, websiteName }: { contactEmail: string; websiteName: string }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
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

