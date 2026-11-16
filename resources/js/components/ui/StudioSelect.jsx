import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { EDITOR_PANEL_TRANSITION, useAnimatedPresence } from '../editor/useAnimatedPresence';

/**
 * Custom branded dropdown replacing native browser <select> triggers and OS option popups.
 * Accepts either standard `<option value="...">Label</option>` children or an `options` array.
 */
export default function StudioSelect({
    value,
    onChange,
    options: optionsProp,
    children,
    placeholder = 'Select...',
    disabled = false,
    size = 'md',
    className = '',
    menuClassName = '',
    id,
    name,
    ariaLabel,
    'aria-label': ariaLabelAttr,
    'data-tooltip': dataTooltip,
    'data-testid': dataTestId,
}) {
    const [open, setOpen] = useState(false);
    const { rendered, visible } = useAnimatedPresence(open, 210);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 160, openUp: false, maxHeight: 240 });
    const [highlightedIdx, setHighlightedIdx] = useState(-1);

    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const typeaheadRef = useRef({ query: '', timer: null });

    const parsedOptions = useMemo(() => {
        if (Array.isArray(optionsProp)) {
            return optionsProp.map((opt) => ({
                value: String(opt?.value ?? ''),
                label: opt?.label ?? String(opt?.value ?? ''),
                disabled: Boolean(opt?.disabled),
            }));
        }
        const collected = [];
        React.Children.forEach(children, (child) => {
            if (!React.isValidElement(child)) return;
            if (child.type === 'option') {
                const rawVal = child.props.value !== undefined ? child.props.value : child.props.children;
                collected.push({
                    value: String(rawVal ?? ''),
                    label: child.props.children ?? String(rawVal ?? ''),
                    disabled: Boolean(child.props.disabled),
                });
            } else if (child.type === 'optgroup') {
                React.Children.forEach(child.props.children, (sub) => {
                    if (!React.isValidElement(sub) || sub.type !== 'option') return;
                    const rawVal = sub.props.value !== undefined ? sub.props.value : sub.props.children;
                    collected.push({
                        value: String(rawVal ?? ''),
                        label: sub.props.children ?? String(rawVal ?? ''),
                        group: child.props.label,
                        disabled: Boolean(sub.props.disabled),
                    });
                });
            }
        });
        return collected;
    }, [optionsProp, children]);

    const normalizedValue = value !== undefined && value !== null ? String(value) : '';
    const selectedOption = parsedOptions.find((o) => o.value === normalizedValue);
    const selectedIndex = parsedOptions.findIndex((o) => o.value === normalizedValue);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const estimatedHeight = Math.min(260, Math.max(88, parsedOptions.length * 34 + 12));
        const spaceBelow = vh - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
        const maxHeight = Math.max(120, Math.min(272, openUp ? spaceAbove : spaceBelow));
        const width = Math.max(rect.width, 136);
        const left = Math.min(Math.max(8, rect.left), Math.max(8, vw - width - 8));
        const top = openUp ? Math.max(8, rect.top - 6) : Math.min(vh - 16, rect.bottom + 6);
        setCoords({ top, left, width, openUp, maxHeight });
    };

    useLayoutEffect(() => {
        if (open) {
            updatePosition();
            setHighlightedIdx(selectedIndex >= 0 ? selectedIndex : 0);
        }
    }, [open, parsedOptions.length, selectedIndex]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e) => {
            if (
                triggerRef.current?.contains(e.target) ||
                menuRef.current?.contains(e.target)
            ) {
                return;
            }
            setOpen(false);
        };
        const onWindowMove = () => updatePosition();
        window.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('resize', onWindowMove);
        window.addEventListener('scroll', onWindowMove, true);
        return () => {
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('resize', onWindowMove);
            window.removeEventListener('scroll', onWindowMove, true);
        };
    }, [open]);

    const emitChange = (nextVal) => {
        if (onChange) {
            onChange({
                target: { value: nextVal, name: name || '', id: id || '' },
                currentTarget: { value: nextVal, name: name || '', id: id || '' },
                preventDefault() {},
                stopPropagation() {},
            });
        }
        setOpen(false);
    };

    const moveHighlight = (step) => {
        if (parsedOptions.length === 0) return;
        let idx = highlightedIdx < 0 ? 0 : highlightedIdx;
        for (let i = 0; i < parsedOptions.length; i++) {
            idx = (idx + step + parsedOptions.length) % parsedOptions.length;
            if (!parsedOptions[idx].disabled) {
                setHighlightedIdx(idx);
                return;
            }
        }
    };

    const handleKeyDown = (e) => {
        if (disabled) return;
        if (e.key === 'Escape') {
            if (open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            } else {
                moveHighlight(1);
            }
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            } else {
                moveHighlight(-1);
            }
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            } else if (highlightedIdx >= 0 && parsedOptions[highlightedIdx] && !parsedOptions[highlightedIdx].disabled) {
                emitChange(parsedOptions[highlightedIdx].value);
            }
            return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const ta = typeaheadRef.current;
            ta.query += e.key.toLowerCase();
            if (ta.timer) clearTimeout(ta.timer);
            ta.timer = setTimeout(() => {
                ta.query = '';
            }, 600);
            const matchIdx = parsedOptions.findIndex(
                (o) => !o.disabled && String(o.label).toLowerCase().startsWith(ta.query)
            );
            if (matchIdx >= 0) {
                if (open) setHighlightedIdx(matchIdx);
                else emitChange(parsedOptions[matchIdx].value);
            }
        }
    };

    const compactPadding =
        size === 'sm'
            ? 'h-7 px-2.5 text-xs font-bold rounded-lg gap-1.5 shadow-sm'
            : 'h-9 px-3 text-xs font-bold rounded-lg gap-2 shadow-sm';

    const resolvedAriaLabel = ariaLabelAttr || ariaLabel || dataTooltip || placeholder;

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                role="combobox"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={resolvedAriaLabel}
                data-tooltip={dataTooltip}
                data-testid={dataTestId}
                onClick={() => !disabled && setOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
                className={`inline-flex items-center justify-between border transition-all duration-150 select-none text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-glow/60 ${compactPadding} ${
                    open
                        ? 'bg-primary-glow text-white border-primary-glow shadow-sm'
                        : 'bg-card-bg hover:text-primary-glow border-card-border text-foreground'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            >
                <span className="truncate font-bold">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-3 h-3 shrink-0 opacity-70 transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {rendered &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="listbox"
                        aria-label={resolvedAriaLabel}
                        data-visible={visible ? 'true' : 'false'}
                        className={`fixed z-[150] rounded-xl bg-card-bg border border-card-border shadow-2xl p-1.5 flex flex-col gap-1 overflow-y-auto ${
                            coords.openUp ? 'origin-bottom -translate-y-full' : 'origin-top'
                        } ${EDITOR_PANEL_TRANSITION} ${
                            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        } ${menuClassName}`}
                        style={{
                            top: `${coords.top}px`,
                            left: `${coords.left}px`,
                            minWidth: `${coords.width}px`,
                            maxHeight: `${coords.maxHeight}px`,
                        }}
                    >
                        {parsedOptions.map((opt, idx) => {
                            const isSelected = opt.value === normalizedValue;
                            const isHighlighted = idx === highlightedIdx;
                            return (
                                <button
                                    key={`${opt.value}-${idx}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                     disabled={opt.disabled}
                                    onMouseEnter={() => !opt.disabled && setHighlightedIdx(idx)}
                                    onClick={() => !opt.disabled && emitChange(opt.value)}
                                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all ${
                                        opt.disabled
                                            ? 'opacity-45 cursor-not-allowed text-foreground/40'
                                            : isSelected
                                                ? 'bg-primary-glow text-white shadow-xs cursor-pointer'
                                                : isHighlighted
                                                    ? 'bg-card-header-bg text-foreground cursor-pointer'
                                                    : 'text-foreground/75 hover:text-foreground hover:bg-card-header-bg cursor-pointer'
                                    }`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                                </button>
                            );
                        })}
                    </div>,
                    document.body
                )}
        </>
    );
}
