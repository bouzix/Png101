import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Users, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import CaptchaWidget from '@/components/CaptchaWidget';

export default function TeamLogin({ captcha }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                const res = await fetch(`/api/captcha/config?context=team_login&_t=${Date.now()}`, { cache: 'no-store' });
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
            const res = await fetch('/api/team/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    captchaToken: captchaData.token,
                    captchaChallenge: captchaData.challengeToken || captchaConfig?.challenge?.token || '',
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                router.visit(data.redirectTo || '/admin/dashboard');
            } else {
                setError(data?.error || data?.message || 'Invalid email or password.');
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
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Head title="Team Portal Login" />
            <div className="w-full max-w-md bg-card-bg border border-card-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-card-border text-center bg-gradient-to-b from-primary-glow/10 to-transparent">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-glow/15 border border-primary-glow/30 flex items-center justify-center text-primary-glow shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                        <Users className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Team Portal Login</h1>
                    <p className="text-sm text-foreground/60 mt-1">
                        Sign in with the email and password sent to your inbox
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-background border border-card-border text-foreground pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary-glow transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your team password"
                                className="w-full bg-background border border-card-border text-foreground pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none focus:border-primary-glow transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {requiresCaptcha && (
                        <div>
                            <CaptchaWidget
                                config={captchaConfig}
                                context="team_login"
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
                        className="w-full bg-primary-glow hover:bg-primary-glow/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-glow/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
