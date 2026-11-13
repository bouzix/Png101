'use client';

import React, { useEffect, useRef } from 'react';

interface CodeInjectorProps {
    html: string;
    location: 'head' | 'body' | 'footer';
}

export default function CodeInjector({ html, location }: CodeInjectorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!html || !html.trim()) return;

        if (location === 'head') {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const injectedNodes: Node[] = [];

            Array.from(temp.childNodes).forEach((node) => {
                if (node.nodeName === 'SCRIPT') {
                    const oldScript = node as HTMLScriptElement;
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach((attr) =>
                        newScript.setAttribute(attr.name, attr.value)
                    );
                    newScript.textContent = oldScript.textContent;
                    document.head.appendChild(newScript);
                    injectedNodes.push(newScript);
                } else {
                    const cloned = node.cloneNode(true);
                    document.head.appendChild(cloned);
                    injectedNodes.push(cloned);
                }
            });

            return () => {
                injectedNodes.forEach((node) => {
                    if (node.parentNode === document.head) {
                        document.head.removeChild(node);
                    }
                });
            };
        }

        // For body and footer containers, ensure any <script> tags execute
        if (containerRef.current) {
            const scripts = containerRef.current.querySelectorAll('script');
            scripts.forEach((oldScript) => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach((attr) =>
                    newScript.setAttribute(attr.name, attr.value)
                );
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });
        }
    }, [html, location]);

    if (!html || !html.trim()) return null;

    if (location === 'head') {
        return null;
    }

    return (
        <div
            ref={containerRef}
            data-code-injection={location}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

