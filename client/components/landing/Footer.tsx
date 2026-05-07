import React from 'react';
import { useTranslation } from 'react-i18next';
import { PremiumEmoji } from '@/components/PremiumEmoji';
import SafarLogo from './SafarLogo';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="bg-horizon-surface-container dark:bg-[#151716] px-4 md:px-12 py-16 md:py-20 relative z-10">
            <div className="max-w-6xl mx-auto">
                {/* Top Section - Logo & Tagline */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <SafarLogo className="w-12 h-12 shrink-0 text-[#042854] dark:text-white" title="Safar Logo" />
                        <span className="text-3xl font-playfair font-extrabold text-[#042854] dark:text-white tracking-widest uppercase">Safar</span>
                    </div>
                    <p className="text-road/60 dark:text-white/50 font-inter font-medium text-base max-w-md mx-auto">{t('footer.tagline')}</p>
                </div>

                {/* Spacing instead of divider - No-Line Rule */}
                <div className="h-12 w-full"></div>

                {/* Contact & Social Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-6 mb-8 md:mb-6">
                    {/* Contact */}
                    <div className="text-center md:text-left">
                        <h4 className="text-forest dark:text-white font-manrope font-bold mb-3 text-sm tracking-widest uppercase">{t('footer.write')}</h4>
                        <a href="mailto:safarparmar0@gmail.com" className="text-solar hover:text-solar-hover transition-colors font-bold font-inter text-base">
                            safarparmar0@gmail.com
                        </a>
                    </div>

                    {/* Instagram */}
                    <div className="text-center">
                        <h4 className="text-forest dark:text-white font-manrope font-bold mb-3 text-sm tracking-widest uppercase">{t('footer.instagram')}</h4>
                        <a href="https://www.instagram.com/safar_parmar?igsh=MXFlOGF0YnBxcmV0bQ==" target="_blank" rel="noopener noreferrer" className="text-road dark:text-white/80 hover:text-solar transition-colors font-bold font-inter text-base inline-flex items-center gap-2">
                            @SAFAR_PARMAR
                        </a>
                    </div>

                    {/* Parmar Academy App */}
                    <div className="text-center md:text-right">
                        <h4 className="text-forest dark:text-white font-manrope font-bold mb-3 text-sm tracking-widest uppercase">{t('footer.meditation')}</h4>
                        <p className="text-road/60 dark:text-white/50 font-inter font-medium text-xs mb-4">{t('footer.app_subtitle')}</p>
                        <a href="https://play.google.com/store/apps/details?id=com.parmar.academy" target="_blank" rel="noopener noreferrer" className="btn-horizon-solar px-6 py-2.5 text-sm inline-flex items-center gap-2">
                            <PremiumEmoji name="deviceMobile" alt="" className="h-4 w-4" />
                            {t('footer.download_app')}
                        </a>
                    </div>
                </div>

                {/* Bottom - Copyright */}
                <p className="text-road/40 dark:text-white/30 font-inter font-medium text-xs text-center pt-8">{t('footer.copyright')}</p>
            </div>
        </footer>
    );
};

export default Footer;
