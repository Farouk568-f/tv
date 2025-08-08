import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';

interface CursorContextType {
    x: number;
    y: number;
    isVisible: boolean;
    isClicking: boolean;
    scrollContainerRef: React.MutableRefObject<HTMLElement | null>;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

const CURSOR_SPEED = 25;
const SCROLL_SPEED = 40;
const SCROLL_THRESHOLD = 0.15; // 15% from top or bottom

export const CursorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [isVisible, setIsVisible] = useState(true);
    const [isClicking, setIsClicking] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHoveredElement = useRef<HTMLElement | null>(null);

    const exitTypingMode = useCallback(() => {
        const activeEl = document.activeElement;
        if (activeEl instanceof HTMLElement && typeof activeEl.blur === 'function') {
            activeEl.blur();
        }
        setIsTyping(false);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isTyping) {
            if (e.key === 'Escape') {
                e.preventDefault();
                exitTypingMode();
            }
            return;
        }

        e.preventDefault();

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            setPosition(prevPos => {
                let { x, y } = prevPos;
                switch (e.key) {
                    case 'ArrowUp': y -= CURSOR_SPEED; break;
                    case 'ArrowDown': y += CURSOR_SPEED; break;
                    case 'ArrowLeft': x -= CURSOR_SPEED; break;
                    case 'ArrowRight': x += CURSOR_SPEED; break;
                }

                x = Math.max(0, Math.min(x, window.innerWidth));
                y = Math.max(0, Math.min(y, window.innerHeight));

                const container = scrollContainerRef.current;
                if (container) {
                    const bounds = container.getBoundingClientRect();
                    const thresholdPx = bounds.height * SCROLL_THRESHOLD;

                    if (y > bounds.bottom - thresholdPx && container.scrollTop + container.clientHeight < container.scrollHeight) {
                        container.scrollBy({ top: SCROLL_SPEED, behavior: 'smooth' });
                    } else if (y < bounds.top + thresholdPx && container.scrollTop > 0) {
                        container.scrollBy({ top: -SCROLL_SPEED, behavior: 'smooth' });
                    }
                }
                return { x, y };
            });
        }

        if (e.key === 'Enter') {
            const elem = document.elementFromPoint(position.x, position.y);
            if (elem instanceof HTMLElement) {
                const focusableInput = elem.closest('.focusable-input');
                if (focusableInput instanceof HTMLElement) {
                    focusableInput.focus();
                    setIsTyping(true);
                } else {
                    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                    setIsClicking(true);
                    elem.click();
                    clickTimeoutRef.current = setTimeout(() => setIsClicking(false), 200);
                }
            }
        }
    }, [isTyping, exitTypingMode, position.x, position.y]);

    useEffect(() => {
        if (isTyping) {
            if (lastHoveredElement.current) {
                lastHoveredElement.current.classList.remove('focused');
                lastHoveredElement.current = null;
            }
            return;
        }

        const el = document.elementFromPoint(position.x, position.y);
        const focusableEl = el?.closest('.focusable') as HTMLElement | null;

        if (focusableEl !== lastHoveredElement.current) {
            if (lastHoveredElement.current) {
                lastHoveredElement.current.classList.remove('focused');
            }
            if (focusableEl) {
                focusableEl.classList.add('focused');
            }
            lastHoveredElement.current = focusableEl;
        }
    }, [position.x, position.y, isTyping]);

    useEffect(() => {
        const handleBlur = (e: FocusEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (isTyping) {
                   setIsTyping(false);
                }
            }
        };

        document.addEventListener('blur', handleBlur, true);
        return () => {
            document.removeEventListener('blur', handleBlur, true);
        };
    }, [isTyping]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        };
    }, [handleKeyDown]);

    return (
        <CursorContext.Provider value={{ x: position.x, y: position.y, isVisible, isClicking, scrollContainerRef }}>
            {children}
        </CursorContext.Provider>
    );
};

export const useCursor = (): CursorContextType => {
    const context = useContext(CursorContext);
    if (context === undefined) {
        throw new Error('useCursor must be used within a CursorProvider');
    }
    return context;
};