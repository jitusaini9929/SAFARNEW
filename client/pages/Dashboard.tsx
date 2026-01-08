import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockDataManager, AppState } from "@/utils/mockData";
import { ArrowRight, TrendingUp } from "lucide-react";

const moodEmojis = {
  peaceful: "😌",
  happy: "😊",
  okay: "🙂",
  motivated: "🌱",
  anxious: "😟",
  low: "😔",
  frustrated: "😠",
  overwhelmed: "😵",
  numb: "😶",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = mockDataManager.getState();
    if (!state.isAuthenticated || !state.user) {
      navigate("/login");
      return;
    }
    setAppState(state);
    setLoading(false);
  }, [navigate]);

  if (loading || !appState) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 animate-pulse"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const today = new Date();
  const todayMood = mockDataManager.getTodayMood();
  const todayGoals = mockDataManager.getTodayGoals();
  const goalsProgress = mockDataManager.getGoalsProgress();
  const quote = mockDataManager.getRandomQuote();
  const moodStats = mockDataManager.getMoodStats();

  // Generate mock chart data for weekly mood trend
  const chartData = [
    { day: "Mon", mood: 7 },
    { day: "Tue", mood: 8 },
    { day: "Wed", mood: 6 },
    { day: "Thu", mood: 8 },
    { day: "Fri", mood: 9 },
    { day: "Sat", mood: 8 },
    { day: "Sun", mood: 7 },
  ];

  return (
    <MainLayout
      userName={appState.user?.name}
      userAvatar={appState.user?.avatar}
    >
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-2xl p-6 sm:p-8 border border-primary/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                Welcome back, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{appState.user?.name.split(" ")[0]}</span>! 👋
              </h1>
              <p className="text-muted-foreground">
                {today.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button
              onClick={() => navigate("/check-in")}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
            >
              Today's Check-In
            </Button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Mood Card */}
          <Card className="border-pastel-blue/30 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Today's Mood
              </CardTitle>
              <CardDescription>How are you feeling right now?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayMood ? (
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{moodEmojis[todayMood.mood]}</div>
                  <div>
                    <p className="text-sm text-muted-foreground capitalize mb-2">
                      Mood: {todayMood.mood}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Intensity:</span>
                      <span className="text-lg font-bold text-primary">
                        {todayMood.intensity}/5
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No check-in yet today</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/check-in")}
                    className="gap-2"
                  >
                    Check In Now <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streak Card */}
          <Card className="border-pastel-green/30 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" />
                Current Streaks 🔥
              </CardTitle>
              <CardDescription>Keep the momentum going</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-pastel-green/10 rounded-lg">
                <span className="text-sm font-medium">Check-In Streak</span>
                <span className="text-2xl font-bold text-accent">
                  {appState.streak.checkInStreak}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-pastel-blue/10 rounded-lg">
                <span className="text-sm font-medium">Login Streak</span>
                <span className="text-2xl font-bold text-primary">
                  {appState.streak.loginStreak}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-pastel-lavender/10 rounded-lg">
                <span className="text-sm font-medium">Goal Completion</span>
                <span className="text-2xl font-bold text-secondary">
                  {appState.streak.goalCompletionStreak}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Goals Progress Card */}
          <Card className="border-pastel-yellow/30 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                Today's Goals
              </CardTitle>
              <CardDescription>
                {todayGoals.length} goals for today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm font-bold text-primary">{goalsProgress}%</span>
                </div>
                <Progress value={goalsProgress} className="h-2" />
              </div>
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-foreground">
                  {todayGoals.filter((g) => g.completed).length}/{todayGoals.length}
                </p>
                <p className="text-xs text-muted-foreground">goals completed</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/goals")}
                className="w-full gap-2"
              >
                View Goals <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Motivational Quote Card */}
          <Card className="border-pastel-pink/30 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-pastel-pink/5 to-pastel-lavender/5">
            <CardHeader>
              <CardTitle className="text-xl">💭 Daily Inspiration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-medium text-foreground italic leading-relaxed">
                "{quote}"
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Mood Chart */}
        <Card className="border-pastel-blue/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Mood Trend
            </CardTitle>
            <CardDescription>Your emotional well-being over the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  cursor={{ stroke: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Last Check-in Status */}
        {appState.lastCheckIn && (
          <Card className="border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Last Check-In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {new Date(appState.lastCheckIn.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-base font-medium">
                    You were feeling {appState.lastCheckIn.mood} with intensity{" "}
                    {appState.lastCheckIn.intensity}/5
                  </p>
                  {appState.lastCheckIn.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{appState.lastCheckIn.notes}"
                    </p>
                  )}
                </div>
                <div className="text-4xl">{moodEmojis[appState.lastCheckIn.mood]}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

// Import icons
function Heart(props: any) {
  return (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function Flame(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657L13.414 22.9a2 2 0 01-2.828 0l-4.243-4.243m2.817-2.817l2.828 2.829m-.141-5.976l2.829-2.829a4 4 0 015.656 0l2.83 2.829m-9.172 0l2.828-2.829m0 0a4 4 0 015.656 0l2.828 2.829" />
    </svg>
  );
}

function Target(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
