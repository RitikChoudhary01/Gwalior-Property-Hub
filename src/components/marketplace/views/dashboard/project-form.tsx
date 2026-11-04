"use client";

// ============================================================
// ProjectForm — create / edit project dialog used by the
// builder dashboard (and reusable elsewhere). Includes the
// shared ImageUploader with per-file progress, reordering
// and deletion.
// ============================================================

import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api, ApiError, uploadFile } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { CITIES, POSSESSION_PERIODS, PROJECT_STATUSES, PROPERTY_TYPES } from "@/lib/constants";
import { formatPriceFull } from "@/lib/format";
import type { ProjectDetailDTO } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ------------------------------------------------------------
// Image uploader (shared with the builder unit form)
// ------------------------------------------------------------

export interface UploadImage {
  key: string;
  url: string;
  caption?: string | null;
  uploading?: boolean;
  progress?: number;
}

export function ImageUploader({
  images,
  onChange,
  max = 10,
}: {
  images: UploadImage[];
  /** Receives an updater so concurrent upload progress is applied against the latest state. */
  onChange: (update: (prev: UploadImage[]) => UploadImage[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files || files.length === 0) return;

    const room = max - images.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${max} photos.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) {
      toast.info(`Only the first ${room} photo${room === 1 ? "" : "s"} were added (limit ${max}).`);
    }

    const entries: UploadImage[] = picked.map((file, i) => ({
      key: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      url: "",
      uploading: true,
      progress: 0,
    }));
    onChange((prev) => [...prev, ...entries]);

    await Promise.all(
      picked.map(async (file, idx) => {
        const entry = entries[idx];
        try {
          const res = await uploadFile(file, (pct) => {
            onChange((prev) => prev.map((p) => (p.key === entry.key ? { ...p, progress: pct } : p)));
          });
          onChange((prev) =>
            prev.map((p) =>
              p.key === entry.key ? { ...p, url: res.url, uploading: false, progress: 100 } : p
            )
          );
        } catch (err) {
          onChange((prev) => prev.filter((p) => p.key !== entry.key));
          toast.error(err instanceof ApiError ? err.message : `Could not upload ${file.name}.`);
        }
      })
    );
  }

  function move(index: number, dir: -1 | 1) {
    onChange((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  const full = images.length >= max;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {images.map((img, idx) => (
          <div
            key={img.key}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
          >
            {img.uploading || !img.url ? (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-2">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
                <Progress value={img.progress ?? 0} className="h-1.5 w-full" aria-label="Upload progress" />
              </div>
            ) : (
              <>
                <img
                  src={img.url}
                  alt={`Project photo ${idx + 1}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
                {idx === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-stone-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Main
                  </span>
                ) : null}
              </>
            )}
            <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0 || !!img.uploading}
                aria-label={`Move photo ${idx + 1} left`}
                className="grid size-7 place-items-center rounded-md bg-stone-900/75 text-white transition hover:bg-stone-900 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => prev.filter((p) => p.key !== img.key))
                }
                disabled={!!img.uploading}
                aria-label={`Delete photo ${idx + 1}`}
                className="grid size-7 place-items-center rounded-md bg-stone-900/75 text-white transition hover:bg-rose-600 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === images.length - 1 || !!img.uploading}
                aria-label={`Move photo ${idx + 1} right`}
                className="grid size-7 place-items-center rounded-md bg-stone-900/75 text-white transition hover:bg-stone-900 disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={full}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          <span className="text-xs font-medium">Add photos</span>
          <span className="text-[10px] tabular-nums">
            {images.length}/{max}
          </span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
        aria-label="Upload project photos"
      />
    </div>
  );
}

// ------------------------------------------------------------
// ProjectForm
// ------------------------------------------------------------

interface ProjectFormValues {
  name: string;
  description: string;
  city: string;
  locality: string;
  propertyType: string;
  configuration: string;
  priceMin: string;
  priceMax: string;
  totalUnits: string;
  availableUnits: string;
  construction: string;
  possessionDate: string;
  reraNumber: string;
  amenities: string;
}

const EMPTY: ProjectFormValues = {
  name: "",
  description: "",
  city: "",
  locality: "",
  propertyType: "",
  configuration: "",
  priceMin: "",
  priceMax: "",
  totalUnits: "",
  availableUnits: "",
  construction: "",
  possessionDate: "",
  reraNumber: "",
  amenities: "",
};

export function ProjectForm({
  project,
  onSaved,
  onClose,
}: {
  project?: ProjectDetailDTO | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<ProjectFormValues>(() => ({
    ...EMPTY,
    name: project?.name ?? "",
    description: project?.description ?? "",
    city: project?.city ?? "",
    locality: project?.locality ?? "",
    propertyType: project?.propertyType ?? "",
    configuration: project?.configuration ?? "",
    priceMin: project?.priceMin != null ? String(project.priceMin) : "",
    priceMax: project?.priceMax != null ? String(project.priceMax) : "",
    totalUnits: project?.totalUnits != null ? String(project.totalUnits) : "",
    availableUnits: project?.availableUnits != null ? String(project.availableUnits) : "",
    construction: project?.construction ?? "",
    possessionDate: project?.possessionDate ?? "",
    reraNumber: project?.reraNumber ?? "",
    amenities: project?.amenities ?? "",
  }));
  const [images, setImages] = useState<UploadImage[]>(() =>
    (project?.images ?? []).map((img) => ({ key: `existing-${img.id}`, url: img.url, caption: img.caption }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cityData = CITIES.find((c) => c.city === values.city);
  const state = cityData?.state ?? "";
  const uploading = images.some((i) => i.uploading);

  function set<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (values.name.trim().length < 4) e.name = "Project name must be at least 4 characters.";
    if (values.description.trim().length < 50)
      e.description = "Description must be at least 50 characters.";
    if (!values.city) e.city = "Select a city.";
    if (!values.locality) e.locality = "Select a locality.";
    if (!values.propertyType) e.propertyType = "Select a property type.";
    if (!values.construction) e.construction = "Select the construction status.";
    const min = values.priceMin ? Number(values.priceMin) : null;
    const max = values.priceMax ? Number(values.priceMax) : null;
    if (min != null && (!Number.isFinite(min) || min <= 0)) e.priceMin = "Enter a valid amount.";
    if (max != null && (!Number.isFinite(max) || max <= 0)) e.priceMax = "Enter a valid amount.";
    if (min != null && max != null && max < min)
      e.priceMax = "Maximum price must be greater than or equal to the minimum.";
    return e;
  }

  async function submit(draft: boolean) {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (uploading) {
      toast.info("Please wait for the photo uploads to finish.");
      return;
    }

    setBusy(true);
    setApiError(null);
    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      city: values.city,
      state,
      locality: values.locality,
      propertyType: values.propertyType,
      configuration: values.configuration.trim() || undefined,
      priceMin: values.priceMin ? Number(values.priceMin) : undefined,
      priceMax: values.priceMax ? Number(values.priceMax) : undefined,
      totalUnits: values.totalUnits ? Number(values.totalUnits) : undefined,
      availableUnits: values.availableUnits ? Number(values.availableUnits) : undefined,
      reraNumber: values.reraNumber.trim() || undefined,
      construction: values.construction,
      possessionDate: values.possessionDate || undefined,
      amenities: values.amenities.trim() || undefined,
      images: images
        .filter((i) => !i.uploading && i.url)
        .map((i) => ({ url: i.url, caption: i.caption ?? undefined })),
      draft,
    };

    try {
      await api(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(
        draft
          ? "Draft saved"
          : project
            ? "Changes submitted for approval"
            : "Project submitted for approval",
        { description: values.name.trim() }
      );
      onSaved();
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const descLength = values.description.trim().length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="font-display text-xl">
            {project ? "Edit project" : "Create a new project"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project details. Changes are submitted for review before going live."
              : "Tell buyers about your project. It will be reviewed by our team before going live."}
          </DialogDescription>
        </DialogHeader>

        <div className="gph-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Basics */}
          <fieldset className="grid gap-4">
            <legend className="mb-1 text-sm font-semibold text-foreground">Basics</legend>
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Meridian Green Heights"
                aria-invalid={!!errors.name}
              />
              {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="project-description">Description</Label>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    descLength < 50 ? "text-amber-600" : "text-muted-foreground"
                  )}
                >
                  {descLength} / 50 characters minimum
                </span>
              </div>
              <Textarea
                id="project-description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the project — architecture, lifestyle, location advantages, nearby landmarks…"
                rows={5}
                aria-invalid={!!errors.description}
              />
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-type">Property type</Label>
                <Select value={values.propertyType} onValueChange={(v) => set("propertyType", v)}>
                  <SelectTrigger id="project-type" className="w-full" aria-invalid={!!errors.propertyType}>
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
                {errors.propertyType ? (
                  <p className="text-xs text-destructive">{errors.propertyType}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-configuration">Configuration</Label>
                <Input
                  id="project-configuration"
                  value={values.configuration}
                  onChange={(e) => set("configuration", e.target.value)}
                  placeholder="e.g. 2, 3 & 4 BHK"
                />
              </div>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset className="grid gap-4">
            <legend className="mb-1 text-sm font-semibold text-foreground">Location</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-city">City</Label>
                <Select
                  value={values.city}
                  onValueChange={(v) => {
                    set("city", v);
                    setValues((prev) => ({ ...prev, city: v, locality: "" }));
                  }}
                >
                  <SelectTrigger id="project-city" className="w-full" aria-invalid={!!errors.city}>
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
                {errors.city ? <p className="text-xs text-destructive">{errors.city}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-locality">Locality</Label>
                <Select
                  value={values.locality}
                  onValueChange={(v) => set("locality", v)}
                  disabled={!values.city}
                >
                  <SelectTrigger id="project-locality" className="w-full" aria-invalid={!!errors.locality}>
                    <SelectValue placeholder={values.city ? "Select locality" : "Select a city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(cityData?.localities ?? []).map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locality ? <p className="text-xs text-destructive">{errors.locality}</p> : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              State: <span className="font-medium text-foreground">{state || "—"}</span> (set from the
              selected city)
            </p>
          </fieldset>

          {/* Pricing & inventory */}
          <fieldset className="grid gap-4">
            <legend className="mb-1 text-sm font-semibold text-foreground">Pricing &amp; inventory</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-price-min">Price from (₹)</Label>
                <Input
                  id="project-price-min"
                  type="number"
                  min={0}
                  value={values.priceMin}
                  onChange={(e) => set("priceMin", e.target.value)}
                  placeholder="e.g. 8500000"
                  aria-invalid={!!errors.priceMin}
                />
                <p className="text-xs text-muted-foreground">
                  {values.priceMin && Number(values.priceMin) > 0
                    ? formatPriceFull(Number(values.priceMin))
                    : "Starting price for the project"}
                </p>
                {errors.priceMin ? <p className="text-xs text-destructive">{errors.priceMin}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-price-max">Price up to (₹)</Label>
                <Input
                  id="project-price-max"
                  type="number"
                  min={0}
                  value={values.priceMax}
                  onChange={(e) => set("priceMax", e.target.value)}
                  placeholder="e.g. 21000000"
                  aria-invalid={!!errors.priceMax}
                />
                <p className="text-xs text-muted-foreground">
                  {values.priceMax && Number(values.priceMax) > 0
                    ? formatPriceFull(Number(values.priceMax))
                    : "Highest price for the project"}
                </p>
                {errors.priceMax ? <p className="text-xs text-destructive">{errors.priceMax}</p> : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-total-units">Total units</Label>
                <Input
                  id="project-total-units"
                  type="number"
                  min={0}
                  value={values.totalUnits}
                  onChange={(e) => set("totalUnits", e.target.value)}
                  placeholder="e.g. 120"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-available-units">Available units</Label>
                <Input
                  id="project-available-units"
                  type="number"
                  min={0}
                  value={values.availableUnits}
                  onChange={(e) => set("availableUnits", e.target.value)}
                  placeholder="e.g. 84"
                />
              </div>
            </div>
          </fieldset>

          {/* Timeline & compliance */}
          <fieldset className="grid gap-4">
            <legend className="mb-1 text-sm font-semibold text-foreground">
              Timeline &amp; compliance
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-construction">Construction status</Label>
                <Select value={values.construction} onValueChange={(v) => set("construction", v)}>
                  <SelectTrigger
                    id="project-construction"
                    className="w-full"
                    aria-invalid={!!errors.construction}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.construction ? (
                  <p className="text-xs text-destructive">{errors.construction}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-possession">Possession</Label>
                <Select value={values.possessionDate} onValueChange={(v) => set("possessionDate", v)}>
                  <SelectTrigger id="project-possession" className="w-full">
                    <SelectValue placeholder="Select possession period" />
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-rera">RERA number (optional)</Label>
              <Input
                id="project-rera"
                value={values.reraNumber}
                onChange={(e) => set("reraNumber", e.target.value)}
                placeholder="e.g. P51800012345"
              />
            </div>
          </fieldset>

          {/* Amenities */}
          <div className="grid gap-2">
            <Label htmlFor="project-amenities">Amenities</Label>
            <Input
              id="project-amenities"
              value={values.amenities}
              onChange={(e) => set("amenities", e.target.value)}
              placeholder="e.g. Swimming Pool, Gym, Clubhouse, 24x7 Security"
            />
            <p className="text-xs text-muted-foreground">
              Separate amenities with commas — these are shown as highlights on the project page.
            </p>
          </div>

          {/* Photos */}
          <div className="grid gap-2">
            <Label>Photos</Label>
            <ImageUploader images={images} onChange={setImages} max={10} />
            <p className="text-xs text-muted-foreground">
              The first photo becomes the cover image. JPG, PNG or WebP up to 5 MB each.
            </p>
          </div>

          {apiError ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {uploading ? "Waiting for uploads to finish…" : "Submitted projects are reviewed within 48 hours."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => submit(true)} disabled={busy || uploading}>
              Save draft
            </Button>
            <Button onClick={() => submit(false)} disabled={busy || uploading}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Submit for approval
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
