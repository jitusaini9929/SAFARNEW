import { ReactNode } from 'react';

interface FloatingActionButtonProps {
    onClick: () => void;
    icon: ReactNode;
    label?: string;
    position?: 'bottom-left' | 'bottom-right';
    className?: string;
}

export default function FloatingActionButton({
    onClick,
    icon,
    label,
    position = 'bottom-right',
    className = ''
}: FloatingActionButtonProps) {
    const positionClasses = {
        'bottom-left': 'bottom-20 left-4',
        'bottom-right': 'bottom-20 right-4'
    };

    return (
        <button
            onClick={onClick}
            className={`fixed ${positionClasses[position]} z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center active:scale-95 ${className}`}
            aria-label={label}
        >
            {icon}
        </button>
    );
}
