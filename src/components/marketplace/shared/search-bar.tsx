"use client";

import { useMemo, useState } from "react";
import { Search, MapPin, Building2, IndianRupee, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, PROPERTY_TYPES, BUDGET_OPTIONS } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";

const BHK_OPTIONS = ["1", "2", "3", "4", "5"];
const ANY = "__any__";

export function SearchBar({ className }: { className?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const query = useAppStore((s) => s.route.query);

  const [city, setCity] = useState<string>(() => query.get("city") ?? "");
  const [locality, setLocality] = useState<string>(() => query.get("locality") ?? "");
  const [type, setType] = useState<string>(() => query.get("type") ?? "");
  const [minBudget, setMinBudget] = useState<string>(() => query.get("minPrice") ?? "");
  const [maxBudget, setMaxBudget] = useState<string>(() => query.get("maxPrice") ?? "");
  const [bhk, setBhk] = useState<string[]>(() =>
    (query.get("bhk") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );

  // Sync state if URL query changes (React recommendation: adjust state during render)
  const [prevQueryStr, setPrevQueryStr] = useState(() => query.toString());
  const currentQueryStr = query.toString();
  if (prevQueryStr !== currentQueryStr) {
    setPrevQueryStr(currentQueryStr);
    setCity(query.get("city") ?? "");
    setLocality(query.get("locality") ?? "");
    setType(query.get("type") ?? "");
    setMinBudget(query.get("minPrice") ?? "");
    setMaxBudget(query.get("maxPrice") ?? "");
    setBhk(
      (query.get("bhk") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    );
  }

  const localities = useMemo(() => CITIES.find((c) => c.city === city)?.localities ?? [], [city]);
  const minOptions = useMemo(
    () => BUDGET_OPTIONS.filter((b) => !maxBudget || Number(b.value) < Number(maxBudget)),
    [maxBudget]
  );
  const maxOptions = useMemo(
    () => BUDGET_OPTIONS.filter((b) => !minBudget || Number(b.value) > Number(minBudget)),
    [minBudget]
  );

  function toggleBhk(value: string) {
    setBhk((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function handleCityChange(v: string) {
    const nextCity = v === ANY ? "" : v;
    setCity(nextCity);
    const validLocalities = CITIES.find((c) => c.city === nextCity)?.localities ?? [];
    if (!validLocalities.includes(locality)) {
      setLocality("");
    }
  }

  function submit() {
    const params = new URLSearchParams();
    if (city && city !== ANY) params.set("city", city);
    if (locality && locality !== ANY) params.set("locality", locality);
    if (type && type !== ANY) params.set("type", type);
    if (minBudget && minBudget !== ANY) params.set("minPrice", minBudget);
    if (maxBudget && maxBudget !== ANY) params.set("maxPrice", maxBudget);
    if (bhk.length) params.set("bhk", [...bhk].sort().join(","));
    navigate(`/properties${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <section
      aria-label="Search properties"
      className={cn(
        "rounded-2xl border border-white/40 bg-white/95 p-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {/* City */}
        <label className="flex-[1.2] rounded-lg border bg-background/60 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" /> City
          </span>
          <Select value={city || ANY} onValueChange={handleCityChange}>
            <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="Any city" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>Any city</SelectItem>
              {CITIES.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {/* Locality */}
        <label className="flex-[1.2] rounded-lg border bg-background/60 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" /> Locality
          </span>
          <Select
            value={locality || ANY}
            onValueChange={(v) => setLocality(v === ANY ? "" : v)}
            disabled={!city}
          >
            <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus-visible:ring-0 disabled:opacity-60">
              <SelectValue placeholder={city ? "Any locality" : "Select city first"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>Any locality</SelectItem>
              {localities.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {/* Type */}
        <label className="flex-[1.1] rounded-lg border bg-background/60 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Building2 className="size-3" aria-hidden="true" /> Property type
          </span>
          <Select value={type || ANY} onValueChange={(v) => setType(v === ANY ? "" : v)}>
            <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any type</SelectItem>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {/* Budget min */}
        <label className="flex-1 rounded-lg border bg-background/60 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <IndianRupee className="size-3" aria-hidden="true" /> Min budget
          </span>
          <Select value={minBudget || ANY} onValueChange={(v) => setMinBudget(v === ANY ? "" : v)}>
            <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="No min" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>No min</SelectItem>
              {minOptions.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {/* Budget max */}
        <label className="flex-1 rounded-lg border bg-background/60 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/25">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <IndianRupee className="size-3" aria-hidden="true" /> Max budget
          </span>
          <Select value={maxBudget || ANY} onValueChange={(v) => setMaxBudget(v === ANY ? "" : v)}>
            <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="No max" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>No max</SelectItem>
              {maxOptions.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Button onClick={submit} size="lg" className="gap-2 lg:w-auto">
          <Search className="size-4" aria-hidden="true" />
          Search
        </Button>
      </div>

      {/* BHK chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Bedroom configuration">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <LayoutGrid className="size-3" aria-hidden="true" /> BHK
        </span>
        {BHK_OPTIONS.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={bhk.includes(b)}
            onClick={() => toggleBhk(b)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              bhk.includes(b)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {b}+ BHK
          </button>
        ))}
      </div>
    </section>
  );
}
