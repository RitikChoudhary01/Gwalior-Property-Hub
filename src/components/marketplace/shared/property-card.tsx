"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Heart, MapPin, BedDouble, Bath, Ruler, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { formatPrice, formatArea, formatConfig, formatNumber } from "@/lib/format";
import { VerifiedBadge } from "./status-badge";
import type { PropertyCardDTO } from "@/lib/types";

export function PropertyCard({
  property,
  className,
  showViews = false,
}: {
  property: PropertyCardDTO;
  className?: string;
  showViews?: boolean;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const favourites = useAppStore((s) => s.favourites);
  const toggleFavourite = useAppStore((s) => s.toggleFavourite);
  const [busy, setBusy] = useState(false);

  const isFav = favourites.includes(property.id);
  const area = property.builtUpArea ?? property.carpetArea ?? property.plotArea;
  const sold = property.availability === "SOLD";

  async function onFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to save favourites", {
        description: "Create a free buyer account to keep track of homes you love.",
        action: { label: "Sign in", onClick: () => navigate("/login") },
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const nowFav = await toggleFavourite(property.id);
      toast.success(nowFav ? "Saved to favourites" : "Removed from favourites", {
        description: property.title,
      });
    } catch {
      toast.error("Could not update favourites. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${property.title} — ${formatPrice(property.price)}`}
      onClick={() => navigate(`/properties/${property.slug}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/properties/${property.slug}`)}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {property.mainImage ? (
           
          <img
            src={property.mainImage}
            alt={property.title}
            loading="lazy"
            className={cn(
              "size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
              sold && "opacity-80 grayscale-[35%]"
            )}
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <MapPin className="size-8" aria-hidden="true" />
          </div>
        )}

        {/* badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {property.featured && !sold && (
            <span className="rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              Featured
            </span>
          )}
          {sold && (
            <span className="rounded-full bg-stone-900/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              Sold
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onFav}
          aria-label={isFav ? "Remove from favourites" : "Save to favourites"}
          aria-pressed={isFav}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur transition-all hover:bg-white active:scale-90"
        >
          <Heart className={cn("size-4.5 transition-colors", isFav && "fill-rose-500 text-rose-500")} aria-hidden="true" />
        </button>

        <div className="absolute bottom-3 left-3">
          <VerifiedBadge verified={property.sellerVerified} label={property.builderName ? "RERA Builder" : "Verified Owner"} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">
            {formatPrice(property.price)}
          </p>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {property.type}
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-[15px] font-medium text-foreground group-hover:text-primary">
          {property.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {property.locality}, {property.city}
          </span>
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3.5 text-[13px] text-muted-foreground">
          {property.type !== "Plot" && property.bhk && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden="true" />
              {formatConfig(property.bhk, property.type)}
            </span>
          )}
          {property.bathrooms && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="size-4" aria-hidden="true" />
              {property.bathrooms} Bath
            </span>
          )}
          {area && (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="size-4" aria-hidden="true" />
              {formatArea(area)}
            </span>
          )}
          {showViews && (
            <span className="ml-auto inline-flex items-center gap-1.5">
              <Eye className="size-4" aria-hidden="true" />
              {formatNumber(property.views)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
