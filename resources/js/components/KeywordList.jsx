import React from 'react';
import { Link } from '@inertiajs/react';

const KeywordList = ({ keywords = [] }) => {
    const defaultKeywords = ['Nature', 'Technology', 'Abstract', 'Animals', 'Food', 'People', 'Business', 'Icons'];
    const displayKeywords = keywords.length > 0 ? keywords : defaultKeywords;

    return (
        <div className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto px-4 mb-12">
            {displayKeywords.map((keyword, index) => (
                <Link
                    key={index}
                    href={`/search?q=${encodeURIComponent(keyword)}`}
                    className="px-4 py-1.5 rounded-full text-xs md:text-sm font-medium bg-tag-bg text-tag-text border border-tag-border hover:bg-tag-bg-hover hover:border-blue-500/40 transition-all duration-200"
                >
                    {keyword}
                </Link>
            ))}
        </div>
    );
};

export default KeywordList;

