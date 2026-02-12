import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';

interface ComposerProps {
    onSendThought: (content: string, imageUrl?: string) => void;
    userAvatar?: string | null;
}

const MAX_CHARS = 500;
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;
const IMAGE_QUALITY = 0.75;

// Compress image on client using canvas
function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if too large
                if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                    const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas not supported'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG for compression (unless PNG with transparency needed)
                const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(outputType, IMAGE_QUALITY);

                // Extract pure base64 (remove data:image/...;base64, prefix)
                const base64 = dataUrl.split(',')[1];

                resolve({ base64, mimeType: outputType });
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Upload base64 image to server
async function uploadImage(base64: string, mimeType: string): Promise<string> {
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: base64, mimeType }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Upload failed');
    }

    const result = await response.json();
    return result.url;
}

const Composer: React.FC<ComposerProps> = ({ onSendThought, userAvatar }) => {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const charCount = content.length;
    const isOverLimit = charCount > MAX_CHARS;
    const canSubmit = charCount > 0 && !isOverLimit && !isUploading;

    const handleImageSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Only JPEG, PNG, GIF, and WebP images are allowed.');
            return;
        }

        // Validate size (10MB raw, will be compressed)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image must be under 10MB.');
            return;
        }

        setUploadError(null);
        setImageFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (ev) => {
            setImagePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Reset file input so same file can be re-selected
        e.target.value = '';
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setUploadError(null);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        let imageUrl: string | undefined;

        // Upload image if selected
        if (imageFile) {
            try {
                setIsUploading(true);
                setUploadError(null);

                const { base64, mimeType } = await compressImage(imageFile);
                imageUrl = await uploadImage(base64, mimeType);
            } catch (err: any) {
                setUploadError(err.message || 'Failed to upload image. Try again.');
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        onSendThought(content, imageUrl);
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setUploadError(null);
    };

    return (
        <div className="glass-card rounded-3xl p-6 mb-8 border border-white/50 dark:border-white/5 shadow-xl shadow-teal-900/5 dark:shadow-black/20">
            <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shrink-0 overflow-hidden shadow-inner">
                    {userAvatar ? (
                        <img
                            src={userAvatar}
                            alt="Your avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl font-bold">
                            ?
                        </div>
                    )}
                </div>
                <div className="flex-grow">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                                e.preventDefault();
                                handleSend(e as any);
                            }
                        }}
                        placeholder="What's on your mind? Share your thoughts with the community..."
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-base focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all focus:outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200 min-h-[140px] resize-none"
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="relative mt-3 inline-block">
                            <img
                                src={imagePreview}
                                alt="Selected"
                                className="max-h-48 max-w-full rounded-xl border border-slate-200 dark:border-slate-700 object-cover shadow-sm"
                            />
                            <button
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                                title="Remove image"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Upload Error */}
                    {uploadError && (
                        <p className="text-xs text-rose-500 mt-2 font-medium">{uploadError}</p>
                    )}

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleImageSelect}
                                disabled={isUploading}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap
                                    ${imageFile
                                        ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {imageFile ? 'Change Image' : 'Add Image'}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-bold ${isOverLimit ? 'text-rose-500' : 'text-slate-400'}`}>
                                {charCount} /{MAX_CHARS}
                            </span>
                            <button
                                onClick={handleSend as any}
                                disabled={!canSubmit}
                                className="bg-gradient-to-tr from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 whitespace-nowrap"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        Share Thought
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Composer;
