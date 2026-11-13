import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (res.ok) {
            router.visit('/admin/dashboard');
        } else {
            setError('Invalid password');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Head title="Admin Login" />
            <form onSubmit={handleSubmit} className="bg-card-bg p-8 rounded-xl border border-card-border shadow-2xl w-full max-w-md">
                <h1 className="text-2xl font-bold text-foreground mb-6 text-center">Admin Login</h1>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full bg-background border border-card-border text-foreground px-4 py-3 rounded-lg mb-4 focus:outline-none focus:border-primary-glow"
                />
                <button
                    type="submit"
                    className="w-full bg-primary-glow hover:bg-primary-glow/90 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Login
                </button>
            </form>
        </div>
    );
}
