import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { focusService, FocusStats } from "@/utils/focusService";
import {
  ArrowLeft,
  Sun,
  Moon,
  Clock,
  Flame,
  Target,
  Settings,
  ChevronDown,
  Calendar,
  Zap
} from "lucide-react";

interface FocusAnalyticsProps {
  onBack?: () => void;
  // Props passed from StudyWithMe to control the timer
  onSetTimer?: (minutes: number) => void;
}

export default function FocusAnalytics({ onBack, onSetTimer }: FocusAnalyticsProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await focusService.getStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-xl z-50 fixed inset-0">Loading...</div>;
  if (!stats) return null;

  // Helper for chart bars
  const maxMinutes = Math.max(...stats.weeklyData, 60);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-7 p-6 font-sans text-foreground animate-in fade-in zoom-in-95 duration-300">
      {/* Header / Controls */}
      <div className="flex justify-between items-center px-3">
        <button
          onClick={() => onBack ? onBack() : navigate('/study')}
          className="p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-yellow-400"
        >
          {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </div>

      {/* Focus Analytics Header */}
      <div className="flex justify-between items-end px-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Focus Analytics</h1>
          <p className="text-base text-gray-500 dark:text-gray-400 font-medium">Your productivity insights</p>
        </div>
        <button className="text-sm font-semibold bg-primary/10 text-primary px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">
          This Week
        </button>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Analytics Section */}
        <div className="lg:col-span-12 flex flex-col gap-4 mt-3">


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Weekly Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-7 flex flex-col justify-between min-h-[286px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">Daily Overview</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {(stats.totalFocusMinutes / 60).toFixed(1)}h
                  </p>
                </div>
                <div className="flex gap-4 text-xs font-bold tracking-wide">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="w-3 h-3 rounded-full bg-primary"></span> FOCUS
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between h-40 gap-3 mt-3">
                {stats.weeklyData.map((minutes, index) => {
                  // Calculate height as percentage of max (capped at reasonable styling max)
                  // Use maxMinutes from data but ensure minimum visual height
                  // Cap visualization at 4 hours (240 mins) for better scaling
                  const heightPercentage = Math.min((minutes / 240) * 100, 100);

                  const isToday = (new Date().getDay() + 6) % 7 === index;
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                  return (
                    <div key={index} className="flex flex-col items-center gap-3 flex-1 group cursor-pointer">
                      <div className="w-full bg-gray-100 dark:bg-gray-800/50 rounded-t-md h-full relative overflow-hidden flex items-end">
                        <div
                          className={`w-full transition-all duration-500 ease-out rounded-t-sm ${isToday ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700 group-hover:bg-primary/50'}`}
                          style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-gray-400'}`}>
                        {days[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              {/* Streak */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Focus Streak</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current: <span className="text-primary">{stats.focusStreak} sessions</span></p>
                </div>
              </div>

              {/* Goal */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-500/10 flex items-center justify-center text-pink-500 dark:text-pink-400">
                  <Target className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Daily Goal</h4>
                    <span className="text-xs text-gray-500">{stats.dailyGoalMinutes}m Target</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(stats.dailyGoalProgress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Total Time */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Total Minutes</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.totalFocusMinutes} mins focused</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="lg:col-span-12">
          <div className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl px-7 py-4 flex justify-between items-center">
            <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Previous Session Summary</span>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
        </div>
      </main>
    </div>
  );
}
