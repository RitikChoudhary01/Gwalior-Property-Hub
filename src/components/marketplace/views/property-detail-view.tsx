"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Check,
  ExternalLink,
  Eye,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  SearchX,
  Share2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api-client";
import {
  formatArea,
  formatDate,
  formatConfig,
  formatMonthYear,
  formatNumber,
  formatPrice,
  formatPriceFull,
  formatPricePerSqft,
  formatSignedPct,
  initials,
} from "@/lib/format";
import { BRAND, CONSTRUCTION_STATUSES } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";
import type { PropertyCardDTO, PropertyDetailDTO } from "@/lib/types";

function toCardDTO(property: PropertyDetailDTO): PropertyCardDTO {
  const mainImage = property.images.find((i) => i.isMain)?.url ?? property.images[0]?.url ?? null;
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    type: property.type,
    price: property.price,
    city: property.city,
    state: property.state,
    locality: property.locality,
    bhk: property.bhk,
    bathrooms: property.bathrooms,
    carpetArea: property.carpetArea,
    builtUpArea: property.builtUpArea,
    plotArea: property.plotArea,
    constructionStatus: property.constructionStatus,
    availability: property.availability,
    status: property.status,
    verificationStatus: property.verificationStatus,
    featured: property.featured,
    views: property.views,
    createdAt: property.createdAt,
    mainImage,
    sellerVerified: property.seller.isVerified,
    sellerName: property.seller.name,
    projectName: property.project?.name ?? null,
    builderName: property.builder?.companyName ?? null,
  };
}
import { EnquiryForm } from "../shared/enquiry-form";
import { EmiCalculator } from "../shared/emi-calculator";
import { ImageGallery } from "../shared/image-gallery";
import { PropertyCard } from "../shared/property-card";
import { EmptyState, SectionHeading } from "../shared/section";
import { StatusBadge, VerifiedBadge, ListingVerifiedBadge } from "../shared/status-badge";
import { VisitDialog } from "../shared/visit-dialog";

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

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

type LoadedProperty =
  | { key: string; ok: true; property: PropertyDetailDTO }
  | { key: string; ok: false; message: string; notFound: boolean };

export function PropertyDetailView({ slugOrId }: { slugOrId: string }) {
  const [loaded, setLoaded] = useState<LoadedProperty | null>(null);
  const recordViewedProperty = useAppStore((s) => s.recordViewedProperty);

  useEffect(() => {
    let cancelled = false;
    api<PropertyDetailDTO>(`/api/properties/${encodeURIComponent(slugOrId)}`)
      .then((property) => {
        if (!cancelled) {
          setLoaded({ key: slugOrId, ok: true, property });
          recordViewedProperty(toCardDTO(property));
        }
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

  // "Loading" is derived — the cached payload belongs to a different listing.
  const current = loaded?.key === slugOrId ? loaded : null;
  if (!current) return <PropertyDetailSkeleton />;
  if (!current.ok)
    return <PropertyDetailError notFound={current.notFound} message={current.message} />;
  return <PropertyDetailBody property={current.property} />;
}

function PropertyDetailError({ notFound, message }: { notFound: boolean; message: string }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden="true" />}
        title={notFound ? "This listing is not available" : "Could not load this listing"}
        description={
          notFound
            ? "It may have been removed by the lister or is no longer accepting enquiries."
            : message
        }
        action={<Button onClick={() => navigate("/properties")}>Back to all properties</Button>}
        className="border-solid shadow-sm"
      />
    </section>
  );
}

function PropertyDetailSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Skeleton className="h-4 w-64" />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="w-full max-w-2xl space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="size-10 rounded-lg" />
        </div>
      </div>
      <Skeleton className="mt-6 aspect-[16/9] w-full rounded-xl" />
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-[28rem] rounded-xl" />
      </div>
    </section>
  );
}

