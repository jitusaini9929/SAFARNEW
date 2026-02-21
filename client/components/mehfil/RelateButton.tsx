import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface RelateButtonProps {
    count: number;
    onRelate: () => void;
}

const RelateButton: React.FC<RelateButtonProps> = ({ count, onRelate }) => {
    const [isClicked, setIsClicked] = useState(false);
    const [displayCount, setDisplayCount] = useState(count);

    useEffect(() => {
        setDisplayCount(count);
    }, [count]);

    const handleClick = () => {
        if (!isClicked) {
            setIsClicked(true);
            setDisplayCount((prev) => prev + 1);
            onRelate();

            setTimeout(() => setIsClicked(false), 600);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isClicked}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all transform shadow-md action-btn-nowrap ${isClicked
                    ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground scale-110 shadow-lg shadow-primary/50'
                    : 'glass-high hover:bg-primary/10 hover:scale-105'
                }`}
            aria-label={`Relate to this message. ${displayCount} people relate.`}
            title={`${displayCount} people relate to this`}
        >
            <Sparkles className={`w-4 h-4 transition-transform ${isClicked ? 'animate-pulse' : ''}`} />
            <span className="action-label-mobile-hidden">{displayCount} relate</span>
        </button>
    );
};

export default RelateButton;
