import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockDataManager, AppState } from "@/utils/mockData";
import { Mail, User, FileText, Users, CheckCircle2 } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    examType: "",
    preparationStage: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const state = mockDataManager.getState();
    if (!state.isAuthenticated || !state.user) {
      navigate("/login");
      return;
    }
    setAppState(state);
    setFormData({
      name: state.user.name || "",
      email: state.user.email || "",
      examType: state.user.examType || "",
      preparationStage: state.user.preparationStage || "",
    });
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Update the state (in real app, this would be an API call)
    if (appState && appState.user) {
      appState.user.name = formData.name;
      appState.user.email = formData.email;
      appState.user.examType = formData.examType as any;
      appState.user.preparationStage = formData.preparationStage as any;
      mockDataManager.saveState(appState);
    }

    setShowSuccess(true);
    setIsSaving(false);

    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  if (!appState || !appState.user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userName={appState.user.name} userAvatar={appState.user.avatar}>
      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        {/* Success Message */}
        {showSuccess && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
            <p className="text-sm font-medium text-accent">
              Profile updated successfully! ✨
            </p>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            👤 Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences.
          </p>
        </div>

        {/* Avatar Section */}
        <Card className="border-pastel-blue/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={appState.user.avatar} alt={appState.user.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                {appState.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                Your profile picture is generated from your email address.
              </p>
              <p className="text-sm font-medium text-foreground">
                Email: {appState.user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="border-pastel-lavender/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your basic information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Full Name
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isSaving}
                  className="border-pastel-lavender/30 focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isSaving}
                  className="border-pastel-lavender/30 focus:border-primary focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">
                  Your email is used to identify your account
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  SSC Exam Type
                </label>
                <Select
                  value={formData.examType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, examType: value })
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="border-pastel-lavender/30">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CGL">CGL</SelectItem>
                    <SelectItem value="CHSL">CHSL</SelectItem>
                    <SelectItem value="GD">GD</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Preparation Stage
                </label>
                <Select
                  value={formData.preparationStage}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preparationStage: value })
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="border-pastel-lavender/30">
                    <SelectValue placeholder="Select your stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="border-pastel-green/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Account Status</span>
              <span className="text-sm font-medium text-accent">Active ✓</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm font-medium text-foreground">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Data Storage</span>
              <span className="text-sm font-medium text-foreground">Local & Secure</span>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="border-border bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground text-center">
              💚 Your data is stored locally on your device and is completely private.
              We never share your personal information or emotional data with third parties.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
