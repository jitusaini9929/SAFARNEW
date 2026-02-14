import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { authService } from "@/utils/authService";
import { TourPrompt } from "@/components/guided-tour";
import { suggestionsTour } from "@/components/guided-tour/tourSteps";
import {
  Lightbulb,
  Wind,
  Coffee,
  Zap,
  Leaf,
  Sparkles,
  Info,
  Circle,
  ArrowRight
} from "lucide-react";

export default function Suggestions() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (!response || !response.user) {
          navigate("/login");
          return;
        }
        setUser(response.user);
      } catch (error) {
        console.error("Error fetching data:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (loading || !user) {
    return (
      <NishthaLayout>
        <div className="flex items-center justify-center h-full bg-background transition-colors duration-300">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <p className="text-primary font-['Poppins'] tracking-wider text-sm">LOADING INSIGHTS...</p>
          </div>
        </div>
      </NishthaLayout>
    );
  }

  return (
    <NishthaLayout userName={user?.name} userAvatar={user?.avatar}>
      {/* Midnight Insight Theme Wrapper */}
      <div className="flex-1 bg-background font-sans min-h-full transition-colors duration-300 relative scroll-smooth selection:bg-primary selection:text-primary-foreground">

        {/* Background Ambient Glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slower"></div>
        </div>

        {/* Top Navigation / Header Spacer is handled by MainLayout, but we can add a subtle gradient at top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#6d1b2b]/10 to-transparent pointer-events-none z-10"></div>

        {/* Hero Section */}
        <div data-tour="suggestions-hero" className="relative w-full py-16 px-8 sm:px-12 z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center mb-4">
                <span className="px-3 py-1 rounded-full border border-[#0d9488]/30 bg-[#0d9488]/10 text-[#0d9488] text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-md">
                  Personalized Insights
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-['Poppins'] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                Your Sanctuary <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0d9488] to-[#2dd4bf]">of Growth</span>
              </h1>
              <p className="text-foreground/70 text-lg leading-relaxed max-w-xl font-light border-l-2 border-[#6d1b2b] pl-6">
                Tailored wisdom to guide your emotional journey. Embrace clarity, find calm, and ignite your potential in the stillness of the night.
              </p>
            </div>

            {/* Hero Visual */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6d1b2b] to-[#0d9488] rounded-full blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity duration-700"></div>
              <div className="relative w-48 h-48 md:w-64 md:h-64 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(13,148,136,0.2)] hover:scale-105 transition-all duration-500">
                <Lightbulb className="w-24 h-24 text-white/90 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]" strokeWidth={1} />
                <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-2 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 pb-16 space-y-16">

          {/* Suggestions Grid - Obsidian Glass Cards */}
          <section data-tour="suggestion-cards" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            {/* Card 1 */}
            <article
              onClick={() => navigate('/meditation')}
              className="glass-high group relative rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(13,148,136,0.1)] transition-all duration-500 cursor-pointer"
            >
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0d9488] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-8 flex flex-col h-full relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0d9488]/20 to-transparent rounded-xl flex items-center justify-center mb-6 border border-[#0d9488]/20 group-hover:scale-110 transition-transform duration-300">
                  <Wind className="w-6 h-6 text-[#2dd4bf]" />
                </div>
                <h2 className="font-['Poppins'] font-semibold text-xl text-[#0d9488] mb-2 group-hover:text-[#2dd4bf] transition-colors">Stress Relief</h2>
                <p className="text-xs text-[#0d9488]/70 mb-6 uppercase tracking-wider font-medium">Calm your mind</p>
                <ul className="space-y-4 text-sm text-foreground/80 flex-1">
                  {["Deep breathing: 4-4-4", "10-min nature walk", "Calming soundscapes", "Progressive relaxation"].map((item, i) => (
                    <li key={i} className="flex items-start group/item hover:text-foreground transition-colors">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0d9488] mr-3 shadow-[0_0_5px_#0d9488]"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#0d9488]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </article>

            {/* Card 2 */}
            <article className="glass-high group relative rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(109,27,43,0.15)] transition-all duration-500">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6d1b2b] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-8 flex flex-col h-full relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6d1b2b]/20 to-transparent rounded-xl flex items-center justify-center mb-6 border border-[#6d1b2b]/20 group-hover:scale-110 transition-transform duration-300">
                  <Coffee className="w-6 h-6 text-[#fb7185]" />
                </div>
                <h2 className="font-['Poppins'] font-semibold text-xl text-[#be123c] mb-2 group-hover:text-[#fb7185] transition-colors">Study Breaks</h2>
                <p className="text-xs text-[#be123c]/70 mb-6 uppercase tracking-wider font-medium">Recharge energy</p>
                <ul className="space-y-4 text-sm text-foreground/80 flex-1">
                  {["5-min stretch", "Hydrate + healthy snack", "Mindfulness moment", "Light yoga flow"].map((item, i) => (
                    <li key={i} className="flex items-start group/item hover:text-foreground transition-colors">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6d1b2b] mr-3 shadow-[0_0_5px_#6d1b2b]"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#6d1b2b]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </article>

            {/* Card 3 */}
            <article className="glass-high group relative rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(234,179,8,0.1)] transition-all duration-500">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#eab308] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-8 flex flex-col h-full relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#eab308]/20 to-transparent rounded-xl flex items-center justify-center mb-6 border border-[#eab308]/20 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-[#fde047]" />
                </div>
                <h2 className="font-['Poppins'] font-semibold text-xl text-[#ca8a04] mb-2 group-hover:text-[#fde047] transition-colors">Motivation</h2>
                <p className="text-xs text-[#ca8a04]/70 mb-6 uppercase tracking-wider font-medium">Ignite focus</p>
                <ul className="space-y-4 text-sm text-foreground/80 flex-1">
                  {["Review achievements", "Connect with peers", "Motivational talks", "Celebrate wins"].map((item, i) => (
                    <li key={i} className="flex items-start group/item hover:text-foreground transition-colors">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#eab308] mr-3 shadow-[0_0_5px_#eab308]"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#eab308]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </article>

            {/* Card 4 */}
            <article className="glass-high group relative rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all duration-500">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[#22c55e] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-8 flex flex-col h-full relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#22c55e]/20 to-transparent rounded-xl flex items-center justify-center mb-6 border border-[#22c55e]/20 group-hover:scale-110 transition-transform duration-300">
                  <Leaf className="w-6 h-6 text-[#4ade80]" />
                </div>
                <h2 className="font-['Poppins'] font-semibold text-xl text-[#16a34a] mb-2 group-hover:text-[#4ade80] transition-colors">Healthy Habits</h2>
                <p className="text-xs text-[#16a34a]/70 mb-6 uppercase tracking-wider font-medium">Build foundation</p>
                <ul className="space-y-4 text-sm text-foreground/80 flex-1">
                  {["Sleep schedule", "Regular exercise", "Nutritious meals", "Gratitude journal"].map((item, i) => (
                    <li key={i} className="flex items-start group/item hover:text-foreground transition-colors">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] mr-3 shadow-[0_0_5px_#22c55e]"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#22c55e]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </article>

          </section>

          {/* Quick Tips Section - Glowing Path */}
          <section data-tour="wellbeing-path" className="relative">
            {/* Section Header */}
            <div className="flex items-center mb-12">
              <div className="relative">
                <div className="absolute inset-0 bg-[#d8b4fe] blur-lg opacity-40"></div>
                <div className="relative bg-[#3b0764]/50 p-3 rounded-full border border-[#d8b4fe]/30">
                  <Sparkles className="w-6 h-6 text-[#e9d5ff]" />
                </div>
              </div>
              <h2 className="ml-5 text-3xl font-['Poppins'] font-bold text-foreground tracking-wide">
                Path to Well-being
              </h2>
            </div>

            {/* The Path Line */}
            <div className="absolute left-9 top-24 bottom-10 w-px bg-gradient-to-b from-[#0d9488] via-[#6d1b2b] to-transparent hidden md:block opacity-30"></div>

            <div className="space-y-8 md:ml-10">
              {/* Tip 1 */}
              <div className="group relative">
                <div className="md:absolute md:-left-[45px] md:top-1/2 md:-translate-y-1/2 w-5 h-5 rounded-full bg-[#050505] border-[3px] border-[#0d9488] z-10 shadow-[0_0_15px_#0d9488] group-hover:scale-125 transition-transform duration-300 hidden md:block"></div>
                <div className="glass-high rounded-2xl p-6 hover:bg-muted/10 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between shadow-lg">
                  <div>
                    <h3 className="text-xl font-bold font-['Poppins'] text-foreground mb-2 group-hover:text-[#2dd4bf] transition-colors">Morning Routine</h3>
                    <p className="text-muted-foreground">Start your day with positive affirmations and a clear plan.</p>
                  </div>
                  <div className="mt-4 md:mt-0 px-4 py-1.5 rounded-lg bg-[#0d9488]/10 border border-[#0d9488]/20 text-[#2dd4bf] text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(13,148,136,0.1)]">
                    Focus
                  </div>
                </div>
              </div>

              {/* Tip 2 */}
              <div className="group relative">
                <div className="md:absolute md:-left-[45px] md:top-1/2 md:-translate-y-1/2 w-5 h-5 rounded-full bg-[#050505] border-[3px] border-[#3b82f6] z-10 shadow-[0_0_15px_#3b82f6] group-hover:scale-125 transition-transform duration-300 hidden md:block"></div>
                <div className="glass-high rounded-2xl p-6 hover:bg-muted/10 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between shadow-lg">
                  <div>
                    <h3 className="text-xl font-bold font-['Poppins'] text-foreground mb-2 group-hover:text-[#60a5fa] transition-colors">Social Connection</h3>
                    <p className="text-muted-foreground">Spend time with people who uplift and support you.</p>
                  </div>
                  <div className="mt-4 md:mt-0 px-4 py-1.5 rounded-lg bg-[#1e3a8a]/20 border border-[#3b82f6]/20 text-[#60a5fa] text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    Community
                  </div>
                </div>
              </div>

              {/* Tip 3 */}
              <div className="group relative">
                <div className="md:absolute md:-left-[45px] md:top-1/2 md:-translate-y-1/2 w-5 h-5 rounded-full bg-[#050505] border-[3px] border-[#ec4899] z-10 shadow-[0_0_15px_#ec4899] group-hover:scale-125 transition-transform duration-300 hidden md:block"></div>
                <div className="glass-high rounded-2xl p-6 hover:bg-muted/10 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between shadow-lg">
                  <div>
                    <h3 className="text-xl font-bold font-['Poppins'] text-foreground mb-2 group-hover:text-[#f472b6] transition-colors">Self-Care First</h3>
                    <p className="text-muted-foreground">Remember: Your well-being is not selfish—it's essential.</p>
                  </div>
                  <div className="mt-4 md:mt-0 px-4 py-1.5 rounded-lg bg-[#831843]/20 border border-[#ec4899]/20 text-[#f472b6] text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(236,72,153,0.1)]">
                    Priority
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Warning - Minimal & Elegant */}
          <div className="max-w-3xl mx-auto border-t border-white/5 pt-12 text-center">
            <div className="inline-flex items-center gap-2 text-red-400/80 bg-red-950/20 px-6 py-3 rounded-full border border-red-900/30 hover:bg-red-950/30 transition-colors cursor-default">
              <Info className="w-4 h-4" />
              <span className="text-xs font-medium tracking-wide">
                In crisis? Reach out to a professional or helpline immediately.
              </span>
            </div>
          </div>

        </div>
      </div>
      <TourPrompt tour={suggestionsTour} featureName="Suggestions" />
    </NishthaLayout>
  );
}
