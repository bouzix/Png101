import React from 'react';
import Link from 'next/link';

const keywords = [
    'science', 'book', 'stamp', 'chart', 'macbook', 'fist', 'circuit', 'food', 'badge', 'easter', 'clown', 'paper'
];

const KeywordList = () => {
    return (
        <div className="flex flex-wrap justify-center gap-4 text-sm text-foreground/60 mt-6">
            {keywords.map((keyword) => (
                <Link
                    key={keyword}
                    href={`/search?q=${encodeURIComponent(keyword)}`}
                    className="cursor-pointer hover:text-primary-glow transition-colors duration-200"
                >
                    {keyword}
                </Link>
            ))}
        </div>
    );
};

export default KeywordList;
