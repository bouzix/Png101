import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeftRight,
    Check,
    Code2,
    Copy,
    Download,
    FileArchive,
    FileCode2,
    Loader2,
    Palette,
    Pipette,
    Plus,
    ShieldCheck,
    Sparkles,
    UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    buildZipBlob,
    canvasToBlob,
    cleanSvgMarkup,
    extractColorPalette,
    formatFileSize,
    inspectImageMetadata,
    loadImageFromFileOrUrl,
    stripExtension,
} from '@/lib/imageConverter';
import { appendDomainToFilename, triggerSiteBlobDownload } from '@/lib/utils';
import { useBatchControl } from '@/lib/useBatchControl';
import IosBrandProgressBar from '@/components/tools/IosBrandProgressBar';
import {
    CHECKER_BG_STYLE,
    StudioBatchFilmstrip,
    StudioClosedSummaryBar,
    StudioInitialDropZone,
    StudioModalFrame,
    StudioViewportStage,
    useStudioViewport,
} from '@/components/tools/StudioPopupShell';

/* ───────────────────────────────────────────────────────────────────────────
 * 1. Image <-> Base64 / Data URI Studio
 * ──────────────────────────────────────────────────────────────────────── */
function Base64Studio({ tool, preloadAsset, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const fileRef = useRef(null);

    const [studioOpen, setStudioOpen] = useState(false);
    const [tab, setTab] = useState('encode');
    const [fileName, setFileName] = useState('');
    const [fileBytes, setFileBytes] = useState(0);
    const [dataUri, setDataUri] = useState('');
    const [copiedKey, setCopiedKey] = useState(null);

    const [decodeInput, setDecodeInput] = useState('');
    const [decodedUrl, setDecodedUrl] = useState('');
    const [encodeDims, setEncodeDims] = useState({ width: 0, height: 0 });
    const [decodeDims, setDecodeDims] = useState({ width: 0, height: 0 });

    const handleFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const uri = String(reader.result || '');
            setFileName(file.name);
            setFileBytes(file.size);
            setEncodeDims({ width: 0, height: 0 });
            setDataUri(uri);
            setTab('encode');
            setStudioOpen(true);
            onTrackEvent?.({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: file.size,
                outputBytes: uri.length,
            });
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (!preloadAsset?.path) return;
        let cancelled = false;
        fetch(preloadAsset.path)
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((blob) => {
                if (cancelled) return;
                const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg');
                handleFile(new File([blob], `${preloadAsset.name || 'asset'}.${ext}`, { type: blob.type || 'image/png' }));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [preloadAsset?.path]);

    const rawBase64 = useMemo(() => {
        const idx = dataUri.indexOf(',');
        return idx >= 0 ? dataUri.slice(idx + 1) : dataUri;
    }, [dataUri]);

    const cssSnippet = dataUri ? `background-image: url("${dataUri}");` : '';
    const htmlSnippet = dataUri ? `<img src="${dataUri}" alt="${fileName || 'image'}" />` : '';
    const mdSnippet = dataUri ? `![${fileName || 'image'}](${dataUri})` : '';

    useEffect(() => {
        const val = decodeInput.trim();
        setDecodeDims({ width: 0, height: 0 });
        if (!val) {
            setDecodedUrl('');
            return;
        }
        const normalized = val.startsWith('data:image/')
            ? val
            : `data:image/png;base64,${val.replace(/\s+/g, '')}`;
        setDecodedUrl(normalized);
    }, [decodeInput]);

    const copyText = (key, text) => {
        navigator.clipboard?.writeText(text);
        setCopiedKey(key);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedKey(null), 1600);
    };

    const hasContent = Boolean(dataUri || decodeInput.trim());

    const clearStudio = () => {
        setFileName('');
        setFileBytes(0);
        setDataUri('');
        setEncodeDims({ width: 0, height: 0 });
        setDecodeInput('');
        setDecodedUrl('');
        setDecodeDims({ width: 0, height: 0 });
        setStudioOpen(false);
    };

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileRef}
                type="file"
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    e.target.value = '';
                }}
            />

            {!hasContent && !studioOpen && (
                <StudioInitialDropZone
                    icon={FileCode2}
                    title="Drop any image here to encode to Base64 & Data URI"
                    subtitle="Instant Base64, Data URI, CSS background-image & HTML snippets — or decode Base64 strings back to PNG/JPG"
                    onFiles={(files) => files?.[0] && handleFile(files[0])}
                    onClick={() => fileRef.current?.click()}
                    extraActions={
                        <button
                            type="button"
                            onClick={() => {
                                setTab('decode');
                                setStudioOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                            <span>Open Base64 &rarr; Image Decoder Studio</span>
                        </button>
                    }
                />
            )}

            {hasContent && !studioOpen && (
                <StudioClosedSummaryBar
                    thumbs={dataUri ? [{ id: 'b64', url: dataUri, name: fileName }] : decodedUrl ? [{ id: 'dec', url: decodedUrl, name: 'decoded' }] : []}
                    fallbackIcon={FileCode2}
                    title={tab === 'encode' && fileName ? fileName : 'Base64 Studio Session'}
                    subtitle={
                        tab === 'encode'
                            ? `${formatFileSize(fileBytes)} · ${dataUri.length.toLocaleString()} Base64 chars`
                            : 'Ready to inspect/decode Base64 string'
                    }
                    onAddClick={() => fileRef.current?.click()}
                    addLabel="Encode Another"
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={dataUri ? () => copyText('uri', dataUri) : null}
                    primaryLabel={dataUri ? 'Copy Data URI' : null}
                    primaryIcon={Copy}
                    onClear={clearStudio}
                    onFilesDrop={(files) => files?.[0] && handleFile(files[0])}
                />
            )}

            <StudioModalFrame
                open={studioOpen}
                onClose={() => setStudioOpen(false)}
                ariaLabel="Live Image Base64 Studio"
                icon={FileCode2}
                title={tab === 'encode' ? fileName || 'Image to Base64 Studio' : 'Base64 to Image Decoder'}
                subtitle={
                    tab === 'encode'
                        ? 'Copy raw Base64, Data URI, CSS, HTML & Markdown snippets or drop another image anytime'
                        : 'Paste a Base64 string or Data URI on the left to preview & download the decoded image'
                }
                badges={
                    tab === 'encode' && dataUri ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                            {formatFileSize(fileBytes)} → {dataUri.length.toLocaleString()} chars
                        </span>
                    ) : null
                }
                onFilesDrop={(files) => files?.[0] && handleFile(files[0])}
                dropOverlayTitle="Drop an image to encode to Base64"
                dropOverlaySubtitle="Generates Data URI, CSS, HTML & Markdown snippets instantly"
                headerActions={
                    <>
                        <div className="inline-flex rounded-xl bg-background border border-card-border p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setTab('encode')}
                                className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                                    tab === 'encode' ? 'bg-blue-600 text-white' : 'text-foreground/70 hover:text-foreground'
                                }`}
                            >
                                Image &rarr; Base64
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('decode')}
                                className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                                    tab === 'decode' ? 'bg-blue-600 text-white' : 'text-foreground/70 hover:text-foreground'
                                }`}
                            >
                                Base64 &rarr; Image
                            </button>
                        </div>

                        {tab === 'encode' && (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer"
                            >
                                <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                                <span>Replace Image</span>
                            </button>
                        )}
                    </>
                }
                leftSidebar={
                    tab === 'encode' ? (
                        <>
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Source Preview
                            </span>
                            {dataUri ? (
                                <div className="space-y-3">
                                    <StudioViewportStage
                                        showBackdropToggle={false}
                                        contentWidth={encodeDims.width}
                                        contentHeight={encodeDims.height}
                                        autoFitKey={
                                            studioOpen && tab === 'encode' && encodeDims.width > 0
                                                ? `enc-${fileName}-${fileBytes}-${encodeDims.width}x${encodeDims.height}`
                                                : null
                                        }
                                        className="rounded-xl border border-card-border h-52 flex-none"
                                    >
                                        <img
                                            src={dataUri}
                                            alt={fileName}
                                            draggable={false}
                                            onLoad={(e) => {
                                                const nw = e.currentTarget.naturalWidth;
                                                const nh = e.currentTarget.naturalHeight;
                                                if (nw > 0 && nh > 0) setEncodeDims({ width: nw, height: nh });
                                            }}
                                            style={
                                                encodeDims.width > 0
                                                    ? {
                                                          width: `${encodeDims.width}px`,
                                                          height: `${encodeDims.height}px`,
                                                          maxWidth: 'none',
                                                          maxHeight: 'none',
                                                      }
                                                    : undefined
                                            }
                                            className="block shrink-0 rounded"
                                        />
                                    </StudioViewportStage>
                                    <div className="p-3 rounded-xl bg-card-bg border border-card-border space-y-1.5 font-mono text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-foreground/60">Original Size</span>
                                            <span className="font-bold">{formatFileSize(fileBytes)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-foreground/60">Data URI Length</span>
                                            <span className="font-bold text-blue-500">{dataUri.length.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-foreground/60">Raw Base64</span>
                                            <span className="font-bold">{rawBase64.length.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full py-10 rounded-xl border-2 border-dashed border-card-border hover:border-blue-500/50 text-center text-xs font-semibold text-foreground/65 cursor-pointer"
                                >
                                    Click or drop an image to encode
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="space-y-2 h-full flex flex-col">
                            <label className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Base64 or Data URI Input
                            </label>
                            <textarea
                                value={decodeInput}
                                onChange={(e) => setDecodeInput(e.target.value)}
                                placeholder="Paste data:image/png;base64,... or raw base64 here"
                                className="flex-1 min-h-[240px] w-full bg-input-bg border border-input-border rounded-xl p-3 text-xs font-mono text-input-text focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    )
                }
                rightStage={
                    tab === 'encode' ? (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {dataUri ? (
                                [
                                    { key: 'uri', title: `Data URI (${dataUri.length.toLocaleString()} chars)`, value: dataUri },
                                    { key: 'raw', title: 'Raw Base64 String', value: rawBase64 },
                                    { key: 'css', title: 'CSS background-image', value: cssSnippet },
                                    { key: 'html', title: 'HTML <img> Tag', value: htmlSnippet },
                                    { key: 'md', title: 'Markdown Image', value: mdSnippet },
                                ].map((blk) => (
                                    <div key={blk.key} className="p-4 rounded-xl bg-card-bg border border-card-border space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground">{blk.title}</span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(blk.key, blk.value)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-xs font-bold text-blue-500 cursor-pointer"
                                            >
                                                {copiedKey === blk.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copiedKey === blk.key ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        </div>
                                        <textarea
                                            readOnly
                                            rows={3}
                                            value={blk.value}
                                            className="w-full bg-input-bg border border-input-border rounded-lg p-2.5 text-[11px] font-mono text-input-text focus:outline-none"
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-foreground/50">
                                    Drop or select an image to generate snippets.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            {decodedUrl ? (
                                <>
                                    <div className="px-4 sm:px-6 py-2.5 border-b border-card-border flex items-center justify-between gap-2 text-xs shrink-0">
                                        <span className="text-foreground/65 font-medium">
                                            Decoded image preview · Scroll to zoom &amp; drag to pan
                                        </span>
                                        <a
                                            href={decodedUrl}
                                            download={appendDomainToFilename('decoded-image.png', websiteInfo)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Download Decoded Image</span>
                                        </a>
                                    </div>
                                    <StudioViewportStage
                                        contentWidth={decodeDims.width}
                                        contentHeight={decodeDims.height}
                                        autoFitKey={
                                            studioOpen && tab === 'decode' && decodeDims.width > 0
                                                ? `dec-${decodeDims.width}x${decodeDims.height}-${decodedUrl.slice(-40)}`
                                                : null
                                        }
                                        footerHint={
                                            decodeDims.width > 0
                                                ? `${decodeDims.width}×${decodeDims.height}px decoded`
                                                : 'Decoded image'
                                        }
                                    >
                                        <img
                                            src={decodedUrl}
                                            alt="Decoded preview"
                                            draggable={false}
                                            onLoad={(e) => {
                                                const nw = e.currentTarget.naturalWidth;
                                                const nh = e.currentTarget.naturalHeight;
                                                if (nw > 0 && nh > 0) setDecodeDims({ width: nw, height: nh });
                                            }}
                                            style={
                                                decodeDims.width > 0
                                                    ? {
                                                          width: `${decodeDims.width}px`,
                                                          height: `${decodeDims.height}px`,
                                                          maxWidth: 'none',
                                                          maxHeight: 'none',
                                                      }
                                                    : undefined
                                            }
                                            className="block shrink-0"
                                        />
                                    </StudioViewportStage>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-6" style={CHECKER_BG_STYLE}>
                                    <div className="text-xs text-foreground/60 bg-card-bg/90 border border-card-border px-4 py-3 rounded-xl">
                                        Paste a valid Base64 string on the left to decode and preview it live.
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            />
        </section>
    );
}

/* ───────────────────────────────────────────────────────────────────────────
 * 2. SVG Cleaner & React JSX Studio
 * ──────────────────────────────────────────────────────────────────────── */
function SvgOptimizerStudio({ tool, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const fileRef = useRef(null);

    const [studioOpen, setStudioOpen] = useState(false);
    const [rawSvg, setRawSvg] = useState('');
    const [fileName, setFileName] = useState('icon.svg');
    const [previewBg, setPreviewBg] = useState('checker');

    const [removeComments, setRemoveComments] = useState(true);
    const [removeMetadata, setRemoveMetadata] = useState(true);
    const [removeDimensions, setRemoveDimensions] = useState(false);
    const [collapseWhitespace, setCollapseWhitespace] = useState(true);
    const [toJsx, setToJsx] = useState(false);
    const [copied, setCopied] = useState(false);

    const cleanedSvg = useMemo(
        () =>
            cleanSvgMarkup(rawSvg, {
                removeComments,
                removeMetadata,
                removeDimensions,
                collapseWhitespace,
                toJsx,
            }),
        [rawSvg, removeComments, removeMetadata, removeDimensions, collapseWhitespace, toJsx]
    );

    const previewSvg = useMemo(
        () =>
            cleanSvgMarkup(rawSvg, {
                removeComments,
                removeMetadata,
                removeDimensions: false,
                collapseWhitespace,
                toJsx: false,
            }),
        [rawSvg, removeComments, removeMetadata, collapseWhitespace]
    );

    const svgDims = useMemo(() => {
        if (!previewSvg || !previewSvg.includes('<svg')) return { width: 128, height: 128 };
        const wMatch = previewSvg.match(/<svg[^>]*\swidth=["']([0-9.]+)(?:px)?["']/i);
        const hMatch = previewSvg.match(/<svg[^>]*\sheight=["']([0-9.]+)(?:px)?["']/i);
        if (wMatch && hMatch) {
            const w = Math.max(16, Math.round(Number(wMatch[1])));
            const h = Math.max(16, Math.round(Number(hMatch[1])));
            if (Number.isFinite(w) && Number.isFinite(h)) return { width: w, height: h };
        }
        const vbMatch = previewSvg.match(/viewBox=["'][\s0-9.-]+[\s,]+[\s0-9.-]+[\s,]+([0-9.]+)[\s,]+([0-9.]+)["']/i);
        if (vbMatch) {
            const w = Math.max(16, Math.round(Number(vbMatch[1])));
            const h = Math.max(16, Math.round(Number(vbMatch[2])));
            if (Number.isFinite(w) && Number.isFinite(h)) return { width: w, height: h };
        }
        return { width: 128, height: 128 };
    }, [previewSvg]);

    const handleFile = async (file) => {
        if (!file) return;
        const text = await file.text();
        setFileName(file.name);
        setRawSvg(text);
        setStudioOpen(true);
        onTrackEvent?.({
            slug: tool.slug,
            eventType: 'convert',
            filesCount: 1,
            inputBytes: file.size,
            outputBytes: text.length,
        });
    };

    const savingsPct =
        rawSvg.length > 0
            ? Math.max(0, Math.round(((rawSvg.length - cleanedSvg.length) / rawSvg.length) * 100))
            : 0;

    const clearStudio = () => {
        setRawSvg('');
        setFileName('icon.svg');
        setStudioOpen(false);
    };

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    e.target.value = '';
                }}
            />

            {!rawSvg.trim() && !studioOpen && (
                <StudioInitialDropZone
                    icon={Code2}
                    title="Drop an .SVG file here to clean bloat & convert to React JSX"
                    subtitle="Strip Figma/Illustrator metadata, inspect live size savings, preview vectors & export clean JSX"
                    onFiles={(files) => files?.[0] && handleFile(files[0])}
                    onClick={() => fileRef.current?.click()}
                    extraActions={
                        <button
                            type="button"
                            onClick={() => setStudioOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background hover:bg-card-header-bg border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer transition-colors"
                        >
                            <Code2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Open Blank SVG Code Editor</span>
                        </button>
                    }
                />
            )}

            {rawSvg.trim() && !studioOpen && (
                <StudioClosedSummaryBar
                    fallbackIcon={Code2}
                    title={fileName}
                    subtitle={`${formatFileSize(rawSvg.length)} → ${formatFileSize(cleanedSvg.length)} (-${savingsPct}%) · ${toJsx ? 'React JSX' : 'Clean SVG'}`}
                    onAddClick={() => fileRef.current?.click()}
                    addLabel="Load Another SVG"
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={
                        !toJsx && cleanedSvg
                            ? () =>
                                  triggerSiteBlobDownload(
                                      new Blob([cleanedSvg], { type: 'image/svg+xml' }),
                                      `${stripExtension(fileName)}.min.svg`,
                                      websiteInfo
                                  )
                            : () => {
                                  navigator.clipboard?.writeText(cleanedSvg);
                                  toast.success('Copied output markup');
                              }
                    }
                    primaryLabel={!toJsx ? 'Download .min.svg' : 'Copy React JSX'}
                    primaryIcon={!toJsx ? Download : Copy}
                    onClear={clearStudio}
                    onFilesDrop={(files) => files?.[0] && handleFile(files[0])}
                />
            )}

            <StudioModalFrame
                open={studioOpen}
                onClose={() => setStudioOpen(false)}
                ariaLabel="Live SVG Cleaner and JSX Studio"
                icon={Code2}
                title={fileName || 'SVG Cleaner & JSX Studio'}
                subtitle="Toggle optimization passes on the left and watch source, cleaned output & rendered vector update live"
                badges={
                    rawSvg.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 font-mono text-[10px] font-bold text-emerald-500">
                            {formatFileSize(rawSvg.length)} → {formatFileSize(cleanedSvg.length)} (-{savingsPct}%)
                        </span>
                    )
                }
                onFilesDrop={(files) => files?.[0] && handleFile(files[0])}
                dropOverlayTitle="Drop an .SVG file to load"
                dropOverlaySubtitle="Your current cleaner & React JSX rules apply immediately"
                headerActions={
                    <>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer"
                        >
                            <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                            <span>Load .SVG</span>
                        </button>

                        <button
                            type="button"
                            disabled={!cleanedSvg}
                            onClick={() => {
                                navigator.clipboard?.writeText(cleanedSvg);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                                toast.success('Copied markup');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500 text-xs font-bold text-foreground cursor-pointer disabled:opacity-45"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                            <span>{copied ? 'Copied' : toJsx ? 'Copy JSX' : 'Copy SVG'}</span>
                        </button>

                        {!toJsx && (
                            <button
                                type="button"
                                disabled={!cleanedSvg}
                                onClick={() =>
                                    triggerSiteBlobDownload(
                                        new Blob([cleanedSvg], { type: 'image/svg+xml' }),
                                        `${stripExtension(fileName)}.min.svg`,
                                        websiteInfo
                                    )
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-45"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download .min.svg</span>
                            </button>
                        )}
                    </>
                }
                leftSidebar={
                    <>
                        <div className="space-y-2">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Optimization Rules
                            </span>
                            <div className="space-y-1.5">
                                {[
                                    { label: 'Strip Comments', checked: removeComments, set: setRemoveComments },
                                    { label: 'Strip Editor Metadata', checked: removeMetadata, set: setRemoveMetadata },
                                    { label: 'Collapse Whitespace', checked: collapseWhitespace, set: setCollapseWhitespace },
                                    { label: 'Remove Fixed width/height', checked: removeDimensions, set: setRemoveDimensions },
                                    { label: 'Convert to React JSX', checked: toJsx, set: setToJsx },
                                ].map((opt) => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => opt.set(!opt.checked)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border font-bold cursor-pointer transition-all ${
                                            opt.checked
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        {opt.checked && <Check className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-card-border">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Vector Preview
                            </span>
                            <StudioViewportStage
                                backdrop={previewBg}
                                onBackdropChange={setPreviewBg}
                                contentWidth={svgDims.width}
                                contentHeight={svgDims.height}
                                autoFitKey={
                                    studioOpen && previewSvg && previewSvg.includes('<svg')
                                        ? `${fileName}-${svgDims.width}x${svgDims.height}`
                                        : null
                                }
                                footerHint={`${svgDims.width}×${svgDims.height}px`}
                                className="rounded-xl border border-card-border h-52 flex-none"
                            >
                                {previewSvg && previewSvg.includes('<svg') ? (
                                    <div
                                        style={{
                                            width: `${svgDims.width}px`,
                                            height: `${svgDims.height}px`,
                                            maxWidth: 'none',
                                            maxHeight: 'none',
                                        }}
                                        className="shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                        dangerouslySetInnerHTML={{ __html: previewSvg }}
                                    />
                                ) : (
                                    <span className="text-[11px] text-foreground/50">Paste valid SVG to preview</span>
                                )}
                            </StudioViewportStage>
                        </div>
                    </>
                }
                rightStage={
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5 overflow-hidden">
                        <div className="flex flex-col min-h-0 space-y-2">
                            <div className="flex justify-between text-xs font-bold shrink-0">
                                <span>Source SVG ({formatFileSize(rawSvg.length)})</span>
                            </div>
                            <textarea
                                value={rawSvg}
                                onChange={(e) => setRawSvg(e.target.value)}
                                placeholder="<svg viewBox='0 0 24 24'>...</svg>"
                                className="flex-1 w-full bg-input-bg border border-input-border rounded-xl p-3 text-xs font-mono text-input-text focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        <div className="flex flex-col min-h-0 space-y-2">
                            <div className="flex justify-between text-xs font-bold shrink-0">
                                <span>
                                    {toJsx ? 'React JSX Output' : 'Cleaned SVG'} ({formatFileSize(cleanedSvg.length)} · -{savingsPct}%)
                                </span>
                            </div>
                            <textarea
                                readOnly
                                value={cleanedSvg}
                                className="flex-1 w-full bg-input-bg border border-input-border rounded-xl p-3 text-xs font-mono text-input-text focus:outline-none resize-none"
                            />
                        </div>
                    </div>
                }
            />
        </section>
    );
}

/* ───────────────────────────────────────────────────────────────────────────
 * 3. Color Palette & CSS / Tailwind Extractor Studio
 * ──────────────────────────────────────────────────────────────────────── */
function ColorPaletteStudio({ tool, preloadAsset, onTrackEvent }) {
    const fileRef = useRef(null);
    const itemsRef = useRef([]);
    const activeIdRef = useRef(null);
    const batchRunRef = useRef(0);

    const [items, setItems] = useState([]);
    itemsRef.current = items;
    const [activeId, setActiveId] = useState(null);
    activeIdRef.current = activeId;
    const [studioOpen, setStudioOpen] = useState(false);
    const [colorCount, setColorCount] = useState(8);
    const [pickedHex, setPickedHex] = useState('');
    const paletteViewport = useStudioViewport({ minZoom: 0.05, maxZoom: 8, initialZoom: 1 });
    const paletteImgRef = useRef(null);
    const [activeNatural, setActiveNatural] = useState({ width: 0, height: 0 });

    const activeItem = items.find((i) => i.id === activeId) || items[0] || null;

    useEffect(() => {
        setActiveNatural({ width: activeItem?.width || 0, height: activeItem?.height || 0 });
    }, [activeItem?.id]);

    useEffect(() => {
        return () => {
            batchRunRef.current++;
            itemsRef.current.forEach((it) => {
                if (it.sourcePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(it.sourcePreviewUrl);
            });
        };
    }, []);

    const handleFilesAdded = async (fileList) => {
        const list = Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'));
        if (!list.length) {
            toast.error('Please drop valid image files.');
            return;
        }
        const hadExisting = itemsRef.current.length > 0;
        const added = list.map((f, i) => ({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            file: f,
            name: f.name,
            sourcePreviewUrl: URL.createObjectURL(f),
            swatches: [],
            width: 0,
            height: 0,
            status: 'pending',
            progress: 0,
            settingsSig: '',
        }));
        setItems((prev) => [...prev, ...added]);
        if (!hadExisting || added.length === 1 || !studioOpen) {
            setActiveId(added[0].id);
        }
        setStudioOpen(true);
        onTrackEvent?.({ slug: tool.slug, eventType: 'convert', filesCount: added.length, inputBytes: 0, outputBytes: colorCount });
        if (hadExisting) toast.success(`Added ${added.length} image(s) to palette studio`);
    };

    useEffect(() => {
        if (!preloadAsset?.path) return;
        let cancelled = false;
        fetch(preloadAsset.path)
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((blob) => {
                if (cancelled) return;
                const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg');
                handleFilesAdded([new File([blob], `${preloadAsset.name || 'asset'}.${ext}`, { type: blob.type || 'image/png' })]);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [preloadAsset?.path]);

    const paletteSettingsSig = `palette|${colorCount}`;
    const paletteItemIdsKey = items.map((i) => i.id).join('|');
    const paletteDoneCount = items.filter(
        (it) => it.status === 'done' && it.settingsSig === paletteSettingsSig
    ).length;
    const paletteBatchBusy = items.length > 0 && paletteDoneCount < items.length;
    const paletteBatchPct = items.length > 0 ? Math.round((paletteDoneCount / items.length) * 100) : 0;

    // Auto-extract color palettes for every queued image in background
    useEffect(() => {
        if (!itemsRef.current.length) return undefined;

        const stale = itemsRef.current.filter(
            (it) =>
                it.settingsSig !== paletteSettingsSig ||
                it.status === 'pending' ||
                it.status === 'processing'
        );
        if (!stale.length) return undefined;

        const runId = ++batchRunRef.current;
        const staleSet = new Set(stale.map((it) => it.id));

        setItems((prev) =>
            prev.map((it) =>
                staleSet.has(it.id) ? { ...it, status: 'pending', progress: 0 } : it
            )
        );

        const timer = setTimeout(async () => {
            const processedInRun = new Set();

            while (batchRunRef.current === runId) {
                const candidates = itemsRef.current.filter(
                    (it) =>
                        !processedInRun.has(it.id) &&
                        (staleSet.has(it.id) ||
                            it.settingsSig !== paletteSettingsSig ||
                            it.status === 'pending')
                );
                if (!candidates.length) break;

                const nextRow =
                    candidates.find((it) => it.id === activeIdRef.current) || candidates[0];
                processedInRun.add(nextRow.id);

                setItems((prev) =>
                    prev.map((it) =>
                        it.id === nextRow.id ? { ...it, status: 'processing', progress: 45 } : it
                    )
                );
                await new Promise((r) => requestAnimationFrame(r));
                if (batchRunRef.current !== runId) break;

                try {
                    const loaded = await loadImageFromFileOrUrl(nextRow.file);
                    const nextSwatches = extractColorPalette(loaded.img, colorCount);
                    const nw = loaded.width || 0;
                    const nh = loaded.height || 0;
                    loaded.revoke?.();
                    if (batchRunRef.current !== runId) break;

                    setItems((prev) =>
                        prev.map((it) =>
                            it.id === nextRow.id
                                ? {
                                      ...it,
                                      swatches: nextSwatches,
                                      width: nw || it.width,
                                      height: nh || it.height,
                                      status: 'done',
                                      progress: 100,
                                      settingsSig: paletteSettingsSig,
                                  }
                                : it
                        )
                    );
                } catch {
                    if (batchRunRef.current !== runId) break;
                    setItems((prev) =>
                        prev.map((it) =>
                            it.id === nextRow.id ? { ...it, status: 'error', progress: 0 } : it
                        )
                    );
                }
            }
        }, 80);

        return () => clearTimeout(timer);
    }, [paletteItemIdsKey, paletteSettingsSig, colorCount]);

    const handleRemoveItem = (id) => {
        setItems((prev) => {
            const target = prev.find((it) => it.id === id);
            if (target?.sourcePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.sourcePreviewUrl);
            const next = prev.filter((it) => it.id !== id);
            if (activeId === id) setActiveId(next[0]?.id || null);
            if (next.length === 0) setStudioOpen(false);
            return next;
        });
    };

    const clearQueue = () => {
        batchRunRef.current++;
        itemsRef.current.forEach((it) => {
            if (it.sourcePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(it.sourcePreviewUrl);
        });
        setItems([]);
        setActiveId(null);
        setStudioOpen(false);
    };

    const swatches = activeItem?.swatches || [];
    const cssVarsSnippet = swatches.length
        ? `:root {\n${swatches.map((s, i) => `  --brand-${i + 1}: ${s.hex};`).join('\n')}\n}`
        : '';
    const tailwindSnippet = swatches.length
        ? `colors: {\n${swatches.map((s, i) => `  palette${i + 1}: '${s.hex}',`).join('\n')}\n}`
        : '';

    const handleSamplePalettePixel = (e) => {
        if (paletteViewport.panMovedRef.current) {
            paletteViewport.panMovedRef.current = false;
            return;
        }
        const img = paletteImgRef.current;
        if (!img || !img.naturalWidth || !img.naturalHeight) return;
        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const x = Math.max(0, Math.min(img.naturalWidth - 1, Math.floor(((e.clientX - rect.left) / rect.width) * img.naturalWidth)));
        const y = Math.max(0, Math.min(img.naturalHeight - 1, Math.floor(((e.clientY - rect.top) / rect.height) * img.naturalHeight)));
        const probe = document.createElement('canvas');
        probe.width = img.naturalWidth;
        probe.height = img.naturalHeight;
        const ctx = probe.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        setPickedHex(hex);
        navigator.clipboard?.writeText(hex);
        toast.success(`Picked & copied ${hex.toUpperCase()}`);
    };

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileRef}
                type="file"
                multiple
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) handleFilesAdded(e.target.files);
                    e.target.value = '';
                }}
            />

            {items.length === 0 && (
                <StudioInitialDropZone
                    icon={Palette}
                    title="Drop one or more logos, screenshots, or photos to extract color palettes"
                    subtitle="Click any swatch to copy HEX · Copy CSS variables & Tailwind config with live WCAG contrast scores"
                    onFiles={handleFilesAdded}
                    onClick={() => fileRef.current?.click()}
                />
            )}

            {items.length > 0 && !studioOpen && (
                <StudioClosedSummaryBar
                    thumbs={items.map((it) => ({ id: it.id, url: it.sourcePreviewUrl, name: it.name }))}
                    fallbackIcon={Palette}
                    title={items.length === 1 ? items[0].name : `${items.length} images analyzed in Palette Studio`}
                    subtitle={`${colorCount} swatches extracted${swatches[0] ? ` · Lead color ${swatches[0].hex}` : ''}`}
                    onAddClick={() => fileRef.current?.click()}
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={
                        cssVarsSnippet
                            ? () => {
                                  navigator.clipboard?.writeText(cssVarsSnippet);
                                  toast.success('Copied CSS Variables');
                              }
                            : null
                    }
                    primaryLabel="Copy CSS Variables"
                    primaryIcon={Copy}
                    onClear={clearQueue}
                    onFilesDrop={handleFilesAdded}
                />
            )}

            <StudioModalFrame
                open={studioOpen && items.length > 0}
                onClose={() => setStudioOpen(false)}
                ariaLabel="Live Color Palette Studio"
                icon={Palette}
                title={activeItem?.name || 'Color Palette Studio'}
                subtitle="Adjust swatch count or click any swatch card to copy its HEX code immediately"
                badges={
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                        {Math.max(1, items.findIndex((i) => i.id === activeItem?.id) + 1)} / {items.length}
                    </span>
                }
                onFilesDrop={handleFilesAdded}
                dropOverlayTitle="Drop images to extract their color palettes"
                dropOverlaySubtitle="Switch between images anytime in the bottom filmstrip"
                topSubBar={
                    paletteBatchBusy && (
                        <div className="px-5 py-2 border-b border-card-border bg-background/60 shrink-0 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/70">
                                <span>
                                    Extracting palettes ({paletteDoneCount} / {items.length})...
                                </span>
                                <span className="font-mono font-bold text-blue-500">
                                    {paletteBatchPct}%
                                </span>
                            </div>
                            <IosBrandProgressBar progress={paletteBatchPct} size="sm" withShadow />
                        </div>
                    )
                }
                headerActions={
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5 text-blue-500" />
                        <span>Add Images</span>
                    </button>
                }
                leftSidebar={
                    <>
                        {activeItem && (
                            <div className="space-y-2">
                                <StudioViewportStage
                                    viewport={paletteViewport}
                                    showBackdropToggle={false}
                                    contentWidth={activeNatural.width || activeItem.width}
                                    contentHeight={activeNatural.height || activeItem.height}
                                    autoFitKey={
                                        studioOpen &&
                                        activeItem &&
                                        (activeNatural.width || activeItem.width) > 0
                                            ? `${activeItem.id}-${activeNatural.width || activeItem.width}x${activeNatural.height || activeItem.height}`
                                            : null
                                    }
                                    className="rounded-xl border border-card-border h-48 flex-none"
                                    footerHint="Click pixel to sample"
                                >
                                    <img
                                        ref={paletteImgRef}
                                        src={activeItem.sourcePreviewUrl}
                                        alt={activeItem.name}
                                        draggable={false}
                                        onClick={handleSamplePalettePixel}
                                        onLoad={(e) => {
                                            const nw = e.currentTarget.naturalWidth;
                                            const nh = e.currentTarget.naturalHeight;
                                            if (nw > 0 && nh > 0) setActiveNatural({ width: nw, height: nh });
                                        }}
                                        style={
                                            (activeNatural.width || activeItem.width) > 0
                                                ? {
                                                      width: `${activeNatural.width || activeItem.width}px`,
                                                      height: `${activeNatural.height || activeItem.height}px`,
                                                      maxWidth: 'none',
                                                      maxHeight: 'none',
                                                  }
                                                : undefined
                                        }
                                        className="block shrink-0 rounded cursor-crosshair"
                                        title="Click any pixel to sample & copy its HEX"
                                    />
                                </StudioViewportStage>
                                {pickedHex && (
                                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card-bg border border-card-border text-[11px]">
                                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/75">
                                            <Pipette className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Picked Pixel</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard?.writeText(pickedHex);
                                                toast.success(`Copied ${pickedHex.toUpperCase()}`);
                                            }}
                                            className="inline-flex items-center gap-1.5 font-mono font-bold text-foreground cursor-pointer"
                                        >
                                            <span
                                                className="w-3.5 h-3.5 rounded border border-card-border"
                                                style={{ backgroundColor: pickedHex }}
                                            />
                                            <span>{pickedHex.toUpperCase()}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2 pt-1">
                            <div className="flex justify-between font-bold">
                                <span className="text-foreground/75">Swatches Extracted</span>
                                <span className="font-mono text-blue-500">{colorCount}</span>
                            </div>
                            <input
                                type="range"
                                min={4}
                                max={12}
                                value={colorCount}
                                onChange={(e) => setColorCount(Number(e.target.value))}
                                className="w-full accent-blue-500 cursor-pointer"
                            />
                        </div>

                        {[
                            { title: 'CSS Variables', code: cssVarsSnippet },
                            { title: 'Tailwind Config', code: tailwindSnippet },
                        ].map((s) => (
                            <div key={s.title} className="p-3 rounded-xl bg-card-bg border border-card-border space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span>{s.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard?.writeText(s.code);
                                            toast.success(`Copied ${s.title}`);
                                        }}
                                        className="text-blue-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                    </button>
                                </div>
                                <pre className="text-[10px] font-mono text-foreground/75 overflow-x-auto leading-relaxed">
                                    {s.code}
                                </pre>
                            </div>
                        ))}
                    </>
                }
                rightStage={
                    <>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                {swatches.map((sw, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard?.writeText(sw.hex);
                                            toast.success(`Copied ${sw.hex}`);
                                        }}
                                        className="text-left rounded-xl border border-card-border bg-card-bg overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
                                    >
                                        <div
                                            className="h-20 w-full flex items-end justify-between p-2.5 text-xs font-mono font-bold"
                                            style={{ backgroundColor: sw.hex, color: sw.isLight ? '#0f172a' : '#ffffff' }}
                                        >
                                            <span>{sw.hex}</span>
                                            <span>{sw.pct}%</span>
                                        </div>
                                        <div className="p-3 text-[11px] font-mono space-y-1 text-foreground/75">
                                            <div className="truncate font-semibold">{sw.rgb}</div>
                                            <div className="text-[10px] text-foreground/55">
                                                WCAG W {sw.contrastWhite}:1 · B {sw.contrastBlack}:1
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <StudioBatchFilmstrip
                            items={items}
                            activeId={activeItem?.id}
                            onSelect={setActiveId}
                            onRemove={handleRemoveItem}
                            onAddClick={() => fileRef.current?.click()}
                            renderBadge={(it) => (it.swatches?.[0] ? { text: it.swatches[0].hex } : null)}
                        />
                    </>
                }
            />
        </section>
    );
}

/* ───────────────────────────────────────────────────────────────────────────
 * 4. EXIF & Metadata Inspector / Stripper Studio
 * ──────────────────────────────────────────────────────────────────────── */
function MetadataStripStudio({ tool, onTrackEvent }) {
    const { props } = usePage();
    const websiteInfo = props?.websiteInfo || {};
    const fileRef = useRef(null);
    const itemsRef = useRef([]);
    const activeIdRef = useRef(null);
    const batchRunRef = useRef(0);

    const [items, setItems] = useState([]);
    itemsRef.current = items;
    const [activeId, setActiveId] = useState(null);
    activeIdRef.current = activeId;
    const [studioOpen, setStudioOpen] = useState(false);
    const [outputFormat, setOutputFormat] = useState('auto');
    const [quality, setQuality] = useState(92);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [activeNatural, setActiveNatural] = useState({ width: 0, height: 0 });
    const batchCtrl = useBatchControl();

    const activeItem = items.find((i) => i.id === activeId) || items[0] || null;

    useEffect(() => {
        setActiveNatural({ width: activeItem?.width || 0, height: activeItem?.height || 0 });
    }, [activeItem?.id]);

    useEffect(() => {
        return () => {
            batchRunRef.current++;
            itemsRef.current.forEach((it) => {
                if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
                if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
            });
        };
    }, []);

    const handleFiles = async (list) => {
        const valid = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
        if (!valid.length) {
            toast.error('Please upload valid image files.');
            return;
        }
        const hadExisting = itemsRef.current.length > 0;
        const analyzed = [];
        for (const f of valid) {
            const meta = await inspectImageMetadata(f);
            analyzed.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                file: f,
                name: f.name,
                size: f.size,
                sourcePreviewUrl: URL.createObjectURL(f),
                meta,
                cleaned: false,
                status: 'pending',
                progress: 0,
                processedUrl: null,
                result: null,
                settingsSig: '',
                width: 0,
                height: 0,
            });
        }
        setItems((prev) => [...prev, ...analyzed]);
        if (!hadExisting || analyzed.length === 1 || !studioOpen) {
            setActiveId(analyzed[0].id);
        }
        setStudioOpen(true);
        if (hadExisting) toast.success(`Added ${analyzed.length} image(s) to privacy studio`);
    };

    const stripSingleToBlob = async (item) => {
        const loaded = await loadImageFromFileOrUrl(item.file);
        try {
            const c = document.createElement('canvas');
            c.width = loaded.width;
            c.height = loaded.height;
            const ctx = c.getContext('2d');
            const origMime = ['image/jpeg', 'image/png', 'image/webp'].includes(item.file.type)
                ? item.file.type
                : 'image/png';
            const mime =
                outputFormat === 'jpg'
                    ? 'image/jpeg'
                    : outputFormat === 'png'
                      ? 'image/png'
                      : outputFormat === 'webp'
                        ? 'image/webp'
                        : origMime;
            if (mime === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, loaded.width, loaded.height);
            }
            ctx.drawImage(loaded.img, 0, 0);
            const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
            const blob = await canvasToBlob(c, mime, quality / 100);
            return {
                blob,
                filename: `${stripExtension(item.name)}-clean.${ext}`,
                width: loaded.width,
                height: loaded.height,
            };
        } finally {
            loaded.revoke?.();
        }
    };

    const metaSettingsSig = `meta|${outputFormat}|${quality}`;
    const metaItemIdsKey = items.map((i) => i.id).join('|');
    const metaDoneCount = items.filter(
        (it) => it.status === 'done' && it.settingsSig === metaSettingsSig
    ).length;
    const metaBatchBusy = items.length > 0 && metaDoneCount < items.length;
    const metaBatchPct = items.length > 0 ? Math.round((metaDoneCount / items.length) * 100) : 0;

    // Auto-strip metadata in background for every uploaded image
    useEffect(() => {
        if (!itemsRef.current.length) return undefined;

        const stale = itemsRef.current.filter(
            (it) =>
                it.settingsSig !== metaSettingsSig ||
                it.status === 'pending' ||
                it.status === 'processing'
        );
        if (!stale.length) return undefined;

        const runId = ++batchRunRef.current;
        const staleSet = new Set(stale.map((it) => it.id));

        setItems((prev) =>
            prev.map((it) =>
                staleSet.has(it.id) ? { ...it, status: 'pending', progress: 0 } : it
            )
        );

        const timer = setTimeout(async () => {
            const processedInRun = new Set();

            while (batchRunRef.current === runId) {
                const candidates = itemsRef.current.filter(
                    (it) =>
                        !processedInRun.has(it.id) &&
                        (staleSet.has(it.id) ||
                            it.settingsSig !== metaSettingsSig ||
                            it.status === 'pending')
                );
                if (!candidates.length) break;

                const nextRow =
                    candidates.find((it) => it.id === activeIdRef.current) || candidates[0];
                processedInRun.add(nextRow.id);

                setItems((prev) =>
                    prev.map((it) =>
                        it.id === nextRow.id ? { ...it, status: 'processing', progress: 45 } : it
                    )
                );
                await new Promise((r) => requestAnimationFrame(r));
                if (batchRunRef.current !== runId) break;

                try {
                    const res = await stripSingleToBlob(nextRow);
                    if (batchRunRef.current !== runId) break;
                    const nextUrl = URL.createObjectURL(res.blob);

                    setItems((prev) =>
                        prev.map((it) => {
                            if (it.id !== nextRow.id) return it;
                            if (it.processedUrl && it.processedUrl !== nextUrl) {
                                URL.revokeObjectURL(it.processedUrl);
                            }
                            return {
                                ...it,
                                status: 'done',
                                progress: 100,
                                processedUrl: nextUrl,
                                result: res,
                                width: res.width || it.width,
                                height: res.height || it.height,
                                settingsSig: metaSettingsSig,
                                cleaned: true,
                            };
                        })
                    );
                } catch {
                    if (batchRunRef.current !== runId) break;
                    setItems((prev) =>
                        prev.map((it) =>
                            it.id === nextRow.id ? { ...it, status: 'error', progress: 0 } : it
                        )
                    );
                }
            }
        }, 120);

        return () => clearTimeout(timer);
    }, [metaItemIdsKey, metaSettingsSig, outputFormat, quality]);

    const handleDownloadCurrent = async () => {
        if (!activeItem) return;
        try {
            const res =
                activeItem.status === 'done' &&
                activeItem.settingsSig === metaSettingsSig &&
                activeItem.result?.blob
                    ? activeItem.result
                    : await stripSingleToBlob(activeItem);
            triggerSiteBlobDownload(res.blob, res.filename, websiteInfo);
            setItems((prev) => prev.map((it) => (it.id === activeItem.id ? { ...it, cleaned: true } : it)));
            onTrackEvent?.({
                slug: tool.slug,
                eventType: 'convert',
                filesCount: 1,
                inputBytes: activeItem.size,
                outputBytes: res.blob.size,
            });
            toast.success('Clean metadata-free image downloaded!');
        } catch {
            toast.error('Failed to strip metadata');
        }
    };

    const handleDownloadAllZip = async () => {
        if (!items.length || exporting) return;
        batchCtrl.reset();
        setExporting(true);
        setExportProgress(0);

        try {
            const entries = [];
            const usedNames = new Map();
            let inSum = 0;
            let outSum = 0;

            for (let i = 0; i < items.length; i++) {
                if (await batchCtrl.waitIfPausedOrStopped()) {
                    toast.info(`Stopped after ${entries.length} image(s).`);
                    break;
                }
                const row = items[i];
                const res =
                    row.status === 'done' &&
                    row.settingsSig === metaSettingsSig &&
                    row.result?.blob
                        ? row.result
                        : await stripSingleToBlob(row);
                const tagged = appendDomainToFilename(res.filename, websiteInfo);
                const count = (usedNames.get(tagged) || 0) + 1;
                usedNames.set(tagged, count);
                const uniqueName = count === 1 ? tagged : tagged.replace(/(\.[^.]+)$/, `-${count}$1`);

                entries.push({ filename: uniqueName, blob: res.blob });
                inSum += row.size;
                outSum += res.blob.size;
                setItems((prev) => prev.map((it) => (it.id === row.id ? { ...it, cleaned: true } : it)));
                setExportProgress(Math.round(((i + 1) / items.length) * 100));
                await new Promise((r) => requestAnimationFrame(r));
            }

            if (entries.length === 1 && items.length === 1) {
                triggerSiteBlobDownload(entries[0].blob, entries[0].filename, websiteInfo);
            } else if (entries.length > 0) {
                const zip = await buildZipBlob(entries);
                triggerSiteBlobDownload(zip, 'clean-no-exif-images.zip', websiteInfo);
                onTrackEvent?.({
                    slug: tool.slug,
                    eventType: 'convert',
                    filesCount: entries.length,
                    inputBytes: inSum,
                    outputBytes: outSum,
                });
                toast.success(`Exported ${entries.length} clean metadata-free images as ZIP!`);
            }
        } catch {
            toast.error('Failed to export clean ZIP');
        } finally {
            setExporting(false);
        }
    };

    const handleRemoveItem = (id) => {
        setItems((prev) => {
            const target = prev.find((it) => it.id === id);
            if (target?.sourcePreviewUrl) URL.revokeObjectURL(target.sourcePreviewUrl);
            if (target?.processedUrl) URL.revokeObjectURL(target.processedUrl);
            const next = prev.filter((it) => it.id !== id);
            if (activeId === id) setActiveId(next[0]?.id || null);
            if (next.length === 0) setStudioOpen(false);
            return next;
        });
    };

    const clearQueue = () => {
        batchCtrl.stop();
        batchRunRef.current++;
        itemsRef.current.forEach((it) => {
            if (it.sourcePreviewUrl) URL.revokeObjectURL(it.sourcePreviewUrl);
            if (it.processedUrl) URL.revokeObjectURL(it.processedUrl);
        });
        setItems([]);
        setActiveId(null);
        setStudioOpen(false);
    };

    const gpsCount = items.filter((i) => i.meta?.hasGps).length;
    const exifCount = items.filter((i) => i.meta?.hasMetadata).length;

    return (
        <section className="w-full space-y-6">
            <input
                ref={fileRef}
                type="file"
                multiple
                accept={tool.accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />

            {items.length === 0 && (
                <StudioInitialDropZone
                    icon={ShieldCheck}
                    title="Drop JPG, PNG, or WebP files to inspect & strip EXIF metadata"
                    subtitle="Audit camera, GPS coordinates & XMP tags per image, then download clean privacy-safe copies locally"
                    onFiles={handleFiles}
                    onClick={() => fileRef.current?.click()}
                />
            )}

            {items.length > 0 && !studioOpen && (
                <StudioClosedSummaryBar
                    thumbs={items.map((it) => ({ id: it.id, url: it.sourcePreviewUrl, name: it.name }))}
                    fallbackIcon={ShieldCheck}
                    title={items.length === 1 ? items[0].name : `${items.length} images inspected`}
                    subtitle={`${exifCount} with EXIF/XMP (${gpsCount} GPS) · Output quality ${quality}%`}
                    onAddClick={() => fileRef.current?.click()}
                    onOpenStudio={() => setStudioOpen(true)}
                    onPrimaryAction={items.length > 1 ? handleDownloadAllZip : handleDownloadCurrent}
                    primaryLabel={items.length > 1 ? `Download Clean (${items.length}) .zip` : 'Download Clean Image'}
                    primaryIcon={items.length > 1 ? FileArchive : Download}
                    primaryDisabled={exporting}
                    onClear={clearQueue}
                    onFilesDrop={handleFiles}
                />
            )}

            <StudioModalFrame
                open={studioOpen && items.length > 0}
                onClose={() => setStudioOpen(false)}
                busy={exporting}
                ariaLabel="Live EXIF and Metadata Privacy Studio"
                icon={ShieldCheck}
                title={activeItem?.name || 'EXIF & Metadata Studio'}
                subtitle="Inspect embedded camera/GPS metadata on the right and export clean stripped copies"
                badges={
                    <>
                        {activeItem?.meta?.hasGps ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 font-mono text-[10px] font-bold">
                                GPS / Sensitive EXIF
                            </span>
                        ) : activeItem?.meta?.hasMetadata ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 font-mono text-[10px] font-bold">
                                {activeItem.meta.findings.length} Tags Found
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 font-mono text-[10px] font-bold">
                                Clean
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 font-mono text-[10px] font-bold text-blue-500">
                            {Math.max(1, items.findIndex((i) => i.id === activeItem?.id) + 1)} / {items.length}
                        </span>
                    </>
                }
                onFilesDrop={handleFiles}
                dropOverlayTitle="Drop images to inspect & strip metadata"
                dropOverlaySubtitle="Every dropped file is audited locally without leaving your browser"
                topSubBar={
                    (exporting || metaBatchBusy) && (
                        <div className="px-5 py-2 border-b border-card-border bg-background/60 shrink-0 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/70">
                                <span>
                                    {exporting
                                        ? 'Packing clean ZIP archive...'
                                        : `Stripping metadata in background (${metaDoneCount} / ${items.length})...`}
                                </span>
                                <span className="font-mono font-bold text-blue-500">
                                    {exporting ? exportProgress : metaBatchPct}%
                                </span>
                            </div>
                            <IosBrandProgressBar
                                progress={exporting ? exportProgress : metaBatchPct}
                                size="sm"
                                withShadow
                            />
                        </div>
                    )
                }
                headerActions={
                    <>
                        <button
                            type="button"
                            disabled={exporting}
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500/40 text-xs font-bold text-foreground cursor-pointer disabled:opacity-50"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-500" />
                            <span>Add Images</span>
                        </button>

                        {items.length > 1 && (
                            <button
                                type="button"
                                disabled={exporting}
                                onClick={handleDownloadCurrent}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-card-border hover:border-blue-500 text-xs font-bold text-foreground cursor-pointer disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5 text-blue-500" />
                                <span>Download Clean</span>
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={exporting}
                            onClick={items.length > 1 ? handleDownloadAllZip : handleDownloadCurrent}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : items.length > 1 ? (
                                <FileArchive className="w-3.5 h-3.5" />
                            ) : (
                                <Download className="w-3.5 h-3.5" />
                            )}
                            <span>
                                {exporting
                                    ? `${exportProgress}%`
                                    : items.length > 1
                                      ? `Download Clean (${items.length}) .zip`
                                      : 'Download Clean Image'}
                            </span>
                        </button>
                    </>
                }
                leftSidebar={
                    <>
                        <div className="p-3.5 rounded-xl bg-card-bg border border-card-border space-y-2">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-foreground/65 block">
                                Batch Privacy Audit
                            </span>
                            <div className="space-y-1 font-mono text-xs">
                                <div className="flex justify-between">
                                    <span className="text-foreground/65">Images Loaded</span>
                                    <span className="font-bold">{items.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-foreground/65">With Metadata</span>
                                    <span className="font-bold text-amber-500">{exifCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-foreground/65">GPS Flagged</span>
                                    <span className="font-bold text-rose-500">{gpsCount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-card-border">
                            <span className="font-bold text-foreground/75 uppercase tracking-wider text-[11px] block">
                                Clean Output Format
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { id: 'auto', label: 'ORIG' },
                                    { id: 'png', label: 'PNG' },
                                    { id: 'webp', label: 'WEBP' },
                                    { id: 'jpg', label: 'JPG' },
                                ].map((fmt) => (
                                    <button
                                        key={fmt.id}
                                        type="button"
                                        onClick={() => setOutputFormat(fmt.id)}
                                        className={`py-1.5 rounded-lg border font-mono text-[11px] font-extrabold cursor-pointer transition-colors ${
                                            outputFormat === fmt.id
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-card-bg border-card-border text-foreground/75 hover:border-blue-500/40'
                                        }`}
                                    >
                                        {fmt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-card-border">
                            <div className="flex justify-between font-bold">
                                <span className="text-foreground/75">Re-encode Quality</span>
                                <span className="font-mono text-blue-500">{quality}%</span>
                            </div>
                            <input
                                type="range"
                                min={50}
                                max={100}
                                value={quality}
                                onChange={(e) => setQuality(Number(e.target.value))}
                                className="w-full accent-blue-500 cursor-pointer"
                            />
                            <p className="text-[10px] text-foreground/55 leading-snug">
                                Clean copies are freshly drawn onto an isolated HTML5 canvas so every EXIF, XMP, ICC, and GPS header is removed.
                            </p>
                        </div>
                    </>
                }
                rightStage={
                    <>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                            {activeItem && (
                                <>
                                    <div className="space-y-3">
                                        <StudioViewportStage
                                            className="rounded-xl border border-card-border h-56 flex-none"
                                            contentWidth={activeNatural.width || activeItem.width}
                                            contentHeight={activeNatural.height || activeItem.height}
                                            autoFitKey={
                                                studioOpen &&
                                                activeItem &&
                                                (activeNatural.width || activeItem.width) > 0
                                                    ? `${activeItem.id}-${activeNatural.width || activeItem.width}x${activeNatural.height || activeItem.height}`
                                                    : null
                                            }
                                            footerHint={
                                                (activeNatural.width || activeItem.width) > 0
                                                    ? `${activeNatural.width || activeItem.width}×${activeNatural.height || activeItem.height}px`
                                                    : activeItem.file.type || 'image'
                                            }
                                        >
                                            <img
                                                src={activeItem.processedUrl || activeItem.sourcePreviewUrl}
                                                alt={activeItem.name}
                                                draggable={false}
                                                onLoad={(e) => {
                                                    const nw = e.currentTarget.naturalWidth;
                                                    const nh = e.currentTarget.naturalHeight;
                                                    if (nw > 0 && nh > 0) setActiveNatural({ width: nw, height: nh });
                                                }}
                                                style={
                                                    (activeNatural.width || activeItem.width) > 0
                                                        ? {
                                                              width: `${activeNatural.width || activeItem.width}px`,
                                                              height: `${activeNatural.height || activeItem.height}px`,
                                                              maxWidth: 'none',
                                                              maxHeight: 'none',
                                                          }
                                                        : undefined
                                                }
                                                className="block shrink-0"
                                            />
                                        </StudioViewportStage>

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-card-bg border border-card-border">
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="font-bold text-sm text-foreground truncate">{activeItem.name}</div>
                                                <div className="text-xs font-mono text-foreground/60">
                                                    Size: {formatFileSize(activeItem.size)} · {activeItem.file.type || 'image'}
                                                </div>
                                            </div>
                                            <div>
                                                {activeItem.meta?.hasGps ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-500 text-xs font-bold">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        GPS &amp; Sensitive EXIF Tags Found — Download Clean to Strip
                                                    </span>
                                                ) : activeItem.meta?.hasMetadata ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 text-xs font-bold">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        {activeItem.meta.findings.length} Metadata Tag(s) Detected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        No Sensitive EXIF/GPS Metadata Found
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {activeItem.meta?.findings?.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 text-xs">
                                            {activeItem.meta.findings.map((tag, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`px-3 py-2 rounded-xl border ${
                                                        tag.sensitive
                                                            ? 'border-rose-500/35 bg-rose-500/10 text-rose-400'
                                                            : 'border-card-border bg-card-bg text-foreground/80'
                                                    }`}
                                                >
                                                    <span className="font-bold">{tag.name}:</span> {tag.value}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-xl bg-card-bg border border-card-border text-center text-xs text-foreground/60">
                                            This image has no readable EXIF/XMP/GPS fields. You can still export a freshly re-encoded canvas copy cleanly.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <StudioBatchFilmstrip
                            items={items}
                            activeId={activeItem?.id}
                            onSelect={setActiveId}
                            onRemove={handleRemoveItem}
                            onAddClick={() => fileRef.current?.click()}
                            renderBadge={(it) =>
                                it.cleaned
                                    ? { text: 'Clean', tone: 'success' }
                                    : it.meta?.hasGps
                                      ? { text: 'GPS!', tone: 'danger' }
                                      : it.meta?.hasMetadata
                                        ? { text: `${it.meta.findings.length} EXIF`, tone: 'warning' }
                                        : { text: 'Clean', tone: 'success' }
                            }
                        />
                    </>
                }
            />
        </section>
    );
}

export default function DevToolsStudios(props) {
    switch (props.tool.mode) {
        case 'base64':
            return <Base64Studio {...props} />;
        case 'svg-optimize':
            return <SvgOptimizerStudio {...props} />;
        case 'palette':
            return <ColorPaletteStudio {...props} />;
        case 'metadata-strip':
            return <MetadataStripStudio {...props} />;
        default:
            return null;
    }
}
