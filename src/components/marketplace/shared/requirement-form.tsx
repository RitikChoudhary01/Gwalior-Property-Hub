"use client";

// ============================================================
// RequirementForm — the buyer-facing "Post Your Requirement"
// experience. Public (no auth): a buyer describes the home they
// want, we POST it to /api/requirements and immediately show
// scored matches from approved inventory.
//
// Also exports RequirementMatchCard + RequirementMatchesList —
// the match presentation reused by the buyer dashboard's
// requirements tab (GET /api/requirements/:id).
// ============================================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bath,
  BedDouble,
  CheckCircle2,
  Home,
  KeyRound,
  MapPin,
  PhoneCall,
  Ruler,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { BUDGET_OPTIONS, CITIES, PROPERTY_TYPES, REQUIREMENT_PURPOSES } from "@/lib/constants";
import { formatArea, formatConfig, formatPrice } from "@/lib/format";
import type { RequirementDTO, RequirementMatchDTO } from "@/lib/types";
import { ListingVerifiedBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- shared types ----------

/** Response of POST /api/requirements — 201 (new) or 200 (duplicate, treated as success). */
export interface RequirementPostResult {
  requirement: RequirementDTO;
  matches: RequirementMatchDTO[];
  duplicate?: boolean;
}

const PHONE_RE = /^[+\d][\d\s-]{7,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PURPOSE_ICONS: Record<string, typeof Home> = { BUY: Home, RENT: KeyRound };

// ============================================================
// RequirementMatchCard — lighter sibling of PropertyCard, tuned
// for the match payload (score + reasons). Same visual language:
// rounded-xl border bg-card, 4/3 image, price + specs row.
// ============================================================

export function RequirementMatchCard({
  match,
  className,
}: {
  match: RequirementMatchDTO;
  className?: string;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const area = match.builtUpArea ?? match.carpetArea;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${match.title}, ${formatPrice(match.price)}, ${match.score}% match`}
      onClick={() => navigate(`/properties/${match.slug}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/properties/${match.slug}`)}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {match.mainImage ? (
          <img
            src={match.mainImage}
            alt={match.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <MapPin className="size-8" aria-hidden="true" />
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
          {match.score}% match
        </span>

        {match.verificationStatus === "VERIFIED" && (
          <div className="absolute bottom-3 left-3">
            <ListingVerifiedBadge />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">
            {formatPrice(match.price)}
          </p>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {match.type}
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-[15px] font-medium text-foreground group-hover:text-primary">
          {match.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {match.locality}, {match.city}
          </span>
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3.5 text-[13px] text-muted-foreground">
          {match.type !== "Plot" && match.bhk && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden="true" />
              {formatConfig(match.bhk, match.type)}
            </span>
          )}
          {match.bathrooms && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="size-4" aria-hidden="true" />
              {match.bathrooms} Bath
            </span>
          )}
          {area && (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="size-4" aria-hidden="true" />
              {formatArea(area)}
            </span>
          )}
        </div>

        {match.reasons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================
// RequirementMatchesList — the instant-matches "wow moment":
// "We found N homes matching your requirement" + cards, or the
// reassuring zero-match copy when the team sources off-market.
// ============================================================

export function RequirementMatchesList({
  matches,
  className,
}: {
  matches: RequirementMatchDTO[];
  className?: string;
}) {
  if (matches.length === 0) {
    return (
      <div className={cn("rounded-xl border border-dashed bg-card/60 px-5 py-8 text-center", className)}>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <PhoneCall className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-3.5 text-sm font-semibold text-foreground">
          No exact match in our published inventory yet
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          That&rsquo;s exactly what our team is for — an advisor will source options on and off the
          market and call you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
        We found {matches.length} {matches.length === 1 ? "home" : "homes"} matching your requirement
      </p>
      <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
        {matches.map((m) => (
          <RequirementMatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// RequirementForm
// ============================================================

interface Props {
  /** Fires once per successful post (new or duplicate) — used by the dashboard to refresh its list. */
  onPosted?: (result: RequirementPostResult) => void;
  /** Prefix for element ids, so two mounted forms can never clash. */
  idPrefix?: string;
  className?: string;
}

export function RequirementForm({ onPosted, idPrefix = "req", className }: Props) {
  const user = useAppStore((s) => s.user);

  // requirement criteria
  const [purpose, setPurpose] = useState<string>("BUY");
  const [city, setCity] = useState("");
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [propertyType, setPropertyType] = useState("Any");
  const [bhk, setBhk] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  // contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RequirementPostResult | null>(null);

  // Prefill contact details for signed-in users (fills only empty fields).
  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
      setPhone((p) => p || (user.phone ?? ""));
    }
  }, [user]);

  const cityLocalities = CITIES.find((c) => c.city === city)?.localities ?? [];
  const budgetError =
    budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)
      ? "Minimum budget cannot exceed maximum budget."
      : null;

  const id = (suffix: string) => `${idPrefix}-${suffix}`;

  function onCityChange(value: string) {
    setCity(value);
    setSelectedLocalities([]); // locality chips are city-specific
  }

  function toggleLocality(locality: string) {
    setSelectedLocalities((prev) =>
      prev.includes(locality) ? prev.filter((l) => l !== locality) : [...prev, locality]
    );
  }

  function resetForm() {
    setPurpose("BUY");
    setCity("");
    setSelectedLocalities([]);
    setPropertyType("Any");
    setBhk("");
    setBudgetMin("");
    setBudgetMax("");
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setEmail(user?.email ?? "");
    setNotes("");
    setConsent(true);
    setResult(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!city) {
      toast.error("Please select the city you are looking in.");
      return;
    }
    if (!PHONE_RE.test(phone.trim())) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (budgetError) {
      toast.error(budgetError);
      return;
    }
    if (!consent) {
      toast.error("Please allow us to contact you about your requirement.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api<RequirementPostResult>("/api/requirements", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          purpose,
          city,
          localities: selectedLocalities.length ? selectedLocalities.join(", ") : undefined,
          propertyType,
          bhk: bhk ? Number(bhk) : undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          notes: notes.trim() || undefined,
          consent: true,
        }),
      });
      setResult(res);
      if (res.duplicate) {
        toast.info("We already have your requirement", {
          description: `Reference ${res.requirement.reference} — our advisor is already on it.`,
        });
      } else {
        toast.success("Requirement posted", {
          description: `Reference ${res.requirement.reference}. Our advisor will call you within 24 hours.`,
        });
      }
      onPosted?.(res);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not post your requirement. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- success state: reference + advisor promise + instant matches ----------

  if (result) {
    return (
      <div className={cn("space-y-6", className)} aria-live="polite">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-6">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden="true" />
          <h3 className="mt-3 font-display text-lg font-semibold text-emerald-900">
            {result.duplicate ? "We already have your requirement" : "Requirement posted"}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
            {result.duplicate ? (
              <>
                A similar requirement for {result.requirement.city} already exists — your reference is{" "}
                <span className="font-semibold">{result.requirement.reference}</span>.
              </>
            ) : (
              <>
                Your reference number is{" "}
                <span className="font-semibold">{result.requirement.reference}</span>.
              </>
            )}{" "}
            Our advisor will call you within 24 hours with options that fit.
          </p>
        </div>

        <RequirementMatchesList matches={result.matches} />

        <Button type="button" variant="outline" className="w-full" onClick={resetForm}>
          Post another requirement
        </Button>
      </div>
    );
  }

  // ---------- the form ----------

  return (
    <form onSubmit={submit} className={cn("space-y-4", className)} aria-label="Post your requirement">
      {/* Purpose */}
      <div className="space-y-1.5">
        <Label>Looking to</Label>
        <div role="group" aria-label="Purpose" className="grid grid-cols-2 gap-2">
          {REQUIREMENT_PURPOSES.map((p) => {
            const Icon = PURPOSE_ICONS[p.value] ?? Home;
            const active = purpose === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* City + property type */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("city")}>City *</Label>
          <Select value={city} onValueChange={onCityChange}>
            <SelectTrigger id={id("city")} className="w-full">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("type")}>Property type</Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger id={id("type")} className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preferred localities (city-specific chips) */}
      {cityLocalities.length > 0 && (
        <div className="space-y-2">
          <div>
            <Label>Preferred localities</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional — tap the areas in {city} you prefer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Preferred localities in ${city}`}>
            {cityLocalities.map((locality) => {
              const active = selectedLocalities.includes(locality);
              return (
                <button
                  key={locality}
                  type="button"
                  onClick={() => toggleLocality(locality)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {locality}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BHK + budget range */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={id("bhk")}>BHK</Label>
          <Select value={bhk} onValueChange={setBhk}>
            <SelectTrigger id={id("bhk")} className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "4", "5", "6"].map((n) => (
                <SelectItem key={n} value={n}>
                  {n} BHK
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("budget-min")}>Budget (min)</Label>
          <Select value={budgetMin} onValueChange={(v) => setBudgetMin(v === "ANY" ? "" : v)}>
            <SelectTrigger id={id("budget-min")} className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANY">Any budget</SelectItem>
              {BUDGET_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("budget-max")}>Budget (max)</Label>
          <Select value={budgetMax} onValueChange={(v) => setBudgetMax(v === "ANY" ? "" : v)}>
            <SelectTrigger id={id("budget-max")} className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANY">Any budget</SelectItem>
              {BUDGET_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {budgetError && (
        <p className="text-xs text-destructive" role="alert">
          {budgetError}
        </p>
      )}

      {/* Contact */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("name")}>Full name *</Label>
          <Input
            id={id("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            autoComplete="name"
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("phone")}>Phone *</Label>
          <Input
            id={id("phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98xxx xxxxx"
            required
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("email")}>Email</Label>
        <Input
          id={id("email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.in"
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("notes")}>Anything else?</Label>
        <Textarea
          id={id("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Ready to move preferred, east-facing, parking for two cars…"
          rows={3}
          maxLength={1000}
        />
      </div>

      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
          aria-label="Consent to be contacted"
        />
        I agree to be contacted by Gwalior Property Hub and our advisor team regarding my requirement.
      </label>

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Skeleton className="size-4 rounded-full bg-primary-foreground/30" />
            Posting…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            Post my requirement
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Our advisor typically calls within 24 hours. One dedicated advisor, verified homes, no spam.
      </p>
    </form>
  );
}
