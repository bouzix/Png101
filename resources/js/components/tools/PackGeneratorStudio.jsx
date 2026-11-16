import React, { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Copy,
    Download,
    FileArchive,
    Loader2,
    Package,
    Plus,
    Sliders,
    Sparkles,
    UploadCloud,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    DEFAULT_ICO_SIZES,
    formatFileSize,
    generateAppIconPackZip,
    generateFaviconPackZip,
    loadImageFromFileOrUrl,
    stripExtension,
} from '@/lib/imageConverter';
import { slugify, triggerSiteBlobDownload } from '@/lib/utils';
import StudioColorPicker from '@/components/tools/StudioColorPicker';

export default function PackGeneratorStudio({ tool, preloadAsset = null, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const isFaviconMode = tool.mode === 'favicon-pack';

    const fileInputRef = useRef(null);
    const modalFileInputRef = useRef(null);
    const appNameInputRef = useRef(null);
    const loadedImgRef = useRef(null);
    const pendingImgRef = useRef(null);
    const prevUrlsRef = useRef([]);
    const genSeqRef = useRef(0);
    const sourceVersionRef = useRef(0);
    const lastGeneratedSigRef = useRef('');

    const [sourceName, setSourceName] = useState('');
    const [sourceDims, setSourceDims] = useState({ width: 0, height: 0 });
    const [sourceThumbUrl, setSourceThumbUrl] = useState('');
    const [pendingMeta, setPendingMeta] = useState(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isModalDragging, setIsModalDragging] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [packVersion, setPackVersion] = useState(0);
    const [completedSig, setCompletedSig] = useState('');

    // Unified Popup Modal: null | 'setup' | 'studio' | 'upload'
    const [modalStep, setModalStep] = useState(null);
    const [draftAppName, setDraftAppName] = useState('My Website');

    // Live customization settings (inside expanded studio popup)
    const [paddingPct, setPaddingPct] = useState(0);
    const [radiusPct, setRadiusPct] = useState(0);
    const [backgroundColor, setBackgroundColor] = useState('transparent');
    const [customBgHex, setCustomBgHex] = useState('#ffffff');

    // Favicon specific
    const [appName, setAppName] = useState('My Website');
    const [icoSizes, setIcoSizes] = useState(DEFAULT_ICO_SIZES);

    // App icon specific
    const [includeIos, setIncludeIos] = useState(true);
    const [includeAndroid, setIncludeAndroid] = useState(true);
    const [includePwa, setIncludePwa] = useState(true);

    // Generated outputs
    const [result, setResult] = useState(null);
    const [copiedKey, setCopiedKey] = useState(null);

    const revokePreviewUrls = (urls) => {
        (urls || []).forEach((u) => URL.revokeObjectURL(u));
    };

    useEffect(() => {
        return () => {
            revokePreviewUrls(prevUrlsRef.current);
            prevUrlsRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (pendingMeta?.thumbUrl && pendingMeta.thumbUrl.startsWith('blob:')) {
            return () => URL.revokeObjectURL(pendingMeta.thumbUrl);
        }
    }, [pendingMeta?.thumbUrl]);

    useEffect(() => {
        if (!modalStep) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (modalStep === 'setup') {
                    pendingImgRef.current = null;
                    setPendingMeta(null);
                }
                setModalStep(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [modalStep]);

    useEffect(() => {
        if (modalStep === 'setup' && isFaviconMode) {
            const t = setTimeout(() => {
                appNameInputRef.current?.focus();
                appNameInputRef.current?.select();
            }, 40);
            return () => clearTimeout(t);
        }
    }, [modalStep, isFaviconMode]);

    const generatePack = async (shouldTrack = false, overrides = {}, targetSig = null) => {
        if (!loadedImgRef.current) return;
        const seq = ++genSeqRef.current;
        setGenerating(true);

        const nextAppName = overrides.appName !== undefined ? overrides.appName : appName;
        const effectiveBg = backgroundColor === 'custom' ? customBgHex : backgroundColor;
        const sigToRecord = targetSig ?? buildConfigSignature(sourceVersionRef.current, overrides);

        try {
            const payload = isFaviconMode
                ? await generateFaviconPackZip(loadedImgRef.current, {
                      appName: nextAppName,
                      icoSizes,
                      paddingPct,
                      radiusPct,
                      backgroundColor: effectiveBg,
                  })
                : await generateAppIconPackZip(loadedImgRef.current, {
                      includeIos,
                      includeAndroid,
                      includePwa,
                      paddingPct,
                      radiusPct,
                      backgroundColor: effectiveBg,
                  });

            const newUrls = [
                ...(payload.icoPreviews || []).map((p) => p.url),
                ...(payload.previews || []).map((p) => p.url),
            ];
            if (seq !== genSeqRef.current) {
                revokePreviewUrls(newUrls);
                return;
            }

            const oldUrls = prevUrlsRef.current;
            prevUrlsRef.current = newUrls;
            setResult(payload);
            setCompletedSig(sigToRecord);
            revokePreviewUrls(oldUrls);

            if (shouldTrack && onTrackEvent) {
                onTrackEvent({
                    slug: tool.slug,
                    eventType: 'convert',
                    filesCount: payload.fileCount || 1,
                    inputBytes: 0,
                    outputBytes: payload.zipBlob?.size || 0,
                });
            }
            return payload;
        } catch (err) {
            if (seq === genSeqRef.current) {
                toast.error(err?.message || 'Failed to generate icon pack');
            }
            return null;
        } finally {
            if (seq === genSeqRef.current) {
                setGenerating(false);
            }
        }
    };

    const handleFileSelected = async (source, fallbackName = 'icon.png') => {
        try {
            const loaded = await loadImageFromFileOrUrl(source);
            const resolvedName = typeof source === 'string' ? fallbackName : source.name;

            // Snapshot decoded pixels onto an offscreen canvas so each upload is independent of blob URLs
            const snapshot = document.createElement('canvas');
            snapshot.width = loaded.width;
            snapshot.height = loaded.height;
            const sctx = snapshot.getContext('2d');
            sctx.drawImage(loaded.img, 0, 0, loaded.width, loaded.height);
            loaded.revoke?.();

            let thumbUrl = '';
            try {
                const thumbCanvas = document.createElement('canvas');
                thumbCanvas.width = 96;
                thumbCanvas.height = 96;
                thumbCanvas.getContext('2d').drawImage(snapshot, 0, 0, 96, 96);
                thumbUrl = thumbCanvas.toDataURL('image/png');
            } catch {
                thumbUrl = '';
            }

            pendingImgRef.current = snapshot;
            setPendingMeta({
                name: resolvedName,
                width: loaded.width,
                height: loaded.height,
                thumbUrl,
            });
            setDraftAppName(appName || 'My Website');
            setModalStep('setup');
        } catch {
            toast.error('Could not decode that image file.');
        }
    };

    const buildConfigSignature = (version, overrides = {}) => {
        const effectiveAppName = overrides.appName !== undefined ? overrides.appName : appName;
        return JSON.stringify([
            version,
            paddingPct,
            radiusPct,
            backgroundColor,
            customBgHex,
            effectiveAppName,
            icoSizes,
            includeIos,
            includeAndroid,
            includePwa,
        ]);
    };

    const getPackDownloadNames = (overrides = {}) => {
        const effAppName = overrides.appName !== undefined ? overrides.appName : appName;
        const effSourceName = overrides.sourceName !== undefined ? overrides.sourceName : sourceName;
        const effVersion = overrides.packVersion !== undefined ? overrides.packVersion : packVersion;

        const appSlug = isFaviconMode && effAppName && effAppName !== 'My Website' ? slugify(effAppName) : '';
        const sourceSlug = slugify(stripExtension(effSourceName));
        const platformTags = !isFaviconMode
            ? [includeIos ? 'ios' : '', includeAndroid ? 'android' : '', includePwa ? 'pwa' : ''].filter(Boolean)
            : [];
        const styleTags = [
            ...platformTags,
            effVersion > 1 ? `v${effVersion}` : '',
            paddingPct > 0 ? `p${paddingPct}` : '',
            radiusPct > 0 ? `r${radiusPct}` : '',
            backgroundColor !== 'transparent'
                ? `bg-${(backgroundColor === 'custom' ? customBgHex : backgroundColor).replace('#', '').toLowerCase()}`
                : '',
        ].filter(Boolean);
        const stemParts = [appSlug, sourceSlug && sourceSlug !== appSlug ? sourceSlug : '', ...styleTags].filter(Boolean);
        const prefix = stemParts.length > 0 ? `${stemParts.join('-')}-` : '';
        return {
            icoDownloadName: `${prefix}favicon.ico`,
            zipDownloadName: isFaviconMode ? `${prefix}favicon-pack.zip` : `${prefix}app-icon-pack.zip`,
        };
    };

    const handleConfirmPrompt = async (e) => {
        e?.preventDefault();
        if (!pendingImgRef.current || !pendingMeta) return;
        if (!isFaviconMode && !includeIos && !includeAndroid && !includePwa) return;

        const nextSourceName = pendingMeta.name;
        const nextWidth = pendingMeta.width;
        const nextHeight = pendingMeta.height;
        const nextThumb = pendingMeta.thumbUrl || '';
        const cleanName = draftAppName.trim() || 'My Website';
        const nextVersion = ++sourceVersionRef.current;
        loadedImgRef.current = pendingImgRef.current;
        pendingImgRef.current = null;

        setSourceName(nextSourceName);
        setSourceDims({ width: nextWidth, height: nextHeight });
        setSourceThumbUrl(nextThumb);
        setPackVersion(nextVersion);

        // Immediately clear any previous pack outputs so Pack 1 cannot be previewed or downloaded
        revokePreviewUrls(prevUrlsRef.current);
        prevUrlsRef.current = [];
        setResult(null);
        setCompletedSig('');

        setAppName(cleanName);
        const targetSig = buildConfigSignature(nextVersion, { appName: cleanName });
        lastGeneratedSigRef.current = targetSig;
        setHasGenerated(true);

        if (isFaviconMode) {
            setPendingMeta(null);
            // Keep the popup open and expand it into the 2-column live studio
            setModalStep('studio');
            await generatePack(true, { appName: cleanName }, targetSig);
            return;
        }

        // App Icon Pack Generator: no editor needed — generate selected platform pack & download immediately
        const payload = await generatePack(true, { appName: cleanName }, targetSig);
        setPendingMeta(null);
        if (payload?.zipBlob) {
            const { zipDownloadName: directZipName } = getPackDownloadNames({
                appName: cleanName,
                sourceName: nextSourceName,
                packVersion: nextVersion,
            });
            triggerSiteBlobDownload(payload.zipBlob, directZipName, websiteInfo);
            setModalStep(null);
        }
    };

    const handleCloseModal = () => {
        if (modalStep === 'setup') {
            pendingImgRef.current = null;
            setPendingMeta(null);
        }
        setModalStep(null);
    };

    useEffect(() => {
        if (preloadAsset?.path) {
            handleFileSelected(preloadAsset.path, `${preloadAsset.name || 'asset'}.png`);
        }
    }, [preloadAsset?.path]);

    useEffect(() => {
        if (!isFaviconMode || !hasGenerated || !loadedImgRef.current) return;
        const sig = buildConfigSignature(sourceVersionRef.current);
        if (sig === lastGeneratedSigRef.current) {
            return;
        }
        const t = setTimeout(() => {
            lastGeneratedSigRef.current = sig;
            generatePack(false, {}, sig);
        }, 120);
        return () => clearTimeout(t);
    }, [
        isFaviconMode,
        hasGenerated,
        paddingPct,
        radiusPct,
        backgroundColor,
        customBgHex,
        appName,
        icoSizes,
    ]);

    const handleCopy = (key, text) => {
        navigator.clipboard?.writeText(text);
        setCopiedKey(key);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedKey(null), 1600);
    };

    const currentConfigSig = hasGenerated ? buildConfigSignature(packVersion) : '';
    const isOutOfSync = isFaviconMode && hasGenerated && currentConfigSig !== completedSig;
    const isBusy = generating || isOutOfSync;

    const { icoDownloadName, zipDownloadName } = getPackDownloadNames();

    const checkerBgStyle = {
        backgroundImage:
            'linear-gradient(45deg, rgba(148,163,184,0.18) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.18) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.18) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.18) 75%)',
        backgroundSize: '12px 12px',
        backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
    };

    return (
        <section className="w-full space-y-6">
            {/* Initial Drop Zone (before any pack has been generated) */}
            {!hasGenerated && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileSelected(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all space-y-3 ${
                        isDragging
                            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                            : 'border-card-border hover:border-blue-500/50 bg-card-bg'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={tool.accept}
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                            e.target.value = '';
                        }}
                    />
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 mx-auto">
                        <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="text-base sm:text-lg font-bold text-foreground">
                        Drop any PNG, JPG, WebP, or SVG icon here, or click to select
                    </div>
                    <p className="text-xs text-foreground/55">
                        Square logos (512×512+) produce the sharpest multi-resolution icons · Processed locally in browser
                    </p>
                </div>
            )}

            {/* Compact Page Summary when user closes the expanded studio popup after generating */}
            {hasGenerated && result && !modalStep && (
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        {sourceThumbUrl ? (
                            <img
                                src={sourceThumbUrl}
                                alt={sourceName}
                                className="w-12 h-12 rounded-xl border border-card-border object-contain bg-background p-1 shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
                                <Package className="w-6 h-6" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-foreground truncate max-w-[260px]">
                                    {sourceName}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-[11px] text-foreground/65">
                                    {sourceDims.width}×{sourceDims.height}
                                </span>
                            </div>
                            <div className="text-xs text-foreground/60 mt-0.5">
                                {result.fileCount} generated assets ready · ZIP {formatFileSize(result.zipBlob.size)}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setModalStep('upload')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                        >
                            <Plus className="w-4 h-4 text-blue-500" />
                            <span>Make Another One</span>
                        </button>

                        {isFaviconMode ? (
                            <button
                                type="button"
                                onClick={() => setModalStep('studio')}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                            >
                                <Sliders className="w-4 h-4 text-blue-500" />
                                <span>Open Editor &amp; Assets</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!loadedImgRef.current) return;
                                    pendingImgRef.current = loadedImgRef.current;
                                    setPendingMeta({
                                        name: sourceName,
                                        width: sourceDims.width,
                                        height: sourceDims.height,
                                        thumbUrl: sourceThumbUrl,
                                    });
                                    setModalStep('setup');
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                            >
                                <Check className="w-4 h-4 text-blue-500" />
                                <span>Choose Platforms</span>
                            </button>
                        )}

                        {isFaviconMode && result.icoBlob && (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => triggerSiteBlobDownload(result.icoBlob, icoDownloadName, websiteInfo)}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-background border border-card-border hover:border-blue-500 text-xs font-bold text-foreground cursor-pointer disabled:opacity-50 transition-colors"
                            >
                                <Download className="w-4 h-4 text-blue-500" />
                                <span>favicon.ico</span>
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => triggerSiteBlobDownload(result.zipBlob, zipDownloadName, websiteInfo)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                            <FileArchive className="w-4 h-4" />
                            <span>Download Pack (.zip)</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Unified Expanding Modal ('setup' -> 'studio', or 'upload') */}
            {modalStep && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={
                        modalStep === 'studio'
                            ? 'Customize & preview generated assets'
                            : modalStep === 'upload'
                              ? 'Make another icon pack'
                              : 'Configure icon pack'
                    }
                    onClick={handleCloseModal}
                    className={`fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center ${
                        modalStep === 'studio' ? 'p-2 sm:p-3' : 'p-3 sm:p-5'
                    }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full bg-card-bg border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out ${
                            modalStep === 'studio'
                                ? 'max-w-none h-[95vh]'
                                : modalStep === 'upload'
                                  ? 'max-w-lg'
                                  : 'max-w-md'
                        }`}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-card-border flex flex-wrap items-center justify-between gap-3 shrink-0">
                            {modalStep === 'studio' ? (
                                <>
                                    <div className="flex items-center gap-3 min-w-0">
                                        {sourceThumbUrl ? (
                                            <img
                                                src={sourceThumbUrl}
                                                alt={sourceName}
                                                className="w-9 h-9 rounded-xl border border-card-border object-contain bg-background p-1 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
                                                <Package className="w-4 h-4" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-sm text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                                                    {sourceName}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded-md bg-background border border-card-border font-mono text-[10px] text-foreground/60">
                                                    {sourceDims.width}×{sourceDims.height}
                                                </span>
                                                {isBusy && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-semibold">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        <span>Updating...</span>
                                                    </span>
                                                )}
                                            </div>
                                            {result && (
                                                <div className="text-[11px] text-foreground/55">
                                                    {result.fileCount} assets ready · ZIP size {formatFileSize(result.zipBlob.size)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModalStep('upload')}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Make Another One</span>
                                        </button>

                                        {isFaviconMode && result?.icoBlob && (
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => triggerSiteBlobDownload(result.icoBlob, icoDownloadName, websiteInfo)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500 text-xs font-bold text-foreground cursor-pointer disabled:opacity-50 transition-colors"
                                            >
                                                <Download className="w-3.5 h-3.5 text-blue-500" />
                                                <span>favicon.ico</span>
                                            </button>
                                        )}

                                        {result?.zipBlob && (
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => triggerSiteBlobDownload(result.zipBlob, zipDownloadName, websiteInfo)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50 transition-colors"
                                            >
                                                <FileArchive className="w-3.5 h-3.5" />
                                                <span>Download Pack (.zip)</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            aria-label="Close studio"
                                            className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        {modalStep === 'upload' ? (
                                            <UploadCloud className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 text-blue-500" />
                                        )}
                                        <h3 className="font-bold text-sm text-foreground">
                                            {modalStep === 'upload'
                                                ? 'Make Another One'
                                                : isFaviconMode
                                                  ? 'Name Your Website / App'
                                                  : 'Choose Target Platforms'}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        aria-label="Close modal"
                                        className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-background cursor-pointer transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Stage 1: Prompt Form ('setup') */}
                        {modalStep === 'setup' && pendingMeta && (
                            <form onSubmit={handleConfirmPrompt} className="flex flex-col">
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-card-border">
                                        {pendingMeta.thumbUrl && (
                                            <div
                                                className="w-12 h-12 rounded-lg border border-card-border flex items-center justify-center overflow-hidden p-1 shrink-0"
                                                style={checkerBgStyle}
                                            >
                                                <img
                                                    src={pendingMeta.thumbUrl}
                                                    alt={pendingMeta.name}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-foreground truncate">
                                                {pendingMeta.name}
                                            </div>
                                            <div className="text-[11px] font-mono text-foreground/55">
                                                {pendingMeta.width}×{pendingMeta.height}px
                                            </div>
                                        </div>
                                    </div>

                                    {isFaviconMode ? (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-foreground block">
                                                Manifest App Name
                                            </label>
                                            <input
                                                ref={appNameInputRef}
                                                type="text"
                                                value={draftAppName}
                                                onChange={(e) => setDraftAppName(e.target.value)}
                                                placeholder="e.g. My Website"
                                                className="w-full bg-input-bg border border-input-border rounded-xl px-3.5 py-2.5 text-sm text-input-text focus:outline-none focus:border-blue-500"
                                            />
                                            <p className="text-[11px] text-foreground/55">
                                                Click next to generate your icons and customize settings live side-by-side.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <span className="text-xs font-bold text-foreground block">
                                                Select Platforms to Generate
                                            </span>
                                            <div className="grid grid-cols-3 gap-2.5 text-xs">
                                                {[
                                                    { label: 'iOS', checked: includeIos, set: setIncludeIos },
                                                    { label: 'Android', checked: includeAndroid, set: setIncludeAndroid },
                                                    { label: 'PWA', checked: includePwa, set: setIncludePwa },
                                                ].map((p) => (
                                                    <button
                                                        key={p.label}
                                                        type="button"
                                                        role="checkbox"
                                                        aria-checked={p.checked}
                                                        onClick={() => p.set(!p.checked)}
                                                        className={`py-2.5 px-3 rounded-xl border font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 ${
                                                            p.checked
                                                                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500 shadow-sm'
                                                                : 'bg-background border-card-border text-foreground/60 hover:border-foreground/30'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                                                p.checked
                                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                                    : 'border-foreground/35 bg-transparent text-transparent'
                                                            }`}
                                                        >
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        </span>
                                                        <span>{p.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {!includeIos && !includeAndroid && !includePwa && (
                                                <p className="text-[11px] font-medium text-amber-500">
                                                    Select at least one platform to download.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="px-5 py-3.5 border-t border-card-border flex items-center justify-end gap-2 bg-background/50">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-3.5 py-2 rounded-xl border border-card-border bg-background hover:bg-card-header-bg text-xs font-bold text-foreground/75 cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            generating ||
                                            (!isFaviconMode && !includeIos && !includeAndroid && !includePwa)
                                        }
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isFaviconMode ? (
                                            <>
                                                <span>Generate Favicon Pack</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </>
                                        ) : generating ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Generating Pack...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileArchive className="w-3.5 h-3.5" />
                                                <span>Download Pack (.zip)</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Stage 2: Expanded Side-by-Side Studio ('studio') */}
                        {modalStep === 'studio' && (
                            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
                                {/* Left Column: Live Settings */}
                                <div className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-card-border bg-background/50 p-5 space-y-4 lg:overflow-y-auto">
                                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-card-border">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                            <Sliders className="w-4 h-4 text-blue-500" />
                                            <span>Live Settings</span>
                                        </div>
                                        <span className="text-[11px] text-foreground/55">Auto-applies</span>
                                    </div>

                                    {/* Manifest App Name or Target Platforms */}
                                    {isFaviconMode ? (
                                        <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2 text-xs">
                                            <label className="font-bold text-foreground/80 block">
                                                Manifest App Name
                                            </label>
                                            <input
                                                type="text"
                                                value={appName}
                                                onChange={(e) => setAppName(e.target.value)}
                                                placeholder="My Website"
                                                className="w-full bg-input-bg border border-input-border rounded-lg px-3 py-2 text-xs text-input-text focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2 text-xs">
                                            <span className="font-bold text-foreground/80 block">Target Platforms</span>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'iOS', checked: includeIos, set: setIncludeIos },
                                                    { label: 'Android', checked: includeAndroid, set: setIncludeAndroid },
                                                    { label: 'PWA', checked: includePwa, set: setIncludePwa },
                                                ].map((p) => (
                                                    <button
                                                        key={p.label}
                                                        type="button"
                                                        onClick={() => p.set(!p.checked)}
                                                        className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                                                            p.checked
                                                                ? 'bg-blue-600 text-white border-blue-500'
                                                                : 'border-card-border text-foreground/65'
                                                        }`}
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Icon Backdrop */}
                                    <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2 text-xs">
                                        <span className="font-bold text-foreground/80 block">Icon Backdrop</span>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {[
                                                { id: 'transparent', label: 'Transparent' },
                                                { id: '#ffffff', label: 'White' },
                                                { id: '#0f172a', label: 'Dark' },
                                                { id: 'custom', label: 'Custom' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setBackgroundColor(opt.id)}
                                                    className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                                                        backgroundColor === opt.id
                                                            ? 'border-blue-500 bg-blue-500/15 text-blue-500'
                                                            : 'border-card-border text-foreground/70'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                            {backgroundColor === 'custom' && (
                                                <StudioColorPicker
                                                    value={customBgHex}
                                                    onChange={setCustomBgHex}
                                                    ariaLabel="Custom favicon background color"
                                                    size="sm"
                                                    showHexLabel
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Safe Padding */}
                                    <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2 text-xs">
                                        <div className="flex justify-between font-bold">
                                            <span className="text-foreground/80">Safe Padding</span>
                                            <span className="font-mono text-blue-500">{paddingPct}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={30}
                                            value={paddingPct}
                                            onChange={(e) => setPaddingPct(Number(e.target.value))}
                                            className="w-full accent-blue-500 cursor-pointer touch-none"
                                        />
                                    </div>

                                    {/* Corner Radius */}
                                    <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2 text-xs">
                                        <div className="flex justify-between font-bold">
                                            <span className="text-foreground/80">Corner Radius</span>
                                            <span className="font-mono text-blue-500">{radiusPct}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={50}
                                            value={radiusPct}
                                            onChange={(e) => setRadiusPct(Number(e.target.value))}
                                            className="w-full accent-blue-500 cursor-pointer touch-none"
                                        />
                                    </div>

                                    {/* Embedded .ICO Frame Sizes */}
                                    {isFaviconMode && (
                                        <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground/80">
                                                    Embedded .ICO Frame Sizes (px)
                                                </span>
                                                {icoSizes.length < DEFAULT_ICO_SIZES.length && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIcoSizes(DEFAULT_ICO_SIZES)}
                                                        className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer"
                                                    >
                                                        Select All
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {DEFAULT_ICO_SIZES.map((sz) => {
                                                    const active = icoSizes.includes(sz);
                                                    return (
                                                        <button
                                                            key={sz}
                                                            type="button"
                                                            onClick={() =>
                                                                setIcoSizes((prev) =>
                                                                    prev.includes(sz)
                                                                        ? prev.length > 1
                                                                            ? prev.filter((v) => v !== sz)
                                                                            : prev
                                                                        : [...prev, sz].sort((a, b) => a - b)
                                                                )
                                                            }
                                                            className={`px-2.5 py-1 rounded-lg border font-mono font-bold cursor-pointer ${
                                                                active
                                                                    ? 'bg-blue-600 text-white border-blue-500'
                                                                    : 'border-card-border text-foreground/65'
                                                            }`}
                                                        >
                                                            {sz}x{sz}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Generated Assets & Snippets */}
                                <div className="lg:col-span-8 xl:col-span-9 p-5 sm:p-6 space-y-6 lg:overflow-y-auto">
                                    {!result ? (
                                        <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-3 text-xs text-foreground/60">
                                            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                                            <span>Generating your icon assets...</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Selected .ICO Frames at True Pixel Dimensions (no cards) */}
                                            {isFaviconMode && (result.icoPreviews || []).length > 0 && (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="font-bold text-foreground">
                                                            Embedded .ICO Frames (Actual Size)
                                                        </span>
                                                        <span className="text-[11px] font-mono text-foreground/55">
                                                            {(result.icoPreviews || []).length} selected
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="rounded-xl border border-card-border/70 p-4 flex flex-wrap items-end gap-5"
                                                        style={checkerBgStyle}
                                                    >
                                                        {(result.icoPreviews || []).map((prev) => (
                                                            <div
                                                                key={`ico-${prev.size}`}
                                                                title={`${prev.size}×${prev.size} px`}
                                                                className="inline-flex flex-col items-center gap-1.5 max-w-full"
                                                            >
                                                                <img
                                                                    src={prev.url}
                                                                    alt={`${prev.size}x${prev.size} favicon frame`}
                                                                    width={prev.size}
                                                                    height={prev.size}
                                                                    style={{ width: `${prev.size}px` }}
                                                                    className="block max-w-full h-auto"
                                                                />
                                                                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-mono font-bold shadow-sm">
                                                                    {prev.size}×{prev.size}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Web / App Pack PNGs at Actual Scale (no cards) */}
                                            {(result.previews || []).length > 0 && (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="font-bold text-foreground">
                                                            {isFaviconMode ? 'Touch & Web App Icons (Actual Size)' : 'Generated Platform Icons (Actual Size)'}
                                                        </span>
                                                        <span className="text-[11px] text-foreground/55">
                                                            1:1 px (scales to fit narrow screens)
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="rounded-xl border border-card-border/70 p-4 flex flex-wrap items-end gap-6"
                                                        style={checkerBgStyle}
                                                    >
                                                        {(result.previews || []).map((prev) => (
                                                            <div
                                                                key={prev.filename}
                                                                title={`${prev.filename} (${prev.size}×${prev.size})`}
                                                                className="inline-flex flex-col items-center gap-1.5 max-w-full"
                                                            >
                                                                <img
                                                                    src={prev.url}
                                                                    alt={prev.filename}
                                                                    width={prev.size}
                                                                    height={prev.size}
                                                                    style={{ width: `${prev.size}px` }}
                                                                    className="block max-w-full h-auto"
                                                                />
                                                                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-mono font-bold shadow-sm max-w-full truncate">
                                                                    {prev.filename} ({prev.size}px)
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {isFaviconMode && result.htmlSnippet && (
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-foreground">
                                                                HTML &lt;head&gt; Tags
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy('html', result.htmlSnippet)}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                                                            >
                                                                {copiedKey === 'html' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                <span>{copiedKey === 'html' ? 'Copied' : 'Copy HTML'}</span>
                                                            </button>
                                                        </div>
                                                        <pre className="text-[11px] font-mono text-foreground/75 overflow-x-auto leading-relaxed">
                                                            {result.htmlSnippet}
                                                        </pre>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-foreground">site.webmanifest</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy('manifest', result.manifestText)}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                                                            >
                                                                {copiedKey === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                <span>{copiedKey === 'manifest' ? 'Copied' : 'Copy JSON'}</span>
                                                            </button>
                                                        </div>
                                                        <pre className="text-[11px] font-mono text-foreground/75 overflow-x-auto leading-relaxed">
                                                            {result.manifestText}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}

                                            {!isFaviconMode && result.manifestIcons && (
                                                <div className="p-4 rounded-xl bg-background border border-card-border space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-foreground">PWA manifest-icons.json</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy('pwa', result.manifestIcons)}
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline cursor-pointer"
                                                        >
                                                            {copiedKey === 'pwa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                            <span>{copiedKey === 'pwa' ? 'Copied' : 'Copy JSON'}</span>
                                                        </button>
                                                    </div>
                                                    <pre className="text-[11px] font-mono text-foreground/75 overflow-x-auto max-h-48 leading-relaxed">
                                                        {result.manifestIcons}
                                                    </pre>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Upload New Image Inside Modal ('upload') */}
                        {modalStep === 'upload' && (
                            <div className="p-5 space-y-4">
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsModalDragging(true);
                                    }}
                                    onDragLeave={() => setIsModalDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsModalDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) handleFileSelected(file);
                                    }}
                                    onClick={() => modalFileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2.5 ${
                                        isModalDragging
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-card-border hover:border-blue-500/50 bg-background/60'
                                    }`}
                                >
                                    <input
                                        ref={modalFileInputRef}
                                        type="file"
                                        accept={tool.accept}
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                                            e.target.value = '';
                                        }}
                                    />
                                    <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500 mx-auto">
                                        <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <div className="text-sm font-bold text-foreground">
                                        Drop a new logo here, or click to browse
                                    </div>
                                    <p className="text-[11px] text-foreground/55">
                                        PNG, JPG, WebP, or SVG · Square 512×512+ recommended
                                    </p>
                                </div>

                                {hasGenerated && (
                                    <div className="flex justify-start">
                                        <button
                                            type="button"
                                            onClick={() => setModalStep('studio')}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70 hover:text-foreground cursor-pointer"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            <span>Back to current pack</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
