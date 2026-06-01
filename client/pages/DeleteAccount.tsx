import React, { useState } from "react";
import { Link } from "react-router-dom";
import SafarLogo from "@/components/landing/SafarLogo";
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsDeleted(true);
        toast({
          title: "Account Deleted",
          description: "Your account has been deleted successfully.",
        });
      } else {
        setErrorMsg(data.message || "Failed to delete account. Please verify your credentials.");
      }
    } catch (err) {
      console.error("Delete account error:", err);
      setErrorMsg("A network error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isDeleted) {
    return (
      <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 bg-gradient-to-br from-white via-slate-50 to-indigo-50 dark:bg-gradient-to-br dark:from-plum-dark dark:via-purple-deep dark:to-midnight flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#1a1c1e] rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-teal-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Account Deleted
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Your account and all associated study planning, focus tracking, and Mehfil details have been permanently purged from our databases.
          </p>
          <Link
            to="/"
            className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors"
          >
            Return to Safar Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 bg-gradient-to-br from-white via-slate-50 to-indigo-50 dark:bg-gradient-to-br dark:from-plum-dark dark:via-purple-deep dark:to-midnight py-12 px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white/70 dark:bg-[#1a1c1e]/70 backdrop-blur-md rounded-3xl p-8 border border-slate-100 dark:border-white/5 shadow-xl">
        
        {/* Back navigation */}
        <Link
          to="/privacy"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-6 hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Privacy Policy
        </Link>

        {/* Branding */}
        <div className="flex items-center gap-3 mb-6">
          <SafarLogo className="w-10 h-10 text-[#042854] dark:text-white" />
          <span className="text-xl font-playfair font-extrabold text-[#042854] dark:text-white tracking-widest uppercase">Safar</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Request Account Deletion
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Google Play Store Compliance Form
        </p>

        {/* Warning Alert */}
        <div className="p-4 mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            <span className="font-bold">Warning:</span> Deletion is permanent and irreversible. 
            All focus stats, chapter planners, Mehfil posts, journals, and private data will be permanently wiped.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="w-full h-10 rounded-xl bg-rose-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            <Trash2 className="w-4 h-4" />
            {isLoading ? "Purging Account..." : "Confirm Deletion"}
          </button>
        </form>

      </div>
    </div>
  );
}
