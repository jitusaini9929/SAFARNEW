import React, { useState, useEffect, useRef } from 'react';
import {
    Bell, Plus, Bold, Italic, ImageIcon, Mic, X, Loader2, Pencil, Send,
    ShieldCheck, Trash2, LinkIcon, Play, Pause, Heart, MessageCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import './SandeshCard.css';

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface LinkMeta {
    url: string;
    title: string;
    description: string;
    image: string;
}

interface SandeshComment {
    id: string;
    sandeshId: string;
    userId: string;
    authorName: string;
    authorAvatar: string | null;
    content: string;
    createdAt: string;
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
    const [sandeshes, setSandeshes] = useState<Sandesh[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [audioUrl, setAudioUrl] = useState('');
    const [showAudioInput, setShowAudioInput] = useState(false);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [likeCountById, setLikeCountById] = useState<Record<string, number>>({});
    const [userLikedById, setUserLikedById] = useState<Record<string, boolean>>({});
    const [commentsById, setCommentsById] = useState<Record<string, SandeshComment[]>>({});
    const [commentCountById, setCommentCountById] = useState<Record<string, number>>({});
    const [showCommentsById, setShowCommentsById] = useState<Record<string, boolean>>({});
    const [newCommentById, setNewCommentById] = useState<Record<string, string>>({});
    const [isPostingCommentById, setIsPostingCommentById] = useState<Record<string, boolean>>({});
    const [isLikingById, setIsLikingById] = useState<Record<string, boolean>>({});
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchSandesh = async () => {
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const incomingSandeshes: Sandesh[] = Array.isArray(data.sandeshes)
                    ? data.sandeshes
                    : (data.sandesh ? [data.sandesh] : []);
                setSandeshes(incomingSandeshes);
                if (typeof data.isAdmin === 'boolean') setIsAdmin(data.isAdmin);
                if (incomingSandeshes.length > 0) {
                    const latestSandesh = incomingSandeshes[0];
                    const lastReadId = localStorage.getItem('mehfil_last_read_sandesh_id');
                    if (lastReadId !== latestSandesh.id) setHasUnread(true);
                    for (const item of incomingSandeshes) {
                        fetchReactions(item.id);
                        fetchCommentCount(item.id);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch sandesh', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReactions = async (sandeshId: string) => {
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${sandeshId}/reactions`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLikeCountById(prev => ({ ...prev, [sandeshId]: data.count }));
                setUserLikedById(prev => ({ ...prev, [sandeshId]: data.userLiked }));
            }
        } catch (err) { console.error('Failed to fetch reactions', err); }
    };

    const fetchCommentCount = async (sandeshId: string) => {
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${sandeshId}/comments`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const nextComments = data.comments || [];
                setCommentCountById(prev => ({ ...prev, [sandeshId]: nextComments.length || 0 }));
                setCommentsById(prev => ({ ...prev, [sandeshId]: nextComments }));
            }
        } catch (err) { console.error('Failed to fetch comments', err); }
    };

    const handleLike = async (sandeshId: string) => {
        if (isLikingById[sandeshId]) return;
        setIsLikingById(prev => ({ ...prev, [sandeshId]: true }));
        const wasLiked = !!userLikedById[sandeshId];
        setUserLikedById(prev => ({ ...prev, [sandeshId]: !wasLiked }));
        setLikeCountById(prev => ({ ...prev, [sandeshId]: wasLiked ? (prev[sandeshId] || 0) - 1 : (prev[sandeshId] || 0) + 1 }));
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${sandeshId}/react`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLikeCountById(prev => ({ ...prev, [sandeshId]: data.count }));
                setUserLikedById(prev => ({ ...prev, [sandeshId]: data.liked }));
            } else {
                setUserLikedById(prev => ({ ...prev, [sandeshId]: wasLiked }));
                setLikeCountById(prev => ({ ...prev, [sandeshId]: wasLiked ? (prev[sandeshId] || 0) + 1 : (prev[sandeshId] || 0) - 1 }));
            }
        } catch {
            setUserLikedById(prev => ({ ...prev, [sandeshId]: wasLiked }));
            setLikeCountById(prev => ({ ...prev, [sandeshId]: wasLiked ? (prev[sandeshId] || 0) + 1 : (prev[sandeshId] || 0) - 1 }));
        } finally {
            setIsLikingById(prev => ({ ...prev, [sandeshId]: false }));
        }
    };

    const handlePostComment = async (sandeshId: string) => {
        const content = (newCommentById[sandeshId] || '').trim();
        if (!content || isPostingCommentById[sandeshId]) return;
        setIsPostingCommentById(prev => ({ ...prev, [sandeshId]: true }));
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${sandeshId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setCommentsById(prev => ({ ...prev, [sandeshId]: [...(prev[sandeshId] || []), data.comment] }));
                setCommentCountById(prev => ({ ...prev, [sandeshId]: (prev[sandeshId] || 0) + 1 }));
                setNewCommentById(prev => ({ ...prev, [sandeshId]: '' }));
            } else {
                toast.error('Failed to post comment');
            }
        } catch { toast.error('Error posting comment'); }
        finally { setIsPostingCommentById(prev => ({ ...prev, [sandeshId]: false })); }
    };

    const handleDeleteComment = async (sandeshId: string, commentId: string) => {
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${sandeshId}/comments/${commentId}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                setCommentsById(prev => ({ ...prev, [sandeshId]: (prev[sandeshId] || []).filter(c => c.id !== commentId) }));
                setCommentCountById(prev => ({ ...prev, [sandeshId]: Math.max((prev[sandeshId] || 1) - 1, 0) }));
                toast.success('Comment deleted');
            } else { toast.error('Failed to delete comment'); }
        } catch { toast.error('Error deleting comment'); }
    };

    useEffect(() => {
        fetchSandesh();
        const intervalId = setInterval(fetchSandesh, 30000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUserId(data?.user?.id || data?.id || null);
                }
            } catch { }
        };
        fetchCurrentUser();
    }, []);

    const markAsRead = () => {
        if (sandeshes.length > 0 && hasUnread) {
            localStorage.setItem('mehfil_last_read_sandesh_id', sandeshes[0].id);
            setHasUnread(false);
        }
    };

    const handleUrlDetection = async (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = text.match(urlRegex);
        if (match && !linkMeta && !previewLoading) {
            setPreviewLoading(true);
            try {
                const res = await fetch(`${API_URL}/mehfil/sandesh/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: match[0] }),
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.metadata) setLinkMeta(data.metadata);
                }
            } catch { }
            finally { setPreviewLoading(false); }
        } else if (!match) { setLinkMeta(null); }
    };

    const insertText = (before: string, after: string = '') => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newText = newContent.substring(0, start) + before + newContent.substring(start, end) + after + newContent.substring(end);
        setNewContent(newText);
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
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent, link_meta: linkMeta, image_url: imageUrl, audio_url: audioUrl }),
                credentials: 'include',
            });
            if (res.ok) {
                toast.success(isEditing ? 'Update edited successfully' : 'Update posted successfully');
                setNewContent(''); setLinkMeta(null); setImageUrl(''); setAudioUrl('');
                setShowInput(false); setIsEditing(false); setEditId(null);
                fetchSandesh();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to post update');
            }
        } catch { toast.error('Error posting update'); }
        finally { setIsPosting(false); }
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('audio/')) { toast.error('Please upload an audio file'); return; }
        setIsUploadingAudio(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result?.toString().split(',')[1];
                if (!base64Data) { toast.error('Failed to process audio file'); setIsUploadingAudio(false); return; }
                const res = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: base64Data, mimeType: file.type }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.success) { setAudioUrl(data.url); toast.success('Audio uploaded successfully'); }
                else { toast.error(data.message || 'Audio upload failed'); }
                setIsUploadingAudio(false);
            };
        } catch { toast.error('Audio upload failed'); setIsUploadingAudio(false); }
    };

    const toggleAudioPlay = (url: string, id: string) => {
        if (playingAudioId === id) {
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            if (audioRef.current) audioRef.current.pause();
            const audio = new Audio(url);
            audio.onended = () => setPlayingAudioId(null);
            audio.play().catch(() => toast.error("Playback failed"));
            audioRef.current = audio;
            setPlayingAudioId(id);
        }
    };

    useEffect(() => {
        return () => { if (audioRef.current) audioRef.current.pause(); };
    }, []);

    const handleEdit = (sandesh: Sandesh) => {
        setNewContent(sandesh.content);
        setImageUrl(sandesh.image_url || '');
        setAudioUrl(sandesh.audio_url || '');
        setLinkMeta(sandesh.link_meta || null);
        setIsEditing(true); setEditId(sandesh.id); setShowInput(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this update?')) return;
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) { toast.success('Update deleted successfully'); fetchSandesh(); }
            else { toast.error('Failed to delete update'); }
        } catch { toast.error('Error deleting update'); }
    };

    if (loading) return null;

    return (
        <div className="sandesh-glow-card" onClick={markAsRead} onMouseEnter={markAsRead}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sandesh-bell-box">
                        <Bell size={16} className={`text-indigo-600 dark:text-indigo-300 relative z-10 ${hasUnread ? 'animate-swing' : ''}`} />
                        {hasUnread && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '8px', height: '8px',
                                background: '#ef4444', borderRadius: '9999px',
                                border: '1.5px solid #0d101a',
                                animation: 'pulse 1.5s infinite'
                            }} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-200 tracking-wide">Sandesh</h2>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {sandeshes.length} announcement{sandeshes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isEditing && (
                        <button className="sandesh-cancel-btn text-slate-600 dark:text-slate-400" style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => { setIsEditing(false); setEditId(null); setNewContent(''); setImageUrl(''); setAudioUrl(''); setLinkMeta(null); setShowInput(false); }}>
                            Cancel Edit
                        </button>
                    )}
                    {isAdmin && (
                        <button className="sandesh-add-btn" onClick={(e) => { e.stopPropagation(); setShowInput(p => !p); }} title="New announcement">
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Admin Compose Panel ── */}
            {showInput && (
                <div style={{ marginBottom: '16px' }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {[
                            { icon: <Bold size={13} />, action: () => insertText('**', '**'), title: 'Bold' },
                            { icon: <Italic size={13} />, action: () => insertText('*', '*'), title: 'Italic' },
                            { icon: <ImageIcon size={13} />, action: () => setShowImageInput(p => !p), title: 'Image', active: showImageInput },
                            { icon: <Mic size={13} />, action: () => audioInputRef.current?.click(), title: 'Audio', active: !!audioUrl },
                        ].map((btn, i) => (
                            <button key={i} title={btn.title} onClick={btn.action}
                                style={{
                                    width: '28px', height: '28px', borderRadius: '7px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className={btn.active ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400" : "bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400"}
                            >
                                {btn.icon}
                            </button>
                        ))}
                        <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />
                    </div>

                    {/* Image URL input */}
                    {showImageInput && (
                        <div className="sandesh-input-card" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', marginBottom: '8px', gap: '8px' }}>
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const ytMatch = val.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                    setImageUrl(ytMatch?.[1] ? `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` : val);
                                }}
                                className="text-slate-800 dark:text-slate-200"
                                placeholder="Paste image URL or YouTube link..."
                                style={{ flex: 1 }}
                            />
                            {imageUrl && <button onClick={() => setImageUrl('')} className="text-slate-500 dark:text-slate-400" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>}
                        </div>
                    )}

                    {/* Textarea */}
                    <div className="sandesh-input-card text-slate-800 dark:text-slate-200" style={{ padding: '12px 14px', marginBottom: '10px' }}>
                        <textarea
                            ref={textareaRef}
                            rows={3}
                            value={newContent}
                            onChange={(e) => { setNewContent(e.target.value); handleUrlDetection(e.target.value); }}
                            placeholder="Write an announcement… (**bold**, *italic* supported)"
                            className="text-slate-800 dark:text-slate-200"
                            style={{ fontSize: '13.5px' }}
                        />
                    </div>

                    {/* Link preview inside compose */}
                    {previewLoading && (
                        <div className="text-slate-500 dark:text-slate-400" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px' }}>
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading preview...
                        </div>
                    )}
                    {linkMeta && (
                        <div className="sandesh-link-preview" style={{ marginBottom: '8px', display: 'flex', position: 'relative' }}>
                            <button onClick={() => setLinkMeta(null)}
                                style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '3px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                                <X size={10} />
                            </button>
                            {linkMeta.image && <img src={linkMeta.image} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />}
                            <div style={{ paddingLeft: '10px' }}>
                                <div className="text-indigo-800 dark:text-indigo-300" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>{linkMeta.title}</div>
                                <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '11px' }}>{linkMeta.description?.slice(0, 80)}</div>
                            </div>
                        </div>
                    )}

                    {/* Audio status */}
                    {isUploadingAudio && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', fontSize: '12px' }}>
                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Uploading audio...
                        </div>
                    )}
                    {audioUrl && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                <Mic size={13} /> Audio attached
                            </div>
                            <button onClick={() => setAudioUrl('')} className="text-slate-500 dark:text-slate-400" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}><X size={12} /></button>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="sandesh-cancel-btn text-slate-600 dark:text-slate-400" onClick={() => { setShowInput(false); setIsEditing(false); setEditId(null); setNewContent(''); setLinkMeta(null); }}>
                            Cancel
                        </button>
                        <button className="sandesh-post-btn" onClick={handlePost}
                            disabled={isPosting || (!newContent.trim() && !imageUrl && !audioUrl) || isUploadingAudio}>
                            {isPosting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : (isEditing ? <Pencil size={12} /> : <Send size={12} />)}
                            {isEditing ? 'Update' : 'Post'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Divider ── */}
            <div className="sandesh-divider" />

            {/* ── Feed ── */}
            <div className="sandesh-feed" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '2px' }}>
                {sandeshes.length > 0 ? (
                    sandeshes.map((sandesh) => (
                        <div key={sandesh.id} className="sandesh-announcement-card" style={{ position: 'relative' }}>

                            {/* Admin controls */}
                            {isAdmin && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}
                                    className="admin-controls">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(sandesh); }}
                                        className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400"
                                        style={{ width: '26px', height: '26px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <Pencil size={11} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(sandesh.id); }}
                                        className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-500 dark:text-rose-400"
                                        style={{ width: '26px', height: '26px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            )}

                            {/* Importance badge */}
                            {sandesh.importance === 'high' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                                    <div className="sandesh-pin-dot" />
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.06em' }}>PINNED</span>
                                    <span className="sandesh-important-badge">Important</span>
                                </div>
                            )}

                            {/* Author row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div className="sandesh-avatar-indigo"
                                    style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                    <ShieldCheck size={16} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-200">Parmar Sir&apos;s Corner</span>
                                        <span className="sandesh-badge sandesh-badge-indigo">Faculty</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {formatDistanceToNow(new Date(sandesh.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>

                            {/* Body text */}
                            <div className="text-[13.5px] text-slate-700 dark:text-slate-400" style={{ lineHeight: '1.65', marginBottom: '10px' }}>
                                {sandesh.content.split('\n').map((line, i) => (
                                    <p key={i} style={{ marginBottom: '4px' }} dangerouslySetInnerHTML={{
                                        __html: line
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-slate-200" style="font-weight:600">$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em class="text-slate-600 dark:text-slate-400">$1</em>')
                                            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#818cf8;text-decoration:underline;text-underline-offset:2px">$1</a>')
                                    }} />
                                ))}
                            </div>

                            {/* Attached Image / YouTube Link fallback */}
                            {(() => {
                                let displayImgUrl = sandesh.image_url || '';
                                let videoUrl = null;

                                // 1. Try to parse YouTube from image_url if provided
                                if (displayImgUrl) {
                                    const ytMatchImg = displayImgUrl.match(/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})/);
                                    if (ytMatchImg) {
                                        videoUrl = `https://www.youtube.com/watch?v=${ytMatchImg[1]}`;
                                        displayImgUrl = `https://img.youtube.com/vi/${ytMatchImg[1]}/hqdefault.jpg`;
                                    }
                                }
                                // 2. If no image_url, try to extract a YouTube link from the text content
                                else if (sandesh.content) {
                                    const ytMatchContent = sandesh.content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                    if (ytMatchContent && ytMatchContent[1]) {
                                        displayImgUrl = `https://img.youtube.com/vi/${ytMatchContent[1]}/hqdefault.jpg`;
                                        videoUrl = `https://www.youtube.com/watch?v=${ytMatchContent[1]}`;
                                    }
                                }

                                if (!displayImgUrl && !videoUrl) return null;

                                const isVideo = !!videoUrl;

                                const imgEl = (
                                    <div style={{ position: 'relative', width: '100%', minHeight: isVideo ? '150px' : 'auto', backgroundColor: isVideo ? '#0f172a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {displayImgUrl && (
                                            <img src={displayImgUrl} alt="Attachment"
                                                style={{ width: '100%', height: 'auto', maxHeight: '250px', objectFit: 'cover', display: 'block' }}
                                                onError={(e) => {
                                                    if (e.currentTarget.src.includes('hqdefault.jpg')) {
                                                        e.currentTarget.src = e.currentTarget.src.replace('hqdefault.jpg', 'default.jpg');
                                                    } else {
                                                        e.currentTarget.style.display = 'none';
                                                    }
                                                }}
                                            />
                                        )}
                                        {isVideo && (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <Play size={26} color="white" style={{ marginLeft: '4px' }} fill="white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );

                                return (
                                    <div className="border border-black/5 dark:border-white/10" style={{ marginBottom: '10px', borderRadius: '10px', overflow: 'hidden' }}>
                                        {videoUrl ? <a href={videoUrl} target="_blank" rel="noopener noreferrer">{imgEl}</a> : imgEl}
                                    </div>
                                );
                            })()}

                            {/* Audio Player */}
                            {sandesh.audio_url && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10" style={{ marginBottom: '10px', padding: '12px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <button onClick={() => toggleAudioPlay(sandesh.audio_url!, sandesh.id)}
                                        className={playingAudioId === sandesh.id ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white'}
                                        style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                                        {playingAudioId === sandesh.id ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}
                                            className={playingAudioId === sandesh.id ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}>
                                            {playingAudioId === sandesh.id ? 'Broadcasting Now' : 'Voice Announcement'}
                                        </div>
                                        <div className="bg-slate-200 dark:bg-white/10" style={{ height: '3px', borderRadius: '9999px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: playingAudioId === sandesh.id ? '100%' : '0%', background: '#e11d48', borderRadius: '9999px', transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Link Preview */}
                            {sandesh.link_meta && !sandesh.link_meta.url.match(/(?:youtube\.com|youtu\.be)/i) && (
                                <a href={sandesh.link_meta.url} target="_blank" rel="noopener noreferrer" className="sandesh-link-preview">
                                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                        className="bg-indigo-100 dark:bg-indigo-500/10">
                                        <LinkIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-indigo-900 dark:text-indigo-300" style={{ fontSize: '12.5px', fontWeight: 600 }}>{sandesh.link_meta.title}</div>
                                        <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '11px' }}>{sandesh.link_meta.description?.slice(0, 60)}</div>
                                    </div>
                                </a>
                            )}

                            {/* ── Reactions & Comments Bar ── */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <button className={`sandesh-action-btn${userLikedById[sandesh.id] ? ' liked' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleLike(sandesh.id); }}
                                    disabled={!!isLikingById[sandesh.id]}>
                                    <Heart size={13} fill={userLikedById[sandesh.id] ? '#fb7185' : 'none'} stroke={userLikedById[sandesh.id] ? '#fb7185' : 'currentColor'} />
                                    <span>{likeCountById[sandesh.id] || 0}</span>
                                </button>

                                <button className={`sandesh-action-btn${showCommentsById[sandesh.id] ? ' commented' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const shouldShow = !showCommentsById[sandesh.id];
                                        setShowCommentsById(prev => ({ ...prev, [sandesh.id]: shouldShow }));
                                        if (shouldShow) fetchCommentCount(sandesh.id);
                                    }}>
                                    <MessageCircle size={13} />
                                    <span>{commentCountById[sandesh.id] || 0}</span>
                                    {showCommentsById[sandesh.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                            </div>

                            {/* Comments Section */}
                            {showCommentsById[sandesh.id] && (
                                <div className="sandesh-comment-area border-t border-black/5 dark:border-white/10">
                                    {/* Comment list */}
                                    {(commentsById[sandesh.id] || []).length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                                            {(commentsById[sandesh.id] || []).map(comment => (
                                                <div key={comment.id} style={{ display: 'flex', gap: '8px' }}>
                                                    <div className="bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-400" style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, overflow: 'hidden' }}>
                                                        {comment.authorAvatar
                                                            ? <img src={comment.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : comment.authorName.charAt(0).toUpperCase()
                                                        }
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                <span className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-300">{comment.authorName}</span>
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-500">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                                            </div>
                                                            {comment.userId === currentUserId && (
                                                                <button onClick={() => handleDeleteComment(sandesh.id, comment.id)}
                                                                    className="text-slate-400 hover:text-rose-500"
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px', transition: 'color 0.2s', flexShrink: 0 }}>
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-[12px] text-slate-600 dark:text-slate-400" style={{ marginTop: '1px', lineHeight: '1.5' }}>{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 dark:text-slate-500" style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '10px' }}>No comments yet. Be the first!</p>
                                    )}

                                    {/* Comment input */}
                                    <div className="sandesh-input-card text-slate-800 dark:text-slate-200" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                                        <input
                                            type="text"
                                            placeholder="Add a comment…"
                                            value={newCommentById[sandesh.id] || ''}
                                            onChange={(e) => setNewCommentById(prev => ({ ...prev, [sandesh.id]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(sandesh.id); } }}
                                            className="text-slate-800 dark:text-slate-200"
                                            style={{ flex: 1, fontSize: '12.5px' }}
                                        />
                                        <button onClick={() => handlePostComment(sandesh.id)}
                                            disabled={!!isPostingCommentById[sandesh.id] || !(newCommentById[sandesh.id] || '').trim()}
                                            className={(newCommentById[sandesh.id] || '').trim() ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'color 0.2s' }}>
                                            {isPostingCommentById[sandesh.id] ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px 0' }} className="text-slate-500 dark:text-slate-500">
                        <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.2 }} />
                        <p style={{ fontSize: '13px', fontStyle: 'italic' }}>No active announcements.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SandeshCard;
