import React from 'react';
import Header from '../components/Header';
import { getWebsiteInfo } from '@/lib/website-info';
import ContactForm from './ContactForm';
import type { Metadata } from 'next';
import { Mail, ShieldAlert, Globe, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    const info = await getWebsiteInfo();
    return {
        title: `Contact Us - ${info.websiteName}`,
        description: `Get in touch with the ${info.websiteName} team for support, feedback, or copyright inquiries.`,
    };
}

export default async function ContactUsPage() {
    const info = await getWebsiteInfo();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header siteName={info.websiteName} />

            <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
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
                                        For copyright or takedown requests (see our <a href="/dmca-policy" className="text-primary-glow hover:underline">DMCA Policy</a>):
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

