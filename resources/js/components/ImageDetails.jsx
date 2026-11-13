import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { toast } from 'sonner';

const ImageDetails = ({ image, onResizeApply, collections = [] }) => {
    const originalWidth = image.width || 800;
    const originalHeight = image.height || 600;

    const [width, setWidth] = useState(originalWidth);
    const [height, setHeight] = useState(originalHeight);
    const [isLocked, setIsLocked] = useState(true);
    const [aspectRatio, setAspectRatio] = useState(originalWidth / originalHeight);

    useEffect(() => {
        if (image.width && image.height) {
            const ratio = image.width / image.height;
            setAspectRatio(ratio);
            setWidth(image.width);
            setHeight(image.height);
        }
    }, [image]);

    const handleWidthChange = (e) => {
        const newWidth = Math.max(1, Number(e.target.value));
        setWidth(newWidth);
        if (isLocked) {
            setHeight(Math.max(1, Math.round(newWidth / aspectRatio)));
        }
    };

    const handleHeightChange = (e) => {
        const newHeight = Math.max(1, Number(e.target.value));
        setHeight(newHeight);
        if (isLocked) {
            setWidth(Math.max(1, Math.round(newHeight * aspectRatio)));
        }
    };

    const stepWidth = (delta) => {
        const newWidth = Math.max(1, width + delta);
        setWidth(newWidth);
        if (isLocked) {
            setHeight(Math.max(1, Math.round(newWidth / aspectRatio)));
        }
    };

    const stepHeight = (delta) => {
        const newHeight = Math.max(1, height + delta);
        setHeight(newHeight);
        if (isLocked) {
            setWidth(Math.max(1, Math.round(newHeight * aspectRatio)));
        }
    };

    const handleResizeClick = () => {
        if (onResizeApply) {
            onResizeApply(width, height);
            toast.success(`Resized to ${width}x${height}`);
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes) return 'Unknown';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm">
            {/* PNG Info Card */}
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-lg">
                <div className="bg-slate-100 dark:bg-card-header-bg px-4 py-3 border-b border-card-border flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    <span className="font-semibold text-foreground text-sm">PNG info</span>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                            <span>Dimensions</span>
                        </div>
                        <span className="text-muted-text font-mono">
                            {image.width && image.height ? `${image.width}px x ${image.height}px` : 'Unknown'}
                        </span>
                    </div>
                    <div className="w-full h-px bg-card-border"></div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <span>Filesize</span>
                        </div>
                        <span className="text-muted-text font-mono">{formatBytes(image.size)}</span>
                    </div>
                    <div className="w-full h-px bg-card-border"></div>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                            <span>MIME type</span>
                        </div>
                        <span className="text-muted-text font-mono">{image.mimeType || 'image/png'}</span>
                    </div>
                </div>
            </div>

            {/* Resize PNG Card */}
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-lg">
                <div className="bg-slate-100 dark:bg-card-header-bg px-4 py-3 border-b border-card-border flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                    <span className="font-semibold text-foreground text-sm">Resize PNG</span>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        {/* Width Input Box */}
                        <div className="relative flex-1 flex items-center bg-input-bg border border-input-border rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                            <input
                                type="number"
                                value={width}
                                onChange={handleWidthChange}
                                className="w-full bg-transparent py-2 pl-3 pr-12 text-sm text-input-text focus:outline-none"
                                placeholder="Width"
                            />
                            <span className="absolute right-7 text-[11px] text-slate-500 font-mono pointer-events-none select-none">
                                px
                            </span>
                            <div className="absolute right-1 flex flex-col items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => stepWidth(10)}
                                    className="p-0.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer"
                                    title="Increase Width (+10px)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => stepWidth(-10)}
                                    className="p-0.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer"
                                    title="Decrease Width (-10px)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Chainlink Icon - Toggle Lock */}
                        <button
                            onClick={() => setIsLocked(!isLocked)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer flex-shrink-0 ${isLocked ? 'bg-blue-500/20 text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
                            title={isLocked ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
                        >
                            {isLocked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 0 1-1.5 0V6.75a3.75 3.75 0 1 0-7.5 0v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3h9v-3c0-2.9 2.35-5.25 5.25-5.25Z" />
                                </svg>
                            )}
                        </button>

                        {/* Height Input Box */}
                        <div className="relative flex-1 flex items-center bg-input-bg border border-input-border rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                            <input
                                type="number"
                                value={height}
                                onChange={handleHeightChange}
                                className="w-full bg-transparent py-2 pl-3 pr-12 text-sm text-input-text focus:outline-none"
                                placeholder="Height"
                            />
                            <span className="absolute right-7 text-[11px] text-slate-500 font-mono pointer-events-none select-none">
                                px
                            </span>
                            <div className="absolute right-1 flex flex-col items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => stepHeight(10)}
                                    className="p-0.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer"
                                    title="Increase Height (+10px)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => stepHeight(-10)}
                                    className="p-0.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer"
                                    title="Decrease Height (-10px)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quality Warning */}
                    {(width > originalWidth || height > originalHeight) && (
                        <div className="flex items-start gap-2 text-amber-500 text-xs bg-amber-500/10 p-2 rounded border border-amber-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mt-0.5 flex-shrink-0">
                                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                            </svg>
                            <span>Warning: Resizing larger than original ({originalWidth}x{originalHeight}) may reduce image quality.</span>
                        </div>
                    )}

                    <button
                        onClick={handleResizeClick}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-blue-600/20 cursor-pointer"
                    >
                        RESIZE
                    </button>
                </div>
            </div>

            {/* Included in Collections Card */}
            {collections && collections.length > 0 && (
                <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-slate-100 dark:bg-card-header-bg px-4 py-3 border-b border-card-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <span className="font-semibold text-foreground text-sm">Part of Collections</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                            {collections.length}
                        </span>
                    </div>
                    <div className="p-3 space-y-2">
                        {collections.map((col) => (
                            <Link
                                key={col.id}
                                href={`/collections/${col.slug}`}
                                className="group flex items-center gap-3 p-2 rounded-lg bg-foreground/[0.02] hover:bg-foreground/5 border border-card-border hover:border-blue-500/30 transition-all"
                            >
                                <div className="w-9 h-9 rounded-md bg-foreground/5 border border-card-border flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                    {col.coverImagePath ? (
                                        <img src={col.coverImagePath} alt="" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <div className="w-4 h-4 bg-blue-500/20 rounded" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">
                                        {col.name}
                                    </h4>
                                    <span className="text-[10px] text-foreground/50">
                                        View full pack &rarr;
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* PNG Keywords Card */}
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-lg">
                <div className="bg-slate-100 dark:bg-card-header-bg px-4 py-3 border-b border-card-border flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <span className="font-semibold text-foreground text-sm">PNG keywords</span>
                </div>
                <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                        {image.tags && image.tags.length > 0 ? (
                            image.tags.map((tag, index) => (
                                <Link
                                    key={index}
                                    href={`/search?q=${encodeURIComponent(tag)}`}
                                    className="px-3 py-1 bg-tag-bg hover:bg-tag-bg-hover text-tag-text text-xs rounded-md cursor-pointer transition-colors border border-tag-border"
                                >
                                    {tag}
                                </Link>
                            ))
                        ) : (
                            <span className="text-slate-500 text-xs italic">No tags available</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageDetails;

