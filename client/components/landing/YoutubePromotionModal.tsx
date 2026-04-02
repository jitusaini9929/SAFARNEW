import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// Helper functions (same as Meditation.tsx)
const ADMIN_EMAIL = "steve123@gmail.com";
const DEFAULT_MEDITATION_VIDEO_URL = "https://youtu.be/rXGlSKg_IOE?si=JR0M731OqUcejS3U";
const DEFAULT_VIDEO_THUMBNAIL = "/meditation-silhouette.webp";

const getYoutubeVideoId = (url: string) => {
    const match = String(url || "").match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
};

const getYoutubeThumbnailPair = (url: string) => {
    const id = getYoutubeVideoId(url);
    if (!id) {
        return { primary: DEFAULT_VIDEO_THUMBNAIL, fallback: DEFAULT_VIDEO_THUMBNAIL };
    }
    return {
        primary: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        fallback: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
};

interface YoutubePromotionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function YoutubePromotionModal({ open, onOpenChange }: YoutubePromotionModalProps) {
    const { user } = useAuth();
    const isMeditationAdmin = String(user?.email || "").toLowerCase() === ADMIN_EMAIL;
    const [meditationVideoUrl, setMeditationVideoUrl] = useState(DEFAULT_MEDITATION_VIDEO_URL);
    const [videoDraftUrl, setVideoDraftUrl] = useState(DEFAULT_MEDITATION_VIDEO_URL);
    const [videoSettingsError, setVideoSettingsError] = useState("");
    const [isSavingVideo, setIsSavingVideo] = useState(false);
    
    const { primary: primaryVideoThumbnail, fallback: fallbackVideoThumbnail } = getYoutubeThumbnailPair(meditationVideoUrl);
    const [videoThumbnailSrc, setVideoThumbnailSrc] = useState(() => primaryVideoThumbnail);

    useEffect(() => {
        let isCancelled = false;
        const loadMeditationVideo = async () => {
            try {
                const response = await fetch("/api/mehfil/meditation-video", { credentials: "include" });
                if (!response.ok) throw new Error("Failed to fetch meditation video.");
                const data = await response.json().catch(() => null);
                const nextVideoUrl = typeof data?.videoUrl === "string" ? data.videoUrl.trim() : "";
                const safeVideoUrl = getYoutubeVideoId(nextVideoUrl) ? nextVideoUrl : DEFAULT_MEDITATION_VIDEO_URL;

                if (!isCancelled) {
                    setMeditationVideoUrl(safeVideoUrl);
                    setVideoDraftUrl(safeVideoUrl);
                    setVideoSettingsError("");
                }
            } catch {
                if (!isCancelled) {
                    setMeditationVideoUrl(DEFAULT_MEDITATION_VIDEO_URL);
                    setVideoDraftUrl(DEFAULT_MEDITATION_VIDEO_URL);
                }
            }
        };
        loadMeditationVideo();
        return () => { isCancelled = true; };
    }, []);

    useEffect(() => {
        setVideoThumbnailSrc(primaryVideoThumbnail);
    }, [primaryVideoThumbnail]);

    const handleSaveMeditationVideo = async () => {
        if (!isMeditationAdmin) return;
        const trimmedUrl = videoDraftUrl.trim();
        if (!getYoutubeVideoId(trimmedUrl)) {
            setVideoSettingsError("Please enter a valid YouTube video URL.");
            return;
        }

        setIsSavingVideo(true);
        setVideoSettingsError("");
        try {
            const response = await fetch("/api/mehfil/meditation-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ videoUrl: trimmedUrl }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error || payload?.message || "Failed to update meditation video.");
            const nextUrl = typeof payload?.videoUrl === "string" ? payload.videoUrl.trim() : trimmedUrl;
            if (!getYoutubeVideoId(nextUrl)) throw new Error("Server returned an invalid YouTube URL.");
            setMeditationVideoUrl(nextUrl);
            setVideoDraftUrl(nextUrl);
        } catch (error: any) {
            setVideoSettingsError(error?.message || "Unable to update meditation video right now.");
        } finally {
            setIsSavingVideo(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-white dark:bg-[#161618] border-border sm:rounded-xl p-0 shadow-2xl overflow-hidden pointer-events-auto">
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all backdrop-blur-md border border-white/10"
                >
                    <X className="w-5 h-5 drop-shadow-md" />
                </button>
                <div className="relative w-full">
                   <a
                        href={meditationVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full overflow-hidden transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 relative group"
                    >
                        <img
                            loading="lazy"
                            src={videoThumbnailSrc}
                            alt="Latest Dhyan video"
                            className="w-full aspect-video object-cover"
                            onError={() => {
                                if (videoThumbnailSrc !== fallbackVideoThumbnail) {
                                    setVideoThumbnailSrc(fallbackVideoThumbnail);
                                    return;
                                }
                                setVideoThumbnailSrc(DEFAULT_VIDEO_THUMBNAIL);
                            }}
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#111] shadow-xl group-hover:scale-105 transition-transform duration-300">
                                <Play className="w-4 h-4 fill-current text-red-600" />
                                Watch on YouTube
                            </span>
                        </div>
                    </a>
                </div>
                
                <div className="p-6 text-center">
                    <h3 className="text-xl font-serif font-bold text-foreground">Latest Video</h3>
                    <p className="py-2 text-sm text-muted-foreground leading-relaxed">Discover our latest video on YouTube.</p>

                    {isMeditationAdmin && (
                        <div className="mt-5 p-4 rounded-lg bg-muted/50 space-y-3 text-left">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Admin video link
                            </label>
                            <input
                                type="url"
                                value={videoDraftUrl}
                                onChange={(event) => setVideoDraftUrl(event.target.value)}
                                placeholder="Paste YouTube video URL"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveMeditationVideo}
                                disabled={isSavingVideo}
                                className="w-full"
                            >
                                {isSavingVideo ? "Saving..." : "Update Video"}
                            </Button>
                            {videoSettingsError && (
                                <p className="text-xs text-red-500">{videoSettingsError}</p>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
