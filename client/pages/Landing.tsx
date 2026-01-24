import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";

export default function Landing() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'apps' | 'tools' | 'community'>('apps');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (data?.user) {
          setUser(data.user);
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

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden font-sans">
      <style>{`
        :root {
          --primary: #0A5FFF;
          --accent: #FFB200;
          --bg-neutral: #F7F9FC;
          --text-main: #111827;
          --text-muted: #6B7280;
        }
        body {
          font-family: 'Lato', sans-serif;
          scroll-behavior: smooth;
        }
        h1, h2, h3, h4, .font-heading {
          font-family: 'Poppins', sans-serif;
        }
        .glass-nav {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(10, 95, 255, 0.1);
        }
        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .btn-animate:hover {
          transform: scale(1.02);
          box-shadow: 0 0 15px rgba(10, 95, 255, 0.3);
        }
        .gold-glow:hover {
          box-shadow: 0 0 20px rgba(255, 178, 0, 0.4);
        }
        .sticky-bottom-cta {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 100;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link to="/" className="text-2xl font-extrabold text-blue-600 flex items-center gap-2">
              🌟 Safar
            </Link>
            <div className="hidden lg:flex items-center space-x-8 font-medium text-gray-900">
              <div className="group relative py-7">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Apps <span className="text-sm">▼</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute top-20 left-0 w-48 bg-white shadow-xl rounded-xl border border-gray-100 p-2">
                    <Link to="/dashboard" className="block p-3 hover:bg-gray-50 rounded-lg text-sm">Nishta</Link>
                    <Link to="/study" className="block p-3 hover:bg-gray-50 rounded-lg text-sm">Focus Timer</Link>
                    <span className="block p-3 text-gray-400 rounded-lg text-sm">Mehfil (Coming Soon)</span>
                  </div>
                )}
              </div>
              <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
              <Link to="/achievements" className="hover:text-blue-600 transition-colors">Achievements</Link>
              <Link to="/profile" className="hover:text-blue-600 transition-colors">Profile</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden sm:block text-sm text-gray-600">Welcome, {user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold btn-animate transition-all text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 overflow-hidden bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-xs uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Your Productivity Ecosystem
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 text-gray-900">
              Transform Your <span className="text-blue-600">Study Journey</span> with Safar
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl leading-relaxed">
              Everything you need for academic success - mental wellness tracking, focus sessions, and study communities. All in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-center btn-animate text-lg"
              >
                Enter Nishta
              </Link>
              <Link
                to="/study"
                className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-bold text-center hover:border-blue-600 transition-all text-lg"
              >
                Start Focus Timer
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-9xl">🎯</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center gap-4 border border-white/20">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white font-bold">S</div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-purple-500 flex items-center justify-center text-white font-bold">A</div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-green-500 flex items-center justify-center text-white font-bold">F</div>
                </div>
                <p className="text-sm font-bold">1000+ Active Students</p>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="max-w-7xl mx-auto px-6 mt-24 border-t border-gray-100 pt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
              <span className="text-blue-600 text-3xl">✓</span>
              <span className="font-bold text-sm">Daily Check-ins</span>
            </div>
            <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
              <span className="text-blue-600 text-3xl">📈</span>
              <span className="font-bold text-sm">Progress Tracking</span>
            </div>
            <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
              <span className="text-blue-600 text-3xl">🎯</span>
              <span className="font-bold text-sm">Goal Setting</span>
            </div>
            <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
              <span className="text-blue-600 text-3xl">🏆</span>
              <span className="font-bold text-sm">Achievements</span>
            </div>
          </div>
        </div>
      </header>

      {/* Why Choose Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Why Choose Safar?</h2>
            <div className="w-20 h-1.5 bg-yellow-400 mx-auto rounded-full"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 card-hover transition-all">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🧘
              </div>
              <h3 className="text-xl font-bold mb-3">Mental Wellness</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Daily mood tracking and journaling to maintain emotional balance during studies.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 card-hover transition-all">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                ⏱️
              </div>
              <h3 className="text-xl font-bold mb-3">Focus Sessions</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Pomodoro-style timer with customizable sessions and achievement rewards.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 card-hover transition-all">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🎯
              </div>
              <h3 className="text-xl font-bold mb-3">Goal Tracking</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Set daily and weekly goals. Track your progress and earn streaks.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 card-hover transition-all">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🏅
              </div>
              <h3 className="text-xl font-bold mb-3">Achievements</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Earn badges and titles as you maintain consistency and hit milestones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Apps Section */}
      <section className="py-24 bg-gray-50" id="courses">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Our Apps</h2>
              <p className="text-gray-600">Your complete productivity ecosystem.</p>
            </div>
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
              <button
                onClick={() => setActiveTab('apps')}
                className={`px-6 py-2 rounded-lg font-bold text-sm ${activeTab === 'apps' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Apps
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={`px-6 py-2 rounded-lg font-bold text-sm ${activeTab === 'tools' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Tools
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`px-6 py-2 rounded-lg font-bold text-sm ${activeTab === 'community' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Community
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Nishta Card */}
            <Link to="/dashboard" className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="h-48 overflow-hidden relative bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <span className="text-8xl group-hover:scale-110 transition-transform duration-500">🧘</span>
                <div className="absolute top-4 right-4 bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Wellness
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">Nishta</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Mental wellness companion with daily mood check-ins, journaling, and emotional tracking.
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <span className="flex items-center gap-1 text-sm font-bold text-gray-600">
                    ✨ Daily Check-ins
                  </span>
                  <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Enter →
                  </span>
                </div>
              </div>
            </Link>

            {/* Focus Timer Card */}
            <Link to="/study" className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="h-48 overflow-hidden relative bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <span className="text-8xl group-hover:scale-110 transition-transform duration-500">⏱️</span>
                <div className="absolute top-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Productivity
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">Focus Timer</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Advanced Pomodoro timer with focus sessions, achievements, and productivity stats.
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <span className="flex items-center gap-1 text-sm font-bold text-gray-600">
                    🔥 Study Sessions
                  </span>
                  <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Enter →
                  </span>
                </div>
              </div>
            </Link>

            {/* Mehfil Card */}
            <div className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm opacity-70">
              <div className="h-48 overflow-hidden relative bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <span className="text-8xl">👥</span>
                <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Coming Soon
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">Mehfil</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Social study rooms where you can focus together with friends and fellow students.
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <span className="flex items-center gap-1 text-sm font-bold text-gray-600">
                    🎯 Study Together
                  </span>
                  <span className="text-purple-600 font-bold">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24" id="contact">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-blue-600 rounded-3xl overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-700/20 transform skew-x-12 translate-x-32"></div>
            <div className="grid lg:grid-cols-2 p-10 md:p-16 relative z-10 items-center gap-12">
              <div className="text-white">
                <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Start Your Journey Today!</h2>
                <p className="text-blue-100 text-lg mb-10 leading-relaxed">
                  Choose your app and begin transforming your study habits. Track progress, earn achievements, and stay consistent.
                </p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-3xl font-extrabold">100%</span>
                    <span className="text-xs uppercase opacity-70">Free to Use</span>
                  </div>
                  <div className="w-px h-10 bg-white/20"></div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-extrabold">∞</span>
                    <span className="text-xs uppercase opacity-70">Unlimited Sessions</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <Link
                  to="/dashboard"
                  className="w-full py-5 bg-white text-blue-600 font-bold rounded-xl text-lg text-center hover:bg-blue-50 transition-all"
                >
                  🧘 Enter Nishta (Wellness)
                </Link>
                <Link
                  to="/study"
                  className="w-full py-5 bg-yellow-400 text-gray-900 font-bold rounded-xl text-lg text-center gold-glow transition-all btn-animate"
                >
                  ⏱️ Start Focus Timer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
            <div>
              <span className="text-2xl font-extrabold text-white flex items-center gap-2 mb-6">
                🌟 Safar
              </span>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Your complete productivity ecosystem for academic success and mental wellness.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Nishta Dashboard</Link></li>
                <li><Link to="/study" className="hover:text-white transition-colors">Focus Timer</Link></li>
                <li><Link to="/goals" className="hover:text-white transition-colors">Goals</Link></li>
                <li><Link to="/achievements" className="hover:text-white transition-colors">Achievements</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-6">Account</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><Link to="/profile" className="hover:text-white transition-colors">Profile</Link></li>
                <li><Link to="/streaks" className="hover:text-white transition-colors">Streaks</Link></li>
                <li><button onClick={handleLogout} className="hover:text-white transition-colors">Logout</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs">© 2024 Safar. All rights reserved.</p>
            <p className="text-slate-500 text-xs">Made with ❤️ for students</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
