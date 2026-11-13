import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function TeamLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/team/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                router.visit(data.redirectPath || '/admin/dashboard');
            } else {
                setError(data.error || 'Invalid email or password.');
            }
        } catch {
            setError('Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
            <Head title="Team Login - Png101" />

            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 w-full max-w-md bg-card-bg border border-card-border rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-500">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Team Member Login</h1>
                    <p className="text-sm text-muted-text mt-1">Sign in to your Png101 workspace</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@png101.com"
                                className="w-full bg-input-bg border border-input-border rounded-xl pl-10 pr-4 py-3 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-muted-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full bg-input-bg border border-input-border rounded-xl pl-10 pr-4 py-3 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs text-center bg-red-500/10 py-2.5 px-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

