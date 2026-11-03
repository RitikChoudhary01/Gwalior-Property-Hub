"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  DoorOpen,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  SearchX,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { formatNumber, formatPriceRange, initials } from "@/lib/format";
import { CONSTRUCTION_STATUSES, PROJECT_STATUSES } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";
import type { ProjectDetailDTO } from "@/lib/types";
import { ImageGallery } from "../shared/image-gallery";
import { PropertyCard } from "../shared/property-card";
import { EmptyState } from "../shared/section";
import { VerifiedBadge } from "../shared/status-badge";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function CrumbLink({ href, children }: { href: string; children: React.ReactNode }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <BreadcrumbLink
      href={`#${href}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </BreadcrumbLink>
  );
}

function constructionLabelOf(value: string): string {
  return (
    PROJECT_STATUSES.find((s) => s.value === value)?.label ??
    CONSTRUCTION_STATUSES.find((s) => s.value === value)?.label ??
    value.replace(/_/g, " ")
  );
}

// ------------------------------------------------------------------
// Project enquiry form (POST /api/contact)
// ------------------------------------------------------------------

function ProjectEnquiryForm({ projectName }: { projectName: string }) {
  const user = useAppStore((s) => s.user);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
      setPhone((p) => p || (user.phone ?? ""));
    }
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in your name and email address.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Please write a short message (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          subject: `Project enquiry: ${projectName}`,
          message: message.trim(),
        }),
      });
      setDone(true);
      toast.success("Enquiry sent successfully", {
        description: "Our team will share availability and pricing details shortly.",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send your enquiry. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <Check className="mx-auto size-8 text-emerald-600" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-emerald-900">Thank you — enquiry received</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800">
          Our team will reach out with availability, pricing and brochure details for {projectName}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3.5" aria-label="Project enquiry form">
      <div className="space-y-1.5">
        <Label htmlFor="pj-name">Your name *</Label>
        <Input
          id="pj-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          autoComplete="name"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pj-email">Email *</Label>
          <Input
            id="pj-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.in"
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pj-phone">Phone</Label>
          <Input
            id="pj-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98xxx xxxxx"
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pj-msg">Message *</Label>
        <Textarea
          id="pj-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I'm interested in this project. Please share the brochure and current availability…"
          rows={3}
          maxLength={1000}
          required
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          "Sending…"
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            Send enquiry
          </>
        )}
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

type LoadedProject =
  | { key: string; ok: true; project: ProjectDetailDTO }
  | { key: string; ok: false; message: string; notFound: boolean };

export function ProjectDetailView({ slugOrId }: { slugOrId: string }) {
  const [loaded, setLoaded] = useState<LoadedProject | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<ProjectDetailDTO>(`/api/projects/${encodeURIComponent(slugOrId)}`)
      .then((project) => {
        if (!cancelled) setLoaded({ key: slugOrId, ok: true, project });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoaded({
          key: slugOrId,
          ok: false,
          message: err instanceof Error ? err.message : "Something went wrong.",
          notFound: err instanceof ApiError && err.status === 404,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  // "Loading" is derived — the cached payload belongs to a different project.
  const current = loaded?.key === slugOrId ? loaded : null;
  if (!current) return <ProjectDetailSkeleton />;
  if (!current.ok)
    return <ProjectDetailError notFound={current.notFound} message={current.message} />;
  return <ProjectDetailBody project={current.project} />;
}

function ProjectDetailError({ notFound, message }: { notFound: boolean; message: string }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden="true" />}
        title={notFound ? "This project is not available" : "Could not load this project"}
        description={
          notFound
            ? "It may have been removed by the builder or is no longer accepting enquiries."
            : message
        }
        action={<Button onClick={() => navigate("/projects")}>Back to all projects</Button>}
        className="border-solid shadow-sm"
      />
    </section>
  );
}

function ProjectDetailSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Skeleton className="h-4 w-56" />
      <div className="mt-6 max-w-2xl space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="mt-6 aspect-[16/9] w-full rounded-xl" />
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </section>
  );
}

function ProjectDetailBody({ project }: { project: ProjectDetailDTO }) {
  const constructionLabel = constructionLabelOf(project.construction);
  const amenities = useMemo(
    () =>
      (project.amenities ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    [project.amenities]
  );
  const paragraphs = useMemo(
    () =>
      (project.description ?? "")
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    [project.description]
  );

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${project.name}, ${project.locality}, ${project.city}`
  )}`;
  const websiteUrl = project.builder.website
    ? project.builder.website.startsWith("http")
      ? project.builder.website
      : `https://${project.builder.website}`
    : "";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <CrumbLink href="/">Home</CrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <CrumbLink href="/projects">Projects</CrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="max-w-[10rem] sm:max-w-[16rem]">
            <BreadcrumbPage className="truncate">{project.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {project.builderName}
          </p>
          <VerifiedBadge verified={project.builderVerified} label="Verified Builder" />
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {project.name}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {project.locality}, {project.city}, {project.state}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{constructionLabel}</Badge>
          {project.possessionDate && (
            <Badge variant="outline" className="gap-1.5">
              <CalendarDays className="size-3" aria-hidden="true" />
              Possession: {project.possessionDate}
            </Badge>
          )}
          {project.featured && (
            <Badge className="border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">
              Featured
            </Badge>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-6">
        <ImageGallery
          images={project.images.map((img) => ({ url: img.url, caption: img.caption }))}
          title={project.name}
        />
      </div>

      {/* Body */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <section
            aria-labelledby="project-overview-heading"
            className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
          >
            <h2 id="project-overview-heading" className="font-display text-lg font-semibold text-foreground">
              Overview
            </h2>
            {paragraphs.length > 0 ? (
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {paragraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The developer has not published a detailed description yet. Send an enquiry below
                and the Vasati team will share the brochure and floor plans.
              </p>
            )}
          </section>

          {amenities.length > 0 && (
            <section
              aria-labelledby="project-amenities-heading"
              className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
            >
              <h2
                id="project-amenities-heading"
                className="font-display text-lg font-semibold text-foreground"
              >
                Amenities
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground"
                  >
                    <Check className="size-3.5 text-primary" aria-hidden="true" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="project-units-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2
                id="project-units-heading"
                className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                Available homes in this project
              </h2>
              {project.units.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {project.units.length} {project.units.length === 1 ? "home" : "homes"} listed
                </p>
              )}
            </div>
            {project.units.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
                {project.units.map((unit) => (
                  <PropertyCard key={unit.id} property={unit} />
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-5"
                icon={<DoorOpen className="size-6" aria-hidden="true" />}
                title="No individual units published yet"
                description="Individual homes in this project have not been listed yet — send an enquiry and the builder will share current availability."
              />
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4 self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto vasati-scroll">
          {/* Builder card */}
          <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Developer
            </p>
            <div className="mt-3 flex items-start gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                  {initials(project.builder.companyName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {project.builder.companyName}
                </p>
                <div className="mt-1">
                  <VerifiedBadge
                    verified={project.builder.isVerified}
                    label="Verified Builder"
                  />
                </div>
              </div>
            </div>
            {project.builder.description && (
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {project.builder.description}
              </p>
            )}
            {project.builder.city && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {project.builder.city}
              </p>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <Globe className="size-4" aria-hidden="true" />
                Visit website
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* Enquiry card */}
          <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {formatPriceRange(project.priceMin, project.priceMax)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {project.propertyType}
              {project.configuration ? ` · ${project.configuration}` : ""}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/70 p-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Units available
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold text-foreground">
                  {formatNumber(project.availableUnits)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    of {formatNumber(project.totalUnits)}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg bg-muted/70 p-3">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Possession
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {project.possessionDate ?? "On request"}
                </dd>
              </div>
            </dl>

            <Separator className="my-4" />
            <h2 className="font-display text-base font-semibold text-foreground">Project enquiry</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Enquire about {project.name} — our team responds within a day.
            </p>
            <ProjectEnquiryForm projectName={project.name} />

            <Button asChild variant="outline" className="mt-4 w-full gap-2">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="size-4" aria-hidden="true" />
                View on Google Maps
              </a>
            </Button>
          </div>

          {/* RERA line */}
          <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            {project.reraNumber ? (
              <>
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <p>
                  <span className="font-semibold text-foreground">
                    RERA Reg. No: {project.reraNumber}
                  </span>
                </p>
              </>
            ) : (
              <>
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  RERA registration not provided by the lister. Buyers are advised to verify details
                  on the state RERA portal.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
