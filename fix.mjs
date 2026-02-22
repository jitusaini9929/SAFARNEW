import fs from 'fs';
let content = fs.readFileSync('client/pages/StudyWithMe.tsx', 'utf8');

const regex = /<div className="fixed top-6 right-8 z-\[60\] flex items-center gap-3">[\s\S]*?<\/DropdownMenuContent>\s*<\/DropdownMenu>\s*<\/div>/;

content = content.replace(regex, function (match) {
    return match
        .replace(/<ThemeToggle className="[^"]+" \/>/, '<ThemeToggle className={showAnalytics ? "bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50" : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white"} />')
        .replace(/className="flex items-center gap-2 bg-white\/10 backdrop-blur-md border border-white\/20 rounded-full px-3 py-2"/, 'className={`flex items-center gap-2 backdrop-blur-md rounded-full px-3 py-2 ${showAnalytics ? "bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-white/20" : "bg-white/10 border border-white/20"}`}')
        .replace(/className="p-1\.5 rounded-full hover:bg-white\/10 transition-colors"/g, 'className={`p-1.5 rounded-full transition-colors ${showAnalytics ? "hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white" : "hover:bg-white/10 text-white"}`}')
        .replace(/className="w-4 h-4 text-white"/g, 'className="w-4 h-4"')
        .replace(/className="w-16 h-1 bg-white\/20 rounded-full appearance-none cursor-pointer accent-white"/, 'className={`w-16 h-1 rounded-full appearance-none cursor-pointer ${showAnalytics ? "bg-slate-300 dark:bg-slate-600 accent-teal-600 dark:accent-white focus:outline-none" : "bg-white/20 accent-white focus:outline-none"}`}')
        .replace(/className={`p-2 rounded-full border border-white\/20 transition-all \$\{showAnalytics[\s\S]*?}`/g, 'className={`p-2 rounded-full border transition-all ${showAnalytics ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white shadow-md hover:bg-slate-100 dark:hover:bg-slate-700" : "bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md"}`}')
        .replace(/className="rounded-xl h-\[52px\] w-\[52px\] p-0 hover:bg-white\/10 border border-white\/20 bg-white\/10 backdrop-blur-md"/, 'className={`rounded-xl h-[52px] w-[52px] p-0 border backdrop-blur-md ${showAnalytics ? "bg-white dark:bg-slate-800/50 border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-slate-700/50" : "bg-white/10 border-white/20 hover:bg-white/10"}`}')
        .replace(/className="h-\[52px\] w-\[52px\] rounded-lg border-2 border-white shadow-sm"/, 'className={`h-[52px] w-[52px] rounded-lg border-2 shadow-sm ${showAnalytics ? "border-slate-300 dark:border-slate-800" : "border-white"}`}');
});

fs.writeFileSync('client/pages/StudyWithMe.tsx', content);
console.log('Done');
