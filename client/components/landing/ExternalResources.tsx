import React from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import youtubeImg from "@/assets/youtube-thumbnail.png";
import courseImg from "@/assets/course-thumbnail.png";

const ExternalResources = () => {
    const { t } = useTranslation();

    return (
        <section className="bg-transparent dark:bg-transparent px-4 md:px-12 py-12 md:py-20 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12 md:mb-16">
                    <span className="inline-block px-8 py-3 bg-solar text-white rounded-full text-lg font-playfair font-bold mb-8 shadow-xl shadow-solar/20 tracking-wide uppercase">
                        {t('resources.label')}
                    </span>
                    <p className="text-lg md:text-xl text-road/70 dark:text-white/60 font-inter font-medium max-w-2xl mx-auto leading-relaxed">
                        {t('resources.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
                    {/* YouTube Channel */}
                    <a href="https://youtube.com/@safarparmar?si=Mvs6U5JaSGojIzSM" target="_blank" rel="noopener noreferrer" className="group tonal-container-high rounded-2xl overflow-hidden shadow-2xl shadow-black/5 hover:shadow-black/10 transition-all hover:-translate-y-1">
                        <div className="relative aspect-video bg-gradient-to-br from-road/20 to-forest/20 overflow-hidden">
                            <img loading="lazy" src={youtubeImg} alt="Safar Parmar YouTube Channel" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-all flex items-center justify-center">
                                <Play className="w-16 h-16 text-white/90 group-hover:text-white group-hover:scale-110 transition-all drop-shadow-lg" />
                            </div>
                        </div>
                        <div className="p-8">
                            <h4 className="text-2xl font-manrope font-extrabold text-forest dark:text-white mb-3 tracking-tight">{t('resources.yt_heading')}</h4>
                            <p className="text-road/70 dark:text-white/60 font-inter font-medium text-base mb-4">{t('resources.yt_desc')}</p>
                            <div className="flex items-center gap-2 text-solar font-bold text-sm tracking-widest uppercase">
                                <span>{t('resources.yt_link')}</span>
                                <ExternalLink className="w-4 h-4" />
                            </div>
                        </div>
                    </a>

                    {/* Course Link */}
                    <a href="https://www.parmaracademy.in/" target="_blank" rel="noopener noreferrer" className="group tonal-container-high rounded-2xl overflow-hidden shadow-2xl shadow-black/5 hover:shadow-black/10 transition-all hover:-translate-y-1">
                        <div className="relative aspect-video bg-white overflow-hidden">
                            <img loading="lazy" src={courseImg} alt="Parmar Academy Course" className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-forest/5 pointer-events-none"></div>
                        </div>
                        <div className="p-8">
                            <h4 className="text-2xl font-manrope font-extrabold text-forest dark:text-white mb-3 tracking-tight">{t('resources.course_heading')}</h4>
                            <p className="text-road/70 dark:text-white/60 font-inter font-medium text-base mb-4">{t('resources.course_desc')}</p>
                            <div className="flex items-center gap-2 text-forest dark:text-forest-container font-bold text-sm tracking-widest uppercase">
                                <span>{t('resources.course_link')}</span>
                                <ExternalLink className="w-4 h-4" />
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default ExternalResources;
