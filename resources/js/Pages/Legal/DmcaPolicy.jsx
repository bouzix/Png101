import React from 'react';
import { Head } from '@inertiajs/react';
import Header from '@/components/Header';

export default function DmcaPolicy({ websiteInfo = {} }) {
    const info = {
        websiteName: websiteInfo.websiteName || 'Png101',
        websiteUrl: websiteInfo.websiteUrl || 'https://png101.com',
        companyName: websiteInfo.companyName || 'Png101',
        dmcaEmail: websiteInfo.dmcaEmail || websiteInfo.contactEmail || 'dmca@png101.com',
        contactEmail: websiteInfo.contactEmail || 'contact@png101.com',
        address: websiteInfo.address || '',
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`DMCA Policy - ${info.websiteName}`} />
            <Header siteName={info.websiteName} />

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-10">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary-glow/10 text-primary-glow border border-primary-glow/20 mb-4">
                        Copyright Compliance
                    </span>
                    <h1 className="text-4xl font-bold text-foreground mb-3">DMCA Policy &amp; Takedown Notice</h1>
                    <p className="text-sm text-foreground/60">
                        Intellectual Property Protection for {info.websiteName} ({info.websiteUrl})
                    </p>
                </div>

                <div className="bg-card-bg border border-card-border rounded-2xl p-8 md:p-10 space-y-8 text-foreground/80 leading-relaxed shadow-xl">
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">1. Respect for Intellectual Property</h2>
                        <p>
                            <strong>{info.websiteName}</strong> (<a href={info.websiteUrl} className="text-primary-glow hover:underline">{info.websiteUrl}</a>), operated by <strong>{info.companyName}</strong>, respects the intellectual property rights of artists, photographers, designers, and copyright holders worldwide and complies with the Digital Millennium Copyright Act (17 U.S.C. &sect; 512) and applicable international copyright laws.
                        </p>
                        <p>
                            If you believe that any PNG image or material available on {info.websiteName} infringes upon a copyright that you own or are authorized to enforce, please submit a written takedown notice to our Designated Copyright Agent using the instructions below.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">2. How to Submit a DMCA Takedown Request</h2>
                        <p>
                            To expedite the removal of allegedly infringing material, please include the following information in your written notification:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2">
                            <li>
                                <strong>Identification of the Copyrighted Work:</strong> A clear description of the copyrighted work you claim has been infringed, or a link to an authorized original version of the work.
                            </li>
                            <li>
                                <strong>Exact URL(s) on {info.websiteName}:</strong> The specific URL(s) of the image page(s) on {info.websiteName} that you are requesting to have removed so we can locate the exact asset quickly.
                            </li>
                            <li>
                                <strong>Your Contact Details:</strong> Your full legal name, organization (if applicable), mailing address, telephone number, and a valid email address.
                            </li>
                            <li>
                                <strong>Good-Faith Statement:</strong> A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
                            </li>
                            <li>
                                <strong>Accuracy &amp; Authority Statement:</strong> A statement made under penalty of perjury that the information in your notification is accurate and that you are the copyright owner or authorized to act on behalf of the owner.
                            </li>
                            <li>
                                <strong>Signature:</strong> Your physical or electronic signature (typing your full legal name at the bottom of your email suffices as an electronic signature).
                            </li>
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">3. Designated Copyright Agent Contact</h2>
                        <div className="bg-background border border-card-border rounded-xl p-6 space-y-2">
                            <p className="text-foreground font-semibold">{info.companyName} — Copyright &amp; DMCA Agent</p>
                            <p>
                                <strong>DMCA Email:</strong>{' '}
                                <a href={`mailto:${info.dmcaEmail}`} className="text-primary-glow hover:underline font-medium">
                                    {info.dmcaEmail}
                                </a>
                            </p>
                            <p>
                                <strong>General Support Email:</strong>{' '}
                                <a href={`mailto:${info.contactEmail}`} className="text-primary-glow hover:underline">
                                    {info.contactEmail}
                                </a>
                            </p>
                            {info.address && (
                                <p>
                                    <strong>Address:</strong> {info.address}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">4. Prompt Removal &amp; Review Timeline</h2>
                        <p>
                            Upon receipt of a valid and complete DMCA notice at <a href={`mailto:${info.dmcaEmail}`} className="text-primary-glow hover:underline">{info.dmcaEmail}</a>, our team will promptly review the claim and remove or disable access to the specified PNG asset—typically within 24 to 72 business hours.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
