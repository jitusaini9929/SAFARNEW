import React, { useState, useRef } from 'react';
import { Send, Loader2, Smile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MehfilRoom } from '@/store/mehfilStore';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import './Composer.css';

type MehfilFeedRoom = MehfilRoom | 'ALL';

interface ComposerProps {
  onSendThought: (content: string, isAnonymous: boolean, room: MehfilFeedRoom) => Promise<void> | void;
  userAvatar?: string | null;
  activeRoom: MehfilFeedRoom;
  placeholder: string;
}

const MAX_CHARS = 5000;
const MIN_CHARS = 15;

const Composer: React.FC<ComposerProps> = ({ onSendThought, activeRoom, placeholder }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isUnderMin = charCount > 0 && charCount < MIN_CHARS;
  const canSubmit = charCount >= MIN_CHARS && !isOverLimit && !isSubmitting;

  const isReflective = activeRoom === 'REFLECTIVE';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      await onSendThought(content, isAnonymous, activeRoom);
      setContent('');
      setIsAnonymous(false);
    } catch (error) {
      console.error('Failed to send thought', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent.slice(0, MAX_CHARS));
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + emoji.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    } else {
      setContent((prev) => (prev + emoji).slice(0, MAX_CHARS));
    }
    setShowEmojiPicker(false);
  };

  const shareLabel = activeRoom === 'REFLECTIVE'
    ? t('mehfil.composer.share_to', { room: t('mehfil.rooms.reflective') })
    : activeRoom === 'ALL'
      ? t('mehfil.composer.post')
      : t('mehfil.composer.share_to', { room: t('mehfil.rooms.academic') });

  const charCountClass = `composer-char-count${isOverLimit ? ' over-limit' : isUnderMin ? ' under-min' : ''}`;

  return (
    <div className={`composer-glow-card composer-card${isReflective ? ' reflective' : ''}`}>
      {/* Inner card with textarea — full width, no avatar */}
      <div className="composer-inner-card">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
              e.preventDefault();
              handleSend(e as any);
            }
          }}
          placeholder={placeholder}
          className="composer-textarea"
        />

        {/* Emoji button — absolute bottom-left inside inner card */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="composer-emoji-btn"
          aria-label="Insert emoji"
        >
          <Smile className="h-[18px] w-[18px]" />
        </button>

        {/* Emoji picker — floats above the emoji button */}
        <div style={{ position: 'absolute', bottom: 44, left: 14, zIndex: 50 }}>
          <EmojiPicker
            open={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={handleEmojiSelect}
            position="top"
            align="left"
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="composer-footer">
        {/* Left — anonymous checkbox + pill toggle */}
        <div className="flex items-center gap-3">
          <div
            className="composer-anon-group"
            onClick={() => setIsAnonymous((prev) => !prev)}
          >
            <div className={`composer-anon-checkbox${isAnonymous ? ' active' : ''}`}>
              {isAnonymous && <div className="composer-anon-checkbox-dot" />}
            </div>
            <span className="composer-anon-label">{t('mehfil.composer.post_anon')}</span>
            <div className={`pill-toggle${isAnonymous ? ' active' : ''}`}>
              <div className="pill-toggle-thumb" />
            </div>
          </div>
          {isUnderMin && (
            <span className="composer-min-hint">
              {t('mehfil.composer.min_chars', { count: MIN_CHARS })}
            </span>
          )}
        </div>

        {/* Right — char count + submit */}
        <div className="composer-footer-right">
          <span className={charCountClass}>
            {charCount} / {MAX_CHARS}
          </span>
          <button
            type="button"
            onClick={handleSend as any}
            disabled={!canSubmit}
            className="composer-btn-share"
            aria-label={isSubmitting ? t('mehfil.composer.posting') : t('mehfil.composer.post')}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="hidden sm:inline">{t('mehfil.composer.posting')}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{shareLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Composer;
