import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

interface LanguageToggleProps {
    className?: string;
    variant?: "default" | "square";
}

export default function LanguageToggle({ className = '', variant = 'default' }: LanguageToggleProps) {
    const { i18n } = useTranslation();

    const toggle = () => {
        const next = i18n.language === 'en' ? 'hi' : 'en';
        i18n.changeLanguage(next);
        localStorage.setItem('language', next); // remembers after page refresh
    };

    const label = i18n.language === 'en' ? 'EN' : 'HI';

    if (variant === 'square') {
        return (
            <button
                onClick={toggle}
                className={`w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-[#3c4146] dark:text-[#e7e5e5] hover:text-[#1a1c1e] dark:hover:text-white text-[13px] font-extrabold transition-all duration-200 hover:scale-105 hover:shadow-sm focus:outline-none ${className}`.trim()}
                title={i18n.language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
            >
                <span>{label}</span>
            </button>
        );
    }

    return (
        <button
            onClick={toggle}
            className={`flex items-center gap-1.5 text-[#3c4146] dark:text-[#e7e5e5] font-bold text-sm hover:text-[#1a1c1e] dark:hover:text-white transition-colors cursor-pointer focus:outline-none ${className}`.trim()}
        >
            <span>{label}</span>
            <ChevronDown className="w-4 h-4 opacity-100 font-black" />
        </button>
    );
}
