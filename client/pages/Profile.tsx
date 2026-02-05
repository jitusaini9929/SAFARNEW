import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import { User } from "@shared/api";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    examType: "",
    preparationStage: "",
    gender: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Check if dark mode is enabled
    setIsDark(document.documentElement.classList.contains('dark'));

    const fetchUser = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (!data || !data.user) {
          navigate("/login");
          return;
        }
        setUser(data.user);
        setFormData({
          name: data.user.name || "",
          email: data.user.email || "",
          examType: data.user.examType || "CHSL",
          preparationStage: data.user.preparationStage || "Intermediate",
          gender: data.user.gender || "Male",
        });
      } catch (error) {
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedUser = await authService.updateProfile({
        name: formData.name,
        examType: formData.examType,
        preparationStage: formData.preparationStage,
        gender: formData.gender,
        avatar: avatarPreview || undefined,
      });
      setUser(updatedUser);
      setFormData({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        examType: updatedUser.examType || "CHSL",
        preparationStage: updatedUser.preparationStage || "Intermediate",
        gender: updatedUser.gender || "Male",
      });
      setAvatarPreview(null);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;


  return (
    <>
      <style>{`
        .bento-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .bento-card:hover {
          transform: translateY(-2px);
        }
        .profile-ring {
          position: relative;
        }
        .profile-ring::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 1.5rem;
          padding: 2px;
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>

      <div className="font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/safar-logo.png.jpeg"
                alt="Safar Logo"
                className="w-10 h-10 rounded-full border border-emerald-500 object-cover shadow-sm"
              />
              <span className="text-xl font-bold tracking-tight">Safar</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/landing')}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title="Go to Home"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your sanctuary preferences and personal details.</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Profile Card - Left Side */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bento-card bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center relative overflow-hidden">
                {/* Profile Picture */}
                <div className="relative inline-block mb-6">
                  <div className="profile-ring">
                    <img
                      alt={`${user.name} profile picture`}
                      className="w-26 h-26 rounded-3xl object-cover border-4 border-white dark:border-slate-900"
                      src={avatarPreview || user.avatar || "https://via.placeholder.com/150"}
                    />
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-1 right-1 w-9 h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-white dark:border-slate-900 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </label>
                </div>

                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-4">{user.email}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </div>
              </div>
            </div>

            {/* Forms Section - Right Side */}
            <div className="lg:col-span-8 space-y-6">
              {/* Personal Information */}
              <div className="bento-card bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg">Personal Information</h3>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Full Name</label>
                      <input
                        className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 px-0 pb-2 focus:ring-0 focus:border-emerald-500 transition-colors font-medium text-slate-900 dark:text-white"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Email Address</label>
                      <div className="flex flex-col">
                        <input
                          className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 px-0 pb-2 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                          disabled
                          type="email"
                          value={formData.email}
                        />
                        <span className="text-[10px] text-slate-400 mt-2 italic">* Contact support to update email</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Gender</label>
                      <div className="relative">
                        <select
                          className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 px-0 pb-2 focus:ring-0 focus:border-emerald-500 transition-colors font-medium appearance-none text-slate-900 dark:text-white"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                          <option value="Male" className="bg-white dark:bg-slate-800">Male</option>
                          <option value="Female" className="bg-white dark:bg-slate-800">Female</option>
                          <option value="Other" className="bg-white dark:bg-slate-800">Other</option>
                        </select>
                        <svg className="absolute right-0 bottom-2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exam Focus */}
              <div className="bento-card bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg">Exam Focus</h3>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Target Exam</label>
                      <div className="relative">
                        <select
                          className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 px-0 pb-2 focus:ring-0 focus:border-emerald-500 transition-colors font-medium appearance-none text-slate-900 dark:text-white"
                          value={formData.examType}
                          onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                        >
                          <option value="CHSL" className="bg-white dark:bg-slate-800">CHSL</option>
                          <option value="CGL" className="bg-white dark:bg-slate-800">CGL</option>
                          <option value="MTS" className="bg-white dark:bg-slate-800">MTS</option>
                          <option value="12th Boards" className="bg-white dark:bg-slate-800">12th Boards</option>
                          <option value="NTPC" className="bg-white dark:bg-slate-800">NTPC</option>
                          <option value="JEE" className="bg-white dark:bg-slate-800">JEE</option>
                          <option value="Other" className="bg-white dark:bg-slate-800">Other</option>
                        </select>
                        <svg className="absolute right-0 bottom-2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Preparation Stage</label>
                      <div className="relative">
                        <select
                          className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 px-0 pb-2 focus:ring-0 focus:border-emerald-500 transition-colors font-medium appearance-none text-slate-900 dark:text-white"
                          value={formData.preparationStage}
                          onChange={(e) => setFormData({ ...formData, preparationStage: e.target.value })}
                        >
                          <option value="Beginner" className="bg-white dark:bg-slate-800">Beginner</option>
                          <option value="Intermediate" className="bg-white dark:bg-slate-800">Intermediate</option>
                          <option value="Advanced" className="bg-white dark:bg-slate-800">Advanced</option>
                        </select>
                        <svg className="absolute right-0 bottom-2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="bento-card bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Account Status</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your account is verified and secured.</p>
                  </div>
                </div>
                <span className="px-4 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Verified
                </span>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-16 flex justify-center">
            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </main>
      </div>
    </>
  );
}
