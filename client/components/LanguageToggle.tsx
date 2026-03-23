import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

interface LanguageToggleProps {
    className?: string;
}

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
    const { i18n } = useTranslation();

    const toggle = () => {
        const next = i18n.language === 'en' ? 'hi' : 'en';
        i18n.changeLanguage(next);
        localStorage.setItem('language', next); // remembers after page refresh
    };

    const label = i18n.language === 'en' ? 'EN' : 'HI';

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
