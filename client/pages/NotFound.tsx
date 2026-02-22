import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/10 shadow-lg glass-card">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          <div>
            <p className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
              404
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Page Not Found
            </h1>
            <p className="text-muted-foreground">
              Oops! It looks like this page doesn't exist. Let's get you back on track.
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/login" className="block">
              <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300">
                Go to Login
              </Button>
            </Link>
            <Link to="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 If you think this is a mistake, please try again or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
