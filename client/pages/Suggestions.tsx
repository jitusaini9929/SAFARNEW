import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDataManager, AppState } from "@/utils/mockData";
import { Button } from "@/components/ui/button";
import { Lightbulb, Brain, Wind, BookOpen, Zap } from "lucide-react";

export default function Suggestions() {
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

  const lastMood = appState.lastCheckIn?.mood;
  const suggestion = lastMood ? mockDataManager.getPersonalizedSuggestion(lastMood) : null;

  const suggestions = [
    {
      title: "Stress Relief Techniques",
      description: "Tried and tested methods to calm your mind",
      icon: Wind,
      items: [
        "Deep breathing exercise: Inhale for 4, hold for 4, exhale for 4",
        "Take a 10-minute walk outside",
        "Listen to calming music or nature sounds",
        "Progressive muscle relaxation",
      ],
      color: "from-pastel-blue",
    },
    {
      title: "Study Break Ideas",
      description: "Recharge your mind between study sessions",
      icon: Brain,
      items: [
        "Stretch for 5 minutes",
        "Drink water and have a healthy snack",
        "Practice meditation or mindfulness",
        "Do some light exercise or yoga",
      ],
      color: "from-pastel-lavender",
    },
    {
      title: "Motivation Boosters",
      description: "Get inspired and refocus on your goals",
      icon: Zap,
      items: [
        "Review your past achievements",
        "Connect with study groups online",
        "Watch motivational videos",
        "Celebrate small wins daily",
      ],
      color: "from-pastel-green",
    },
    {
      title: "Healthy Habits",
      description: "Build sustainable routines for success",
      icon: BookOpen,
      items: [
        "Maintain a consistent sleep schedule",
        "Exercise regularly for better focus",
        "Eat nutritious meals on time",
        "Keep a gratitude journal",
      ],
      color: "from-pastel-yellow",
    },
  ];

  return (
    <MainLayout userName={appState.user?.name} userAvatar={appState.user?.avatar}>
      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            💡 Personalized Suggestions
          </h1>
          <p className="text-muted-foreground">
            Get tailored advice based on your emotional state and progress.
          </p>
        </div>

        {/* Personalized Suggestion Card */}
        {suggestion && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Just For You
              </CardTitle>
              <CardDescription>Based on your recent mood check-in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-base font-medium text-foreground">
                {suggestion}
              </p>
              <Button
                onClick={() => navigate("/check-in")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Update your mood
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Suggestion Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suggestions.map((section, idx) => {
            const Icon = section.icon;
            return (
              <Card
                key={idx}
                className={`border-pastel-blue/30 shadow-md hover:shadow-lg transition-shadow duration-300`}
              >
                <CardHeader className={`bg-gradient-to-br ${section.color}/10`}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tips Card */}
        <Card className="border-pastel-pink/30 bg-gradient-to-br from-pastel-pink/10 to-pastel-lavender/10">
          <CardHeader>
            <CardTitle>💭 Quick Tips for Better Well-being</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/50 border border-pastel-pink/20">
                <p className="font-medium text-foreground mb-1">Morning Routine</p>
                <p className="text-sm text-muted-foreground">
                  Start your day with positive affirmations and a clear plan.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/50 border border-pastel-lavender/20">
                <p className="font-medium text-foreground mb-1">Evening Wind Down</p>
                <p className="text-sm text-muted-foreground">
                  Reflect on your day and prepare for quality sleep.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/50 border border-pastel-blue/20">
                <p className="font-medium text-foreground mb-1">Social Connection</p>
                <p className="text-sm text-muted-foreground">
                  Spend time with people who uplift and support you.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/50 border border-pastel-green/20">
                <p className="font-medium text-foreground mb-1">Self-Care First</p>
                <p className="text-sm text-muted-foreground">
                  Remember: Your well-being is not selfish—it's essential.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Support */}
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              If you're experiencing severe emotional distress or having thoughts of self-harm,
              please reach out to a mental health professional or call a helpline immediately.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
