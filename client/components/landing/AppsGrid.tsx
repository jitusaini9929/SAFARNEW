import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AppsGrid = () => {
    const { t } = useTranslation();

    const apps = [
        {
            key: 'nishtha',
            name: t('apps.nishtha_name'),
            path: "/nishtha",
            image: "/nishtha-silhouette.png",
            description: t('apps.nishtha_desc'),
            bg: "bg-forest/5 dark:bg-forest/10",
            hoverBg: "group-hover:bg-forest/20",
            textColor: "group-hover:text-forest",
            borderColor: "border-emerald-600/60",
            darkBorderColor: "dark:border-emerald-500/40"
        },
        {
            key: 'ekagra',
            name: t('apps.ekagra_name'),
            path: "/study",
            image: "/focus-timer.png",
            description: t('apps.ekagra_desc'),
            bg: "bg-solar/5 dark:bg-solar/10",
            hoverBg: "group-hover:bg-solar/20",
            textColor: "group-hover:text-solar",
            borderColor: "border-teal-600/60",
            darkBorderColor: "dark:border-teal-500/40"
        },
        {
            key: 'mehfil',
            name: t('apps.mehfil_name'),
            path: "/mehfil",
            image: "/mehfil-silhouette.png",
            description: t('apps.mehfil_desc'),
            bg: "bg-road/5 dark:bg-road/10",
            hoverBg: "group-hover:bg-road/20",
            textColor: "group-hover:text-road",
            borderColor: "border-slate-500/70",
            darkBorderColor: "dark:border-slate-400/30"
        },
        {
            key: 'dhyan',
            name: t('apps.dhyan_name'),
            path: "/meditation",
            image: "/meditation-silhouette.png",
            description: t('apps.dhyan_desc'),
            bg: "bg-forest/5 dark:bg-forest/10",
            hoverBg: "group-hover:bg-forest/20",
            textColor: "group-hover:text-forest",
            borderColor: "border-indigo-600/60",
            darkBorderColor: "dark:border-indigo-500/40"
        }
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 md:gap-8 mb-10 w-full">
                {apps.map((app) => (
                    <Link key={app.key} to={app.path} className="group flex flex-col items-center w-full md:w-auto">
                        <div className={`w-full aspect-square max-w-[140px] md:w-44 md:h-44 rounded-xl ${app.bg} ${app.hoverBg} border-[5px] ${app.borderColor} ${app.darkBorderColor} transition-all duration-500 flex items-center justify-center hover:scale-105 overflow-hidden shadow-2xl shadow-black/5`}>
                            <img loading="lazy" src={app.image} alt={app.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className={`mt-4 md:mt-5 text-xl md:text-2xl font-manrope font-extrabold text-forest dark:text-white ${app.textColor} transition-colors text-center tracking-tight`}>{app.name}</h3>
                        <p className="text-sm text-road/60 dark:text-white/50 font-inter font-medium text-center max-w-[170px] mt-2 line-clamp-2 leading-tight px-1 md:px-0">
                            {app.description}
                        </p>
                    </Link>
                ))}
            </div>

            <Link to="/dashboard" className="group block w-full max-w-2xl mx-auto mt-16 scale-95 active:scale-90 transition-all duration-200">
                <div className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 transition-all duration-500 py-4 px-12 flex items-center justify-center shadow-xl shadow-amber-500/20">
                    <span className="text-white font-manrope font-extrabold text-xl tracking-tight uppercase">{t('apps.dashboard_btn')}</span>
                </div>
            </Link>
        </div>
    );
};

export default AppsGrid;
