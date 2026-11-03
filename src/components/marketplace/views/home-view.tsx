"use client";

// ============================================================
// HomeView — flagship public homepage: hero + search, featured
// listings, locations, fresh arrivals, projects, categories,
// how-it-works and audience CTA bands.
// ============================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  DoorOpen,
  Home,
  Landmark,
  Map as MapIcon,
  ArrowRight,
  Search,
  MessageSquare,
  Handshake,
  PlusCircle,
  ShieldCheck,
  Inbox,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/use-app-store";
import { api } from "@/lib/api-client";
import { CITIES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Paginated, ProjectCardDTO, PropertyCardDTO } from "@/lib/types";
import { PropertyCard } from "../shared/property-card";
import { ProjectCard } from "../shared/project-card";
import { SearchBar } from "../shared/search-bar";
import { SectionHeading } from "../shared/section";

const HOME_CITIES = ["Mumbai", "Bengaluru", "Pune", "Hyderabad", "Gurugram", "Noida"];

const CATEGORY_TILES: { type: string; label: string; icon: typeof Building2; blurb: string }[] = [
  { type: "Apartment", label: "Apartment", icon: Building2, blurb: "Community living with shared amenities" },
  { type: "Flat", label: "Flat", icon: DoorOpen, blurb: "Compact, efficient city homes" },
  { type: "Independent House", label: "Independent House", icon: Home, blurb: "Standalone homes with private access" },
  { type: "Villa", label: "Villa", icon: Landmark, blurb: "Spacious luxury in gated enclaves" },
  { type: "Plot", label: "Plot", icon: MapIcon, blurb: "Land parcels to build your vision" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

interface LoadState<T> {
  loading: boolean;
  data: T | null;
}

export function HomeView() {
  const navigate = useAppStore((s) => s.navigate);

  const [featured, setFeatured] = useState<LoadState<PropertyCardDTO[]>>({ loading: true, data: null });
  const [recent, setRecent] = useState<LoadState<PropertyCardDTO[]>>({ loading: true, data: null });
  const [projects, setProjects] = useState<LoadState<ProjectCardDTO[]>>({ loading: true, data: null });
  const [cityCounts, setCityCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let active = true;

    api<Paginated<PropertyCardDTO>>("/api/properties?featured=1&pageSize=6")
      .then((res) => active && setFeatured({ loading: false, data: res.data }))
      .catch(() => active && setFeatured({ loading: false, data: null }));

    api<Paginated<PropertyCardDTO>>("/api/properties?sort=recent&pageSize=6")
      .then((res) => active && setRecent({ loading: false, data: res.data }))
      .catch(() => active && setRecent({ loading: false, data: null }));

    api<Paginated<ProjectCardDTO>>("/api/projects?pageSize=3")
      .then((res) => active && setProjects({ loading: false, data: res.data }))
      .catch(() => active && setProjects({ loading: false, data: null }));

    // Parallel per-city listing counts (total from pagination meta)
    Promise.allSettled(
      HOME_CITIES.map((city) =>
        api<Paginated<PropertyCardDTO>>(
          `/api/properties?city=${encodeURIComponent(city)}&pageSize=1`
        ).then((res) => [city, res.pagination.total] as const)
      )
    ).then((results) => {
      if (!active) return;
      const counts: Record<string, number | null> = {};
      for (const r of results) {
        if (r.status === "fulfilled") counts[r.value[0]] = r.value[1];
      }
      setCityCounts(counts);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="pb-16">
      {/* ============ Hero ============ */}
      <section className="relative isolate min-h-[560px] overflow-hidden" aria-label="Find your home">
        <img
          src="/images/hero.png"
          alt="Elegant Indian apartment facade at golden hour"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="hero-scrim absolute inset-0 -z-10" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-7xl flex-col items-center justify-center px-4 pb-32 pt-24 text-center sm:px-6 sm:pb-36 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
            Premium Indian Real Estate
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find a Place You&rsquo;ll Love to Call Home.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            Discover residential properties, explore verified listings and connect with property
            owners and trusted developers.
          </p>
        </div>
      </section>

      {/* Search bar overlapping the hero bottom edge */}
      <div className="relative z-20 mx-auto -mt-20 max-w-6xl px-4 sm:-mt-24 sm:px-6 lg:px-8">
        <SearchBar />
      </div>

      {/* ============ Featured properties ============ */}
      {(featured.loading || (featured.data?.length ?? 0) > 0) && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="Handpicked homes"
              title="Featured properties"
              description="A curated selection of standout residences from verified owners and reputed builders."
              linkText="View all properties"
              linkHref="#/properties"
            />
          </motion.div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)
              : featured.data?.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </section>
      )}

      {/* ============ Explore locations ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Where would you like to live"
            title="Explore locations"
            description="Browse verified residential listings across India's most sought-after cities."
          />
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_CITIES.map((cityName) => {
            const city = CITIES.find((c) => c.city === cityName);
            const count = cityCounts[cityName];
            return (
              <button
                key={cityName}
                type="button"
                onClick={() => navigate(`/properties?city=${encodeURIComponent(cityName)}`)}
                className="group rounded-xl border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-foreground group-hover:text-primary sm:text-2xl">
                      {cityName}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{city?.state ?? ""}</p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <MapIcon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-4 text-[13px] text-muted-foreground">
                  {count == null ? "Explore properties" : `${formatNumber(count)} listings`}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Explore properties
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============ Recently added ============ */}
      {(recent.loading || (recent.data?.length ?? 0) > 0) && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="Fresh on the market"
              title="Recently added"
              description="The newest listings on Vasati, ready for your shortlist."
              linkText="Browse all listings"
              linkHref="#/properties"
            />
          </motion.div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)
              : recent.data?.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </section>
      )}

      {/* ============ Featured projects ============ */}
      {(projects.loading || (projects.data?.length ?? 0) > 0) && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <motion.div {...fadeUp}>
            <SectionHeading
              eyebrow="From trusted developers"
              title="Featured projects"
              description="New constructions and ready-to-move communities from verified builders."
              linkText="View all projects"
              linkHref="#/projects"
            />
          </motion.div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)
              : projects.data?.map((pr) => <ProjectCard key={pr.id} project={pr} />)}
          </div>
        </section>
      )}

      {/* ============ Browse by category ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Find your format"
            title="Browse by category"
            description="Every kind of home, from city apartments to private villas and plots."
          />
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORY_TILES.map(({ type, label, icon: Icon, blurb }) => (
            <button
              key={type}
              type="button"
              onClick={() => navigate(`/properties?type=${encodeURIComponent(type)}`)}
              className="group flex flex-col items-start rounded-xl border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
                {label}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{blurb}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ============ How it works ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Simple by design"
            title="How Vasati works"
            description="A guided path from first search to final signature, for every side of the transaction."
          />
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Buyers */}
          <motion.div {...fadeUp} className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">For Buyers</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Search verified homes and move forward with confidence.
            </p>
            <ol className="mt-6 space-y-6">
              {[
                {
                  icon: Search,
                  title: "Search & shortlist",
                  text: "Filter by city, budget and configuration. Save favourites and compare homes side by side.",
                },
                {
                  icon: MessageSquare,
                  title: "Enquire & schedule a visit",
                  text: "Send an enquiry or request a site visit directly from any listing — no cold calls.",
                },
                {
                  icon: Handshake,
                  title: "Visit, negotiate, close",
                  text: "Meet the owner or builder, negotiate terms and complete the purchase on your timeline.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="size-4.5" aria-hidden="true" />
                    </span>
                    {i < 2 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[15px] font-semibold text-foreground">
                      <span className="mr-2 text-xs font-semibold text-primary">{i + 1}.</span>
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>

          {/* Sellers / Builders */}
          <motion.div {...fadeUp} className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
              For Sellers &amp; Builders
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              List once and let matched buyers come to you.
            </p>
            <ol className="mt-6 space-y-6">
              {[
                {
                  icon: PlusCircle,
                  title: "List your property",
                  text: "Add photos, specifications and pricing. Draft at your own pace, then submit.",
                },
                {
                  icon: ShieldCheck,
                  title: "Get verified",
                  text: "Our team reviews every listing before it goes live, keeping the marketplace trustworthy.",
                },
                {
                  icon: Inbox,
                  title: "Receive matched enquiries",
                  text: "Buyer enquiries and site-visit requests arrive with full contact details and references.",
                },
                {
                  icon: LineChart,
                  title: "Close with attributed tracking",
                  text: "Track every lead to a completed transaction with platform-attributed reporting.",
                },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="size-4.5" aria-hidden="true" />
                    </span>
                    {i < 3 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[15px] font-semibold text-foreground">
                      <span className="mr-2 text-xs font-semibold text-primary">{i + 1}.</span>
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </section>

      {/* ============ Seller CTA band ============ */}
      <section className="mt-16 w-full bg-foreground text-background sm:mt-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 id="seller-cta" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Have a Property to Sell?
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-background/75 sm:text-[15px]">
              Publish your home to genuine, verified buyers. Create a listing with photos, specs and
              pricing — our team reviews it before it goes live, and you stay in control of
              availability and enquiries.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate("/list-property")}>
              List your property
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              onClick={() => navigate("/contact")}
            >
              Talk to our team
            </Button>
          </div>
        </div>
      </section>

      {/* ============ Builder CTA band ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8" aria-labelledby="builder-cta">
        <motion.div
          {...fadeUp}
          className="flex flex-col items-start gap-6 rounded-2xl bg-accent p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">For developers</p>
            <h2 id="builder-cta" className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Partner with Vasati as a Builder
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-foreground/75 sm:text-[15px]">
              Publish your projects and inventory to a curated audience of serious home buyers, with
              dedicated project pages, attributed leads and transparent commission agreements.
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="shrink-0"
            onClick={() => navigate("/partner")}
          >
            Become a partner
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
