import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { useTheme } from "@/contexts/ThemeContext";
import PerkTitle from "@/components/PerkTitle";
import { Bell, ArrowRight, Moon, Sun, LogOut, ChevronDown, ChevronUp, User, Award, Target, Flame, BookOpen, Heart, Medal } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [activeBadge, setActiveBadge] = useState<any | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (data?.user) {
          setUser(data.user);
          // Fetch active title
          try {
            const titleData = await dataService.getActiveTitle();
            setActiveTitle(titleData.title);
          } catch (e) { console.error('Failed to fetch active title', e); }

          // Fetch all achievements to find active badge (highest tier earned)
          try {
            const allAchievementsData = await dataService.getAllAchievements();
            const earnedBadges = (allAchievementsData.achievements || [])
              .filter((a: any) => a.type === 'badge' && a.earned)
              .sort((a: any, b: any) => (b.tier || 0) - (a.tier || 0));

            if (earnedBadges.length > 0) {
              setActiveBadge(earnedBadges[0]);
            }
          } catch (e) { console.error('Failed to fetch badges', e); }
        }
      } catch (e) {
        console.error("Failed to fetch user", e);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const apps = [
    {
      name: "Nishta",
      description: "Mental wellness tracking, mood journals, and daily goals for academic success",
      emoji: "🧘",
      href: "/dashboard",
      gradient: "from-primary/20 to-secondary/10",
      borderColor: "border-primary/30",
      available: true
    },
    {
      name: "Focus Timer",
      description: "Pomodoro sessions with calming visuals to enhance your concentration",
      emoji: "⏱️",
      href: "/study",
      gradient: "from-green-500/20 to-teal-500/10",
      borderColor: "border-green-500/30",
      available: true
    },
    {
      name: "Mehfil",
      description: "Study communities and peer support groups for collaborative learning",
      emoji: "👥",
      href: "/mehfil",
      gradient: "from-purple-500/20 to-pink-500/10",
      borderColor: "border-purple-500/30",
      available: true
    }
  ];

  const features = [
    { icon: "💚", title: "Emotional Check-Ins", desc: "Track your daily mood and understand patterns" },
    { icon: "📓", title: "Private Journal", desc: "Express your thoughts in a safe space" },
    { icon: "🎯", title: "Goal Setting", desc: "Set and track daily & weekly objectives" },
    { icon: "🔥", title: "Streak System", desc: "Build habits with motivating streaks" },
    { icon: "🏆", title: "Achievements", desc: "Earn badges and titles as you progress" },
    { icon: "💡", title: "Smart Suggestions", desc: "Personalized tips based on your state" }
  ];

  const stats = [
    { value: "10K+", label: "Active Students" },
    { value: "50K+", label: "Goals Completed" },
    { value: "98%", label: "Satisfaction Rate" },
    { value: "365", label: "Days of Support" }
  ];

  const testimonials = [
    {
      quote: "Review 3",
      name: "",
      role: "",
      avatar: "👩‍🎓"
    },
    {
      quote: "Review 1",
      name: "",
      role: "",
      avatar: "👨‍⚕️"
    },
    {
      quote: "review 2 ",
      name: "",
      role: "",
      avatar: "👩‍🎨"
    }
  ];

  const faqs = [
    {
      question: "What is Safar and how does it help students?",
      answer: "Safar is a comprehensive productivity ecosystem designed for students. It includes Nishta for mental wellness tracking, Focus Timer for productive study sessions, and Mehfil (coming soon) for study communities. Together, these tools help you achieve academic success while maintaining mental well-being."
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely! Your privacy is our top priority. All your journal entries, mood data, and personal information are encrypted and stored securely. We never share your data with third parties, and you have full control over your information."
    },
    {
      question: "How does the Achievement system work?",
      answer: "As you use Nishta, you earn badges and titles by completing goals, maintaining streaks, and tracking your emotional wellness. There are different tiers of badges — from Bronze to Diamond — rewarding consistent progress and helping you stay motivated."
    },
    {
      question: "Can I use Safar on multiple devices?",
      answer: "Yes! Your account syncs across all devices. Log in from your laptop, tablet, or phone, and all your data — goals, journal entries, streaks — will be there waiting for you."
    },
    {
      question: "Is Safar free to use?",
      answer: "Safar is completely free for all students! We believe mental wellness and productivity tools should be accessible to everyone. There are no hidden fees or premium tiers."
    },
    {
      question: "How do I get started with Nishta?",
      answer: "Simply create an account, complete your first emotional check-in, and set a few daily goals. The dashboard will guide you through all features. You can personalize your experience in the Profile section."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-['Poppins'] transition-colors duration-300">
      {/* Background Gradient Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 50%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
            radial-gradient(circle at 85% 30%, hsl(var(--primary) / 0.08) 0%, transparent 45%),
            radial-gradient(circle at 50% 80%, hsl(var(--secondary) / 0.06) 0%, transparent 40%)
          `,
          backgroundAttachment: 'fixed'
        }}
      ></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
        <div className="w-full px-8 h-16 flex justify-between items-center">
          {/* Left: Logo */}
          <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2 shrink-0">
            🌟 Safar
          </Link>

          {/* Center: Navigation Links */}
          <div className="hidden lg:flex items-center space-x-8 text-sm font-medium absolute left-1/2 -translate-x-1/2">
            <div className="relative flex items-center">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                Apps <ChevronDown className="w-4 h-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 glass-high rounded-xl p-2 shadow-xl">
                  <Link to="/dashboard" className="block p-3 hover:bg-muted rounded-lg text-sm text-foreground">Nishta</Link>
                  <Link to="/study" className="block p-3 hover:bg-muted rounded-lg text-sm text-foreground">Focus Timer</Link>
                  <Link to="/mehfil" className="block p-3 hover:bg-muted rounded-lg text-sm text-foreground">Mehfil</Link>
                </div>
              )}
            </div>
            <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
            <Link to="/achievements" className="text-muted-foreground hover:text-primary transition-colors">Achievements</Link>
            <Link to="/profile" className="text-muted-foreground hover:text-primary transition-colors">Profile</Link>
          </div>

          {/* Right: Actions and Logout */}
          <div className="flex items-center gap-4 shrink-0">
            {user && (
              <span className="hidden sm:block text-xs text-muted-foreground mr-2">
                Welcome, <span className="text-foreground font-medium">{user.name}</span>
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg glass-high flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative mr-2">
              <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full"></span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Card */}
      <header className="relative pt-0 pb-0 overflow-hidden min-h-screen">
        <div className="w-full relative z-10 h-full">
          {/* Hero Card with Video Background */}
          <div className="relative w-full mx-auto h-full">
            {/* Hero Card with glass effect - Contains video background */}
            <div className="glass-high px-8 py-24 md:px-16 md:py-32 relative overflow-hidden rounded-none w-full border-0 min-h-screen flex items-center justify-center">
              {/* Video Background - Inside the card */}
              <div className="absolute inset-0 z-0">
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.3 }}
                >
                  <source src="/hero-background-new.mp4" type="video/mp4" />
                </video>
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/40" />
                {/* Vignette effect */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 100%)'
                  }}
                />
              </div>

              {/* Decorative gradient orbs */}
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none z-0" />
              <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none z-0" />

              <div className="text-center max-w-3xl mx-auto relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-xs uppercase tracking-widest mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Your Productivity Ecosystem
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  Transform Your{" "}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Study Journey
                  </span>{" "}
                  with Safar
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                  Everything you need for academic success — mental wellness tracking, focus sessions, and study communities. All in one place.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                  <Link
                    to="/dashboard"
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25 transition-all"
                  >
                    Enter Nishta <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/study"
                    className="px-8 py-3 glass-high rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/5 transition-all"
                  >
                    Focus Timer <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Stats moved inside the card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>



      {/* Apps Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Apps</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A suite of tools designed to support your academic journey and mental well-being
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {apps.map((app) => (
              <Link
                key={app.name}
                to={app.available ? app.href : "#"}
                className={`group relative glass-high rounded-2xl p-6 border ${app.borderColor} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${!app.available && 'opacity-60 cursor-not-allowed'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${app.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                    {app.emoji}
                  </div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {app.name}
                    {!app.available && (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-normal">
                        Coming Soon
                      </span>
                    )}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{app.description}</p>
                  {app.available && (
                    <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open App <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nishta Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comprehensive tools to support your mental wellness and academic growth
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass-high rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Students Say</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hear from students who transformed their study habits with Safar
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="glass-high rounded-2xl p-6">
                <div className="text-4xl mb-4">{testimonial.avatar}</div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Preview Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Your Personal Profile</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Track your progress, view your achievements, and personalize your Safar experience. Your profile is your command center for academic success.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Personal Dashboard</div>
                    <div className="text-sm text-muted-foreground">View all your stats at a glance</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Achievement Gallery</div>
                    <div className="text-sm text-muted-foreground">Showcase your earned badges</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Goal History</div>
                    <div className="text-sm text-muted-foreground">Review your completed objectives</div>
                  </div>
                </div>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
              >
                View Profile <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="glass-high rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0) || "S"}
                </div>
                <div>
                  <div className="font-bold text-lg">{user?.name || "Student Name"}</div>
                  <div className="text-sm text-muted-foreground">{user?.email || "student@safar.com"}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <div className="font-bold">12</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <Target className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="font-bold">45</div>
                  <div className="text-xs text-muted-foreground">Goals Done</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <Award className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                  <div className="font-bold">8</div>
                  <div className="text-xs text-muted-foreground">Badges</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Weekly Progress</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[78%] bg-gradient-to-r from-primary to-secondary rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Everything you need to know about Safar
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-high rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium pr-4">{faq.question}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-high rounded-3xl p-10 text-center border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of students who are already transforming their study habits and mental wellness.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/dashboard"
                  className="px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25 transition-all"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 relative z-10 bg-gradient-to-b from-primary/70 to-primary/10 dark:from-primary/40 dark:to-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold text-primary mb-4">
                🌟 Safar
              </div>
              <p className="text-sm text-muted-foreground">
                Your companion for academic success and mental well-being.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-4">Apps</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/dashboard" className="block hover:text-primary transition-colors">Nishta</Link>
                <Link to="/study" className="block hover:text-primary transition-colors">Focus Timer</Link>
                <span className="block">Mehfil (Soon)</span>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-4">Features</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/check-in" className="block hover:text-primary transition-colors">Check-Ins</Link>
                <Link to="/journal" className="block hover:text-primary transition-colors">Journal</Link>
                <Link to="/goals" className="block hover:text-primary transition-colors">Goals</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-4">Account</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/profile" className="block hover:text-primary transition-colors">Profile</Link>
                <Link to="/achievements" className="block hover:text-primary transition-colors">Achievements</Link>
                <Link to="/streaks" className="block hover:text-primary transition-colors">Streaks</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10">
            <p className="text-xs text-muted-foreground">
              © 2026 Safar. Built with 💚 for students.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
