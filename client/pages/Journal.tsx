import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mockDataManager, AppState } from "@/utils/mockData";
import { Pencil, Plus, Trash2 } from "lucide-react";

export default function Journal() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [newEntry, setNewEntry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    const state = mockDataManager.getState();
    if (!state.isAuthenticated || !state.user) {
      navigate("/login");
      return;
    }
    setAppState(state);
  }, [navigate]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newState = mockDataManager.addJournalEntry(newEntry);
    setAppState(newState);
    setNewEntry("");
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

  const journalEntries = appState.journal.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <MainLayout userName={appState.user?.name} userAvatar={appState.user?.avatar}>
      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            📔 Journal / Thought Space
          </h1>
          <p className="text-muted-foreground">
            A safe, private space to write your thoughts freely.
          </p>
        </div>

        {/* New Entry Card */}
        <Card className="border-pastel-blue/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Write Your Thoughts
            </CardTitle>
            <CardDescription>What's on your mind today?</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <Textarea
                placeholder="Write your thoughts freely here... Your journal is completely private and secure."
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                className="min-h-40 border-pastel-blue/30 focus:border-primary focus:ring-primary/20 resize-none"
              />
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setNewEntry("")}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !newEntry.trim()}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Entries List */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Previous Entries</h2>
          {journalEntries.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No entries yet</p>
                <p className="text-sm text-muted-foreground">
                  Start writing to capture your thoughts and emotions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {journalEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className="border-pastel-blue/20 hover:border-pastel-blue/40 transition-colors duration-200 cursor-pointer"
                  onClick={() =>
                    setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(entry.timestamp).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-foreground line-clamp-2">
                          {entry.content}
                        </p>
                      </div>
                    </div>

                    {expandedEntry === entry.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-foreground whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <Card className="border-pastel-lavender/30 bg-gradient-to-br from-pastel-lavender/5 to-pastel-blue/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              💚 Your journal entries are completely private and stored locally. No one else can access your thoughts.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