function PropertyDetailBody({ property }: { property: PropertyDetailDTO }) {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const favourites = useAppStore((s) => s.favourites);
  const toggleFavourite = useAppStore((s) => s.toggleFavourite);
  const [showContact, setShowContact] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  const sold = property.availability === "SOLD";
  const isFav = favourites.includes(property.id);
  const constructionLabel =
    CONSTRUCTION_STATUSES.find((c) => c.value === property.constructionStatus)?.label ??
    property.constructionStatus.replace(/_/g, " ");
  const sellerName = property.builder?.companyName ?? property.seller.name;
  // Identity-scoped label — an ID check is NOT listing verification.
  const sellerBadgeLabel = "ID Verified";

  const mapsUrl =
    property.latitude != null && property.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${property.locality}, ${property.city}`
        )}`;

  // WhatsApp enquiries route to the platform number (+91 70116 45976) —
  // in the assisted model the team coordinates buyer conversations.
  const waUrl = `https://wa.me/${BRAND.whatsappDigits}?text=${encodeURIComponent(
    `Hello, I found your listing "${property.title}" (${formatPrice(property.price)}) on ${BRAND.name}. Is it still available?`
  )}`;

  const paragraphs = property.description
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const specs: Array<[string, string]> = [
    ["BHK", property.bhk ? `${property.bhk} BHK` : "—"],
    ["Bathrooms", property.bathrooms != null ? String(property.bathrooms) : "—"],
    ["Carpet area", formatArea(property.carpetArea)],
    ["Built-up area", formatArea(property.builtUpArea)],
  ];
  if (property.plotArea != null) specs.push(["Plot area", formatArea(property.plotArea)]);
  specs.push(
    ["Furnishing", property.furnishing ?? "—"],
    [
      "Parking",
      property.parking > 0 ? `${property.parking} ${property.parking === 1 ? "car" : "cars"}` : "None",
    ],
    ["Floor", property.floorInfo ?? "—"],
    ["Facing", property.facing ?? "—"],
    ["Age of property", property.ageOfProperty ?? "—"],
    ["Possession", property.possessionDate ?? "—"],
    ["Configuration", formatConfig(property.bhk, property.type)]
  );

  async function share() {
    const url = window.location.href;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard", {
        description: "Share this home with family or friends.",
      });
    } catch {
      toast.error("Could not copy the link", {
        description: "Please copy it from your browser address bar.",
      });
    }
  }

  async function onFavourite() {
    if (!user) {
      toast.info("Sign in to save favourites", {
        description: "Create a free buyer account to keep track of homes you love.",
      });
      navigate("/login");
      return;
    }
    if (favBusy) return;
    setFavBusy(true);
    try {
      const nowFav = await toggleFavourite(property.id);
      toast.success(nowFav ? "Saved to favourites" : "Removed from favourites", {
        description: property.title,
      });
    } catch {
      toast.error("Could not update favourites. Please try again.");
    } finally {
      setFavBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10 lg:pb-12">
      {/* Top Navigation Row: Back button & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/properties");
            }
          }}
          className="group inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-95 sm:text-sm"
          aria-label="Back to properties list"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5 text-primary" aria-hidden="true" />
          <span>Back to properties</span>
        </button>

        {/* Breadcrumb */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <CrumbLink href="/">Home</CrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <CrumbLink href="/properties">Properties</CrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <CrumbLink href={`/properties?city=${encodeURIComponent(property.city)}`}>
                {property.city}
              </CrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="max-w-[10rem] sm:max-w-[16rem]">
              <BreadcrumbPage className="truncate">{property.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Title row */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {property.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="font-display text-xl font-semibold text-primary sm:text-2xl">
              {formatPrice(property.price)}
            </p>
            {property.negotiable && <Badge variant="secondary">Negotiable</Badge>}
            {/* Live price context vs the locality — computed from real
                published listings, shown only when the comparison is honest. */}
            {property.localityInsights?.vsLocalityPct != null &&
              Math.abs(property.localityInsights.vsLocalityPct) >= 5 &&
              property.localityInsights.vsLocalityPct <= 0 && (
                <Badge className="gap-1 border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <TrendingDown className="size-3" aria-hidden="true" />
                  {formatSignedPct(property.localityInsights.vsLocalityPct)} vs locality avg
                </Badge>
              )}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {property.locality}, {property.city}, {property.state}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{property.type}</Badge>
            <Badge variant="outline">{constructionLabel}</Badge>
            <StatusBadge
              status={property.availability}
              className={sold ? "px-3 py-1 text-xs" : undefined}
            />
            {/* Listing-level legal verification — only shown when Gwalior Property Hub
                actually completed document verification for this listing. */}
            {property.verificationStatus === "VERIFIED" && <ListingVerifiedBadge />}
            {property.featured && (
              <Badge className="border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">
                Featured
              </Badge>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5" aria-hidden="true" />
              {formatNumber(property.views)} views
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Listed on {formatDate(property.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={share}
            aria-label="Share this property"
            className="shadow-sm"
          >
            <Share2 className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onFavourite}
            aria-label={isFav ? "Remove from favourites" : "Save to favourites"}
            aria-pressed={isFav}
            className="shadow-sm"
          >
            <Heart
              className={cn("size-4 transition-colors", isFav && "fill-rose-500 text-rose-500")}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-6">
        <ImageGallery
          images={property.images.map((i) => ({ url: i.url }))}
          title={property.title}
        />
      </div>

      {/* Body */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="overview-heading" className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
            <h2 id="overview-heading" className="font-display text-lg font-semibold text-foreground">
              Overview
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* Locality snapshot — live price intelligence from published listings */}
          {property.localityInsights && (
            <section
              aria-labelledby="locality-insights-heading"
              className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
            >
              <h2
                id="locality-insights-heading"
                className="font-display text-lg font-semibold text-foreground"
              >
                {property.localityInsights.locality} price snapshot
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live market data from {property.localityInsights.listingCount}{" "}
                {property.localityInsights.listingCount === 1 ? "other home" : "other homes"} listed
                on Gwalior Property Hub right now.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    This home
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatPricePerSqft(property.localityInsights.thisPricePerSqft)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Locality average
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatPricePerSqft(property.localityInsights.avgPricePerSqft)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Vs locality
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-sm font-semibold",
                      property.localityInsights.vsLocalityPct == null
                        ? "text-foreground"
                        : property.localityInsights.vsLocalityPct <= 0
                          ? "text-emerald-700"
                          : "text-amber-700"
                    )}
                  >
                    {property.localityInsights.vsLocalityPct != null &&
                      property.localityInsights.vsLocalityPct > 0 && (
                        <TrendingUp className="size-3.5" aria-hidden="true" />
                      )}
                    {property.localityInsights.vsLocalityPct != null &&
                      property.localityInsights.vsLocalityPct < 0 && (
                        <TrendingDown className="size-3.5" aria-hidden="true" />
                      )}
                    {formatSignedPct(property.localityInsights.vsLocalityPct)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Avg listed price
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatPrice(property.localityInsights.avgPrice)}
                  </p>
                </div>
              </div>

              {property.localityInsights.vsLocalityPct != null && (
                <p className="mt-4 rounded-lg bg-muted/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
                  {property.localityInsights.vsLocalityPct <= 0
                    ? `This home is priced at or below the ${property.localityInsights.locality} average — worth a closer look.`
                    : `This home is priced above the ${property.localityInsights.locality} average — its condition, floor or amenities may justify the premium.`}
                </p>
              )}
            </section>
          )}

          <section
            aria-labelledby="specs-heading"
            className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
          >
            <h2 id="specs-heading" className="font-display text-lg font-semibold text-foreground">
              Specifications
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {specs.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* EMI calculator — plan the purchase, not just the price */}
          <EmiCalculator price={property.price} />

          {property.amenities.length > 0 && (
            <section
              aria-labelledby="amenities-heading"
              className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
            >
              <h2 id="amenities-heading" className="font-display text-lg font-semibold text-foreground">
                Amenities
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {property.amenities.map((amenity) => (
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

          <section
            aria-labelledby="location-heading"
            className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
          >
            <h2 id="location-heading" className="font-display text-lg font-semibold text-foreground">
              Location
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{property.address}</p>
            <div className="mt-4 flex h-44 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted">
              <span className="grid size-10 place-items-center rounded-full bg-background text-primary shadow-sm">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {property.locality}, {property.city}
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View on Google Maps
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4 self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto gph-scroll">
          <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
            <p className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {formatPrice(property.price)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {property.negotiable ? "Price negotiable" : "Price as listed"} · {formatPriceFull(property.price)}
            </p>

            <Separator className="my-4" />

            {/* Seller / builder */}
            <div className="flex items-start gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                  {initials(sellerName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{sellerName}</p>
                <div className="mt-1">
                  {property.seller.isVerified ? (
                    <VerifiedBadge verified={true} label={sellerBadgeLabel} />
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Member since {formatMonthYear(property.seller.memberSince)}
                </p>
              </div>
            </div>

            {!sold ? (
              <>
                {property.seller.phone && (
                  <div className="mt-4">
                    {showContact ? (
                      <a
                        href={`tel:${property.seller.phone}`}
                        className="flex h-10 items-center justify-center gap-2 rounded-md border bg-background text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-primary/40"
                      >
                        <Phone className="size-4 text-primary" aria-hidden="true" />
                        {property.seller.phone}
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowContact(true)}
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        Show contact
                      </Button>
                    )}
                  </div>
                )}

                {waUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="mt-2.5 w-full gap-2 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-4" aria-hidden="true" />
                      WhatsApp
                    </a>
                  </Button>
                )}

                <div className="mt-2.5">
                  <VisitDialog property={property}>
                    <Button size="lg" className="w-full">
                      <CalendarCheck className="size-4" aria-hidden="true" />
                      Schedule a site visit
                    </Button>
                  </VisitDialog>
                </div>

                <Separator className="my-5" />

                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Enquire about this home
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    The listing representative typically responds within a day.
                  </p>
                  <div className="mt-4">
                    <EnquiryForm propertyId={property.id} propertyTitle={property.title} />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed bg-muted/60 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">This property is sold</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Explore other homes in {property.city} and nearby localities.
                </p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => navigate(`/properties?city=${encodeURIComponent(property.city)}`)}
                >
                  Browse similar homes
                </Button>
              </div>
            )}
          </div>

          {/* RERA note */}
          <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            {property.reraNumber ? (
              <>
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <p>
                  <span className="font-semibold text-foreground">
                    RERA Reg. No: {property.reraNumber}
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

      {/* Similar properties */}
      {property.similar.length > 0 && (
        <section className="mt-12" aria-label="Similar homes">
          <SectionHeading title={`Similar homes in ${property.city}`} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {property.similar.map((similar) => (
              <PropertyCard key={similar.id} property={similar} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Floating Sticky CTA Bar */}
      {!sold && (
        <aside
          aria-label="Quick mobile booking actions"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Asking Price</p>
              <p className="truncate font-display text-lg font-bold text-primary">
                {formatPrice(property.price)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {waUrl && (
                <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    <span>WhatsApp</span>
                  </a>
                </Button>
              )}
              <VisitDialog property={property}>
                <Button size="sm" className="h-9 gap-1.5 font-semibold">
                  <CalendarCheck className="size-4" aria-hidden="true" />
                  <span>Book Visit</span>
                </Button>
              </VisitDialog>
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}
