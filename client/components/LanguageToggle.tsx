import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
    const { i18n } = useTranslation();

    const toggle = () => {
        const next = i18n.language === 'en' ? 'hi' : 'en';
        i18n.changeLanguage(next);
        localStorage.setItem('language', next); // remembers after page refresh
    };

    return (
        <button
            onClick={toggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                color: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
        >
            {i18n.language === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
        </button>
    );
}
