import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockDataManager, AppState } from "@/utils/mockData";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function Goals() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [newGoal, setNewGoal] = useState("");
  const [goalType, setGoalType] = useState<"daily" | "weekly">("daily");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const state = mockDataManager.getState();
    if (!state.isAuthenticated || !state.user) {
      navigate("/login");
      return;
    }
    setAppState(state);
  }, [navigate]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newState = mockDataManager.addGoal(newGoal, goalType);
    setAppState(newState);
    setNewGoal("");
    setIsSubmitting(false);
  };

  const handleToggleGoal = (goalId: string) => {
    const newState = mockDataManager.toggleGoal(goalId);
    setAppState(newState);
  };

  if (!appState) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  const dailyGoals = appState.goals.filter((g) => g.type === "daily" && !g.completed);
  const weeklyGoals = appState.goals.filter((g) => g.type === "weekly" && !g.completed);
  const completedGoals = appState.goals.filter((g) => g.completed);

  return (
    <MainLayout userName={appState.user?.name} userAvatar={appState.user?.avatar}>
      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            🎯 Goals & Progress Tracker
          </h1>
          <p className="text-muted-foreground">
            Set and track your daily and weekly goals to stay on track.
          </p>
        </div>

        {/* Add Goal Card */}
        <Card className="border-pastel-yellow/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Add New Goal
            </CardTitle>
            <CardDescription>Set a goal for yourself</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your goal (e.g., 'Revise algebra chapter')"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                disabled={isSubmitting}
                className="border-pastel-yellow/30 focus:border-primary focus:ring-primary/20"
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Goal Type</label>
                  <Select value={goalType} onValueChange={(v: any) => setGoalType(v)}>
                    <SelectTrigger className="border-pastel-yellow/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Goal</SelectItem>
                      <SelectItem value="weekly">Weekly Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newGoal.trim()}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg"
                  >
                    Add Goal
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Daily Goals */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            📅 Today's Goals ({dailyGoals.length})
          </h2>
          {dailyGoals.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No daily goals yet. Create one to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dailyGoals.map((goal) => (
                <Card key={goal.id} className="border-pastel-blue/20 hover:border-pastel-blue/40 transition-colors">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={() => handleToggleGoal(goal.id)}
                      className="h-5 w-5"
                    />
                    <span className="flex-1 text-foreground font-medium">{goal.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(goal.createdAt).toLocaleDateString()}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Goals */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            📆 This Week's Goals ({weeklyGoals.length})
          </h2>
          {weeklyGoals.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No weekly goals yet. Create one to plan your week!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {weeklyGoals.map((goal) => (
                <Card key={goal.id} className="border-pastel-lavender/20 hover:border-pastel-lavender/40 transition-colors">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={() => handleToggleGoal(goal.id)}
                      className="h-5 w-5"
                    />
                    <span className="flex-1 text-foreground font-medium">{goal.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(goal.createdAt).toLocaleDateString()}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Completed Goals ({completedGoals.length})
            </h2>
            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="border-accent/20 bg-accent/5 opacity-75">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={() => handleToggleGoal(goal.id)}
                      className="h-5 w-5"
                    />
                    <span className="flex-1 text-foreground font-medium line-through">
                      {goal.text}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Completed {new Date(goal.completedAt!).toLocaleDateString()}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
