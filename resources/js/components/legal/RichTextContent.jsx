import React, { useMemo } from 'react';

const ALLOWED_TAGS = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'a',
    'h3',
    'h4',
    'blockquote',
    'code',
    'span',
]);

const DROP_WITH_CHILDREN = new Set([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'svg',
    'form',
    'input',
    'textarea',
    'button',
]);

export function sanitizeRichHtml(html) {
    if (!html || typeof html !== 'string') return '';
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return html;
    }

    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body?.firstElementChild;
    if (!root) return '';

    const sanitizeNode = (parent) => {
        const children = Array.from(parent.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.COMMENT_NODE) {
                parent.removeChild(child);
                continue;
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase();
                if (DROP_WITH_CHILDREN.has(tag)) {
                    parent.removeChild(child);
                    continue;
                }
                sanitizeNode(child);
                if (!ALLOWED_TAGS.has(tag)) {
                    while (child.firstChild) {
                        parent.insertBefore(child.firstChild, child);
                    }
                    parent.removeChild(child);
                    continue;
                }
                for (const attr of Array.from(child.attributes)) {
                    const name = attr.name.toLowerCase();
                    if (tag === 'a' && name === 'href') {
                        const val = attr.value.trim();
                        const ok =
                            val.startsWith('/') ||
                            val.startsWith('#') ||
                            /^(https?:\/\/|mailto:)/i.test(val);
                        if (!ok) {
                            child.removeAttribute(attr.name);
                        }
                        continue;
                    }
                    if (tag === 'a' && (name === 'target' || name === 'rel' || name === 'title')) {
                        continue;
                    }
                    child.removeAttribute(attr.name);
                }
            }
        }
    };

    sanitizeNode(root);
    return root.innerHTML;
}

export default function RichTextContent({ html = '', className = '' }) {
    const cleanHtml = useMemo(() => sanitizeRichHtml(html), [html]);

    if (!cleanHtml) return null;

    return (
        <div
            className={`[&_p+p]:mt-4 [&_p+ul]:mt-3 [&_p+ol]:mt-3 [&_ul+p]:mt-3 [&_ol+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_a]:text-primary-glow [&_a:hover]:underline [&_strong]:font-bold [&_strong]:text-foreground [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-4 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-primary-glow/50 [&_blockquote]:pl-4 [&_blockquote]:italic ${className}`}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
}
