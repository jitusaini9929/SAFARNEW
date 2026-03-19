import React from 'react';

const GlobalPageFooter = () => {
    return (
        <footer className="bg-midnight px-4 md:px-12 py-8 border-t border-slate-800/50">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

                <div className="text-center md:text-left space-y-2">
                    <p className="text-slate-300 text-sm">
                        For any technical or app related queries mail at{" "}
                        <a href="mailto:onesaffar@gmail.com" className="text-brand-accent hover:text-brand-accent/80 transition-colors">
                            onesaffar@gmail.com
                        </a>
                    </p>
                    <p className="text-white font-semibold text-sm">
                        Write to us at{" "}
                        <a href="mailto:safarparmar0@gmail.com" className="text-brand-accent hover:text-brand-accent/80 transition-colors text-sm">
                            safarparmar0@gmail.com
                        </a>
                    </p>
                </div>

                <p className="text-slate-600 text-xs">© 2026 Safar</p>
            </div>
        </footer>
    );
};

export default GlobalPageFooter;
