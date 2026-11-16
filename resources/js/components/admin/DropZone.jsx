import React, { useRef, useState } from 'react';

const DropZone = ({ onFilesDropped }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const isInternalBulkDrag = (e) => {
        const types = e?.dataTransfer?.types;
        if (!types) return false;
        return Array.from(types).includes('application/x-png101-bulk-items');
    };

    const handleDragOver = (e) => {
        if (isInternalBulkDrag(e)) return;
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        if (isInternalBulkDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesDropped(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesDropped(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    return (
        <div
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${
                isDragging
                    ? 'border-primary-glow bg-primary-glow/10'
                    : 'border-card-border bg-card-bg/50 hover:border-primary-glow/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="w-16 h-16 mb-4 text-foreground/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
            </div>
            <p className="text-foreground/60 font-bold text-lg mb-2 text-center">
                Drag and Drop Your File Here to Start Uploading
            </p>
            <div className="flex items-center gap-4 w-full max-w-xs my-4">
                <div className="h-px bg-card-border flex-1"></div>
                <span className="text-foreground/40 text-sm font-bold">OR</span>
                <div className="h-px bg-card-border flex-1"></div>
            </div>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary-glow hover:bg-primary-glow/90 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Browse for Files
            </button>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png"
                multiple
                onChange={handleFileSelect}
            />
        </div>
    );
};

export default DropZone;

