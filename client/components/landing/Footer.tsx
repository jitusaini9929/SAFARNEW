import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-midnight px-4 md:px-12 py-8 md:py-10">
            <div className="max-w-6xl mx-auto">
                {/* Top Section - Logo & Tagline */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <img
                            src="/safar-logo.png.jpeg"
                            alt="Safar Logo"
                            className="w-16 h-16 rounded-full border-2 border-brand-accent object-cover shadow-lg"
                        />
                        <span className="text-3xl font-serif font-bold text-white">Safar</span>
                    </div>
                    <p className="text-slate-400 text-sm max-w-md mx-auto">Your journey to better studying starts here.</p>
                </div>

                {/* Middle Section - Links */}
                <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-400 mb-6">
                    <Link to="/dashboard" className="hover:text-[#6EE7B7] transition-colors">Dashboard</Link>
                    <Link to="/study" className="hover:text-[#6EE7B7] transition-colors">Focus Timer</Link>
                    <Link to="/mehfil" className="hover:text-[#6EE7B7] transition-colors">Mehfil</Link>
                    <Link to="/achievements" className="hover:text-[#6EE7B7] transition-colors">Achievements</Link>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-800 my-6"></div>

                {/* Contact & Social Section */}
                {/* Contact & Social Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-6 mb-8 md:mb-6">
                    {/* Contact */}
                    <div className="text-center md:text-left">
                        <h4 className="text-white font-semibold mb-2 text-sm">Write to us</h4>
                        <a href="mailto:safarparmar0@gmail.com" className="text-brand-accent hover:text-brand-accent/80 transition-colors text-sm">
                            safarparmar0@gmail.com
                        </a>
                    </div>

                    {/* Instagram */}
                    <div className="text-center">
                        <h4 className="text-white font-semibold mb-2 text-sm">Follow us on Instagram</h4>
                        <a
                            href="https://www.instagram.com/safar_parmar?igsh=MXFlOGF0YnBxcmV0bQ=="
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#E4405F] hover:text-[#E4405F]/80 transition-colors text-sm inline-flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            @SAFAR_PARMAR
                        </a>
                    </div>

                    {/* Parmar Academy App */}
                    <div className="text-center md:text-right">
                        <h4 className="text-white font-semibold mb-2 text-sm">Join Daily Meditation</h4>
                        <p className="text-slate-400 text-xs mb-2">SAFAR 3.0 on Parmar Academy</p>
                        <a
                            href="https://play.google.com/store/apps/details?id=com.parmar.academy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-brand-accent text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-brand-accent/90 transition-colors"
                        >
                            📱 Download App
                        </a>
                    </div>
                </div>

                {/* Bottom - Copyright */}
                <p className="text-slate-600 text-xs text-center pt-4 border-t border-slate-800/50">© 2026 Safar. Made for students.</p>
            </div>
        </footer>
    );
};

export default Footer;
