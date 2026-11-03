"use client";

import { MapPin, Building2, Home, DoorOpen, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { formatPriceRange } from "@/lib/format";
import { VerifiedBadge } from "./status-badge";
import { CONSTRUCTION_STATUSES } from "@/lib/constants";
import type { ProjectCardDTO } from "@/lib/types";

export function ProjectCard({ project, className }: { project: ProjectCardDTO; className?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const constructionLabel =
    CONSTRUCTION_STATUSES.find((c) => c.value === project.construction)?.label ?? project.construction;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${project.name}, ${project.locality}, ${project.city}`}
      onClick={() => navigate(`/projects/${project.slug}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/projects/${project.slug}`)}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {project.mainImage ? (
           
          <img
            src={project.mainImage}
            alt={`${project.name} — ${project.locality}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Building2 className="size-8" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {project.featured && (
            <span className="rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              Featured
            </span>
          )}
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-stone-800 shadow-sm backdrop-blur">
            {constructionLabel}
          </span>
        </div>
        <div className="absolute bottom-3 left-3">
          <VerifiedBadge verified={project.builderVerified} label="Verified Builder" />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{project.builderName}</p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
          {project.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {project.locality}, {project.city}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3.5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Home className="size-4" aria-hidden="true" />
            {project.configuration ?? project.propertyType}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <DoorOpen className="size-4" aria-hidden="true" />
            {project.availableUnits} units available
          </span>
          {project.possessionDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {project.possessionDate}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-display text-base font-semibold text-foreground">{formatPriceRange(project.priceMin, project.priceMax)}</p>
          <span className="text-xs text-muted-foreground">{project.totalUnits} total units</span>
        </div>
      </div>
    </article>
  );
}
