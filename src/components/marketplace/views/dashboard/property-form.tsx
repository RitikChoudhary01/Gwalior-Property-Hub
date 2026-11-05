"use client";

// ============================================================
// PropertyForm — create / edit a listing from the seller
// dashboard. Designed to be rendered inside a Dialog with
// `className="gap-0 p-0 sm:max-w-3xl"` on the DialogContent.
// Handles uploads with per-image progress, image ordering,
// client validation and the exact /api/properties contract.
// ============================================================

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Info,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, uploadFile, ApiError } from "@/lib/api-client";
import { formatPriceFull } from "@/lib/format";
import {
  AMENITIES,
  CITIES,
  CONSTRUCTION_STATUSES,
  FURNISHINGS,
  POSSESSION_PERIODS,
  PROPERTY_TYPES,
} from "@/lib/constants";
import type { PropertyDetailDTO } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ---------- constants ----------

const MAX_PHOTOS = 12;
const MAX_FILE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isAcceptedPhoto(file: File): boolean {
  if (file.type && ACCEPTED_TYPES.includes(file.type.toLowerCase())) return true;
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp";
}

const FACING_OPTIONS = [
  "North",
  "East",
  "South",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
] as const;

const AGE_OPTIONS = [
  { value: "0-1", label: "0-1 years" },
  { value: "1-2", label: "1-2 years" },
  { value: "2-3", label: "2-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-7", label: "5-7 years" },
  { value: "7-10", label: "7-10 years" },
  { value: "10+", label: "10+ years" },
];

const BATHROOM_OPTIONS = ["1", "2", "3", "4", "5", "6"] as const;
const BHK_OPTIONS = ["1", "2", "3", "4", "5", "6"] as const;
const PARKING_OPTIONS = ["0", "1", "2", "3", "4"] as const;

// ---------- types ----------

interface FormState {
  title: string;
  description: string;
  type: string;
  price: string;
  negotiable: boolean;
  city: string;
  locality: string;
  address: string;
  latitude: string;
  longitude: string;
  bhk: string; // "na" = not applicable (Plot)
  bathrooms: string;
  carpetArea: string;
  builtUpArea: string;
  plotArea: string;
  furnishing: string;
  parking: string;
  floorInfo: string;
  facing: string;
  constructionStatus: string;
  possessionDate: string;
  ageOfProperty: string;
  reraNumber: string;
}

interface UploadItem {
  id: string;
  name: string;
  progress: number;
}

type SubmitKind = "submit" | "draft";

// ---------- small helpers (module scope) ----------

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function isValidArea(value: string): boolean {
  const n = Number(value.trim());
  return Number.isFinite(n) && Number.isInteger(n) && n >= 100;
}

function isValidCoord(value: string, range: number): boolean {
  const n = Number(value.trim());
  return Number.isFinite(n) && n >= -range && n <= range;
}

// ---------- listing strength (pure scoring) ----------

interface CompletenessGap {
  label: string;
  points: number;
  targetId: string;
}

/**
 * Pure scoring helper for the live "Listing strength" meter.
 * Weights (total 100):
 *   Basics 40 · Specifications 20 · Details 10 · Photos 15 ·
 *   Amenities 8 · RERA 7.
 * Field thresholds mirror the form's own validation hints
 * (title ≥ 10 chars, description ≥ 50, price ≥ ₹5,00,000 …).
 */
