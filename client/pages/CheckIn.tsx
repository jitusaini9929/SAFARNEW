import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { mockDataManager, MoodType, AppState } from "@/utils/mockData";
import { useEffect } from "react";
import { Check } from "lucide-react";

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  description: string;
}

const moodOptions: MoodOption[] = [
  {
    type: "peaceful",
    emoji: "😌",
    label: "Peaceful / Happy",
    description: "Feeling calm and content",
  },
  {
    type: "happy",
    emoji: "😊",
    label: "Happy",
    description: "Feeling great and positive",
  },
  {
    type: "okay",
    emoji: "🙂",
    label: "Okay",
    description: "Feeling neutral and balanced",
  },
  {
    type: "motivated",
    emoji: "🌱",
    label: "Motivated",
    description: "Feeling inspired and driven",
  },
  {
    type: "anxious",
    emoji: "😟",
    label: "Anxious",
    description: "Feeling worried or concerned",
  },
  {
    type: "low",
    emoji: "😔",
    label: "Low",
    description: "Feeling down or discouraged",
  },
  {
    type: "frustrated",
    emoji: "😠",
    label: "Frustrated",
    description: "Feeling irritated or annoyed",
  },
  {
    type: "overwhelmed",
    emoji: "😵",
    label: "Overwhelmed",
    description: "Feeling stressed and exhausted",
  },
  {
    type: "numb",
    emoji: "😶",
    label: "Numb",
    description: "Feeling disconnected or empty",
  },
];

