"use client";

// ============================================================
// TeamActivateView — invited internal team members activate
// their account through #/team-activate?token=… : confirm their
// name/phone, set a password and land directly in the Team
// Dashboard. The token is single-use; public registration can
// never create TEAM accounts.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/use-app-store";
import { api, ApiError } from "@/lib/api-client";
import { BRAND } from "@/lib/constants";
import type { AuthUser } from "@/lib/types";
import { Logo } from "../shared/logo";

interface InvitePreview {
  name: string;
  email: string;
  city: string | null;
}

export function TeamActivateView() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const token = route.query.get("token") ?? "";

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setInvalid("This invitation link is missing its token.");
        setChecking(false);
        return;
      }
      try {
        const res = await api<InvitePreview>(`/api/team/activate?token=${encodeURIComponent(token)}`);
        if (!cancelled) {
          setInvite(res);
          setName(res.name);
          setChecking(false);
        }
      } catch (err) {
        if (!cancelled) {
          setInvalid(err instanceof ApiError ? err.message : "This invitation link is invalid.");
          setChecking(false);
        }
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setError(null);

      if (name.trim().length < 2) {
        setError("Please enter your full name.");
        return;
      }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setError("Password must be at least 8 characters and contain a letter and a number.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      try {
        const user = await api<AuthUser>("/api/team/activate", {
          method: "POST",
          body: JSON.stringify({
            token,
            name: name.trim(),
            phone: phone.trim() || undefined,
            password,
          }),
        });
        useAppStore.getState().setUser(user);
        useAppStore.getState().loadNotifications();
        toast.success("Welcome to the Gwalior Property Hub team", { description: `Your account is active, ${user.name.split(" ")[0]}.` });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not activate your account. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, token, name, phone, password, confirmPassword, navigate]
  );

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 pb-16 sm:px-6 sm:py-16">
      <div className="flex justify-center">
        <Logo />
      </div>

      {checking ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking your invitation…
        </div>
      ) : invalid ? (
        <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Invitation unavailable</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{invalid}</p>
            <Button variant="outline" className="mt-5" onClick={() => navigate("/")}>
              Back to home
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center gap-3 rounded-lg bg-accent/60 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Internal team invitation</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3 shrink-0" aria-hidden="true" />
                  {invite?.email}
                </p>
              </div>
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Activate your account
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Welcome to the {BRAND.name} team. Confirm your details, choose a password and you&apos;ll go straight to
              your lead workspace.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5" aria-label="Team activation form">
              <div className="space-y-2">
                <Label htmlFor="ta-name">Full name</Label>
                <Input
                  id="ta-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ta-phone">Phone (optional)</Label>
                <Input
                  id="ta-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError(null);
                  }}
                  placeholder="+91 98xxx xxxxx"
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ta-password">Password</Label>
                <div className="relative">
                  <Input
                    id="ta-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="At least 8 characters with a letter and a number"
                    autoComplete="new-password"
                    className="pr-11"
                    required
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

              <div className="space-y-2">
                <Label htmlFor="ta-confirm">Confirm password</Label>
                <Input
                  id="ta-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
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
                    Activating…
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" aria-hidden="true" />
                    Activate & continue
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            Team accounts can only be created through administrator invitations.
          </p>
        </>
      )}
    </div>
  );
}
