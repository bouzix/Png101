import React, { useEffect, useId, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

const scriptPromises = {};

function loadExternalScript(src) {
    if (typeof window === 'undefined') return Promise.resolve();
    if (scriptPromises[src]) return scriptPromises[src];

    scriptPromises[src] = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (err) => {
            delete scriptPromises[src];
            reject(err);
        };
        document.head.appendChild(script);
    });

    return scriptPromises[src];
}

/**
 * Unified Captcha Widget supporting:
 * none, builtin_math, recaptcha_v2, recaptcha_v3, turnstile, hcaptcha, friendly
 */
export default function CaptchaWidget({
    config,
    context = 'download',
    onChange,
    onChallengeChange,
    resetKey = 0,
}) {
    const provider = config?.provider || 'none';
    const siteKey = config?.siteKey || '';
    const [localChallenge, setLocalChallenge] = useState(null);
    const activeChallenge = localChallenge || config?.challenge || null;
    const activeChallengeToken = activeChallenge?.token || '';
    const [mathAnswer, setMathAnswer] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [widgetStatus, setWidgetStatus] = useState('idle'); // idle | loading | ready | verified | error
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const mathInputRef = useRef(null);
    const uniqueId = useId().replace(/:/g, '');

    useEffect(() => {
        setLocalChallenge(null);
        setMathAnswer('');
    }, [config?.challenge?.token, config?.provider]);

    useEffect(() => {
        if (resetKey > 0) {
            setMathAnswer('');
            if (provider === 'builtin_math') {
                setTimeout(() => mathInputRef.current?.focus(), 20);
            }
        }
    }, [resetKey, provider]);

    const handleRefreshMath = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            const res = await fetch(`/api/captcha/config?context=${encodeURIComponent(context)}&_t=${Date.now()}`, {
                cache: 'no-store',
            });
            const data = await res.json();
            if (data?.challenge) {
                setLocalChallenge(data.challenge);
                setMathAnswer('');
                if (onChallengeChange) onChallengeChange(data.challenge);
                if (onChange) onChange({ token: '', challengeToken: data.challenge.token });
                setTimeout(() => mathInputRef.current?.focus(), 20);
            }
        } catch {
            // Keep existing challenge if offline
        } finally {
            setRefreshing(false);
        }
    };

    // External provider initialization
    useEffect(() => {
        if (provider === 'none' || provider === 'builtin_math') {
            return undefined;
        }
        if (!siteKey) {
            setWidgetStatus('error');
            return undefined;
        }

        let cancelled = false;
        setWidgetStatus('loading');

        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const theme = isDark ? 'dark' : 'light';

        const emitToken = (token) => {
            if (onChange) onChange({ token: token || '', challengeToken: '' });
            setWidgetStatus(token ? 'verified' : 'ready');
        };

        if (provider === 'turnstile') {
            loadExternalScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
                .then(() => {
                    if (cancelled || !containerRef.current || !window.turnstile) return;
                    containerRef.current.innerHTML = '';
                    widgetIdRef.current = window.turnstile.render(containerRef.current, {
                        sitekey: siteKey,
                        theme,
                        callback: (token) => emitToken(token),
                        'expired-callback': () => emitToken(''),
                        'error-callback': () => setWidgetStatus('error'),
                    });
                    setWidgetStatus('ready');
                })
                .catch(() => !cancelled && setWidgetStatus('error'));
        } else if (provider === 'recaptcha_v2') {
            loadExternalScript('https://www.google.com/recaptcha/api.js?render=explicit')
                .then(() => {
                    const tryRender = () => {
                        if (cancelled || !containerRef.current) return;
                        if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
                            containerRef.current.innerHTML = '';
                            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
                                sitekey: siteKey,
                                theme,
                                callback: (token) => emitToken(token),
                                'expired-callback': () => emitToken(''),
                                'error-callback': () => setWidgetStatus('error'),
                            });
                            setWidgetStatus('ready');
                        } else {
                            setTimeout(tryRender, 120);
                        }
                    };
                    tryRender();
                })
                .catch(() => !cancelled && setWidgetStatus('error'));
        } else if (provider === 'recaptcha_v3') {
            const scriptUrl = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
            loadExternalScript(scriptUrl)
                .then(() => {
                    const executeV3 = () => {
                        if (cancelled || !window.grecaptcha) return;
                        window.grecaptcha.ready(() => {
                            window.grecaptcha
                                .execute(siteKey, { action: context })
                                .then((token) => {
                                    if (!cancelled) emitToken(token);
                                })
                                .catch(() => !cancelled && setWidgetStatus('error'));
                        });
                    };
                    executeV3();
                })
                .catch(() => !cancelled && setWidgetStatus('error'));
        } else if (provider === 'hcaptcha') {
            loadExternalScript('https://js.hcaptcha.com/1/api.js?render=explicit')
                .then(() => {
                    const tryRender = () => {
                        if (cancelled || !containerRef.current) return;
                        if (window.hcaptcha && typeof window.hcaptcha.render === 'function') {
                            containerRef.current.innerHTML = '';
                            widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
                                sitekey: siteKey,
                                theme,
                                callback: (token) => emitToken(token),
                                'expired-callback': () => emitToken(''),
                                'error-callback': () => setWidgetStatus('error'),
                            });
                            setWidgetStatus('ready');
                        } else {
                            setTimeout(tryRender, 120);
                        }
                    };
                    tryRender();
                })
                .catch(() => !cancelled && setWidgetStatus('error'));
        } else if (provider === 'friendly') {
            loadExternalScript('https://cdn.jsdelivr.net/npm/friendly-challenge@0.9.18/widget.min.js')
                .then(() => {
                    if (cancelled || !containerRef.current || !window.friendlyChallenge?.WidgetInstance) {
                        setWidgetStatus('error');
                        return;
                    }
                    containerRef.current.innerHTML = '';
                    const el = document.createElement('div');
                    el.id = `fc-${uniqueId}`;
                    containerRef.current.appendChild(el);
                    widgetIdRef.current = new window.friendlyChallenge.WidgetInstance(el, {
                        sitekey: siteKey,
                        doneCallback: (solution) => emitToken(solution),
                        errorCallback: () => setWidgetStatus('error'),
                    });
                    setWidgetStatus('ready');
                })
                .catch(() => !cancelled && setWidgetStatus('error'));
        }

        return () => {
            cancelled = true;
            try {
                if (provider === 'turnstile' && window.turnstile && widgetIdRef.current !== null) {
                    window.turnstile.remove(widgetIdRef.current);
                } else if (provider === 'friendly' && widgetIdRef.current?.destroy) {
                    widgetIdRef.current.destroy();
                }
            } catch {
                // Ignore cleanup errors
            }
        };
    }, [provider, siteKey, context, resetKey]);

    if (!provider || provider === 'none') {
        return null;
    }

    if (provider === 'builtin_math') {
        return (
            <div className="rounded-xl border border-card-border bg-background/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/75">
                        <ShieldCheck className="w-4 h-4 text-primary-glow" />
                        Human Verification
                    </span>
                    <button
                        type="button"
                        onClick={handleRefreshMath}
                        disabled={refreshing}
                        title="Get a new puzzle"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/60 hover:text-primary-glow transition-colors cursor-pointer disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>New Puzzle</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-3.5 py-2 rounded-lg bg-card-bg border border-card-border font-mono text-sm font-bold text-foreground select-none whitespace-nowrap">
                        {activeChallenge?.question || 'Loading puzzle...'}
                    </div>
                    <input
                        ref={mathInputRef}
                        name={`captcha_math_${uniqueId}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={mathAnswer}
                        onChange={(e) => {
                            const val = e.target.value;
                            setMathAnswer(val);
                            if (onChange) {
                                onChange({
                                    token: val.trim(),
                                    challengeToken: activeChallengeToken,
                                });
                            }
                        }}
                        placeholder="Answer"
                        className="flex-1 min-w-0 bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:border-primary-glow"
                    />
                </div>
            </div>
        );
    }

    if (provider === 'recaptcha_v3') {
        return (
            <div className="rounded-xl border border-card-border bg-background/70 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-foreground/75">
                    <ShieldCheck className={`w-4 h-4 ${widgetStatus === 'verified' ? 'text-emerald-400' : 'text-primary-glow'}`} />
                    <span>
                        {widgetStatus === 'verified'
                            ? 'Protected by Google reCAPTCHA v3 (Verified)'
                            : widgetStatus === 'error'
                            ? 'reCAPTCHA v3 could not load'
                            : 'Running Google reCAPTCHA v3 check...'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            <div ref={containerRef} className="min-h-[65px] flex items-center justify-center rounded-xl border border-card-border bg-background/60 p-2 overflow-x-auto" />
            {widgetStatus === 'error' && (
                <p className="text-xs text-red-400">
                    Failed to load captcha widget. Verify your Site Key and allowed domain in Captcha Settings.
                </p>
            )}
        </div>
    );
}

