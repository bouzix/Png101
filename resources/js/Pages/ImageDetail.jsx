import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Head, Link, usePage } from '@inertiajs/react';
import { HexColorPicker } from 'react-colorful';
import { GripHorizontal, Lock, Pipette, RotateCcw, ShieldCheck, SlidersHorizontal, Clock, Download, Unlock, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ImageDetails from '@/components/ImageDetails';
import RelatedImages from '@/components/RelatedImages';
import CaptchaWidget from '@/components/CaptchaWidget';
import EditorEyedropperOverlay from '@/components/editor/EditorEyedropperOverlay';
import { getSiteDomainTag } from '@/lib/utils';
import {
    parseHexOrRgbColor,
    useGlobalColorPickerDefaults,
    useSmallColorPickerViewport,
} from '@/lib/colorPickerConfig';

const GRADIENT_PRESETS = [
    { name: 'Sunset', from: '#ff7e5f', to: '#feb47b', angle: 135 },
    { name: 'Ocean', from: '#2b5876', to: '#4e4376', angle: 135 },
    { name: 'Cyber', from: '#00f2fe', to: '#4facfe', angle: 135 },
    { name: 'Emerald', from: '#11998e', to: '#38ef7d', angle: 135 },
    { name: 'Royal', from: '#141e30', to: '#243b55', angle: 135 },
    { name: 'Peach', from: '#ffecd2', to: '#fcb69f', angle: 135 },
    { name: 'Berry', from: '#8e2de2', to: '#4a00e0', angle: 135 },
    { name: 'Midnight', from: '#0f0c29', to: '#302b63', angle: 135 },
    { name: 'Cotton', from: '#a18cd1', to: '#fbc2eb', angle: 135 },
    { name: 'Gold', from: '#f6d365', to: '#fda085', angle: 135 },
    { name: 'Mint', from: '#d4fc79', to: '#96e6a1', angle: 135 },
    { name: 'Rose', from: '#ff9a9e', to: '#fecfef', angle: 135 },
];

/**
 * Compute centered, aspect-fit PNG placement inside a target JPG canvas with uniform padding.
 */
function computeContainedImageRect(canvasW, canvasH, paddingPx, srcW, srcH) {
    const width = Math.max(1, Number(canvasW) || 1);
    const height = Math.max(1, Number(canvasH) || 1);
    const maxPadding = Math.max(0, Math.floor(Math.min(width, height) / 2) - 1);
    const padding = Math.max(0, Math.min(maxPadding, Math.round(Number(paddingPx) || 0)));
    const innerW = Math.max(1, width - padding * 2);
    const innerH = Math.max(1, height - padding * 2);
    const natW = Math.max(1, Number(srcW) || width);
    const natH = Math.max(1, Number(srcH) || height);
    // Never upscale the PNG above its actual pixel dimensions (scale <= 1)
    const scale = Math.min(1, innerW / natW, innerH / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    return {
        width,
        height,
        padding,
        drawW,
        drawH,
        x: (width - drawW) / 2,
        y: (height - drawH) / 2,
    };
}

export default function ImageDetail({
    image,
    relatedImages = [],
    totalRelatedImages = 0,
    collections = [],
    partOfCollectionsSliderConfig = {},
}) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const siteName = websiteInfo?.websiteName || websiteInfo?.siteName || 'Png101';

    const originalWidth = image.width || 800;
    const originalHeight = image.height || 600;
    const imageSrc = image.path || image.filePath;
    const imageTitle = image.name || image.title || 'TRANSPARENT PNG IMAGE';

    const [downloadWidth, setDownloadWidth] = useState(originalWidth);
    const [downloadHeight, setDownloadHeight] = useState(originalHeight);
    const [downloadFormat, setDownloadFormat] = useState('png');
    const [naturalDims, setNaturalDims] = useState({ width: originalWidth, height: originalHeight });

    // JPG dimensions & padding setup modal state
    const [jpgConfigOpen, setJpgConfigOpen] = useState(false);
    const [jpgCanvasWidth, setJpgCanvasWidth] = useState(originalWidth);
    const [jpgCanvasHeight, setJpgCanvasHeight] = useState(originalHeight);
    const [jpgPadding, setJpgPadding] = useState(0);
    const [jpgLockAspect, setJpgLockAspect] = useState(false);
    const jpgExportConfigRef = useRef({
        width: originalWidth,
        height: originalHeight,
        padding: 0,
    });

    const globalColorDefaults = useGlobalColorPickerDefaults();
    const isSmallViewport = useSmallColorPickerViewport();

    // Interactive background preview state
    const [bgMode, setBgMode] = useState('checker');
    const [customBgColor, setCustomBgColor] = useState(globalColorDefaults.defaultColor);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const pickerRef = useRef(null);
    const customPopupRef = useRef(null);

    // Gradient builder state
    const [gradientFrom, setGradientFrom] = useState(globalColorDefaults.defaultGradientFrom);
    const [gradientTo, setGradientTo] = useState(globalColorDefaults.defaultGradientTo);
    const [gradientType, setGradientType] = useState(globalColorDefaults.defaultGradientType);
    const [gradientAngle, setGradientAngle] = useState(globalColorDefaults.defaultGradientAngle);
    const [activeGradientStop, setActiveGradientStop] = useState('from');
    const [showGradientPicker, setShowGradientPicker] = useState(false);
    const gradientPickerRef = useRef(null);
    const gradientPopupRef = useRef(null);

    // Eyedropper state ('custom' | 'gradient' | null)
    const [eyedropperTarget, setEyedropperTarget] = useState(null);
    const eyedropperTargetRef = useRef(null);
    eyedropperTargetRef.current = eyedropperTarget;

    // Draggable popover offset state
    const [customPickerOffset, setCustomPickerOffset] = useState({ x: 0, y: 0 });
    const [gradientPickerOffset, setGradientPickerOffset] = useState({ x: 0, y: 0 });
    const dragInfoRef = useRef({
        active: null,
        startX: 0,
        startY: 0,
        initialOffsetX: 0,
        initialOffsetY: 0,
    });

    const handleStartDrag = (e, type) => {
        const target = e.target;
        if (target.closest('input, button, select, .react-colorful, [data-no-drag]')) return;
        if (e.cancelable) e.preventDefault();
        const currentOffset = type === 'custom' ? customPickerOffset : gradientPickerOffset;
        dragInfoRef.current = {
            active: type,
            startX: e.clientX,
            startY: e.clientY,
            initialOffsetX: currentOffset.x,
            initialOffsetY: currentOffset.y,
        };
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            const { active, startX, startY, initialOffsetX, initialOffsetY } = dragInfoRef.current;
            if (!active) return;
            if (e.cancelable) e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (active === 'custom') {
                setCustomPickerOffset({ x: initialOffsetX + dx, y: initialOffsetY + dy });
            } else if (active === 'gradient') {
                setGradientPickerOffset({ x: initialOffsetX + dx, y: initialOffsetY + dy });
            }
        };
        const handlePointerEnd = () => {
            dragInfoRef.current.active = null;
        };
        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerEnd);
        window.addEventListener('pointercancel', handlePointerEnd);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerEnd);
            window.removeEventListener('pointercancel', handlePointerEnd);
        };
    }, []);

    // Lock horizontal & vertical page scrolling on touch screens while a color picker is open
    useEffect(() => {
        if (!showColorPicker && !showGradientPicker) return undefined;

        const isTouchDevice =
            window.matchMedia('(pointer: coarse)').matches ||
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0;
        if (!isTouchDevice) return undefined;

        const html = document.documentElement;
        const body = document.body;
        const prevStyles = {
            htmlOverflow: html.style.overflow,
            htmlOverflowX: html.style.overflowX,
            htmlOverflowY: html.style.overflowY,
            htmlTouchAction: html.style.touchAction,
            htmlOverscrollBehavior: html.style.overscrollBehavior,
            bodyOverflow: body.style.overflow,
            bodyOverflowX: body.style.overflowX,
            bodyOverflowY: body.style.overflowY,
            bodyTouchAction: body.style.touchAction,
            bodyOverscrollBehavior: body.style.overscrollBehavior,
        };

        html.style.overflow = 'hidden';
        html.style.overflowX = 'hidden';
        html.style.overflowY = 'hidden';
        html.style.touchAction = 'none';
        html.style.overscrollBehavior = 'none';

        body.style.overflow = 'hidden';
        body.style.overflowX = 'hidden';
        body.style.overflowY = 'hidden';
        body.style.touchAction = 'none';
        body.style.overscrollBehavior = 'none';

        const preventTouchScroll = (e) => {
            if (e.target instanceof Element && e.target.closest('input[type="range"]')) {
                return;
            }
            if (e.cancelable) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventTouchScroll, { passive: false });

        return () => {
            document.removeEventListener('touchmove', preventTouchScroll);
            html.style.overflow = prevStyles.htmlOverflow;
            html.style.overflowX = prevStyles.htmlOverflowX;
            html.style.overflowY = prevStyles.htmlOverflowY;
            html.style.touchAction = prevStyles.htmlTouchAction;
            html.style.overscrollBehavior = prevStyles.htmlOverscrollBehavior;
            body.style.overflow = prevStyles.bodyOverflow;
            body.style.overflowX = prevStyles.bodyOverflowX;
            body.style.overflowY = prevStyles.bodyOverflowY;
            body.style.touchAction = prevStyles.bodyTouchAction;
            body.style.overscrollBehavior = prevStyles.bodyOverscrollBehavior;
        };
    }, [showColorPicker, showGradientPicker]);

    useEffect(() => {
        if (!showColorPicker && !showGradientPicker) {
            setEyedropperTarget(null);
        }
    }, [showColorPicker, showGradientPicker]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (eyedropperTargetRef.current) return;
            if (e.target?.closest?.('[data-testid="editor-eyedropper-overlay"]')) return;
            const inCustom =
                (pickerRef.current && pickerRef.current.contains(e.target)) ||
                (customPopupRef.current && customPopupRef.current.contains(e.target));
            if (!inCustom) {
                setShowColorPicker(false);
            }
            const inGradient =
                (gradientPickerRef.current && gradientPickerRef.current.contains(e.target)) ||
                (gradientPopupRef.current && gradientPopupRef.current.contains(e.target));
            if (!inGradient) {
                setShowGradientPicker(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, []);

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Download countdown + captcha gate state
    const [gateOpen, setGateOpen] = useState(false);
    const [gateLoading, setGateLoading] = useState(false);
    const [gateVerifying, setGateVerifying] = useState(false);
    const [gateFeedback, setGateFeedback] = useState('idle'); // 'idle' | 'success' | 'error'
    const [gateError, setGateError] = useState('');
    const [countdown, setCountdown] = useState(3);
    const [initialCountdown, setInitialCountdown] = useState(3);
    const [captchaConfig, setCaptchaConfig] = useState(null);
    const [captchaData, setCaptchaData] = useState({ token: '', challengeToken: '' });
    const [captchaResetKey, setCaptchaResetKey] = useState(0);
    const verifyingRef = useRef(false);
    const feedbackTimerRef = useRef(null);
    const gateRequestIdRef = useRef(0);

    useEffect(() => {
        return () => {
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!gateOpen || gateLoading || countdown <= 0) return undefined;
        const timer = setInterval(() => {
            setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [gateOpen, gateLoading, countdown]);

    const handleResizeApply = (newWidth, newHeight) => {
        setDownloadWidth(newWidth);
        setDownloadHeight(newHeight);
    };

    const getGradientCss = () => {
        if (gradientType === 'radial') {
            return `radial-gradient(circle, ${gradientFrom}, ${gradientTo})`;
        }
        return `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;
    };

    const applyCanvasBackground = (ctx, width, height) => {
        if (bgMode === 'dark') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'custom') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, width, height);
        } else if (bgMode === 'gradient') {
            let gradient;
            if (gradientType === 'radial') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.max(width, height) / 2;
                gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            } else {
                const angleRad = (gradientAngle - 90) * (Math.PI / 180);
                const halfW = width / 2;
                const halfH = height / 2;
                const x0 = halfW - Math.cos(angleRad) * halfW;
                const y0 = halfH - Math.sin(angleRad) * halfH;
                const x1 = halfW + Math.cos(angleRad) * halfW;
                const y1 = halfH + Math.sin(angleRad) * halfH;
                gradient = ctx.createLinearGradient(x0, y0, x1, y1);
            }
            gradient.addColorStop(0, gradientFrom);
            gradient.addColorStop(1, gradientTo);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
    };

    const getJpgBackground = () => {
        switch (bgMode) {
            case 'dark':
                return { color: '#1e293b', label: 'Dark BG', shortLabel: 'Dark', isGradient: false };
            case 'black':
                return { color: '#000000', label: 'Black BG', shortLabel: 'Black', isGradient: false };
            case 'custom':
                return { color: customBgColor, label: 'Custom BG', shortLabel: 'Custom', isGradient: false };
            case 'gradient':
                return { color: gradientFrom, label: 'Gradient BG', shortLabel: 'Gradient', isGradient: true };
            case 'white':
            case 'checker':
            default:
                return { color: '#ffffff', label: 'White BG', shortLabel: 'White', isGradient: false };
        }
    };

    const jpgBgInfo = getJpgBackground();

    const executeDownload = async (overrideCfg = null) => {
        const isJpeg = downloadFormat === 'jpeg';
        const effectiveW = isJpeg
            ? Math.max(1, Number(overrideCfg?.width ?? jpgExportConfigRef.current?.width ?? downloadWidth) || originalWidth)
            : downloadWidth;
        const effectiveH = isJpeg
            ? Math.max(1, Number(overrideCfg?.height ?? jpgExportConfigRef.current?.height ?? downloadHeight) || originalHeight)
            : downloadHeight;
        const effectivePadding = isJpeg
            ? Math.max(0, Number(overrideCfg?.padding ?? jpgExportConfigRef.current?.padding ?? 0) || 0)
            : 0;

        const ext = isJpeg ? 'jpg' : downloadFormat;
        const formatLabel = downloadFormat.toUpperCase();
        toast.success(`Preparing ${formatLabel} (${effectiveW}x${effectiveH})...`);

        const isCustomSize = effectiveW !== originalWidth || effectiveH !== originalHeight || effectivePadding > 0;
        try {
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageId: image.id,
                    isCustomSize,
                    resolution: `${effectiveW}x${effectiveH}`,
                }),
            });
        } catch (error) {
            console.error('Failed to track download:', error);
        }

        const safeName = imageTitle ? imageTitle.trim().replace(/\s+/g, '-') : 'image';
        const siteTag = getSiteDomainTag(websiteInfo);
        const filename = `${safeName}-${effectiveW}x${effectiveH}-${siteTag}.${ext}`;

        if (downloadFormat === 'png' && effectiveW === originalWidth && effectiveH === originalHeight) {
            const a = document.createElement('a');
            const separator = imageSrc.includes('?') ? '&' : '?';
            a.href = `${imageSrc}${separator}download=1&name=${encodeURIComponent(filename)}`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = effectiveW;
        canvas.height = effectiveH;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;

        img.onload = () => {
            if (!ctx) return;
            if (isJpeg) {
                applyCanvasBackground(ctx, effectiveW, effectiveH);
                const rect = computeContainedImageRect(
                    effectiveW,
                    effectiveH,
                    effectivePadding,
                    img.naturalWidth || naturalDims.width,
                    img.naturalHeight || naturalDims.height
                );
                ctx.drawImage(img, rect.x, rect.y, rect.drawW, rect.drawH);
            } else {
                ctx.clearRect(0, 0, effectiveW, effectiveH);
                ctx.drawImage(img, 0, 0, effectiveW, effectiveH);
            }

            const mime = isJpeg
                ? 'image/jpeg'
                : downloadFormat === 'webp'
                ? 'image/webp'
                : 'image/png';
            const quality = isJpeg || downloadFormat === 'webp' ? 0.95 : undefined;

            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }, mime, quality);
        };
    };

    const proceedToDownloadGate = async (overrideCfg = null) => {
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
        }
        const requestId = ++gateRequestIdRef.current;
        verifyingRef.current = false;
        setGateOpen(true);
        setGateLoading(true);
        setGateVerifying(false);
        setGateFeedback('idle');
        setGateError('');
        setCaptchaData({ token: '', challengeToken: '' });

        try {
            const res = await fetch(`/api/captcha/config?context=download&_t=${Date.now()}`, {
                cache: 'no-store',
            });
            const cfg = await res.json();
            if (requestId !== gateRequestIdRef.current) return;

            const seconds = typeof cfg?.countdownSeconds === 'number' ? Math.max(0, cfg.countdownSeconds) : 3;
            const provider = cfg?.provider || 'none';

            if (seconds === 0 && provider === 'none') {
                setGateOpen(false);
                setGateLoading(false);
                await executeDownload(overrideCfg);
                return;
            }

            setCaptchaConfig(cfg);
            setCaptchaData({
                token: '',
                challengeToken: cfg?.challenge?.token || '',
            });
            setInitialCountdown(seconds);
            setCountdown(seconds);
        } catch {
            if (requestId !== gateRequestIdRef.current) return;
            // Safe fallback to 3-second countdown even if offline/transient error
            setCaptchaConfig({ context: 'download', provider: 'none', countdownSeconds: 3 });
            setInitialCountdown(3);
            setCountdown(3);
        } finally {
            if (requestId === gateRequestIdRef.current) {
                setGateLoading(false);
            }
        }
    };

    const handleDownload = async () => {
        if (downloadFormat === 'jpeg') {
            const initW = Math.max(32, Math.min(8000, Math.round(Number(downloadWidth) || originalWidth)));
            const initH = Math.max(32, Math.min(8000, Math.round(Number(downloadHeight) || originalHeight)));
            const maxPad = Math.max(0, Math.floor(Math.min(initW, initH) / 2) - 1);
            setJpgCanvasWidth(initW);
            setJpgCanvasHeight(initH);
            setJpgPadding((prev) => Math.max(0, Math.min(maxPad, Math.round(Number(prev) || 0))));
            setJpgConfigOpen(true);
            return;
        }
        await proceedToDownloadGate();
    };

    const handleConfirmJpgConfig = async (e) => {
        e?.preventDefault?.();
        const targetW = Math.max(32, Math.min(8000, Math.round(Number(jpgCanvasWidth) || originalWidth)));
        const targetH = Math.max(32, Math.min(8000, Math.round(Number(jpgCanvasHeight) || originalHeight)));
        const maxPad = Math.max(0, Math.floor(Math.min(targetW, targetH) / 2) - 1);
        const targetPad = Math.max(0, Math.min(maxPad, Math.round(Number(jpgPadding) || 0)));

        const nextCfg = { width: targetW, height: targetH, padding: targetPad };
        jpgExportConfigRef.current = nextCfg;
        setDownloadWidth(targetW);
        setDownloadHeight(targetH);
        setJpgConfigOpen(false);
        await proceedToDownloadGate(nextCfg);
    };

    const handleConfirmGateDownload = async (e) => {
        e.preventDefault();
        if (countdown > 0 || gateLoading || gateVerifying || verifyingRef.current || gateFeedback === 'success') {
            return;
        }

        const provider = captchaConfig?.provider || 'none';
        if (provider !== 'none') {
            if (!captchaData.token) {
                setGateError('Please complete the captcha verification to start your download.');
                return;
            }

            verifyingRef.current = true;
            setGateVerifying(true);
            setGateError('');
            if (feedbackTimerRef.current) {
                clearTimeout(feedbackTimerRef.current);
                feedbackTimerRef.current = null;
            }

            const activeChallengeToken = captchaData.challengeToken || captchaConfig?.challenge?.token || '';

            try {
                const res = await fetch('/api/captcha/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageId: image.id,
                        captchaToken: captchaData.token,
                        captchaChallenge: activeChallengeToken,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data?.success) {
                    setGateError(data?.error || data?.message || 'Verification failed. Please try again.');
                    setGateFeedback('error');
                    if (data?.freshChallenge) {
                        setCaptchaConfig((prev) => ({ ...(prev || {}), challenge: data.freshChallenge }));
                        setCaptchaData({ token: '', challengeToken: data.freshChallenge.token });
                    } else {
                        setCaptchaData((prev) => ({ ...prev, token: '' }));
                    }
                    setCaptchaResetKey((k) => k + 1);
                    feedbackTimerRef.current = setTimeout(() => {
                        setGateFeedback('idle');
                    }, 900);
                    return;
                }

                // Right answer: play fluid thumbs-up feedback, then start download cleanly
                setGateFeedback('success');
                await new Promise((resolve) => {
                    feedbackTimerRef.current = setTimeout(resolve, 680);
                });
            } catch {
                setGateError('Verification network error. Please try again.');
                setGateFeedback('error');
                feedbackTimerRef.current = setTimeout(() => {
                    setGateFeedback('idle');
                }, 900);
                return;
            } finally {
                verifyingRef.current = false;
                setGateVerifying(false);
            }
        }

        setGateOpen(false);
        setGateFeedback('idle');
        await executeDownload();
    };

    const displaySrc = isClient ? imageSrc : (image.previewPath || imageSrc);

    const getPreviewBgStyle = () => {
        switch (bgMode) {
            case 'white':
                return { backgroundColor: '#ffffff' };
            case 'dark':
                return { backgroundColor: '#1e293b' };
            case 'black':
                return { backgroundColor: '#000000' };
            case 'custom':
                return { backgroundColor: customBgColor };
            case 'gradient':
                return { backgroundImage: getGradientCss() };
            case 'checker':
            default:
                return {
                    backgroundImage: `
                        linear-gradient(45deg, #334155 25%, transparent 25%),
                        linear-gradient(-45deg, #334155 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #334155 75%),
                        linear-gradient(-45deg, transparent 75%, #334155 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                };
        }
    };

    const is4K = (image.width && image.width >= 3840) || (image.height && image.height >= 2160);
    const isHD = (image.width && image.width >= 1920) || (image.height && image.height >= 1080);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30">
            <Head title={`${imageTitle} - Free Transparent PNG | ${siteName}`} />
            <Header />

            <main className="w-full px-4 sm:px-10 md:px-16 py-6 sm:py-8">
                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-foreground/50 flex items-center gap-1.5 flex-wrap">
                    <Link href="/" className="hover:text-primary-glow transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/latest" className="hover:text-primary-glow transition-colors">Images</Link>
                    <span>/</span>
                    <span className="text-foreground/80 font-medium truncate max-w-xs">{imageTitle}</span>
                </nav>

                <div className="text-center mb-6">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase">
                        {imageTitle}
                    </h1>

                    {/* Spec Badges */}
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap text-xs">
                        {is4K ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                                4K Ultra HD
                            </span>
                        ) : isHD ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold uppercase tracking-wider">
                                Full HD
                            </span>
                        ) : (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold uppercase tracking-wider">
                                High Res
                            </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-primary-glow/15 text-primary-glow border border-primary-glow/30 font-medium">
                            Transparent PNG
                        </span>
                        {image.width && image.height && (
                            <span className="px-2.5 py-1 rounded-full bg-card-bg text-foreground/70 border border-card-border font-mono">
                                {image.width} &times; {image.height} px
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 justify-between items-start">
                    {/* Left Column */}
                    <div className="flex-1 w-full flex flex-col gap-6">
                        <div className="bg-card-bg border border-slate-300/40 rounded-2xl p-6 sm:p-10 flex items-center justify-center relative overflow-hidden shadow-2xl sm:min-h-[500px]">
                            {bgMode === 'checker' && (
                                <div className="absolute inset-0 bg-white z-0 pointer-events-none" />
                            )}

                            {image.luminance === 'dark' && image.contrastBgDark !== 'none' && (
                                <div
                                    className="contrast-stage-dark absolute inset-0 z-0 pointer-events-none"
                                    style={image.contrastBgDark ? { backgroundColor: image.contrastBgDark } : undefined}
                                />
                            )}

                            {image.luminance === 'light' && image.contrastBgLight !== 'none' && (
                                <div
                                    className="absolute inset-0 z-0 pointer-events-none opacity-50"
                                    style={{
                                        backgroundColor: image.contrastBgLight || '#cbd5e1',
                                        opacity: 0.5,
                                    }}
                                />
                            )}

                            <div
                                className={`absolute inset-0 z-0 transition-colors duration-200 ${bgMode === 'checker' ? 'opacity-20' : 'opacity-100'}`}
                                style={getPreviewBgStyle()}
                            />

                            {(bgMode === 'checker' || bgMode === 'dark' || bgMode === 'black') && (
                                <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full transform scale-75 z-0" />
                            )}

                            {displaySrc ? (
                                <img
                                    src={displaySrc}
                                    alt={image.altText || imageTitle}
                                    draggable={false}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="relative z-10 max-w-full max-h-[360px] sm:max-h-[600px] object-contain select-none"
                                />
                            ) : (
                                <div className="relative z-10 w-full h-[220px] sm:h-[400px] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Interactive Background Preview Switcher */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-card-bg border border-card-border flex-wrap gap-3">
                            <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary-glow">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
                                </svg>
                                Test Background:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap" data-testid="test-bg-options">
                                {[
                                    { key: 'checker', label: 'None', dotClass: 'border-slate-400', isCheckerSwatch: true },
                                    { key: 'white', label: 'White', dotClass: 'border-slate-300 bg-white' },
                                    { key: 'black', label: 'Black', dotClass: 'border-slate-700 dark:border-white/60 bg-black' },
                                ].map((mode) => {
                                    const active = bgMode === mode.key;
                                    return (
                                        <button
                                            key={mode.key}
                                            type="button"
                                            data-testid={`test-bg-${mode.key}`}
                                            aria-label={mode.label}
                                            title={mode.label}
                                            onClick={() => setBgMode(mode.key)}
                                            className={`w-8 h-8 sm:w-auto sm:h-auto p-0 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center sm:gap-1.5 ${
                                                active
                                                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-card-bg sm:ring-0 sm:ring-offset-0 sm:bg-blue-600 sm:text-white shadow-sm'
                                                    : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                            }`}
                                        >
                                            <span
                                                className={`w-6 h-6 sm:w-3 sm:h-3 rounded-full border ${mode.dotClass} inline-block shrink-0`}
                                                style={
                                                    mode.isCheckerSwatch
                                                        ? {
                                                              backgroundColor: '#f1f5f9',
                                                              backgroundImage:
                                                                  'linear-gradient(45deg, #94a3b8 25%, transparent 25%), linear-gradient(-45deg, #94a3b8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #94a3b8 75%), linear-gradient(-45deg, transparent 75%, #94a3b8 75%)',
                                                              backgroundSize: '8px 8px',
                                                              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                                          }
                                                        : undefined
                                                }
                                            />
                                            <span className="hidden sm:inline">{mode.label}</span>
                                        </button>
                                    );
                                })}

                                {/* Custom Color Picker */}
                                <div className="relative flex items-center" ref={pickerRef}>
                                    <button
                                        type="button"
                                        data-testid="test-bg-custom"
                                        onClick={() => {
                                            setBgMode('custom');
                                            setShowGradientPicker(false);
                                            setShowColorPicker((prev) => !prev);
                                        }}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                            bgMode === 'custom'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-white/60 inline-block shadow-inner"
                                            style={{ backgroundColor: customBgColor }}
                                        />
                                        <span>Custom</span>
                                    </button>

                                    {showColorPicker && (() => {
                                        const isCustomModified =
                                            parseHexOrRgbColor(customBgColor, '') !== globalColorDefaults.defaultColor;
                                        const popup = (
                                            <div
                                                ref={customPopupRef}
                                                role="dialog"
                                                aria-label="Custom background color picker"
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    handleStartDrag(e, 'custom');
                                                }}
                                                style={{
                                                    transform: isSmallViewport
                                                        ? `translate(calc(-50% + ${customPickerOffset.x}px), calc(-50% + ${customPickerOffset.y}px))`
                                                        : `translate(${customPickerOffset.x}px, ${customPickerOffset.y}px)`,
                                                }}
                                                className={`${
                                                    isSmallViewport
                                                        ? 'fixed left-1/2 top-1/2 z-[120]'
                                                        : 'absolute right-0 bottom-full mb-3 z-50'
                                                } p-3.5 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col items-center gap-3 cursor-move select-none touch-none max-w-[calc(100vw-1.5rem)] ${
                                                    eyedropperTarget === 'custom' ? 'opacity-0 pointer-events-none' : ''
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full pb-1 border-b border-card-border/50 text-[11px] font-bold text-foreground/50">
                                                    <div className="flex items-center gap-1.5 pointer-events-none">
                                                        <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
                                                        <span>Custom Color</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {isCustomModified && (
                                                            <button
                                                                type="button"
                                                                data-testid="custom-color-reset"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCustomBgColor(globalColorDefaults.defaultColor);
                                                                    setBgMode('custom');
                                                                }}
                                                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/75 hover:text-foreground hover:bg-foreground/15 cursor-pointer"
                                                                title={`Reset color to ${globalColorDefaults.defaultColor}`}
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                <span>Reset</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowColorPicker(false);
                                                            }}
                                                            className="p-0.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-card-header-bg transition-colors cursor-pointer"
                                                            aria-label="Close color picker"
                                                            title="Close"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="cursor-default touch-none [&_.react-colorful]:touch-none" data-no-drag>
                                                    <HexColorPicker
                                                        color={customBgColor}
                                                        onChange={(newColor) => {
                                                            setCustomBgColor(newColor);
                                                            setBgMode('custom');
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2 w-full cursor-default" data-no-drag>
                                                    <span
                                                        className="w-5 h-5 rounded-md border border-card-border flex-shrink-0"
                                                        style={{ backgroundColor: customBgColor }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={customBgColor.toUpperCase()}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val.startsWith('#') || val.length <= 7) {
                                                                setCustomBgColor(val);
                                                                setBgMode('custom');
                                                            }
                                                        }}
                                                        className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2 py-1 rounded font-mono uppercase focus:outline-none focus:border-blue-500 text-center cursor-text"
                                                    />
                                                    <button
                                                        type="button"
                                                        data-testid="image-custom-eyedropper"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEyedropperTarget('custom');
                                                        }}
                                                        className="p-1.5 rounded-md border border-input-border bg-card-header-bg hover:bg-blue-500/15 hover:border-blue-500/40 text-foreground/75 hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                                                        aria-label="Pick color from image or screen"
                                                        title="Eyedropper"
                                                    >
                                                        <Pipette className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                        if (isSmallViewport && typeof document !== 'undefined') {
                                            return createPortal(popup, document.body);
                                        }
                                        return popup;
                                    })()}
                                </div>

                                {/* Gradient Picker */}
                                <div className="relative flex items-center" ref={gradientPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBgMode('gradient');
                                            setShowColorPicker(false);
                                            setShowGradientPicker((prev) => !prev);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                            bgMode === 'gradient'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full border border-white/60 inline-block shadow-inner"
                                            style={{ background: getGradientCss() }}
                                        />
                                        <span>Gradient</span>
                                    </button>

                                    {showGradientPicker && (() => {
                                        const isGradientModified =
                                            parseHexOrRgbColor(gradientFrom, '') !== globalColorDefaults.defaultGradientFrom ||
                                            parseHexOrRgbColor(gradientTo, '') !== globalColorDefaults.defaultGradientTo ||
                                            gradientType !== globalColorDefaults.defaultGradientType ||
                                            Number(gradientAngle) !== Number(globalColorDefaults.defaultGradientAngle);
                                        const activeStopHex = activeGradientStop === 'from' ? gradientFrom : gradientTo;
                                        const gradientPopup = (
                                            <div
                                                ref={gradientPopupRef}
                                                role="dialog"
                                                aria-label="Gradient builder color picker"
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    handleStartDrag(e, 'gradient');
                                                }}
                                                style={{
                                                    transform: isSmallViewport
                                                        ? `translate(calc(-50% + ${gradientPickerOffset.x}px), calc(-50% + ${gradientPickerOffset.y}px))`
                                                        : `translate(${gradientPickerOffset.x}px, ${gradientPickerOffset.y}px)`,
                                                }}
                                                className={`${
                                                    isSmallViewport
                                                        ? 'fixed left-1/2 top-1/2 z-[120]'
                                                        : 'absolute right-0 bottom-full mb-3 z-50'
                                                } p-4 bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col gap-3 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto cursor-move select-none touch-none ${
                                                    eyedropperTarget === 'gradient' ? 'opacity-0 pointer-events-none' : ''
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full pb-1 border-b border-card-border/50 text-[11px] font-bold text-foreground/50">
                                                    <div className="flex items-center gap-1.5 pointer-events-none">
                                                        <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
                                                        <span>Gradient Builder</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {isGradientModified && (
                                                            <button
                                                                type="button"
                                                                data-testid="gradient-color-reset"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setGradientFrom(globalColorDefaults.defaultGradientFrom);
                                                                    setGradientTo(globalColorDefaults.defaultGradientTo);
                                                                    setGradientType(globalColorDefaults.defaultGradientType);
                                                                    setGradientAngle(globalColorDefaults.defaultGradientAngle);
                                                                    setBgMode('gradient');
                                                                }}
                                                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/75 hover:text-foreground hover:bg-foreground/15 cursor-pointer"
                                                                title="Reset gradient to default"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                <span>Reset</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowGradientPicker(false);
                                                            }}
                                                            className="p-0.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-card-header-bg transition-colors cursor-pointer"
                                                            aria-label="Close gradient builder"
                                                            title="Close"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div
                                                    className="w-full h-8 rounded-xl border border-card-border shadow-inner shrink-0 cursor-default"
                                                    style={{ background: getGradientCss() }}
                                                />

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveGradientStop('from')}
                                                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                                            activeGradientStop === 'from'
                                                                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                                                : 'border-card-border bg-card-header-bg text-foreground/60 hover:text-foreground'
                                                        }`}
                                                    >
                                                        <span className="w-3.5 h-3.5 rounded-full border border-card-border inline-block" style={{ backgroundColor: gradientFrom }} />
                                                        <span>Color 1</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveGradientStop('to')}
                                                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                                            activeGradientStop === 'to'
                                                                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                                                : 'border-card-border bg-card-header-bg text-foreground/60 hover:text-foreground'
                                                        }`}
                                                    >
                                                        <span className="w-3.5 h-3.5 rounded-full border border-card-border inline-block" style={{ backgroundColor: gradientTo }} />
                                                        <span>Color 2</span>
                                                    </button>
                                                </div>

                                                <div className="flex justify-center touch-none [&_.react-colorful]:touch-none" data-no-drag>
                                                    <HexColorPicker
                                                        color={activeStopHex}
                                                        onChange={(newColor) => {
                                                            if (activeGradientStop === 'from') setGradientFrom(newColor);
                                                            else setGradientTo(newColor);
                                                            setBgMode('gradient');
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2 w-full cursor-default" data-no-drag>
                                                    <span
                                                        className="w-5 h-5 rounded-md border border-card-border flex-shrink-0"
                                                        style={{ backgroundColor: activeStopHex }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={String(activeStopHex || '').toUpperCase()}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val.startsWith('#') || val.length <= 7) {
                                                                if (activeGradientStop === 'from') setGradientFrom(val);
                                                                else setGradientTo(val);
                                                                setBgMode('gradient');
                                                            }
                                                        }}
                                                        aria-label={activeGradientStop === 'from' ? 'Color 1 hex value' : 'Color 2 hex value'}
                                                        className="w-full bg-input-bg border border-input-border text-foreground text-xs px-2 py-1 rounded font-mono uppercase focus:outline-none focus:border-blue-500 text-center cursor-text"
                                                    />
                                                    <button
                                                        type="button"
                                                        data-testid="image-gradient-eyedropper"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEyedropperTarget('gradient');
                                                        }}
                                                        className="p-1.5 rounded-md border border-input-border bg-card-header-bg hover:bg-blue-500/15 hover:border-blue-500/40 text-foreground/75 hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                                                        aria-label={`Pick ${activeGradientStop === 'from' ? 'Color 1' : 'Color 2'} from image or screen`}
                                                        title="Eyedropper"
                                                    >
                                                        <Pipette className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-foreground/70">Type:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGradientType('linear');
                                                            setBgMode('gradient');
                                                        }}
                                                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                                                            gradientType === 'linear' ? 'bg-blue-600 text-white' : 'bg-card-header-bg text-foreground/60'
                                                        }`}
                                                    >
                                                        Linear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGradientType('radial');
                                                            setBgMode('gradient');
                                                        }}
                                                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                                                            gradientType === 'radial' ? 'bg-blue-600 text-white' : 'bg-card-header-bg text-foreground/60'
                                                        }`}
                                                    >
                                                        Radial
                                                    </button>
                                                </div>
                                            </div>

                                            {gradientType === 'linear' && (
                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="font-semibold text-foreground/70">Angle:</span>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={360}
                                                        value={gradientAngle}
                                                        onChange={(e) => {
                                                            setGradientAngle(Number(e.target.value));
                                                            setBgMode('gradient');
                                                        }}
                                                        className="flex-1 accent-blue-500 cursor-pointer touch-none"
                                                    />
                                                    <span className="font-mono text-foreground/60 w-8 text-right">{gradientAngle}&deg;</span>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-card-border/60">
                                                <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block mb-1.5">
                                                    Linear Presets (12):
                                                </span>
                                                <div className="grid grid-cols-6 gap-1.5">
                                                    {GRADIENT_PRESETS.map((preset) => (
                                                        <button
                                                            key={preset.name}
                                                            type="button"
                                                            onClick={() => {
                                                                setGradientFrom(preset.from);
                                                                setGradientTo(preset.to);
                                                                setGradientType('linear');
                                                                setGradientAngle(preset.angle);
                                                                setBgMode('gradient');
                                                            }}
                                                            className="w-full h-6 rounded-md border border-card-border hover:scale-110 transition-transform cursor-pointer shadow-sm"
                                                            style={{ background: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})` }}
                                                            title={preset.name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            </div>
                                        );
                                        if (isSmallViewport && typeof document !== 'undefined') {
                                            return createPortal(gradientPopup, document.body);
                                        }
                                        return gradientPopup;
                                    })()}
                                </div>
                            </div>
                        </div>

                        <EditorEyedropperOverlay
                            open={Boolean(eyedropperTarget)}
                            initialColor={
                                eyedropperTarget === 'gradient'
                                    ? activeGradientStop === 'from'
                                        ? gradientFrom
                                        : gradientTo
                                    : customBgColor
                            }
                            onPick={(hex) => {
                                if (eyedropperTarget === 'custom') {
                                    setCustomBgColor(hex);
                                    setBgMode('custom');
                                } else if (eyedropperTarget === 'gradient') {
                                    if (activeGradientStop === 'from') setGradientFrom(hex);
                                    else setGradientTo(hex);
                                    setBgMode('gradient');
                                }
                                setEyedropperTarget(null);
                            }}
                            onCancel={() => setEyedropperTarget(null)}
                        />

                        {/* Download Format & Button */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-card-bg border border-card-border flex-wrap gap-2">
                                <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                    Download Format:
                                </span>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" data-testid="download-format-options">
                                    <button
                                        type="button"
                                        data-testid="download-format-png"
                                        onClick={() => setDownloadFormat('png')}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            downloadFormat === 'png'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span className="sm:hidden">PNG</span>
                                        <span className="hidden sm:inline">PNG (Lossless)</span>
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="download-format-webp"
                                        onClick={() => setDownloadFormat('webp')}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            downloadFormat === 'webp'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span className="sm:hidden">WebP</span>
                                        <span className="hidden sm:inline">WebP (Fast)</span>
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="download-format-jpeg"
                                        onClick={() => setDownloadFormat('jpeg')}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            downloadFormat === 'jpeg'
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                : 'bg-card-header-bg text-foreground/60 hover:text-foreground hover:bg-blue-200 dark:hover:bg-blue-500/30'
                                        }`}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full border border-slate-400 inline-block shrink-0"
                                            style={{ background: jpgBgInfo.isGradient ? getGradientCss() : jpgBgInfo.color }}
                                        />
                                        <span className="sm:hidden">JPG ({jpgBgInfo.shortLabel})</span>
                                        <span className="hidden sm:inline">JPG ({jpgBgInfo.label})</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                data-testid="main-download-button"
                                onClick={handleDownload}
                                className="group relative overflow-hidden w-full max-w-full min-w-0 px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 animate-btn-shimmer active:scale-[0.99] text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.65)] transition-all duration-300 text-center tracking-wide sm:tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                            >
                                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent shimmer-sweep" />
                                </div>

                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 shrink-0 transform group-hover:translate-y-0.5 transition-transform">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                <span className="relative z-10 min-w-0 truncate text-[12px] min-[375px]:text-[13px] sm:text-base">
                                    Download {downloadFormat.toUpperCase()} ({downloadWidth}x{downloadHeight})
                                </span>
                            </button>

                            {props?.bonusToolsNav?.enableCatalogHandoff && (
                                <Link
                                    href={`/tools/image-resizer?asset=${encodeURIComponent(imageSrc)}&name=${encodeURIComponent(imageTitle)}`}
                                    className="w-full py-2.5 px-4 rounded-xl bg-card-bg border border-card-border hover:border-blue-500/45 text-xs font-bold text-foreground/80 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Open in Resize Image &rarr;</span>
                                </Link>
                            )}
                            {props?.editorNav?.showEditInStudioButton && (
                                <Link
                                    href={`/image-editor?asset=${encodeURIComponent(image.id)}`}
                                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600/15 to-blue-600/15 border border-indigo-500/35 hover:border-indigo-500/65 text-xs font-bold text-indigo-600 dark:text-indigo-300 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Edit in Canva Studio &rarr;</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="w-full lg:w-96 lg:shrink-0">
                        <ImageDetails
                            image={image}
                            onResizeApply={handleResizeApply}
                            collections={collections}
                            partOfCollectionsSliderConfig={partOfCollectionsSliderConfig}
                        />
                    </div>
                </div>

                {/* Related Images */}
                <RelatedImages images={relatedImages} currentId={image.id} totalCount={totalRelatedImages} />
            </main>

            {/* JPG Dimensions & Padding Customizer Modal */}
            {jpgConfigOpen && (() => {
                const safeW = Math.max(32, Math.min(8000, Math.round(Number(jpgCanvasWidth) || originalWidth)));
                const safeH = Math.max(32, Math.min(8000, Math.round(Number(jpgCanvasHeight) || originalHeight)));
                const maxPad = Math.max(0, Math.floor(Math.min(safeW, safeH) / 2) - 1);
                const safePad = Math.max(0, Math.min(maxPad, Math.round(Number(jpgPadding) || 0)));
                const rect = computeContainedImageRect(
                    safeW,
                    safeH,
                    safePad,
                    naturalDims.width || originalWidth,
                    naturalDims.height || originalHeight
                );
                const previewBgStyle =
                    bgMode === 'gradient'
                        ? { background: getGradientCss() }
                        : { backgroundColor: jpgBgInfo.color };

                const handleWidthChange = (raw) => {
                    const num = Number(raw);
                    if (!Number.isFinite(num)) {
                        setJpgCanvasWidth(raw);
                        return;
                    }
                    const clampedW = Math.max(1, Math.min(8000, Math.round(num)));
                    setJpgCanvasWidth(clampedW);
                    if (jpgLockAspect && safeW > 0) {
                        const nextH = Math.max(32, Math.min(8000, Math.round((clampedW * originalHeight) / originalWidth)));
                        setJpgCanvasHeight(nextH);
                    }
                };

                const handleHeightChange = (raw) => {
                    const num = Number(raw);
                    if (!Number.isFinite(num)) {
                        setJpgCanvasHeight(raw);
                        return;
                    }
                    const clampedH = Math.max(1, Math.min(8000, Math.round(num)));
                    setJpgCanvasHeight(clampedH);
                    if (jpgLockAspect && safeH > 0) {
                        const nextW = Math.max(32, Math.min(8000, Math.round((clampedH * originalWidth) / originalHeight)));
                        setJpgCanvasWidth(nextW);
                    }
                };

                const previewMaxW = isSmallViewport ? 280 : 340;
                const previewMaxH = 200;
                const previewScale = Math.min(previewMaxW / safeW, previewMaxH / safeH);
                const previewW = Math.max(48, Math.round(safeW * previewScale));
                const previewH = Math.max(48, Math.round(safeH * previewScale));

                return (
                    <div
                        data-testid="jpg-config-modal"
                        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
                        onClick={() => setJpgConfigOpen(false)}
                    >
                        <form
                            onSubmit={handleConfirmJpgConfig}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg rounded-2xl bg-card-bg border border-card-border shadow-2xl overflow-hidden my-auto"
                        >
                            {/* Header */}
                            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-card-border flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-blue-600/15 text-blue-400 shrink-0">
                                        <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                                            Customize JPG Size &amp; Padding
                                        </h3>
                                        <p className="text-[11px] text-foreground/55 truncate">
                                            {safeW}&times;{safeH} px &bull; Padding {safePad}px &bull; {jpgBgInfo.label}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    data-testid="jpg-config-close"
                                    onClick={() => setJpgConfigOpen(false)}
                                    aria-label="Close JPG setup"
                                    className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 space-y-5">
                                {/* Live Scaled Output Preview */}
                                <div className="rounded-xl border border-card-border bg-black/15 dark:bg-black/35 p-3 sm:p-4 flex flex-col items-center justify-center gap-2.5">
                                    <div className="w-full flex items-center justify-center min-h-[168px] sm:min-h-[200px]">
                                        <div
                                            data-testid="jpg-config-preview"
                                            style={{
                                                ...previewBgStyle,
                                                width: `${previewW}px`,
                                                height: `${previewH}px`,
                                                maxWidth: '100%',
                                            }}
                                            className="relative rounded-lg shadow-xl border border-black/15 dark:border-white/15 overflow-hidden transition-all duration-150 shrink-0"
                                        >
                                            {safePad > 0 && (
                                                <div
                                                    aria-hidden="true"
                                                    style={{
                                                        left: `${(safePad / safeW) * 100}%`,
                                                        right: `${(safePad / safeW) * 100}%`,
                                                        top: `${(safePad / safeH) * 100}%`,
                                                        bottom: `${(safePad / safeH) * 100}%`,
                                                    }}
                                                    className="absolute border border-dashed border-blue-400/60 pointer-events-none"
                                                />
                                            )}
                                            <img
                                                data-testid="jpg-config-preview-img"
                                                src={imageSrc}
                                                alt={imageTitle}
                                                onLoad={(e) => {
                                                    const nw = e.currentTarget.naturalWidth;
                                                    const nh = e.currentTarget.naturalHeight;
                                                    if (nw > 0 && nh > 0) {
                                                        setNaturalDims({ width: nw, height: nh });
                                                    }
                                                }}
                                                style={{
                                                    left: `${(rect.x / safeW) * 100}%`,
                                                    top: `${(rect.y / safeH) * 100}%`,
                                                    width: `${(rect.drawW / safeW) * 100}%`,
                                                    height: `${(rect.drawH / safeH) * 100}%`,
                                                }}
                                                className="absolute object-contain pointer-events-none select-none transition-all duration-75"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-mono text-foreground/65">
                                        <span>Canvas: <strong className="text-foreground">{safeW}&times;{safeH}px</strong></span>
                                        <span>PNG Inside: <strong className="text-foreground">{Math.round(rect.drawW)}&times;{Math.round(rect.drawH)}px</strong></span>
                                        <span>Pad: <strong className="text-foreground">{safePad}px</strong></span>
                                    </div>
                                </div>

                                {/* Full Image Dimensions */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                                            Full Image Dimensions (px)
                                        </span>
                                        <button
                                            type="button"
                                            data-testid="jpg-aspect-lock"
                                            onClick={() => setJpgLockAspect((p) => !p)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                                jpgLockAspect
                                                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-500 dark:text-blue-400'
                                                    : 'bg-card-header-bg border-card-border text-foreground/65 hover:text-foreground'
                                            }`}
                                        >
                                            {jpgLockAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                            <span>{jpgLockAspect ? 'Locked' : 'Free Ratio'}</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-foreground/60 mb-1">
                                                Width (px)
                                            </label>
                                            <input
                                                type="number"
                                                min={32}
                                                max={8000}
                                                data-testid="jpg-width-input"
                                                value={jpgCanvasWidth}
                                                onChange={(e) => handleWidthChange(e.target.value)}
                                                onBlur={() => setJpgCanvasWidth(safeW)}
                                                className="w-full bg-input-bg border border-input-border text-foreground text-sm px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-foreground/60 mb-1">
                                                Height (px)
                                            </label>
                                            <input
                                                type="number"
                                                min={32}
                                                max={8000}
                                                data-testid="jpg-height-input"
                                                value={jpgCanvasHeight}
                                                onChange={(e) => handleHeightChange(e.target.value)}
                                                onBlur={() => setJpgCanvasHeight(safeH)}
                                                className="w-full bg-input-bg border border-input-border text-foreground text-sm px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {[
                                            { label: `Original (${originalWidth}×${originalHeight})`, w: originalWidth, h: originalHeight },
                                            { label: '1080×1080', w: 1080, h: 1080 },
                                            { label: '1920×1080', w: 1920, h: 1080 },
                                            { label: '1200×630', w: 1200, h: 630 },
                                            { label: '1080×1350', w: 1080, h: 1350 },
                                        ].map((preset) => {
                                            const active = safeW === preset.w && safeH === preset.h;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setJpgCanvasWidth(preset.w);
                                                        setJpgCanvasHeight(preset.h);
                                                    }}
                                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                                        active
                                                            ? 'bg-blue-600 text-white border-blue-500'
                                                            : 'bg-card-header-bg border-card-border text-foreground/65 hover:text-foreground'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* PNG Padding Inside Canvas */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                                            PNG Padding Inside JPG (px)
                                        </span>
                                        <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400">
                                            {safePad} px
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0}
                                            max={maxPad}
                                            data-testid="jpg-padding-slider"
                                            value={safePad}
                                            onChange={(e) => setJpgPadding(Number(e.target.value))}
                                            className="flex-1 accent-blue-500 cursor-pointer touch-none"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            max={maxPad}
                                            data-testid="jpg-padding-input"
                                            value={jpgPadding}
                                            onChange={(e) => setJpgPadding(e.target.value)}
                                            onBlur={() => setJpgPadding(safePad)}
                                            aria-label="PNG padding in pixels"
                                            className="w-20 bg-input-bg border border-input-border text-foreground text-xs px-2.5 py-1.5 rounded-lg font-mono text-center focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[0, 24, 48, 96, 160].filter((p) => p <= maxPad).map((presetPad) => (
                                            <button
                                                key={presetPad}
                                                type="button"
                                                onClick={() => setJpgPadding(presetPad)}
                                                className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                                    safePad === presetPad
                                                        ? 'bg-blue-600 text-white border-blue-500'
                                                        : 'bg-card-header-bg border-card-border text-foreground/65 hover:text-foreground'
                                                }`}
                                            >
                                                {presetPad === 0 ? 'No Padding (0px)' : `${presetPad}px`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer Buttons */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-card-border">
                                    <button
                                        type="button"
                                        data-testid="jpg-config-cancel"
                                        onClick={() => setJpgConfigOpen(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-card-border text-foreground/75 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        data-testid="jpg-config-download-btn"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 hover:brightness-110 transition-all cursor-pointer"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Continue to Download</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                );
            })()}

            {/* Download Countdown & Captcha Verification Modal */}
            {gateOpen && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => !gateVerifying && setGateOpen(false)}
                >
                    <form
                        onSubmit={handleConfirmGateDownload}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl bg-card-bg border border-card-border shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-primary-glow/15 text-primary-glow">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground">Prepare Download</h3>
                                    <p className="text-[11px] text-foreground/55">
                                        {downloadFormat.toUpperCase()} &bull; {downloadWidth}&times;{downloadHeight} px
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setGateOpen(false)}
                                disabled={gateVerifying}
                                className="p-1.5 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {gateLoading ? (
                                <div className="py-8 flex flex-col items-center gap-3 text-xs text-foreground/60">
                                    <div className="w-8 h-8 border-2 border-primary-glow border-t-transparent rounded-full animate-spin" />
                                    <span>Preparing secure download link...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Countdown Banner */}
                                    <div className="rounded-xl border border-card-border bg-background/70 p-4">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/75">
                                                <Clock className="w-4 h-4 text-primary-glow" />
                                                {countdown > 0
                                                    ? `Generating high-resolution file in ${countdown}s...`
                                                    : 'Your file is ready to download!'}
                                            </span>
                                            <span className="text-sm font-mono font-bold text-primary-glow">
                                                {countdown > 0 ? `${countdown}s` : 'READY'}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-card-border overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700"
                                                style={{
                                                    width:
                                                        initialCountdown > 0
                                                            ? `${Math.min(100, Math.round(((initialCountdown - countdown) / initialCountdown) * 100))}%`
                                                            : '100%',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Captcha Challenge */}
                                    {captchaConfig?.provider && captchaConfig.provider !== 'none' && (
                                        <CaptchaWidget
                                            config={captchaConfig}
                                            context="download"
                                            resetKey={captchaResetKey}
                                            onChange={(val) => {
                                                setCaptchaData(val);
                                                if (gateError) setGateError('');
                                            }}
                                            onChallengeChange={(fresh) =>
                                                setCaptchaConfig((prev) => ({ ...(prev || {}), challenge: fresh }))
                                            }
                                        />
                                    )}

                                    {gateError && (
                                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                            {gateError}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <div className="flex items-center gap-2 min-h-[40px]">
                                            {gateFeedback === 'success' && (
                                                <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-bold">
                                                    <span className="relative flex items-center justify-center">
                                                        <span className="absolute inset-0 rounded-full bg-emerald-400/35 animate-captcha-ring" />
                                                        <ThumbsUp className="w-4 h-4 relative animate-captcha-thumb-up" />
                                                    </span>
                                                    <span>Verified!</span>
                                                </div>
                                            )}
                                            {gateFeedback === 'error' && (
                                                <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-bold">
                                                    <span className="relative flex items-center justify-center">
                                                        <span className="absolute inset-0 rounded-full bg-red-400/35 animate-captcha-ring" />
                                                        <ThumbsDown className="w-4 h-4 relative animate-captcha-thumb-down" />
                                                    </span>
                                                    <span>Wrong!</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setGateOpen(false)}
                                                disabled={gateVerifying || gateFeedback === 'success'}
                                                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-card-border text-foreground/70 hover:text-foreground transition-colors cursor-pointer disabled:opacity-45"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={
                                                    countdown > 0 ||
                                                    gateVerifying ||
                                                    gateFeedback === 'success' ||
                                                    (captchaConfig?.provider && captchaConfig.provider !== 'none' && !captchaData.token)
                                                }
                                                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                                    gateFeedback === 'error'
                                                        ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shadow-red-600/35 animate-captcha-shake !opacity-100'
                                                        : gateFeedback === 'success'
                                                        ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 shadow-emerald-500/35 !opacity-100'
                                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/25 hover:brightness-110'
                                                }`}
                                            >
                                                {gateFeedback === 'success' ? (
                                                    <ThumbsUp className="w-4 h-4 animate-captcha-thumb-up" />
                                                ) : gateFeedback === 'error' ? (
                                                    <ThumbsDown className="w-4 h-4 animate-captcha-thumb-down" />
                                                ) : (
                                                    <Download className="w-4 h-4" />
                                                )}
                                                <span>
                                                    {countdown > 0
                                                        ? `Wait ${countdown}s`
                                                        : gateFeedback === 'success'
                                                        ? 'Starting Download...'
                                                        : gateFeedback === 'error'
                                                        ? 'Try Again'
                                                        : gateVerifying
                                                        ? 'Verifying...'
                                                        : `Download ${downloadFormat.toUpperCase()}`}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

