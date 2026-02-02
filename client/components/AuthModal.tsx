import { useState } from "react";
import { authService } from "@/utils/authService";
import { toast } from "sonner";
import { X } from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");

    // Login fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Signup fields
    const [name, setName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [examType, setExamType] = useState("");
    const [preparationStage, setPreparationStage] = useState("");
    const [gender, setGender] = useState("");
    const [profilePreview, setProfilePreview] = useState<string | null>(null);

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setName("");
        setConfirmPassword("");
        setExamType("");
        setPreparationStage("");
        setGender("");
        setProfilePreview(null);
        setError("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Please fill in email and password");
            return;
        }

        if (!email.includes("@")) {
            setError("Please enter a valid email");
            return;
        }

        setIsLoading(true);
        try {
            await authService.login(email, password);
            toast.success("Welcome back!");
            sessionStorage.setItem("showWelcome", "true");
            resetForm();
            onAuthSuccess();
            onClose();
            // Refresh the page to update user state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (err: any) {
            setError(err.message || "Invalid credentials");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim() || !email.trim() || !password.trim() || !gender) {
            setError("Please fill in all required fields including gender");
            return;
        }

        if (!email.includes("@")) {
            setError("Please enter a valid email");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            await authService.signup(
                name,
                email,
                password,
                examType || undefined,
                preparationStage || undefined,
                gender,
                profilePreview || undefined
            );
            toast.success("Account created successfully!");
            sessionStorage.setItem("showWelcome", "true");
            resetForm();
            onAuthSuccess();
            onClose();
            // Refresh the page to update user state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (err: any) {
            setError(err.message || "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <style>{`
        .auth-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .auth-modal-container {
          position: relative;
          width: 100%;
          max-width: 28rem;
          max-height: 90vh;
          overflow-y: auto;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modal-slide-up 0.3s ease-out;
        }
        .dark .auth-modal-container {
          background: rgba(17, 24, 39, 0.95);
        }
        @keyframes modal-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .btn-gradient {
          background: linear-gradient(135deg, #047857 0%, #881337 100%);
          transition: all 0.3s ease;
        }
        .btn-gradient:hover {
          background: linear-gradient(135deg, #059669 0%, #9f1239 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(4, 120, 87, 0.4);
        }
      `}</style>

            <div className="auth-modal-backdrop" onClick={onClose}>
                <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>

                    <div className="p-8">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {mode === "login" ? "Welcome Back" : "Create Account"}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {mode === "login"
                                    ? "Sign in to continue your journey"
                                    : "Join Safar to start your journey"}
                            </p>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
                            <button
                                type="button"
                                onClick={() => { setMode("login"); setError(""); }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login"
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                                        : "text-gray-500 dark:text-gray-400"
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode("signup"); setError(""); }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "signup"
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                                        : "text-gray-500 dark:text-gray-400"
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Login Form */}
                        {mode === "login" && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-gradient w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50"
                                >
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </button>
                            </form>
                        )}

                        {/* Signup Form */}
                        {mode === "signup" && (
                            <form onSubmit={handleSignup} className="space-y-3">
                                {/* Profile Picture */}
                                <div className="flex flex-col items-center mb-2">
                                    <label htmlFor="modal-profile-upload" className="cursor-pointer">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-teal-500/50 flex items-center justify-center overflow-hidden hover:border-teal-500 transition-colors">
                                            {profilePreview ? (
                                                <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400 text-center px-1">Add Photo</span>
                                            )}
                                        </div>
                                    </label>
                                    <input
                                        id="modal-profile-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        disabled={isLoading}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                        disabled={isLoading}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                    />
                                </div>

                                {/* Password Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Password *
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 6 chars"
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Confirm *
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm"
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Exam Type & Prep Stage */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Exam Type
                                        </label>
                                        <select
                                            value={examType}
                                            onChange={(e) => setExamType(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        >
                                            <option value="">Select</option>
                                            <option value="CGL">CGL</option>
                                            <option value="CHSL">CHSL</option>
                                            <option value="GD">GD</option>
                                            <option value="MTS">MTS</option>
                                            <option value="12th Boards">12th Boards</option>
                                            <option value="NTPC">NTPC</option>
                                            <option value="JEE">JEE</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Prep Stage
                                        </label>
                                        <select
                                            value={preparationStage}
                                            onChange={(e) => setPreparationStage(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                        >
                                            <option value="">Select</option>
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Gender *
                                    </label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        disabled={isLoading}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-sm"
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn-gradient w-full py-3 rounded-xl text-white font-bold tracking-wide disabled:opacity-50"
                                >
                                    {isLoading ? "Creating account..." : "Create Account"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
