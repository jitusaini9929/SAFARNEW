import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/utils/authService";
import nishthaLogo from "@/assets/nishtha-logo.jpg";
import { toast } from "sonner";

const ALLOWED_SIGNUP_DOMAINS = new Set(["gmail.com", "outlook.com"]);
const SIGNUP_EMAIL_EXCEPTION = "steve123@example.com";

function isAllowedSignupEmail(email: string): boolean {
  if (email === SIGNUP_EMAIL_EXCEPTION) return true;
  const domain = email.split("@")[1] || "";
  return ALLOWED_SIGNUP_DOMAINS.has(domain);
}

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [examType, setExamType] = useState("");
  const [preparationStage, setPreparationStage] = useState("");
  const [gender, setGender] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim() || !gender) {
      setError("Please fill in all required fields including gender");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedSignupEmail(normalizedEmail)) {
      setError("Registration is currently allowed only with Gmail or Outlook email addresses.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await authService.signup(name, email, password, examType || undefined, preparationStage || undefined, gender, profilePreview || undefined);
      toast.success("Account created successfully!");
      // Set flag to show welcome dialog on dashboard
      sessionStorage.setItem("showWelcomeNishtha", "true");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8 transition-colors duration-300">
      <Card className="w-full max-w-md border-primary/10 shadow-lg glass-card">
        <CardHeader className="space-y-2">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <img loading="lazy"
                src={nishthaLogo}
                alt="Nishtha Logo"
                className="w-full h-full rounded-full object-cover shadow-lg border-2 border-primary/20"
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Nishtha
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Create your account to get started
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-3">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center mb-4">
              <label htmlFor="profile-upload" className="cursor-pointer group">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-primary/50 flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                  {profilePreview ? (
                    <img loading="lazy" src={profilePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center px-2">Click to upload photo</span>
                  )}
                </div>
              </label>
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isLoading}
              />
              <span className="text-xs text-muted-foreground mt-2">Profile Picture (Optional)</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password *</label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password *</label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Exam Type</label>
              <Select value={examType} onValueChange={setExamType} disabled={isLoading}>
                <SelectTrigger className="border-input">
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CGL">CGL</SelectItem>
                  <SelectItem value="CHSL">CHSL</SelectItem>
                  <SelectItem value="GD">GD</SelectItem>
                  <SelectItem value="MTS">MTS</SelectItem>
                  <SelectItem value="12th Boards">12th Boards</SelectItem>
                  <SelectItem value="NTPC">NTPC</SelectItem>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preparation Stage</label>
              <Select
                value={preparationStage}
                onValueChange={setPreparationStage}
                disabled={isLoading}
              >
                <SelectTrigger className="border-input">
                  <SelectValue placeholder="Select your stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Gender *</label>
              <Select value={gender} onValueChange={setGender} disabled={isLoading}>
                <SelectTrigger className="border-input">
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

