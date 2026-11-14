import React from 'react';
import { Link, usePage } from '@inertiajs/react';

const FALLBACK_KEYWORDS = [
    'science', 'book', 'stamp', 'chart', 'macbook', 'fist', 'circuit', 'food', 'badge', 'paper'
];

const getKeywordVisibilityClass = (index) => {
    if (index < 5) {
        return '';
    }
    if (index < 7) {
        return 'hidden md:inline-block';
    }
    if (index < 8) {
        return 'hidden lg:inline-block';
    }
    return 'hidden xl:inline-block';
};

const KeywordList = () => {
    const { props } = usePage();
    const rawKeywords = Array.isArray(props?.popularKeywords) && props.popularKeywords.length > 0
        ? props.popularKeywords
        : FALLBACK_KEYWORDS;
    const keywords = rawKeywords.slice(0, 10);

    return (
        <div className="flex flex-wrap justify-center gap-4 text-sm text-foreground/60 mt-6">
            {keywords.map((keyword, index) => (
                <Link
                    key={keyword}
                    href={`/search?q=${encodeURIComponent(keyword)}`}
                    className={`${getKeywordVisibilityClass(index)} cursor-pointer hover:text-primary-glow transition-colors duration-200`}
                >
                    {keyword}
                </Link>
            ))}
        </div>
    );
};

export default KeywordList;
