import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FlagModalProps {
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

const FLAG_REASONS = [
    'Spam',
    'Inappropriate content',
    'Harassment',
    'Misinformation',
    'Other',
];

const FlagModal: React.FC<FlagModalProps> = ({ onClose, onSubmit }) => {
    const [selectedReason, setSelectedReason] = useState('');

    const handleSubmit = () => {
        if (selectedReason) {
            onSubmit(selectedReason);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-high rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/10 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold mb-2">
                    Report This Message
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Help us keep Mehfil a safe space for everyone
                </p>

                <div className="space-y-2 mb-6">
                    {FLAG_REASONS.map((reason) => (
                        <label
                            key={reason}
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                            <input
                                type="radio"
                                name="reason"
                                value={reason}
                                checked={selectedReason === reason}
                                onChange={(e) => setSelectedReason(e.target.value)}
                                className="w-4 h-4 cursor-pointer accent-primary"
                            />
                            <span className="font-medium">{reason}</span>
                        </label>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 glass-high rounded-xl font-semibold hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-md ${selectedReason
                                ? 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                    >
                        Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlagModal;
