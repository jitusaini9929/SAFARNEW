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
        <button onClick={toggle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all duration-200 text-sm font-bold text-slate-900 dark:text-white hover:scale-105 hover:shadow-sm">
            {i18n.language === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
        </button>
    );
}
