import React, { Suspense, useRef, useState } from 'react';
import { Send, Loader2, Smile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MehfilRoom } from '@/store/mehfilStore';
import './Composer.css';
import { MdSwitchReact } from './material/MdComponents';

type MehfilFeedRoom = MehfilRoom | 'ALL';

const LazyEmojiPicker = React.lazy(async () => {
  const module = await import('@/components/ui/EmojiPicker');
  return { default: module.EmojiPicker };
});

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
  const isAcademic = activeRoom === 'ACADEMIC' || activeRoom === 'ALL';

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

  const shareLabel =
    activeRoom === 'REFLECTIVE'
      ? t('mehfil.composer.share_to', { room: t('mehfil.rooms.reflective') })
      : activeRoom === 'ALL'
        ? t('mehfil.composer.post')
        : t('mehfil.composer.share_to', { room: t('mehfil.rooms.academic') });

  const charCountClass = `composer-char-count${isOverLimit ? ' over-limit' : isUnderMin ? ' under-min' : ''}`;

  return (
    <form
      onSubmit={handleSend}
      className={`composer-card${isReflective ? ' composer-card--reflective' : ''}${isAcademic ? ' composer-card--academic' : ''}`}
    >
      <div className="composer-inner-card">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
              e.preventDefault();
              void handleSend(e);
            }
          }}
          placeholder={placeholder}
          className="composer-textarea"
          aria-label={placeholder}
        />

        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="composer-emoji-btn"
          aria-label="Insert emoji"
          aria-expanded={showEmojiPicker}
        >
          <Smile className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>

        {showEmojiPicker ? (
          <div className="composer-emoji-picker-anchor">
            <Suspense fallback={null}>
              <LazyEmojiPicker
                open={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={handleEmojiSelect}
                position="top"
                align="left"
              />
            </Suspense>
          </div>
        ) : null}
      </div>

      <div className="composer-footer">
        <div className="composer-footer-left">
          <div
            className="composer-anon-group"
            role="button"
            tabIndex={0}
            onClick={() => setIsAnonymous((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsAnonymous((prev) => !prev);
              }
            }}
          >
            <MdSwitchReact selected={isAnonymous} aria-label={t('mehfil.composer.post_anon')} />
            <span className="composer-anon-label">{t('mehfil.composer.post_anon')}</span>
          </div>
          {isUnderMin ? (
            <span className="composer-min-hint" role="status">
              {t('mehfil.composer.min_chars', { min: MIN_CHARS })}
            </span>
          ) : null}
        </div>

        <div className="composer-footer-right">
          <span className={charCountClass} aria-live="polite">
            {charCount} / {MAX_CHARS}
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="composer-btn-share mehfil-btn-primary"
            aria-label={isSubmitting ? t('mehfil.composer.posting') : shareLabel}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{t('mehfil.composer.posting')}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" />
                <span>{shareLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default Composer;
