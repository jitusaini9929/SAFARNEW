import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDataManager, AppState } from "@/utils/mockData";
import { Flame, Heart, Target, TrendingUp } from "lucide-react";

export default function Streaks() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);

  useEffect(() => {
    const state = mockDataManager.getState();
    if (!state.isAuthenticated || !state.user) {
      navigate("/login");
      return;
    }
    setAppState(state);
  }, [navigate]);

  if (!appState) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const streaks = [
    {
      title: "Check-In Streak 💚",
      value: appState.streak.checkInStreak,
      description: "Days in a row you've completed your emotional check-in",
      icon: Heart,
      color: "text-red-500",
      bgColor: "from-red-50 to-pink-50",
      borderColor: "border-red-200",
    },
    {
      title: "Login Streak 🔥",
      value: appState.streak.loginStreak,
      description: "Days in a row you've visited the portal",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "from-orange-50 to-amber-50",
      borderColor: "border-orange-200",
    },
    {
      title: "Goal Completion Streak 🎯",
      value: appState.streak.goalCompletionStreak,
      description: "Days in a row you've completed your goals",
      icon: Target,
      color: "text-amber-500",
      bgColor: "from-amber-50 to-yellow-50",
      borderColor: "border-amber-200",
    },
  ];

  // Generate calendar data (simplified version)
  const generateCalendarDays = (daysToShow: number) => {
    const days = [];
    const today = new Date();
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // Random streak visualization
      const hasActivity = Math.random() > 0.3;
      days.push({
        date,
        active: hasActivity,
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays(56); // 8 weeks

  return (
    <MainLayout userName={appState.user?.name} userAvatar={appState.user?.avatar}>
      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            🔥 Streaks Page
          </h1>
          <p className="text-muted-foreground">
            Keep your streaks alive! Consistency is key to building sustainable habits.
          </p>
        </div>

        {/* Streak Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {streaks.map((streak, idx) => {
            const Icon = streak.icon;
            return (
              <Card
                key={idx}
                className={`border-${streak.borderColor} shadow-md hover:shadow-lg transition-shadow duration-300`}
              >
                <CardHeader className={`bg-gradient-to-br ${streak.bgColor}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{streak.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {streak.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-baseline gap-2">
                    <div className={`text-5xl font-bold ${streak.color}`}>
                      {streak.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {streak.value === 1 ? "day" : "days"}
                    </div>
                  </div>

                  {streak.value > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-accent font-medium">
                        ✨ Amazing! Keep it up! {streak.value > 7 ? "🎉" : ""}
                      </p>
                    </div>
                  )}

                  {streak.value === 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Start your streak today! 💪
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calendar Visualization */}
        <Card className="border-pastel-blue/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              8-Week Activity Calendar
            </CardTitle>
            <CardDescription>Your engagement over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                    day.active
                      ? "bg-gradient-to-br from-primary to-secondary text-white shadow-md"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title={day.date.toLocaleDateString()}
                >
                  {day.date.getDate()}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-gradient-to-br from-primary to-secondary"></div>
                <span className="text-sm text-foreground">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-muted"></div>
                <span className="text-sm text-foreground">Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Encouragement Card */}
        <Card className="border-pastel-green/30 bg-gradient-to-br from-pastel-green/10 to-accent/10">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-lg font-semibold text-foreground">
              💪 Keep Going Strong!
            </p>
            <p className="text-sm text-muted-foreground">
              Your streak shows your commitment to your well-being. Every day you show up is a victory.
              Don't get discouraged if you break a streak—what matters is starting fresh with renewed determination.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Remember: Progress over perfection
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
