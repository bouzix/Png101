import React, { useEffect, useRef, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Link2,
    Unlink,
    RemoveFormatting,
    Code2,
    Eye,
    Check,
    X,
} from 'lucide-react';

const PLACEHOLDER_TOKENS = [
    { label: 'Site Name', token: '{{websiteName}}' },
    { label: 'Company', token: '{{companyName}}' },
    { label: 'Site URL', token: '{{websiteUrl}}' },
    { label: 'Contact Email', token: '{{contactEmail}}' },
    { label: 'DMCA Email', token: '{{dmcaEmail}}' },
    { label: 'Country', token: '{{country}}' },
    { label: 'Founded Year', token: '{{foundedYear}}' },
];

export default function RichTextEditor({
    value = '',
    onChange,
    minHeightClass = 'min-h-[140px]',
    showTokens = true,
}) {
    const editorRef = useRef(null);
    const lastValueRef = useRef(value);
    const savedRangeRef = useRef(null);

    const [sourceMode, setSourceMode] = useState(false);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        ul: false,
        ol: false,
    });
    const [linkPromptOpen, setLinkPromptOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');

    useEffect(() => {
        if (sourceMode) return;
        const el = editorRef.current;
        if (!el) return;
        const isFocused = document.activeElement === el;
        if (!isFocused || value !== lastValueRef.current) {
            if (el.innerHTML !== (value || '')) {
                el.innerHTML = value || '';
            }
            lastValueRef.current = value;
        }
    }, [value, sourceMode]);

    const refreshFormatState = () => {
        if (typeof document === 'undefined' || sourceMode) return;
        try {
            setActiveFormats({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                ul: document.queryCommandState('insertUnorderedList'),
                ol: document.queryCommandState('insertOrderedList'),
            });
        } catch {
            // Ignore command state query errors
        }
    };

    const emitChange = () => {
        const el = editorRef.current;
        if (!el || !onChange) return;
        const nextHtml = el.innerHTML;
        lastValueRef.current = nextHtml;
        onChange(nextHtml);
        refreshFormatState();
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (savedRangeRef.current && sel) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        }
    };

    const exec = (cmd, arg = null) => {
        if (sourceMode) return;
        editorRef.current?.focus();
        try {
            document.execCommand('styleWithCSS', false, false);
        } catch {
            // Browser may not support styleWithCSS
        }
        document.execCommand(cmd, false, arg);
        emitChange();
    };

    const openLinkPrompt = () => {
        saveSelection();
        setLinkUrl('https://');
        setLinkPromptOpen(true);
    };

    const applyLink = (e) => {
        e?.preventDefault();
        const trimmed = linkUrl.trim();
        if (!trimmed) {
            setLinkPromptOpen(false);
            return;
        }
        restoreSelection();
        document.execCommand('createLink', false, trimmed);
        emitChange();
        setLinkPromptOpen(false);
    };

    const insertToken = (token) => {
        if (sourceMode) {
            onChange?.(`${value || ''}${token}`);
            return;
        }
        editorRef.current?.focus();
        document.execCommand('insertText', false, token);
        emitChange();
    };

    const toolbarBtnClass = (active) =>
        `p-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            active
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white'
        }`;

    return (
        <div className="rounded-xl border border-card-border bg-background overflow-hidden">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-card-border">
                <div className="flex flex-wrap items-center gap-1">
                    {!sourceMode && (
                        <>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('bold');
                                }}
                                title="Bold (Ctrl+B)"
                                className={toolbarBtnClass(activeFormats.bold)}
                            >
                                <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('italic');
                                }}
                                title="Italic (Ctrl+I)"
                                className={toolbarBtnClass(activeFormats.italic)}
                            >
                                <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('underline');
                                }}
                                title="Underline (Ctrl+U)"
                                className={toolbarBtnClass(activeFormats.underline)}
                            >
                                <Underline className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-4 bg-card-border mx-1" />

                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('insertUnorderedList');
                                }}
                                title="Bullet List"
                                className={toolbarBtnClass(activeFormats.ul)}
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('insertOrderedList');
                                }}
                                title="Numbered List"
                                className={toolbarBtnClass(activeFormats.ol)}
                            >
                                <ListOrdered className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-4 bg-card-border mx-1" />

                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    openLinkPrompt();
                                }}
                                title="Add Link to Selected Text"
                                className={toolbarBtnClass(linkPromptOpen)}
                            >
                                <Link2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('unlink');
                                }}
                                title="Remove Link"
                                className={toolbarBtnClass(false)}
                            >
                                <Unlink className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    exec('removeFormat');
                                }}
                                title="Clear Formatting"
                                className={toolbarBtnClass(false)}
                            >
                                <RemoveFormatting className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    {sourceMode && (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 px-1.5">
                            HTML Source Mode
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setSourceMode((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                        sourceMode
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                            : 'bg-background border-card-border text-foreground/70 hover:text-foreground'
                    }`}
                    title={sourceMode ? 'Switch to Visual Editor' : 'Switch to HTML Source'}
                >
                    {sourceMode ? (
                        <>
                            <Eye className="w-3 h-3" />
                            <span>Visual</span>
                        </>
                    ) : (
                        <>
                            <Code2 className="w-3 h-3" />
                            <span>HTML</span>
                        </>
                    )}
                </button>
            </div>

            {/* Inline Link Bar */}
            {linkPromptOpen && !sourceMode && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border-b border-blue-500/20">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                        URL:
                    </span>
                    <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyLink(e);
                            if (e.key === 'Escape') setLinkPromptOpen(false);
                        }}
                        placeholder="https://... or mailto:... or /dmca-policy"
                        className="flex-1 px-2.5 py-1 text-xs rounded-md bg-background border border-card-border text-foreground focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={applyLink}
                        className="p-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                        title="Apply Link"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setLinkPromptOpen(false)}
                        className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 text-foreground/70 hover:text-foreground cursor-pointer"
                        title="Cancel"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Dynamic Placeholder Chips */}
            {showTokens && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/40 border-b border-card-border">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45 mr-1">
                        Insert:
                    </span>
                    {PLACEHOLDER_TOKENS.map((item) => (
                        <button
                            key={item.token}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                insertToken(item.token);
                            }}
                            className="px-1.5 py-0.5 rounded bg-card-bg border border-card-border hover:border-blue-500/50 text-[10px] font-mono text-foreground/75 hover:text-blue-500 transition-colors cursor-pointer"
                            title={`Insert ${item.token} (auto-updates from Website Info settings)`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Editor Surface */}
            {sourceMode ? (
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                    rows={7}
                    className={`w-full ${minHeightClass} p-3.5 bg-background text-foreground font-mono text-xs leading-relaxed focus:outline-none resize-y`}
                />
            ) : (
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={emitChange}
                    onBlur={emitChange}
                    onKeyUp={refreshFormatState}
                    onMouseUp={refreshFormatState}
                    className={`w-full ${minHeightClass} p-3.5 text-sm text-foreground/90 leading-relaxed focus:outline-none [&_p+p]:mt-3 [&_p+ul]:mt-2 [&_p+ol]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_a]:text-blue-500 [&_a]:underline [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline`}
                />
            )}
        </div>
    );
}
