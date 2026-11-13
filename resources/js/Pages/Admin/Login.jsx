import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.visit('/admin/dashboard');
            } else {
                const data = await res.json();
                setError(data.error || 'Invalid password');
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <Head title="Admin Login - Png101" />
            <div className="w-full max-w-md bg-card-bg border border-card-border rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        Admin Access
                    </h1>
                    <p className="text-muted-text text-sm mt-2">Enter password to manage Png101</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-input-text placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

