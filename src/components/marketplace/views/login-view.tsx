"use client";

// ============================================================
// LoginView — sign-in card with password toggle, demo-account
// quick fill, and post-login store wiring.
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/use-app-store";
import { api, ApiError } from "@/lib/api-client";
import { BRAND } from "@/lib/constants";
import type { AuthUser } from "@/lib/types";
import { Logo } from "../shared/logo";

export function LoginView() {
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishSignIn(user: AuthUser) {
    useAppStore.getState().setUser(user);
    // Non-blocking background loads so network hiccups never fail the login UI
    try {
      useAppStore.getState().loadNotifications();
      useAppStore.getState().loadFavourites();
    } catch (e) {
      console.warn("Non-critical post-signin error:", e);
    }
    const firstName = user?.name ? user.name.split(" ")[0] : "User";
    toast.success("Signed in", { description: `Welcome back, ${firstName}.` });
    const next = route.query.get("next");
    navigate(next && next.startsWith("/") ? next : "/dashboard");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    let user: AuthUser | null = null;
    try {
      user = await api<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
    } catch (err) {
      console.error("[Login failed]", err);
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError("Could not sign you in. Please check your connection and try again.");
      }
      setSubmitting(false);
      return;
    }

    try {
      if (user) await finishSignIn(user);
    } catch (err) {
      console.error("[Post-login error]", err);
      // Fallback navigation in case of unexpected state errors
      navigate("/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10 pb-16 sm:px-6 sm:py-14">
      <div className="mb-4 flex items-center justify-start">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/");
            }
          }}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5 text-primary" aria-hidden="true" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex justify-center">
        <Logo />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Sign in to manage your listings, favourites and enquiries.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5" aria-label="Sign in form">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!error}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <a
                href={`mailto:${BRAND.supportEmail}?subject=Password%20reset%20request`}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Your password"
                autoComplete="current-password"
                className="pr-11"
                aria-invalid={!!error}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="size-4" aria-hidden="true" />
                Sign in
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Gwalior Property Hub?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-medium text-primary hover:text-primary/80"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
