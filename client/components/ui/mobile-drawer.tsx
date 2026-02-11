import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
}

export default function MobileDrawer({ isOpen, onClose, children, title }: MobileDrawerProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-background border-r border-border shadow-2xl z-[70] lg:hidden animate-in slide-in-from-left duration-300">
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="h-full overflow-y-auto pb-20">
                    {children}
                </div>
            </div>
        </>
    );
}
