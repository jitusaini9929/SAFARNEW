import React from 'react';
import { ExternalLink, Play } from 'lucide-react';
import youtubeImg from "@/assets/youtube-thumbnail.png";
import courseImg from "@/assets/course-thumbnail.png";

const ExternalResources = () => {
    return (
        <section className="bg-slate-50 dark:bg-midnight px-8 md:px-12 py-20 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <span className="inline-block px-4 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full text-sm font-semibold mb-4">
                        Resources
                    </span>

                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Helpful resources for your well-being and study journey
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* YouTube Channel */}
                    <a
                        href="https://youtube.com/@safarparmar?si=Mvs6U5JaSGojIzSM"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                    >
                        <div className="relative aspect-video bg-gradient-to-br from-red-900/20 to-red-600/20 overflow-hidden">
                            <img
                                src={youtubeImg}
                                alt="Safar Parmar YouTube Channel"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                <Play className="w-16 h-16 text-white/90 group-hover:text-white group-hover:scale-110 transition-all drop-shadow-lg" />
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                <p className="text-white font-semibold text-sm drop-shadow-lg">Safar Parmar</p>
                                <p className="text-white/90 text-xs drop-shadow-lg">YouTube Channel</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Wellness & Motivation</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                Visit for inspiring content to fuel your journey
                            </p>
                            <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm font-medium">
                                <span>Watch on YouTube</span>
                                <ExternalLink className="w-4 h-4" />
                            </div>
                        </div>
                    </a>

                    {/* Course Link */}
                    <a
                        href="https://parmaracademy.in/courses/75"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                    >
                        <div className="relative aspect-video bg-gradient-to-br from-pink-900/20 to-pink-600/20 overflow-hidden">
                            <img
                                src={courseImg}
                                alt="Parmar Academy Course"
                                className="w-full h-full object-contain bg-white p-4 group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                <p className="text-white font-semibold text-sm drop-shadow-lg">Parmar Academy</p>
                                <p className="text-white/90 text-xs drop-shadow-lg">Professional Course</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Comprehensive Learning</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                Explore structured courses for your growth
                            </p>
                            <div className="flex items-center gap-2 text-pink-500 dark:text-pink-400 text-sm font-medium">
                                <span>View Course</span>
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
