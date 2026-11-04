"use client";

// ============================================================
// RegisterView — account creation: role selection followed by
// the registration form (builder accounts add company name).
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Search, Home, Building2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/use-app-store";
import { api, ApiError } from "@/lib/api-client";
import { CITIES } from "@/lib/constants";
import type { AuthUser } from "@/lib/types";
import { Logo } from "../shared/logo";

type RegisterRole = "BUYER" | "SELLER" | "BUILDER";

const ROLE_OPTIONS: {
  value: RegisterRole;
  title: string;
  blurb: string;
  icon: typeof Search;
}[] = [
  {
    value: "BUYER",
    title: "Buyer",
    blurb: "Browse and save homes, enquire and schedule visits.",
    icon: Search,
  },
  {
    value: "SELLER",
    title: "Property Owner",
    blurb: "List your property and sell to verified buyers.",
    icon: Home,
  },
  {
    value: "BUILDER",
    title: "Builder / Developer",
    blurb: "Publish projects and manage inventory.",
    icon: Building2,
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s-]{7,14}$/;

function validPassword(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

export function RegisterView() {
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);

  const initialRoleParam = route.query.get("role");
  const initialRole: RegisterRole =
    initialRoleParam === "seller"
      ? "SELLER"
      : initialRoleParam === "builder"
        ? "BUILDER"
        : "BUYER";

  const [role, setRole] = useState<RegisterRole>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate(): string | null {
    if (!name.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email address.";
    if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address.";
    if (phone.trim() && !PHONE_RE.test(phone.trim())) return "Please enter a valid phone number.";
    if (role === "BUILDER" && !companyName.trim()) return "Please enter your company name.";
    if (!validPassword(password))
      return "Password must be at least 8 characters and include both letters and numbers.";
    if (confirm !== password) return "Passwords do not match.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setApiError(null);

    const validationError = validate();
    if (validationError) {
      setApiError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const user = await api<AuthUser>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          city: city || undefined,
          role,
          ...(role === "BUILDER" ? { companyName: companyName.trim() } : {}),
        }),
      });
      useAppStore.getState().setUser(user);
      useAppStore.getState().loadNotifications();
      useAppStore.getState().loadFavourites();
      toast.success("Account created", {
        description: `Welcome to Gwalior Property Hub, ${user.name.split(" ")[0]}.`,
      });
      navigate("/dashboard");
    } catch (err) {
      setApiError(
        err instanceof ApiError && err.message
          ? err.message
          : "Could not create your account. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 pb-16 sm:px-6 sm:py-16">
      <div className="flex justify-center">
        <Logo />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Choose how you plan to use Gwalior Property Hub — you can always do more later.
        </p>

        {/* Role selection */}
        <fieldset className="mt-6">
          <legend className="sr-only">Choose your role</legend>
          <div className="grid grid-cols-1 gap-3">
            {ROLE_OPTIONS.map((option) => {
              const active = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRole(option.value);
                    setApiError(null);
                  }}
                  aria-pressed={active}
                  className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                    }`}
                  >
                    <option.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-foreground">{option.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                      {option.blurb}
                    </span>
                  </span>
                  <span
                    className={`ml-auto grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                      active ? "border-primary" : "border-border"
                    }`}
                    aria-hidden="true"
                  >
                    {active && <span className="size-2.5 rounded-full bg-primary" />}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Registration form */}
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5" aria-label="Registration form">
          <div className="space-y-2">
            <Label htmlFor="register-name">Full name *</Label>
            <Input
              id="register-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setApiError(null);
              }}
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-email">Email *</Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setApiError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-phone">Phone</Label>
              <Input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setApiError(null);
                }}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-city">City</Label>
              <Select
                value={city}
                onValueChange={(v) => {
                  setCity(v);
                  setApiError(null);
                }}
              >
                <SelectTrigger id="register-city" className="w-full">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CITIES.map((c) => (
                    <SelectItem key={c.city} value={c.city}>
                      {c.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "BUILDER" && (
            <div className="space-y-2">
              <Label htmlFor="register-company">Company name *</Label>
              <Input
                id="register-company"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setApiError(null);
                }}
                placeholder="e.g. Meridian Developers"
                autoComplete="organization"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="register-password">Password *</Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setApiError(null);
                }}
                placeholder="Create a password"
                autoComplete="new-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters, with at least one letter and one number.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-confirm">Confirm password *</Label>
            <Input
              id="register-confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setApiError(null);
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </div>

          {apiError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              <>
                <UserPlus className="size-4" aria-hidden="true" />
                Create account
              </>
            )}
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By creating an account you agree to our{" "}
            <a href="#/terms" className="font-medium text-primary hover:text-primary/80">
              Terms
            </a>{" "}
            and{" "}
            <a href="#/privacy" className="font-medium text-primary hover:text-primary/80">
              Privacy Policy
            </a>
            .
          </p>
        </form>

        <p className="mt-5 border-t pt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-medium text-primary hover:text-primary/80"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
