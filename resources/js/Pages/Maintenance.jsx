import React from 'react';
import { Head } from '@inertiajs/react';

export default function Maintenance({ config = {} }) {
    const title = config.title || 'Under Maintenance';
    const heading = config.heading || "We'll Be Back Soon!";
    const message = config.message || 'We are currently performing scheduled maintenance to improve your experience. Please check back in a few moments.';
    const estimatedTime = config.estimatedTime || 'Less than 30 minutes';
    const contactEmail = config.contactEmail || 'support@png101.com';

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
            <Head title={title} />

            {/* Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-lg w-full text-center space-y-8 bg-card-bg border border-card-border rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-4xl">
                    🛠️
                </div>

                <div className="space-y-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider">
                        {title}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                        {heading}
                    </h1>
                    <p className="text-muted-text text-sm md:text-base leading-relaxed">
                        {message}
                    </p>
                </div>

                {estimatedTime && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/5 border border-card-border text-xs font-medium text-foreground/80">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Estimated Return: <strong>{estimatedTime}</strong></span>
                    </div>
                )}

                {contactEmail && (
                    <p className="text-xs text-muted-text pt-4 border-t border-card-border">
                        Need urgent assistance? Contact{' '}
                        <a href={`mailto:${contactEmail}`} className="text-blue-500 hover:underline font-medium">
                            {contactEmail}
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
}

