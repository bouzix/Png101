import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import CaptchaWidget from '@/components/CaptchaWidget';

export default function AdminLogin({ captcha }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaConfig, setCaptchaConfig] = useState(captcha || null);
    const [captchaData, setCaptchaData] = useState({
        token: '',
        challengeToken: captcha?.challenge?.token || '',
    });
    const [captchaResetKey, setCaptchaResetKey] = useState(0);

    const requiresCaptcha = Boolean(captchaConfig?.provider && captchaConfig.provider !== 'none');

    // Refresh captcha on pageshow (bfcache back navigation) so solved/expired nonces are never reused
    useEffect(() => {
        const refreshConfig = async () => {
            try {
                const res = await fetch(`/api/captcha/config?context=admin_login&_t=${Date.now()}`, { cache: 'no-store' });
                const cfg = await res.json();
                if (cfg?.provider) {
                    setCaptchaConfig(cfg);
                    setCaptchaData({ token: '', challengeToken: cfg?.challenge?.token || '' });
                    setCaptchaResetKey((k) => k + 1);
                }
            } catch {
                // Keep initial SSR config
            }
        };

        const handlePageShow = (e) => {
            if (e.persisted) refreshConfig();
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (requiresCaptcha && !captchaData.token) {
            setError('Please complete the security captcha first.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    captchaToken: captchaData.token,
                    captchaChallenge: captchaData.challengeToken || captchaConfig?.challenge?.token || '',
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success) {
                router.visit('/admin/dashboard');
            } else {
                setError(data?.error || data?.message || 'Invalid password');
                if (data?.freshChallenge) {
                    setCaptchaConfig((prev) => ({ ...(prev || {}), challenge: data.freshChallenge }));
                    setCaptchaData({ token: '', challengeToken: data.freshChallenge.token });
                } else {
                    setCaptchaData((prev) => ({ ...prev, token: '' }));
                }
                setCaptchaResetKey((k) => k + 1);
            }
        } catch {
            setError('Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
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
                {requiresCaptcha && (
                    <div className="mb-4">
                        <CaptchaWidget
                            config={captchaConfig}
                            context="admin_login"
                            resetKey={captchaResetKey}
                            onChange={(val) => setCaptchaData(val)}
                            onChallengeChange={(fresh) =>
                                setCaptchaConfig((prev) => ({ ...(prev || {}), challenge: fresh }))
                            }
                        />
                    </div>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-glow hover:bg-primary-glow/90 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {loading ? 'Signing in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}
