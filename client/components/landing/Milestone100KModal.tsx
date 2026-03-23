import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Play, Youtube } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const timeline = [
  { label: '0', note: 'The first upload and first believer.' },
  { label: '1K', note: 'Momentum started with consistent value.' },
  { label: '10K', note: 'A serious student movement was visible.' },
  { label: '100K', note: 'Discipline became a shared identity.' },
];

const wallOfImpact = [
  {
    title: 'From distraction to rank focus',
    story: '"I was scrolling 6+ hours a day. SAFAR routines helped me build a 2-hour deep work habit in 3 weeks."',
    student: 'Student Story #1',
  },
  {
    title: 'Consistency after burnout',
    story: '"I thought motivation was dead. The daily structure gave me back control and confidence."',
    student: 'Student Story #2',
  },
  {
    title: 'Calm + productivity together',
    story: '"I stopped choosing between mental peace and performance. The wellness + productivity mix changed everything."',
    student: 'Student Story #3',
  },
];

const resourcePack = [
  {
    label: 'Productivity planner template (PDF)',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=1sQGG8jfeFfBM3RyNb0VALcbcgyzQI8EG',
  },
  {
    label: 'Study routine blueprint (weekly + monthly)',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=12CKHMTtGb_ek6itxhmwuZxHITXTvNqwS',
  },
  {
    label: 'Dopamine detox starter guide',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=1bcavcNSUs6XRfthLQXKLpuqJMbdbEkb1',
  },
];

const YOUTUBE_VIDEO_ID = 'MA6v4KD2Gg8';
const YOUTUBE_WATCH_URL = `https://youtu.be/${YOUTUBE_VIDEO_ID}`;
const RESOURCE_PACK_ZIP_URL = 'https://drive.google.com/uc?export=download&id=1AFISfumYr-757LeB9RgVJbp2L0xDDiYn';
const YOUTUBE_THUMBNAILS = [
  `https://i.ytimg.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`,
  `https://i.ytimg.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`,
  `https://i.ytimg.com/vi/${YOUTUBE_VIDEO_ID}/mqdefault.jpg`,
];

interface Milestone100KModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Milestone100KModal: React.FC<Milestone100KModalProps> = ({ open, onOpenChange }) => {
  const [thumbnailIndex, setThumbnailIndex] = useState(0);