export default function CheckIn() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [thought1, setThought1] = useState<string>("");
  const [thought2, setThought2] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [targetCompletion, setTargetCompletion] = useState<number>(50);
  const [journalEntry, setJournalEntry] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const state = mockDataManager.getState();
    if (!state.isAuthenticated || !state.user) {
      navigate("/login");
      return;
    }
    setAppState(state);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMood) {
      alert("Please select a mood");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newState = mockDataManager.addMood(selectedMood, intensity, notes);
    setAppState(newState);

    setShowSuccess(true);
    setSelectedMood(null);
    setIntensity(3);
    setEnergyLevel(3);
    setThought1("");
    setThought2("");
    setTarget("");
    setTargetCompletion(50);
    setJournalEntry("");
    setNotes("");

    // Hide success message and navigate
    setTimeout(() => {
      setShowSuccess(false);
      navigate("/dashboard");
    }, 2000);

    setIsSubmitting(false);
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

  return (
    <MainLayout userName={appState.user?.name} userAvatar={appState.user?.avatar}>
      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/30 flex items-center gap-3 animate-fade-in">
            <Check className="w-5 h-5 text-accent" />
            <p className="text-sm font-medium text-accent">
              Check-in saved! Keep up the great work! 🎉
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              How are you feeling today? 💭
            </h1>
            <p className="text-muted-foreground">
              Your emotional check-ins help us understand your well-being and provide better support.
            </p>
          </div>

          {/* Mood Selector */}
          <Card className="border-pastel-blue/30 shadow-md">
            <CardHeader>
              <CardTitle>What was your overall emotional state today?</CardTitle>
              <CardDescription>Click on the emotion that best represents how you're feeling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {moodOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setSelectedMood(option.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${
                      selectedMood === option.type
                        ? "bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary scale-110"
                        : "bg-muted/50 border-2 border-transparent hover:bg-muted"
                    }`}
                  >
                    <span className="text-4xl sm:text-5xl">{option.emoji}</span>
                    <span className="text-xs sm:text-sm font-medium text-center text-foreground">
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center hidden sm:block">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Intensity Slider */}
          <Card className="border-pastel-lavender/30 shadow-md">
            <CardHeader>
              <CardTitle>Mood Intensity</CardTitle>
              <CardDescription>How intense is this feeling? (1 = mild, 5 = very intense)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Intensity Level</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {intensity}/5
                  </p>
                </div>
                <div className="text-5xl">
                  {intensity === 1 && "😌"}
                  {intensity === 2 && "😐"}
                  {intensity === 3 && "😕"}
                  {intensity === 4 && "😟"}
                  {intensity === 5 && "😫"}
                </div>
              </div>

              <Slider
                value={[intensity]}
                onValueChange={(value) => setIntensity(value[0])}
                min={1}
                max={5}
                step={1}
                className="cursor-pointer"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mild</span>
                <span>Very Intense</span>
              </div>
            </CardContent>
          </Card>

          {/* Top 2 Thoughts Section */}
          <Card className="border-pastel-pink/30 shadow-md">
            <CardHeader>
              <CardTitle>What were your top 2 thoughts today?</CardTitle>
              <CardDescription>Capture the main thoughts on your mind</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Thought 1</label>
                <input
                  type="text"
                  placeholder="First thought on your mind..."
                  value={thought1}
                  onChange={(e) => setThought1(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-pastel-pink/30 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white text-foreground placeholder-muted-foreground transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Thought 2</label>
                <input
                  type="text"
                  placeholder="Second thought on your mind..."
                  value={thought2}
                  onChange={(e) => setThought2(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-pastel-pink/30 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white text-foreground placeholder-muted-foreground transition-colors"
                />
              </div>
            </CardContent>
          </Card>

          {/* Target Section */}
          <Card className="border-pastel-yellow/30 shadow-md">
            <CardHeader>
              <CardTitle>What target did you set?</CardTitle>
              <CardDescription>Define your goal for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Your Target</label>
                <input
                  type="text"
                  placeholder="What's your target for today?"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-pastel-yellow/30 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white text-foreground placeholder-muted-foreground transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">How much of the target did you complete?</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completion Progress</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {targetCompletion}%
                    </span>
                  </div>
                  <Slider
                    value={[targetCompletion]}
                    onValueChange={(value) => setTargetCompletion(value[0])}
                    min={0}
                    max={100}
                    step={10}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Energy Level Section */}
          <Card className="border-pastel-lavender/30 shadow-md">
            <CardHeader>
              <CardTitle>Your energy level right now?</CardTitle>
              <CardDescription>Rate your current energy (1 = low, 5 = high)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Energy Level</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {energyLevel}/5
                  </p>
                </div>
                <div className="text-5xl">
                  {energyLevel === 1 && "⚫"}
                  {energyLevel === 2 && "🔵"}
                  {energyLevel === 3 && "🟡"}
                  {energyLevel === 4 && "🟢"}
                  {energyLevel === 5 && "🔴"}
                </div>
              </div>

              <Slider
                value={[energyLevel]}
                onValueChange={(value) => setEnergyLevel(value[0])}
                min={1}
                max={5}
                step={1}
                className="cursor-pointer"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Energy</span>
                <span>High Energy</span>
              </div>
            </CardContent>
          </Card>

          {/* Journal Section */}
          <Card className="border-pastel-green/30 shadow-md">
            <CardHeader>
              <CardTitle>Journal Entry</CardTitle>
              <CardDescription>Write about your day (this is private)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="What happened today? How did you feel? What did you learn?"
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                className="min-h-32 border-pastel-green/30 focus:border-primary focus:ring-primary/20 resize-none"
              />
            </CardContent>
          </Card>

          {/* Quote Section */}
          <Card className="border-pastel-pink/30 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-pastel-pink/5 to-pastel-lavender/5">
            <CardHeader>
              <CardTitle className="text-xl">💭 Daily Inspiration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-medium text-foreground italic leading-relaxed">
                "{mockDataManager.getRandomQuote()}"
              </p>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="border-pastel-green/30 shadow-md">
            <CardHeader>
              <CardTitle>Additional Notes (Optional)</CardTitle>
              <CardDescription>Share what's on your mind (this is private)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="How are you feeling today? What triggered this mood? What's on your mind?..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-32 border-pastel-green/30 focus:border-primary focus:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This information is stored privately and helps us provide personalized suggestions.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedMood || isSubmitting}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
            >
              {isSubmitting ? "Saving..." : "Submit Check-In"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
