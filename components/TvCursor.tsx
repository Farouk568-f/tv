import React from 'react';
import { useCursor } from '../contexts/CursorContext';

const TvCursor: React.FC = () => {
    const { x, y, isVisible, isClicking } = useCursor();

    if (!isVisible) {
        return null;
    }
    
    const scale = isClicking ? 1.5 : 1;

    return (
        <div 
            className="tv-cursor"
            style={{ 
                transform: `translate(${x}px, ${y}px) scale(${scale})`
            }}
        />
    );
};

export default TvCursor;
