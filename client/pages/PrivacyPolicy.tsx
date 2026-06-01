import React from "react";
import { Link } from "react-router-dom";
import SafarLogo from "@/components/landing/SafarLogo";
import { ArrowLeft, Shield, Lock, EyeOff, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 bg-gradient-to-br from-white via-slate-50 to-indigo-50 dark:bg-gradient-to-br dark:from-plum-dark dark:via-purple-deep dark:to-midnight py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white/70 dark:bg-[#1a1c1e]/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-xl">
        
        {/* Header */}
        <header className="mb-10 text-center md:text-left">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <SafarLogo className="w-14 h-14 text-[#042854] dark:text-white" />
            <div>
              <h1 className="text-3xl md:text-4xl font-playfair font-extrabold text-[#042854] dark:text-white uppercase tracking-wider">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Last Updated: June 2026 • Safar Digital Wellbeing Project
              </p>
            </div>
          </div>
        </header>

        {/* Intro */}
        <section className="prose dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Welcome to <strong>Safar</strong> (“we”, “our”, or “us”). We are dedicated to protecting your privacy and ensuring you have a safe, distraction-free environment to study. This Privacy Policy details how we collect, process, and secure data across the Safar Website and Mobile Application.
          </p>

          <hr className="border-slate-100 dark:border-white/5 my-8" />

          {/* Core Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/20 border border-indigo-500/10 text-center">
              <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Local Encryption</h4>
              <p className="text-xs text-slate-500">Your journals and blocked app choices remain strictly on your local device.</p>
            </div>
            <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-slate-800/20 border border-teal-500/10 text-center">
              <Lock className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">No Tracking</h4>
              <p className="text-xs text-slate-500">We do not track, read, or upload personal photos, passwords, or keystrokes.</p>
            </div>
            <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-slate-800/20 border border-rose-500/10 text-center">
              <EyeOff className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Support Only</h4>
              <p className="text-xs text-slate-500">Data usage is strictly scoped to the study and focus aids you choose to use.</p>
            </div>
          </div>

          {/* Section 1 */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
            1. Information We Collect and How We Use It
          </h2>
          <p>
            Safar gathers only the absolute minimum amount of information necessary to deliver high-quality, personalized services:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account Data:</strong> When creating an account, we store your username, email address, and avatar to enable synchronized data and access to the Mehfil community space.
            </li>
            <li>
              <strong>Study & Focus Stats:</strong> Focus durations, chapter progress, and streak counts are synchronized to help you track consistency.
            </li>
            <li>
              <strong>Nishtha Journals:</strong> Your personal journals are securely stored with end-to-end cloud protection or locally cached based on your preferences.
            </li>
          </ul>

          {/* Section 2 - Accessibility API */}
          <div className="my-8 p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10">
            <h2 className="text-lg font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">
              ⚠️ Kavach Focus Shield & Accessibility Service API
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              The Safar mobile application provides a digital well-being utility named <strong>Kavach Focus Shield</strong> designed to help students block access to distracting applications during active study timers.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <strong>Purpose of Permission:</strong> The app uses Android’s <code>AccessibilityService API</code> strictly to detect when a distracting app (pre-selected by the student) is brought to the foreground, prompting the Kavach custom overlay to block it.
              </li>
              <li>
                <strong>Zero Sniffing & Logging:</strong> The Accessibility Service does not log, monitor, read, or compile any keystrokes, messages, typed text, passwords, or on-screen inputs.
              </li>
              <li>
                <strong>Completely Offline & Secure:</strong> All accessibility events are processed directly in-memory, locally on your device. Absolutely no data from this service is ever transmitted to Safar servers or external third parties.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
            2. Sharing and Third-Party Disclosures
          </h2>
          <p>
            We do not sell, rent, or trade your personal data. Inside the <strong>Mehfil</strong> chat system, you may opt to share social/contact handles (LinkedIn, Instagram, Discord) directly with peers. This sharing is fully controlled by the user, optional, and can be deleted at any time.
          </p>

          {/* Section 4 */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
            3. Data Retention and Deletion Requests
          </h2>
          <p>
            You retain absolute ownership of your data. You may request the deletion of your account and all associated data at any time by navigating to your profile or contacting us at <a href="mailto:safarparmar0@gmail.com" className="text-primary underline">safarparmar0@gmail.com</a>. To request immediate data and account deletion programmatically, you can fill out our automated form directly at <a href="https://safar.parmarssc.in/delete-account" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://safar.parmarssc.in/delete-account</a>.
          </p>

          {/* Section 5 */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
            4. Children's Privacy
          </h2>
          <p>
            Our services do not target and are not intended for children under the age of 13. We do not knowingly collect personal identifiable information from children under 13. If we discover that a child under 13 has provided us with personal information, we immediately delete this from our servers.
          </p>

          <hr className="border-slate-100 dark:border-white/5 my-8" />

          {/* Footer Contact */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <p className="text-xs text-slate-500">
              © 2026 Safar Wellbeing Project. All Rights Reserved.
            </p>
            <a
              href="mailto:safarparmar0@gmail.com"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <Mail className="w-4 h-4" /> safarparmar0@gmail.com
            </a>
          </div>

        </section>
      </div>
    </div>
  );
}
