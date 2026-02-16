import React, { useState, useEffect, useRef } from 'react';
import {
    Bell, Plus, Bold, Italic, ImageIcon, Mic, X, Loader2, Pencil, Send,
    ShieldCheck, Trash2, LinkIcon, Play, Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface LinkMeta {
    url: string;
    title: string;
    description: string;
    image: string;
}

interface Sandesh {
    id: string;
    content: string;
    importance: 'normal' | 'high';
    created_at: string;
    link_meta?: LinkMeta;
    image_url?: string;
    audio_url?: string;
}

const SandeshCard = () => {
    const [sandesh, setSandesh] = useState<Sandesh | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    // New State
    const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Audio State
    const [audioUrl, setAudioUrl] = useState('');
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);



    const fetchSandesh = async () => {
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSandesh(data.sandesh);

                // Update admin status from backend source of truth
                if (typeof data.isAdmin === 'boolean') {
                    setIsAdmin(data.isAdmin);
                }

                // Check for new announcement
                if (data.sandesh) {
                    const lastReadId = localStorage.getItem('mehfil_last_read_sandesh_id');
                    if (lastReadId !== data.sandesh.id) {
                        setHasUnread(true);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch sandesh', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSandesh();
        // Poll every 30 seconds for updates
        const intervalId = setInterval(fetchSandesh, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const markAsRead = () => {
        if (sandesh && hasUnread) {
            localStorage.setItem('mehfil_last_read_sandesh_id', sandesh.id);
            setHasUnread(false);
        }
    };

    const handleUrlDetection = async (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = text.match(urlRegex);

        if (match && !linkMeta && !previewLoading) {
            const url = match[0];
            setPreviewLoading(true);
            try {
                const res = await fetch(`${API_URL}/mehfil/sandesh/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.metadata) setLinkMeta(data.metadata);
                }
            } catch (err) {
                console.error('Failed to fetch preview', err);
            } finally {
                setPreviewLoading(false);
            }
        } else if (!match) {
            setLinkMeta(null);
        }
    };

    const insertText = (before: string, after: string = '') => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = newContent;

        const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
        setNewContent(newText);

        // Reset cursor position
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + before.length, end + before.length);
            }
        }, 0);
    };

    const handlePost = async () => {
        if (!newContent.trim() && !imageUrl && !audioUrl) return;

        setIsPosting(true);
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${API_URL}/mehfil/sandesh/${editId}` : `${API_URL}/mehfil/sandesh`;

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: newContent,
                    link_meta: linkMeta,
                    image_url: imageUrl,
                    audio_url: audioUrl
                }),
                credentials: 'include', // Important for session cookie
            });

            if (res.ok) {
                toast.success(isEditing ? 'Update edited successfully' : 'Update posted successfully');
                setNewContent('');
                setLinkMeta(null);
                setImageUrl('');
                setAudioUrl('');
                setShowInput(false);
                setIsEditing(false);
                setEditId(null);
                fetchSandesh();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to post update');
            }
        } catch (err) {
            toast.error('Error posting update');
        } finally {
            setIsPosting(false);
        }
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Verify it's an audio file
        if (!file.type.startsWith('audio/')) {
            toast.error('Please upload an audio file');
            return;
        }

        setIsUploadingAudio(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result?.toString().split(',')[1];
                if (!base64Data) {
                    toast.error('Failed to process audio file');
                    setIsUploadingAudio(false);
                    return;
                }

                const res = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: base64Data,
                        mimeType: file.type
                    }),
                    credentials: 'include'
                });

                const data = await res.json();
                if (data.success) {
                    setAudioUrl(data.url);
                    toast.success('Audio uploaded successfully');
                } else {
                    toast.error(data.message || 'Audio upload failed');
                }
                setIsUploadingAudio(false);
            };
        } catch (error) {
            console.error('Audio upload error:', error);
            toast.error('Audio upload failed');
            setIsUploadingAudio(false);
        }
    };

    const toggleAudioPlay = (url: string, id: string) => {
        if (playingAudioId === id) {
            // Pause
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            // Play new
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audio.onended = () => setPlayingAudioId(null);
            audio.play().catch(e => toast.error("Playback failed"));
            audioRef.current = audio;
            setPlayingAudioId(id);
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    const handleEdit = (sandesh: Sandesh) => {
        setNewContent(sandesh.content);
        setImageUrl(sandesh.image_url || '');
        setAudioUrl(sandesh.audio_url || '');
        setLinkMeta(sandesh.link_meta || null);
        setIsEditing(true);
        setEditId(sandesh.id);
        setShowInput(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this update?')) return;

        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Update deleted successfully');
                setSandesh(null); // Clear displayed sandesh
                fetchSandesh(); // Refresh to get next latest if any
            } else {
                toast.error('Failed to delete update');
            }
        } catch (err) {
            toast.error('Error deleting update');
        }
    };

    if (loading) return null;

    return (
        <div
            className="backdrop-blur-3xl bg-white/60 dark:bg-[#0a0a0a]/60 border border-white/40 dark:border-white/10 shadow-glass rounded-[2rem] p-5 min-h-[500px] w-full lg:w-[108%] -ml-[4%] transition-all duration-300 hover:shadow-glass-hover group relative z-10"
            onClick={markAsRead}
            onMouseEnter={markAsRead}
        >
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-xl relative">
                        <Bell className={`w-5 h-5 text-indigo-600 dark:text-indigo-400 ${hasUnread ? 'animate-swing' : ''}`} />
                        {hasUnread && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                        )}
                    </span>
                    Sandesh
                </h2>

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowInput(!showInput);
                            }}
                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <Plus className="w-4 h-4 text-slate-500" />
                        </Button>
                    )}
                    {isEditing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsEditing(false);
                                setEditId(null);
                                setNewContent('');
                                setImageUrl('');
                                setAudioUrl('');
                                setLinkMeta(null);
                                setShowInput(false);
                            }}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
                        >
                            Cancel Edit
                        </Button>
                    )}
                </div>
            </div>

            {showInput && (
                <div className="mb-6 animate-in slide-in-from-top-2 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/20">
                    <div className="flex gap-2 mb-2 pb-2 border-b border-white/10">
                        <Button variant="ghost" size="sm" onClick={() => insertText('**', '**')} className="h-8 w-8 p-0" title="Bold">
                            <Bold className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => insertText('*', '*')} className="h-8 w-8 p-0" title="Italic">
                            <Italic className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowImageInput(!showImageInput)} className={`h-8 w-8 p-0 ${showImageInput ? 'bg-teal-500/20 text-teal-500' : ''}`} title="Add Image">
                            <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => audioInputRef.current?.click()} className={`h-8 w-8 p-0 ${audioUrl ? 'bg-indigo-500/20 text-indigo-500' : ''}`} title="Add Audio">
                            <Mic className="w-4 h-4" />
                        </Button>
                        <input
                            type="file"
                            ref={audioInputRef}
                            className="hidden"
                            accept="audio/*"
                            onChange={handleAudioUpload}
                        />
                    </div>

                    {showImageInput && (
                        <div className="mb-3 relative">
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const ytMatch = val.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                    if (ytMatch && ytMatch[1]) {
                                        setImageUrl(`https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`);
                                    } else {
                                        setImageUrl(val);
                                    }
                                }}
                                placeholder="Paste image URL..."
                                className="w-full text-xs p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-white/10 focus:ring-0"
                            />
                            {imageUrl && (
                                <button onClick={() => setImageUrl('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
                                </button>
                            )}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={newContent}
                        onChange={(e) => {
                            setNewContent(e.target.value);
                            handleUrlDetection(e.target.value);
                        }}
                        placeholder="Write an update... (supports markdown)"
                        className="w-full text-sm p-3 rounded-xl bg-transparent border-0 focus:ring-0 placeholder-slate-400 resize-none min-h-[80px] text-slate-800 dark:text-slate-200"
                    />

                    {previewLoading && (
                        <div className="my-2 flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Loading preview...</span>
                        </div>
                    )}

                    {linkMeta && (
                        <div className="my-2 rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 overflow-hidden flex relative group">
                            <button
                                onClick={() => setLinkMeta(null)}
                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            {linkMeta.image && (
                                <img src={linkMeta.image} alt="" className="w-24 h-24 object-cover" />
                            )}
                            <div className="p-3 flex-1 min-w-0">
                                <p className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{linkMeta.title}</p>
                                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{linkMeta.description}</p>
                                <p className="text-[10px] text-indigo-500 mt-1 truncate">{new URL(linkMeta.url).hostname}</p>
                            </div>
                        </div>
                    )}

                    {isUploadingAudio && (
                        <div className="mb-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span className="text-xs text-indigo-600 dark:text-indigo-400">Uploading audio...</span>
                        </div>
                    )}

                    {audioUrl && (
                        <div className="mb-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Audio Attached</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setAudioUrl('')} className="h-6 w-6 p-0 rounded-full hover:bg-red-500/20 hover:text-red-500">
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                    <div className="flex justify-end pt-2 border-t border-white/10 mt-2">
                        <Button
                            size="sm"
                            onClick={handlePost}
                            disabled={isPosting || (!newContent.trim() && !imageUrl && !audioUrl) || isUploadingAudio}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl"
                        >
                            {isPosting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : (isEditing ? <Pencil className="w-3 h-3 mr-1" /> : <Send className="w-3 h-3 mr-1" />)}
                            {isEditing ? 'Update' : 'Post'}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-4 pr-1 h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {sandesh ? (
                    <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 rounded-2xl p-6 border border-white/20 group hover:-translate-y-1 shadow-lg">

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg ring-2 ring-white/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Parmar Sir&apos;s Corner</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {formatDistanceToNow(new Date(sandesh.created_at), { addSuffix: true })}
                                </p>
                            </div>
                            {sandesh.importance === 'high' && (
                                <div className="bg-red-500/10 dark:bg-red-500/20 rounded-lg p-2">
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">Important</span>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleEdit(sandesh); }}
                                    className="h-7 w-7 p-0 rounded-full bg-white/50 hover:bg-white/80 dark:bg-black/50 dark:hover:bg-black/80"
                                >
                                    <Pencil className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(sandesh.id); }}
                                    className="h-7 w-7 p-0 rounded-full bg-white/50 hover:bg-red-100 dark:bg-black/50 dark:hover:bg-red-900/30"
                                >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                            </div>
                        )}

                        {/* Rich Text Content */}
                        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {sandesh.content.split('\n').map((line, i) => (
                                <p key={i} className="mb-2" dangerouslySetInnerHTML={{
                                    __html: line
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:underline break-all">$1</a>')
                                }} />
                            ))}
                        </div>

                        {/* Attached Image */}
                        {/* Attached Image */}
                        {sandesh.image_url && (() => {
                            const ytMatch = sandesh.image_url.match(/(?:https:\/\/img\.youtube\.com\/vi\/)([a-zA-Z0-9_-]{11})\//);
                            const videoUrl = ytMatch ? `https://www.youtube.com/watch?v=${ytMatch[1]}` : null;

                            const ImageComponent = (
                                <img
                                    src={sandesh.image_url}
                                    alt="Attachment"
                                    className="w-full h-auto object-cover max-h-60 group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.style.display = 'none';
                                    }}
                                />
                            );

                            return (
                                <div className="mt-3 rounded-xl overflow-hidden border border-white/10 relative">
                                    {videoUrl ? (
                                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="block relative group/image">
                                            {ImageComponent}
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity">
                                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                                </div>
                                            </div>
                                        </a>
                                    ) : (
                                        ImageComponent
                                    )}
                                </div>
                            );
                        })()}

                        {/* Audio Player */}
                        {sandesh.audio_url && (
                            <div className="mt-4 mb-2 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 relative overflow-hidden group/audio">
                                {playingAudioId === sandesh.id && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                        <div className="w-full h-full absolute animate-[ping_3s_linear_infinite] border border-white rounded-full scale-0"></div>
                                        <div className="w-full h-full absolute animate-[ping_3s_linear_infinite_1s] border border-white rounded-full scale-0"></div>
                                        <div className="w-full h-full absolute animate-[ping_3s_linear_infinite_2s] border border-white rounded-full scale-0"></div>
                                    </div>
                                )}

                                <div className="relative z-10 flex items-center gap-4">
                                    <button
                                        onClick={() => toggleAudioPlay(sandesh.audio_url!, sandesh.id)}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${playingAudioId === sandesh.id
                                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                    >
                                        {playingAudioId === sandesh.id ? (
                                            <Pause className="w-5 h-5 fill-current" />
                                        ) : (
                                            <Play className="w-5 h-5 fill-current ml-1" />
                                        )}
                                    </button>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2 h-2 rounded-full ${playingAudioId === sandesh.id ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'
                                                }`}></div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                {playingAudioId === sandesh.id ? 'Broadcasting Now' : 'Voice Announcement'}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-slate-700 rounded-full w-full overflow-hidden">
                                            <div className={`h-full bg-rose-500 transition-all duration-300 ${playingAudioId === sandesh.id ? 'w-full animate-[shimmer_2s_infinite]' : 'w-0'
                                                }`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Link Preview Card */}
                        {sandesh.link_meta && (
                            <a
                                href={sandesh.link_meta.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 block rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 overflow-hidden hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            >
                                {sandesh.link_meta.image && (
                                    <div className="h-32 w-full overflow-hidden">
                                        <img src={sandesh.link_meta.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="p-3">
                                    <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-200">{sandesh.link_meta.title}</p>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{sandesh.link_meta.description}</p>
                                    <p className="text-[10px] text-indigo-500 mt-2 truncate flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3" />
                                        {new URL(sandesh.link_meta.url).hostname}
                                    </p>
                                </div>
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400 text-sm italic flex flex-col items-center gap-2">
                        <Bell className="w-8 h-8 opacity-20" />
                        No active announcements.
                    </div>
                )}
            </div>

        </div>
    );
};

export default SandeshCard;
