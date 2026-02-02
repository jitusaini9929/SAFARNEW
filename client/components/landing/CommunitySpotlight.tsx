import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CommunitySpotlight = () => {
    return (
        <div className="max-w-7xl mx-auto relative z-10 mt-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                        Join the<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-500">Mehfil</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                        A safe space to speak about your silent struggles and quiet wins — because here, you're not alone.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link to="/mehfil" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-purple-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-rose-500/30">
                            Explore Mehfil <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Share without judgment</h4>
                        </div>
                        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">React with empathy</h4>
                        </div>
                    </div>
                    <div className="space-y-4 mt-8">
                        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Find your tribe</h4>
                        </div>
                        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Celebrate together</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunitySpotlight;
