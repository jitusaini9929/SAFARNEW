import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    maxHeight?: string;
}

export default function BottomSheet({
    isOpen,
    onClose,
    children,
    title,
    maxHeight = 'max-h-[80vh]'
}: BottomSheetProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className={`fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-[70] ${maxHeight} animate-in slide-in-from-bottom duration-300`}>
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(80vh - 100px)' }}>
                    {children}
                </div>
            </div>
        </>
    );
}
