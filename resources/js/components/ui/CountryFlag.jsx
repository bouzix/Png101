import React, { useState, useEffect } from 'react';

export function CountryFlag({ code, name = '', fallback = '🌐', className = 'w-5 h-3.5' }) {
    const normalized = String(code || '').trim().toLowerCase();
    const isIso2 = /^[a-z]{2}$/.test(normalized) && normalized !== 'xx' && normalized !== 't1';
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => {
        setImgFailed(false);
    }, [normalized]);

    if (!isIso2 || imgFailed) {
        return (
            <span className="text-base leading-none shrink-0" title={name || code || 'Unknown'}>
                {fallback || '🌐'}
            </span>
        );
    }

    return (
        <img
            src={`https://flagcdn.com/w40/${normalized}.png`}
            srcSet={`https://flagcdn.com/w80/${normalized}.png 2x`}
            alt={name || normalized.toUpperCase()}
            title={name || normalized.toUpperCase()}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className={`${className} object-cover rounded-[2px] border border-white/15 shrink-0 inline-block`}
        />
    );
}

