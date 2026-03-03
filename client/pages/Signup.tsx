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
import { useTranslation } from "react-i18next";

const ALLOWED_SIGNUP_DOMAINS = new Set(["gmail.com", "outlook.com"]);
const SIGNUP_EMAIL_EXCEPTION = "steve123@example.com";

function isAllowedSignupEmail(email: string): boolean {
  if (email === SIGNUP_EMAIL_EXCEPTION) return true;
  const domain = email.split("@")[1] || "";
  return ALLOWED_SIGNUP_DOMAINS.has(domain);
}

export default function Signup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(t('auth.error_fill_all'));
      return;
    }

    if (!email.includes("@")) {
      setError(t('auth.error_valid_email'));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedSignupEmail(normalizedEmail)) {
      setError(t('auth.error_gmail_only'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.error_password_min'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.error_password_match'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.signup(name, email, password, examType || undefined, preparationStage || undefined, gender, profilePreview || undefined);
      toast.success(t('auth.signup_success'));
      sessionStorage.setItem("showWelcomeNishtha", "true");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || t('auth.error_invalid_creds'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 py-8 transition-colors duration-300">
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
              {t('auth.signup_desc')}
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
                    <span className="text-xs text-muted-foreground text-center px-2">{t('auth.upload_photo')}</span>
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
              <span className="text-xs text-muted-foreground mt-2">{t('auth.profile_pic_optional')}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.full_name')}</label>
              <Input
                type="text"
                placeholder={t('auth.full_name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
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
              <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
              <Input
                type="password"
                placeholder={t('auth.password_min')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.confirm_password')}</label>
              <Input
                type="password"
                placeholder={t('auth.confirm_password_placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="border-input focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.exam_type')}</label>
              <Select value={examType} onValueChange={setExamType} disabled={isLoading}>
                <SelectTrigger className="border-input">
                  <SelectValue placeholder={t('auth.exam_type_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CGL">CGL</SelectItem>
                  <SelectItem value="CHSL">CHSL</SelectItem>
                  <SelectItem value="GD">GD</SelectItem>
                  <SelectItem value="MTS">MTS</SelectItem>
                  <SelectItem value="12th Boards">12th Boards</SelectItem>
                  <SelectItem value="NTPC">NTPC</SelectItem>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="Other">{t('auth.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.prep_stage')}</label>
              <Select value={preparationStage} onValueChange={setPreparationStage} disabled={isLoading}>
                <SelectTrigger className="border-input">
                  <SelectValue placeholder={t('auth.prep_stage_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">{t('auth.beginner')}</SelectItem>
                  <SelectItem value="Intermediate">{t('auth.intermediate')}</SelectItem>
                  <SelectItem value="Advanced">{t('auth.advanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.gender')}</label>
              <Select value={gender} onValueChange={setGender} disabled={isLoading}>
                <SelectTrigger className="border-input">
                  <SelectValue placeholder={t('auth.gender_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('auth.male')}</SelectItem>
                  <SelectItem value="female">{t('auth.female')}</SelectItem>
                  <SelectItem value="other">{t('auth.other')}</SelectItem>
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
              {isLoading ? t('auth.signup_loading') : t('auth.signup')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t('auth.have_account')}{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('auth.signin_here')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