function listingCompleteness(
  form: FormState,
  amenities: string[],
  imageCount: number,
  isPlot: boolean
): { score: number; missing: CompletenessGap[] } {
  let score = 0;
  const missing: CompletenessGap[] = [];

  const award = (earned: boolean, points: number, label: string, targetId: string) => {
    if (earned) score += points;
    else missing.push({ label, points, targetId });
  };

  // Basics — 40 pts
  award(form.title.trim().length >= 10, 6, "Add a title", "prop-title");
  award(form.description.trim().length >= 50, 6, "Write a description", "prop-description");
  award(form.type !== "", 4, "Select property type", "prop-type");
  const price = Number(form.price.trim());
  award(
    form.price.trim() !== "" && Number.isFinite(price) && price >= 500000,
    6,
    "Set the price",
    "prop-price"
  );
  award(form.city !== "", 6, "Select the city", "prop-city");
  award(form.locality !== "", 6, "Select the locality", "prop-locality");
  award(form.address.trim().length >= 10, 6, "Add the full address", "prop-address");

  // Specifications — 20 pts
  award(
    isPlot || (form.bhk !== "" && form.bhk !== "na"),
    7,
    "Select bedrooms (BHK)",
    "prop-bhk"
  );
  award(form.bathrooms !== "", 6, "Select bathrooms", "prop-bathrooms");
  award(
    form.carpetArea.trim() !== "" ||
      form.builtUpArea.trim() !== "" ||
      (isPlot && form.plotArea.trim() !== ""),
    7,
    "Add the area (sq.ft)",
    "prop-carpet"
  );

  // Details — 10 pts
  award(form.furnishing !== "", 2, "Select furnishing", "prop-furnishing");
  award(form.parking !== "", 2, "Select parking", "prop-parking");
  award(form.floorInfo.trim() !== "", 2, "Add floor details", "prop-floor");
  award(form.facing !== "", 2, "Select facing", "prop-facing");
  award(
    form.constructionStatus === "UNDER_CONSTRUCTION"
      ? form.possessionDate !== ""
      : form.constructionStatus === "READY_TO_MOVE"
        ? form.ageOfProperty !== ""
        : form.constructionStatus !== "",
    2,
    "Add possession / age details",
    "prop-construction"
  );

  // Photos — 15 pts (0 → 0 · 1-2 → 8 · 3+ → 15)
  score += imageCount === 0 ? 0 : imageCount <= 2 ? 8 : 15;
  if (imageCount === 0) {
    missing.push({ label: "Add photos", points: 15, targetId: "prop-photos" });
  } else if (imageCount <= 2) {
    missing.push({ label: "Add more photos", points: 7, targetId: "prop-photos" });
  }

  // Amenities — 8 pts (0 → 0 · 1-3 → 5 · 4+ → 8)
  score += amenities.length >= 4 ? 8 : amenities.length >= 1 ? 5 : 0;
  if (amenities.length === 0) {
    missing.push({ label: "Add amenities", points: 8, targetId: "prop-amenities" });
  } else if (amenities.length < 4) {
    missing.push({ label: "Add more amenities", points: 3, targetId: "prop-amenities" });
  }

  // RERA — 7 pts
  award(form.reraNumber.trim() !== "", 7, "Add RERA number", "prop-rera");

  missing.sort((a, b) => b.points - a.points);
  return { score, missing };
}

/** Qualitative tier for the current listing-strength score. */
function strengthTier(score: number): { label: string; textClass: string; barClass: string } {
  if (score >= 90)
    return {
      label: "Ready to impress",
      textClass: "text-primary",
      barClass: "[&_[data-slot=progress-indicator]]:bg-primary",
    };
  if (score >= 70)
    return {
      label: "Almost complete",
      textClass: "text-emerald-600 dark:text-emerald-400",
      barClass: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
    };
  if (score >= 40)
    return {
      label: "Getting there",
      textClass: "text-amber-600 dark:text-amber-400",
      barClass: "[&_[data-slot=progress-indicator]]:bg-amber-500",
    };
  return {
    label: "Just started",
    textClass: "text-stone-500 dark:text-stone-400",
    barClass: "[&_[data-slot=progress-indicator]]:bg-stone-400",
  };
}

// ============================================================
// PropertyForm
// ============================================================

