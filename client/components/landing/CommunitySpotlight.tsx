import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CommunitySpotlight = () => {
    const { t } = useTranslation();

    return (
        <div id="community" className="max-w-7xl mx-auto relative z-10 mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="text-center lg:text-left">
                    <h2 className="text-4xl md:text-6xl font-playfair font-extrabold text-forest dark:text-white mb-6 leading-[0.9] tracking-tighter">
                        {t('community.heading_join')}<br />
                        <span className="text-solar">{t('community.heading_mehfil')}</span>
                    </h2>
                    <p className="text-lg md:text-xl text-road/70 dark:text-white/60 font-inter font-medium mb-8 md:mb-10 leading-relaxed px-2 lg:px-0">
                        {t('community.desc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <Link to="/mehfil" className="inline-flex items-center justify-center gap-3 bg-road dark:bg-road-container text-white px-10 py-4 md:py-5 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-road/20 transition-all duration-300">
                            {t('community.explore_btn')} <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 px-2 md:px-0">
                    <div className="space-y-4 md:space-y-6">
                        <div className="bg-indigo-50/50 dark:tonal-container-high rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/5 hover:translate-x-1 hover:bg-indigo-50 dark:hover:bg-[#2d3144] transition-all duration-300 border border-indigo-100/50 dark:border-transparent dark:hover:border-white/15">
                            <h4 className="text-xl font-manrope font-extrabold text-indigo-900 dark:text-white mb-1 tracking-tight">{t('community.card1')}</h4>
                        </div>
                        <div className="bg-teal-50/50 dark:tonal-container-low rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/5 hover:translate-x-1 hover:bg-teal-50 dark:hover:bg-[#243a3f] transition-all duration-300 border border-teal-100/50 dark:border-transparent dark:hover:border-white/15">
                            <h4 className="text-xl font-manrope font-extrabold text-teal-900 dark:text-white mb-1 tracking-tight">{t('community.card2')}</h4>
                        </div>
                    </div>
                    <div className="space-y-4 md:space-y-6 mt-8 md:mt-12">
                        <div className="bg-sky-50/50 dark:tonal-container-low rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/5 hover:translate-x-1 hover:bg-sky-50 dark:hover:bg-[#2b3442] transition-all duration-300 border border-sky-100/50 dark:border-transparent dark:hover:border-white/15">
                            <h4 className="text-xl font-manrope font-extrabold text-sky-900 dark:text-white mb-1 tracking-tight">{t('community.card3')}</h4>
                        </div>
                        <div className="bg-rose-50/50 dark:tonal-container-high rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/5 hover:translate-x-1 hover:bg-rose-50 dark:hover:bg-[#3a2f40] transition-all duration-300 border border-rose-100/50 dark:border-transparent dark:hover:border-white/15">
                            <h4 className="text-xl font-manrope font-extrabold text-rose-900 dark:text-white mb-1 tracking-tight">{t('community.card4')}</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunitySpotlight;
