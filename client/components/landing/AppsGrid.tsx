import React from 'react';
import { Link } from 'react-router-dom';

const apps = [
    {
        name: "Nishtha",
        path: "/nishtha",
        image: "/nishtha-silhouette.png",
        color: "purple",
        description: "Track consistency, Journal, reflect on your emotional state",
        borderColor: "border-purple-500",
        hoverBg: "hover:bg-purple-500/10",
        textColor: "group-hover:text-purple-500"
    },
    {
        name: "Ekagra Mode",
        path: "/study",
        image: "/focus-timer.png",
        color: "yellow",
        description: "Your focus timer for productive study",
        borderColor: "border-yellow-400",
        hoverBg: "hover:bg-yellow-400/10",
        textColor: "group-hover:text-yellow-400"
    },
    {
        name: "Mehfil",
        path: "/mehfil",
        image: "/mehfil-silhouette.png",
        color: "cyan",
        description: "Judgement free and safe emotional space",
        borderColor: "border-cyan-400",
        hoverBg: "hover:bg-cyan-400/10",
        textColor: "group-hover:text-cyan-400"
    },
    {
        name: "Dhyan",
        path: "/meditation",
        image: "/meditation-silhouette.png",
        color: "green",
        description: "Meditation sessions and live chitchat with Parmar sir",
        borderColor: "border-green-400",
        hoverBg: "hover:bg-green-400/10",
        textColor: "group-hover:text-green-400"
    }
];

const AppsGrid = () => {
    return (
        <div className="max-w-5xl mx-auto">
            {/* Apps Grid - 4 Colored Outline Boxes with Names & Descriptions */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 md:gap-8 mb-10 w-full">
                {apps.map((app) => (
                    <Link key={app.name} to={app.path} className="group flex flex-col items-center w-full md:w-auto">
                        <div className={`w-full aspect-square max-w-[140px] md:w-44 md:h-44 rounded-xl border-4 ${app.borderColor} bg-transparent ${app.hoverBg} transition-all duration-300 flex items-center justify-center hover:scale-105 overflow-hidden`}>
                            <img src={app.image} alt={app.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className={`mt-3 md:mt-4 text-lg md:text-xl font-bold text-slate-800 dark:text-white ${app.textColor} transition-colors text-center`}>{app.name}</h3>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 text-center max-w-[170px] mt-1 hidden md:block">{app.description}</p>
                        {/* Only show brief description on mobile if needed, currently hidden to save space as cards are small? OR show nicely. */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1 md:hidden line-clamp-2 leading-tight px-1">{app.description}</p>
                    </Link>
                ))}
            </div>

            {/* White Dashboard Container Box - Glassmorphism */}
            <Link to="/dashboard" className="group block w-full max-w-2xl mx-auto">
                <div className="rounded-xl border border-white/1 dark:border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:bg-white/6 dark:hover:bg-white/10 transition-all duration-300 py-5 px-10 flex items-center justify-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:scale-[1.02] hover:shadow-xl">
                    <span className="text-white text-sm md:text-base font-bold px-8 py-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-md group-hover:shadow-orange-400/50 group-hover:from-orange-500 group-hover:to-orange-700 transition-all">Go to Dashboard</span>
                </div>
            </Link>
        </div>
    );
};

export default AppsGrid;