export function PropertyForm({
  property,
  onSaved,
  onClose,
}: {
  property?: PropertyDetailDTO | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = !!property;

  const [form, setForm] = useState<FormState>(() => ({
    title: property?.title ?? "",
    description: property?.description ?? "",
    type: property?.type ?? "Apartment",
    price: property ? String(property.price) : "",
    negotiable: property?.negotiable ?? false,
    city: property?.city ?? "",
    locality: property?.locality ?? "",
    address: property?.address ?? "",
    latitude: property?.latitude != null ? String(property.latitude) : "",
    longitude: property?.longitude != null ? String(property.longitude) : "",
    bhk: property?.bhk != null ? String(property.bhk) : "na",
    bathrooms: property?.bathrooms != null ? String(property.bathrooms) : "",
    carpetArea: property?.carpetArea != null ? String(property.carpetArea) : "",
    builtUpArea: property?.builtUpArea != null ? String(property.builtUpArea) : "",
    plotArea: property?.plotArea != null ? String(property.plotArea) : "",
    furnishing: property?.furnishing ?? "",
    parking: property ? String(property.parking ?? 0) : "",
    floorInfo: property?.floorInfo ?? "",
    facing: property?.facing ?? "",
    constructionStatus: property?.constructionStatus ?? "READY_TO_MOVE",
    possessionDate: property?.possessionDate ?? "",
    ageOfProperty: property?.ageOfProperty ?? "",
    reraNumber: property?.reraNumber ?? "",
  }));

  const [amenities, setAmenities] = useState<string[]>(() => property?.amenities ?? []);
  const [images, setImages] = useState<{ url: string }[]>(() =>
    property ? [...property.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => ({ url: i.url })) : []
  );
  const [mainIndex, setMainIndex] = useState<number>(() => {
    if (!property || property.images.length === 0) return 0;
    const sorted = [...property.images].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((i) => i.isMain);
    return idx >= 0 ? idx : 0;
  });

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [coordsOpen, setCoordsOpen] = useState<boolean>(
    () => property?.latitude != null || property?.longitude != null
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<SubmitKind | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cityEntry = CITIES.find((c) => c.city === form.city);
  const isPlot = form.type === "Plot";
  const descriptionLength = form.description.trim().length;
  const priceValue = form.price.trim() !== "" ? Number(form.price) : NaN;
  const uploadingCount = uploads.length;

  // Editing a listing that is a draft or was rejected offers the
  // submit / draft choice; other statuses simply save changes.
  const canChooseDraft = !isEdit || property!.status === "DRAFT" || property!.status === "REJECTED";
  const primaryLabel = isEdit && !canChooseDraft ? "Save changes" : "Submit for approval";

  // ---------- listing strength meter ----------

  const { score: listingScore, missing: listingGaps } = useMemo(
    () => listingCompleteness(form, amenities, images.length, isPlot),
    [form, amenities, images.length, isPlot]
  );
  const tier = strengthTier(listingScore);
  const topGaps = listingGaps.slice(0, 3);

  function scrollToGap(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ---------- photos ----------

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    let attached = images.length + uploads.length;

    for (const file of files) {
      if (attached >= MAX_PHOTOS) {
        toast.error(`You can upload up to ${MAX_PHOTOS} photos.`);
        break;
      }
      if (!isAcceptedPhoto(file)) {
        toast.error(`${file.name}: only JPEG, PNG or WebP photos are allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name}: photos must be ${MAX_FILE_MB} MB or smaller.`);
        continue;
      }

      attached += 1;
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);
      try {
        const res = await uploadFile(file, (pct) => {
          setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: pct } : x)));
        });
        setImages((imgs) => [...imgs, { url: res.url }]);
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (err) {
        setUploads((u) => u.filter((x) => x.id !== id));
        const message = err instanceof ApiError ? err.message : "upload failed. Please try again.";
        toast.error(`${file.name}: ${message}`);
      }
    }
  }

  function moveImage(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMainIndex((prev) => {
      if (prev === index) return target;
      if (prev === target) return index;
      return prev;
    });
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setMainIndex((prev) => {
      if (images.length <= 1) return 0;
      if (index < prev) return prev - 1;
      if (index === prev) return Math.min(prev, images.length - 2);
      return prev;
    });
  }

  // ---------- validation + submit ----------

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (form.title.trim().length < 10) errs.title = "Title must be at least 10 characters.";
    if (descriptionLength < 50) errs.description = "Description must be at least 50 characters.";
    const price = Number(form.price.trim());
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 500000) {
      errs.price = "Enter a price of at least ₹5,00,000.";
    } else if (!Number.isInteger(price)) {
      errs.price = "Price must be a whole number in rupees.";
    }
    if (!form.city) errs.city = "Select a city.";
    if (!form.locality) errs.locality = "Select a locality.";
    if (form.address.trim().length < 10) errs.address = "Enter the full address (at least 10 characters).";
    if (!isPlot && (form.bhk === "" || form.bhk === "na")) {
      errs.bhk = "Select the number of bedrooms.";
    }
    if (images.length === 0) {
      errs.photos = "Add at least one photo — listings with photos get far more enquiries.";
    }
    if (form.carpetArea.trim() !== "" && !isValidArea(form.carpetArea)) {
      errs.carpetArea = "Enter a valid carpet area of at least 100 sq.ft.";
    }
    if (form.builtUpArea.trim() !== "" && !isValidArea(form.builtUpArea)) {
      errs.builtUpArea = "Enter a valid built-up area of at least 100 sq.ft.";
    }
    if (isPlot && form.plotArea.trim() !== "" && !isValidArea(form.plotArea)) {
      errs.plotArea = "Enter a valid plot area of at least 100 sq.ft.";
    }
    if (form.latitude.trim() !== "" && !isValidCoord(form.latitude, 90)) {
      errs.latitude = "Latitude must be a number between -90 and 90.";
    }
    if (form.longitude.trim() !== "" && !isValidCoord(form.longitude, 180)) {
      errs.longitude = "Longitude must be a number between -180 and 180.";
    }
    return errs;
  }

  function buildBody(): Record<string, unknown> {
    const toNum = (v: string): number | null => {
      const t = v.trim();
      if (t === "") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      price: Number(form.price.trim()),
      negotiable: form.negotiable,
      city: form.city,
      state: cityEntry?.state ?? "",
      locality: form.locality,
      address: form.address.trim(),
      latitude: toNum(form.latitude),
      longitude: toNum(form.longitude),
      bhk: !isPlot && form.bhk !== "" && form.bhk !== "na" ? Number(form.bhk) : null,
      bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,
      carpetArea: toNum(form.carpetArea),
      builtUpArea: toNum(form.builtUpArea),
      plotArea: isPlot ? toNum(form.plotArea) : null,
      furnishing: form.furnishing !== "" ? form.furnishing : null,
      parking: form.parking === "" ? 0 : Number(form.parking),
      floorInfo: form.floorInfo.trim() !== "" ? form.floorInfo.trim() : null,
      facing: form.facing !== "" ? form.facing : null,
      constructionStatus: form.constructionStatus,
      possessionDate: form.constructionStatus === "UNDER_CONSTRUCTION" && form.possessionDate !== "" ? form.possessionDate : null,
      ageOfProperty: form.constructionStatus === "READY_TO_MOVE" && form.ageOfProperty !== "" ? form.ageOfProperty : null,
      reraNumber: form.reraNumber.trim() !== "" ? form.reraNumber.trim() : null,
      amenities,
      images: images.map((img, i) => ({ url: img.url, isMain: i === mainIndex })),
    };
  }

  async function handleSubmit(kind: SubmitKind) {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields before saving.");
      return;
    }
    setErrors({});
    setApiError(null);
    setSubmitting(kind);
    try {
      const body = buildBody();
      if (property) {
        if (canChooseDraft) {
          body.status = kind === "submit" ? "PENDING" : "DRAFT";
        }
        await api(`/api/properties/${property.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        body.draft = kind === "draft";
        await api("/api/properties", { method: "POST", body: JSON.stringify(body) });
      }
      if (kind === "draft") {
        toast.success("Draft saved", { description: "You can finish and submit it any time." });
      } else if (isEdit) {
        toast.success("Listing updated", { description: "It is now pending approval." });
      } else {
        toast.success("Listing submitted for approval", {
          description: "Our team reviews new listings, usually within 24 hours.",
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Could not save the listing. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  // ---------- render ----------

  return (
    <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
      <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
        <DialogTitle className="font-display text-lg font-semibold tracking-tight">
          {isEdit ? "Edit listing" : "List a new property"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the details below. Your latest photos and amenities are saved with this listing."
            : "Accurate details and good photos help your listing get approved and found faster."}
        </DialogDescription>
      </DialogHeader>

      <div className="gph-scroll flex-1 min-h-0 space-y-8 overflow-y-auto px-6 py-5">
        {/* ---------------- Listing strength (sticky meter) ---------------- */}
        <div className="sticky top-0 z-20 -mx-6 border-b bg-background/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Gauge className={cn("size-3.5 shrink-0", tier.textClass)} aria-hidden="true" />
              <h4 className="truncate text-xs font-semibold tracking-wide text-foreground uppercase">
                Listing strength
              </h4>
              <span className={cn("min-w-0 truncate text-xs font-semibold", tier.textClass)}>
                · {tier.label}
              </span>
            </div>
            <p className={cn("shrink-0 text-sm font-semibold tabular-nums", tier.textClass)}>
              {listingScore}%
            </p>
          </div>
          <Progress
            value={listingScore}
            className={cn("mt-2 h-1.5", tier.barClass)}
            aria-label={`Listing completeness ${listingScore} percent — ${tier.label}`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {topGaps.length > 0 ? (
              topGaps.map((gap) => (
                <button
                  key={gap.label}
                  type="button"
                  onClick={() => scrollToGap(gap.targetId)}
                  className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Plus className="size-3 shrink-0" aria-hidden="true" />
                  {gap.label}
                </button>
              ))
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" aria-hidden="true" />
                All key details filled in
              </span>
            )}
            <p className="text-[11px] leading-snug text-muted-foreground">
              {listingGaps.length === 0
                ? "This listing is ready to impress buyers."
                : "Complete listings get significantly more buyer enquiries on Gwalior Property Hub."}
            </p>
          </div>
        </div>

        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Could not save the listing</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {isEdit && property!.status === "PUBLISHED" && (
          <Alert className="border-primary/30 bg-accent/60">
            <Info className="size-4 text-primary" aria-hidden="true" />
            <AlertDescription>
              Saving changes will send this listing back for approval before it goes live again.
            </AlertDescription>
          </Alert>
        )}

        {/* ---------------- Basics ---------------- */}
        <FormSection title="Basics" description="The headline facts buyers see first.">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="prop-title">Listing title</Label>
              <Input
                id="prop-title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. 3 BHK Apartment with Garden Views in Powai"
                aria-invalid={!!errors.title}
              />
              <FieldError message={errors.title} />
              <p className="text-xs text-muted-foreground">
                A clear title with the configuration and locality works best.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-description">Description</Label>
              <Textarea
                id="prop-description"
                rows={6}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Describe the home — layout, natural light, nearby schools and transit, society amenities, and what makes it special."
                aria-invalid={!!errors.description}
              />
              <div className="flex items-center justify-between">
                <FieldError message={errors.description} />
                <p
                  className={cn(
                    "text-xs",
                    descriptionLength < 50 ? "font-medium text-destructive" : "text-muted-foreground"
                  )}
                >
                  {descriptionLength} / 50 characters minimum
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="prop-type">Property type</Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger id="prop-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="prop-price">Price (₹)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="prop-price"
                    type="number"
                    min={500000}
                    step={1000}
                    inputMode="numeric"
                    className="pl-7"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    placeholder="85,00,000"
                    aria-invalid={!!errors.price}
                  />
                </div>
                <FieldError message={errors.price} />
                <p className="text-xs text-muted-foreground">
                  {Number.isFinite(priceValue) && priceValue >= 500000
                    ? `Displayed as ${formatPriceFull(priceValue)}`
                    : "Minimum ₹5,00,000."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3.5">
              <div>
                <Label htmlFor="prop-negotiable" className="text-sm">
                  Price is negotiable
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">Buyers may propose a different price.</p>
              </div>
              <Switch
                id="prop-negotiable"
                checked={form.negotiable}
                onCheckedChange={(v) => setField("negotiable", v)}
                aria-label="Price is negotiable"
              />
            </div>
          </div>
        </FormSection>

        {/* ---------------- Location ---------------- */}
        <FormSection title="Location" description="Where the property is located.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="prop-city">City</Label>
              <Select
                value={form.city}
                onValueChange={(city) => {
                  const entry = CITIES.find((c) => c.city === city);
                  setForm((f) => ({
                    ...f,
                    city,
                    locality: entry?.localities.includes(f.locality) ? f.locality : "",
                  }));
                }}
              >
                <SelectTrigger id="prop-city" className="w-full" aria-invalid={!!errors.city}>
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
              <FieldError message={errors.city} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-state">State</Label>
              <Input id="prop-state" readOnly value={cityEntry?.state ?? ""} placeholder="Auto-filled from city" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-locality">Locality</Label>
              <Select
                value={form.locality}
                onValueChange={(v) => setField("locality", v)}
                disabled={!form.city}
              >
                <SelectTrigger id="prop-locality" className="w-full" aria-invalid={!!errors.locality}>
                  <SelectValue placeholder={form.city ? "Select locality" : "Select a city first"} />
                </SelectTrigger>
                <SelectContent>
                  {(cityEntry?.localities ?? []).map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.locality} />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="prop-address">Full address</Label>
              <Textarea
                id="prop-address"
                rows={2}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Flat / house number, building, street, landmarks"
                aria-invalid={!!errors.address}
              />
              <FieldError message={errors.address} />
            </div>
          </div>

          <Collapsible open={coordsOpen} onOpenChange={setCoordsOpen}>
            <CollapsibleTrigger className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80">
              <ChevronDown
                className={cn("size-4 transition-transform", coordsOpen && "rotate-180")}
                aria-hidden="true"
              />
              Add map coordinates
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="grid gap-4 rounded-lg border bg-muted/40 p-3.5 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="prop-latitude">Latitude</Label>
                  <Input
                    id="prop-latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setField("latitude", e.target.value)}
                    placeholder="e.g. 19.1176"
                    aria-invalid={!!errors.latitude}
                  />
                  <FieldError message={errors.latitude} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="prop-longitude">Longitude</Label>
                  <Input
                    id="prop-longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setField("longitude", e.target.value)}
                    placeholder="e.g. 72.9060"
                    aria-invalid={!!errors.longitude}
                  />
                  <FieldError message={errors.longitude} />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Optional — exact coordinates help buyers find the property on the map.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </FormSection>

        {/* ---------------- Details ---------------- */}
        <FormSection title="Details" description="Configuration and condition of the property.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="prop-bhk">Bedrooms (BHK)</Label>
              <Select value={form.bhk} onValueChange={(v) => setField("bhk", v)}>
                <SelectTrigger id="prop-bhk" className="w-full" aria-invalid={!!errors.bhk}>
                  <SelectValue placeholder="Select BHK" />
                </SelectTrigger>
                <SelectContent>
                  {BHK_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b} BHK
                    </SelectItem>
                  ))}
                  <SelectItem value="na">N/A (Plot)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.bhk} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-bathrooms">Bathrooms</Label>
              <Select value={form.bathrooms} onValueChange={(v) => setField("bathrooms", v)}>
                <SelectTrigger id="prop-bathrooms" className="w-full">
                  <SelectValue placeholder="Select bathrooms" />
                </SelectTrigger>
                <SelectContent>
                  {BATHROOM_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-carpet">Carpet area (sq.ft)</Label>
              <Input
                id="prop-carpet"
                type="number"
                min={100}
                inputMode="numeric"
                value={form.carpetArea}
                onChange={(e) => setField("carpetArea", e.target.value)}
                placeholder="e.g. 950"
                aria-invalid={!!errors.carpetArea}
              />
              <FieldError message={errors.carpetArea} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-builtin">Built-up area (sq.ft)</Label>
              <Input
                id="prop-builtin"
                type="number"
                min={100}
                inputMode="numeric"
                value={form.builtUpArea}
                onChange={(e) => setField("builtUpArea", e.target.value)}
                placeholder="e.g. 1150"
                aria-invalid={!!errors.builtUpArea}
              />
              <FieldError message={errors.builtUpArea} />
            </div>

            {isPlot && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="prop-plot">Plot area (sq.ft)</Label>
                <Input
                  id="prop-plot"
                  type="number"
                  min={100}
                  inputMode="numeric"
                  value={form.plotArea}
                  onChange={(e) => setField("plotArea", e.target.value)}
                  placeholder="e.g. 2400"
                  aria-invalid={!!errors.plotArea}
                />
                <FieldError message={errors.plotArea} />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="prop-furnishing">Furnishing</Label>
              <Select value={form.furnishing} onValueChange={(v) => setField("furnishing", v)}>
                <SelectTrigger id="prop-furnishing" className="w-full">
                  <SelectValue placeholder="Select furnishing" />
                </SelectTrigger>
                <SelectContent>
                  {FURNISHINGS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-parking">Parking</Label>
              <Select value={form.parking} onValueChange={(v) => setField("parking", v)}>
                <SelectTrigger id="prop-parking" className="w-full">
                  <SelectValue placeholder="Select parking" />
                </SelectTrigger>
                <SelectContent>
                  {PARKING_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "0" ? "None" : `${p} car${p === "1" ? "" : "s"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-floor">Floor</Label>
              <Input
                id="prop-floor"
                value={form.floorInfo}
                onChange={(e) => setField("floorInfo", e.target.value)}
                placeholder="e.g. 5 of 14"
                maxLength={30}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-facing">Facing</Label>
              <Select value={form.facing} onValueChange={(v) => setField("facing", v)}>
                <SelectTrigger id="prop-facing" className="w-full">
                  <SelectValue placeholder="Select facing" />
                </SelectTrigger>
                <SelectContent>
                  {FACING_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prop-construction">Construction status</Label>
              <Select
                value={form.constructionStatus}
                onValueChange={(v) => setField("constructionStatus", v)}
              >
                <SelectTrigger id="prop-construction" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTRUCTION_STATUSES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.constructionStatus === "UNDER_CONSTRUCTION" && (
              <div className="grid gap-1.5">
                <Label htmlFor="prop-possession">Expected possession</Label>
                <Select value={form.possessionDate} onValueChange={(v) => setField("possessionDate", v)}>
                  <SelectTrigger id="prop-possession" className="w-full">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSSESSION_PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.constructionStatus === "READY_TO_MOVE" && (
              <div className="grid gap-1.5">
                <Label htmlFor="prop-age">Age of property</Label>
                <Select value={form.ageOfProperty} onValueChange={(v) => setField("ageOfProperty", v)}>
                  <SelectTrigger id="prop-age" className="w-full">
                    <SelectValue placeholder="Select age" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="prop-rera">
                RERA number <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="prop-rera"
                value={form.reraNumber}
                onChange={(e) => setField("reraNumber", e.target.value)}
                placeholder="e.g. P51800009999"
                maxLength={60}
              />
            </div>
          </div>
        </FormSection>

        {/* ---------------- Amenities ---------------- */}
        <FormSection title="Amenities" description="Pick everything this property offers.">
          <div id="prop-amenities" className="flex flex-wrap gap-2" role="group" aria-label="Amenities">
            {AMENITIES.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setAmenities((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* ---------------- Photos ---------------- */}
        <FormSection
          title="Photos"
          description={`Up to ${MAX_PHOTOS} photos — the first one marked as main is used as the cover.`}
        >
          <FieldError message={errors.photos} />

          <div
            id="prop-photos"
            role="button"
            tabIndex={0}
            aria-label="Upload photos"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              dragging
                ? "border-primary bg-accent"
                : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
            )}
          >
            <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Drag and drop photos here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG or WebP · up to {MAX_FILE_MB} MB each · max {MAX_PHOTOS} photos
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {uploads.length > 0 && (
            <div className="space-y-2.5">
              {uploads.map((u) => (
                <div key={u.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">{u.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {u.progress < 100 ? `${u.progress}%` : "Finishing…"}
                    </span>
                  </div>
                  <Progress value={u.progress} className="mt-2 h-1.5" aria-label={`Uploading ${u.name}`} />
                </div>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <RadioGroup
              value={String(mainIndex)}
              onValueChange={(v) => setMainIndex(Number(v))}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              aria-label="Choose the main photo and arrange the order"
            >
              {images.map((img, i) => (
                <div key={`${img.url}-${i}`} className="overflow-hidden rounded-lg border bg-card">
                  <div className="relative aspect-[4/3] bg-muted">
                    <img
                      src={img.url}
                      alt={`Property photo ${i + 1}`}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    {i === mainIndex && (
                      <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Main
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t p-1">
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={i === 0}
                        onClick={() => moveImage(i, -1)}
                        aria-label={`Move photo ${i + 1} earlier`}
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={i === images.length - 1}
                        onClick={() => moveImage(i, 1)}
                        aria-label={`Move photo ${i + 1} later`}
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => removeImage(i)}
                      aria-label={`Delete photo ${i + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <label
                    htmlFor={`main-photo-${i}`}
                    className="flex cursor-pointer items-center gap-2 border-t px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    <RadioGroupItem id={`main-photo-${i}`} value={String(i)} className="size-3.5" />
                    Use as main photo
                  </label>
                </div>
              ))}
            </RadioGroup>
          )}
        </FormSection>
      </div>

      {/* ---------------- Fixed footer ---------------- */}
      <div className="shrink-0 flex flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        {uploadingCount > 0 && (
          <p className="mr-auto text-xs text-muted-foreground">
            Uploading {uploadingCount} photo{uploadingCount === 1 ? "" : "s"} — please wait…
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitting !== null || uploadingCount > 0}
        >
          Cancel
        </Button>
        {canChooseDraft && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSubmit("draft")}
            disabled={submitting !== null || uploadingCount > 0}
          >
            {submitting === "draft" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save as draft
          </Button>
        )}
        <Button
          type="button"
          onClick={() => void handleSubmit("submit")}
          disabled={submitting !== null || uploadingCount > 0}
        >
          {submitting === "submit" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