  const downloadPackZip = () => {
    window.open(RESOURCE_PACK_ZIP_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0e0e0e] border-slate-200 dark:border-white/5 sm:rounded-xl p-0 gap-0 shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader className="sr-only">
          <DialogTitle>100K YouTube Celebration</DialogTitle>
        </DialogHeader>

        <div className="relative font-inter text-[#311B92] dark:text-[#e7e5e4]">
          {/* Subtle Deep Purple Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-[#311B92]/5 dark:bg-slate-400/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="p-6 md:p-10 space-y-8 md:space-y-12">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F5F3FF] dark:bg-[#1f2020] text-[#311B92] dark:text-[#c6c6c6] text-xs font-bold tracking-wide uppercase border border-[#311B92]/10 dark:border-white/5 shadow-inner transition-colors">
                  <Youtube className="w-4 h-4 text-[#ff0000]" />
                  100K YouTube Milestone
                </p>
                <h2 className="mt-4 text-3xl md:text-5xl font-bold text-[#311B92] dark:text-white font-manrope tracking-tight break-words">
                  100,000 Subscribers Strong
                </h2>
                <p className="mt-3 text-[#311B92]/70 dark:text-[#acabaa] text-sm md:text-base leading-relaxed">
                  Building discipline, productivity and clarity together. This is not only a celebration, it is the start of the next level.
                </p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <a
                  href="https://youtube.com/@safarparmar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#311B92] dark:bg-gradient-to-br dark:from-[#e2e2e2] dark:to-[#b8b9b9] text-white dark:text-[#0e0e0e] px-8 py-3.5 font-semibold transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(49,27,146,0.2)] dark:shadow-[0_0_20px_rgba(198,198,198,0.15)]"
                >
                  Join the Community
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </a>
              </div>
            </div>

            {/* Video & Stats Grid */}
            <div className="grid grid-cols-1 gap-6">
              {/* Video Player */}
              <div className="rounded-xl overflow-hidden bg-[#F5F3FF] dark:bg-[#131313] border border-[#311B92]/10 dark:border-white/5 relative group">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#311B92]/10 dark:border-white/5 text-[#311B92]/60 dark:text-[#acabaa] text-xs font-medium uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><Youtube className="w-4 h-4 text-[#ff0000] dark:text-[#e2e2e2]" /> Celebration Video</span>
                </div>
                <div className="aspect-video bg-black">
                  <a
                    href={YOUTUBE_WATCH_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block w-full h-full"
                    aria-label="Watch celebration video on YouTube"
                  >
                    <img
                      src={YOUTUBE_THUMBNAILS[Math.min(thumbnailIndex, YOUTUBE_THUMBNAILS.length - 1)]}
                      alt="100K celebration video thumbnail"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => {
                        setThumbnailIndex((prev) =>
                          prev < YOUTUBE_THUMBNAILS.length - 1 ? prev + 1 : prev,
                        );
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#111111] shadow-lg">
                        <Play className="w-4 h-4 fill-current" />
                        Watch on YouTube
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Content Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* What's New */}
              <div className="lg:col-span-2 rounded-xl bg-[#F5F3FF] dark:bg-[#131313] p-5 md:p-6 border border-[#311B92]/10 dark:border-white/5">
                <h3 className="text-lg md:text-xl font-bold font-manrope text-[#311B92] dark:text-white">What's New?</h3>
                <p className="mt-2 text-sm md:text-base text-[#311B92]/75 dark:text-[#b8b7b6] leading-relaxed">
                  Syllabus Planner is now live. Add your exam type, organize subjects and chapters, plan daily topics,
                  track progress in Kanban and Calendar views, and download the full 100K resource pack in one click.
                </p>
              </div>

              {/* Changed Lives */}
              <div className="rounded-xl bg-[#F5F3FF] dark:bg-[#131313] p-6 md:p-8 border border-[#311B92]/10 dark:border-white/5">
                <h3 className="text-xl font-bold font-manrope text-[#311B92] dark:text-white">How SAFAR Changed Lives</h3>
                <div className="mt-5 space-y-4">
                  {wallOfImpact.map((item) => (
                    <article key={item.title} className="rounded-lg bg-white dark:bg-[#1f2020] p-4 text-[#311B92] dark:text-[#e7e5e4] border border-[#311B92]/10 dark:border-transparent transition-colors">
                      <p className="text-sm font-bold text-[#311B92] dark:text-[#c6c6c6]">{item.title}</p>
                      <p className="mt-2 text-sm text-[#311B92]/70 dark:text-[#acabaa] font-normal leading-relaxed">{item.story}</p>
                      <p className="mt-3 text-xs uppercase tracking-widest text-cyan-600 dark:text-[#767575] font-semibold">{item.student}</p>
                    </article>
                  ))}
                </div>
              </div>

              {/* Celebration Pack */}
              <div className="rounded-xl bg-[#F5F3FF] dark:bg-[#131313] p-6 md:p-8 flex flex-col border border-[#311B92]/10 dark:border-white/5">
                <h3 className="text-xl font-bold font-manrope text-[#311B92] dark:text-white">100K Celebration Pack</h3>
                <p className="mt-2 text-sm text-[#311B92]/70 dark:text-[#acabaa]">Limited-time resource drop for students who want to reset and level up fast.</p>
                <div className="mt-5 space-y-3 flex-1">
                  {resourcePack.map((item) => (
                    <a
                      key={item.label}
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white dark:bg-[#1f2020] px-4 py-3 flex items-center justify-between group border border-[#311B92]/10 dark:border-transparent hover:border-cyan-400/40 transition-colors"
                      aria-label={`Download ${item.label}`}
                    >
                      <span className="text-sm text-[#311B92] dark:text-[#d0d0d0]">{item.label}</span>
                      <Download className="w-4 h-4 text-cyan-600 dark:text-[#767575] group-hover:text-[#311B92] dark:group-hover:text-[#c6c6c6] transition-colors" />
                    </a>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={downloadPackZip}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#311B92] dark:bg-[#1f2020] border border-[#311B92]/20 dark:border-[#484848] text-white dark:text-[#e7e5e4] px-5 py-3 font-semibold hover:bg-[#311B92]/90 dark:hover:bg-[#252626] transition-colors"
                >
                  Download Free Pack
                </button>
              </div>
            </div>

            {/* Footer Timeline */}
            <div className="rounded-xl bg-[#F5F3FF] dark:bg-[#191a1a] p-6 md:p-8 border border-[#311B92]/10 dark:border-white/5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-[#311B92]/5 blur-[80px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2" />
              
              <h3 className="text-xl font-bold font-manrope text-[#311B92] dark:text-white">Thank You For Building This Journey</h3>
              <p className="mt-2 text-sm text-[#311B92]/60 dark:text-[#acabaa] max-w-2xl">
                What started as a small idea is now a movement. Every milestone happened because students decided to show up daily.
              </p>

              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
                {timeline.map((step) => (
                  <div key={step.label} className="relative z-10">
                    <p className="text-2xl font-black font-manrope text-slate-300 dark:text-[#c6c6c6] opacity-80">{step.label}</p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-[#9b9e9f] font-medium leading-relaxed pr-4">{step.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/challenge-100k"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#311B92] dark:bg-white text-white dark:text-black px-8 py-3.5 font-bold transition-all hover:bg-[#311B92]/90 dark:hover:bg-[#e2e2e2] w-full sm:w-auto shadow-lg shadow-[#311B92]/20 dark:shadow-none"
                >
                  Join 100K Discipline Challenge
                  <ArrowRight className="w-4 h-4 text-cyan-400 dark:text-black" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Milestone100KModal;
