"use client";

// ============================================================
// LoginView — sign-in card with password toggle, demo-account
// quick fill, and post-login store wiring.
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/use-app-store";
import { api, ApiError } from "@/lib/api-client";
import { BRAND, ROLE_LABELS } from "@/lib/constants";
import type { AuthUser } from "@/lib/types";
import { Logo } from "../shared/logo";

const DEMO_ACCOUNTS = [
  { email: "admin@vasati.in", password: "Admin@123", label: "Admin", role: "ADMIN" },
  { email: "buyer@vasati.in", password: "Buyer@123", label: "Buyer", role: "BUYER" },
  { email: "seller@vasati.in", password: "Seller@123", label: "Seller", role: "SELLER" },
  { email: "builder@vasati.in", password: "Builder@123", label: "Builder", role: "BUILDER" },
];

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
    useAppStore.getState().loadNotifications();
    useAppStore.getState().loadFavourites();
    toast.success("Signed in", { description: `Welcome back, ${user.name.split(" ")[0]}.` });
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
    try {
      const user = await api<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await finishSignIn(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(
          err instanceof ApiError && err.message
            ? err.message
            : "Could not sign you in. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 pb-16 sm:px-6 sm:py-16">
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

      {/* Demo access */}
      <div className="mt-6 rounded-xl border border-dashed bg-card/60 p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Demo access
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Explore every side of the marketplace with a pre-seeded account. Click to fill the form.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="rounded-lg border bg-background px-3 py-2.5 text-left transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <span className="block text-[13px] font-semibold text-foreground">
                {account.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({ROLE_LABELS[account.role]})
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="size-3 shrink-0" aria-hidden="true" />
                {account.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
