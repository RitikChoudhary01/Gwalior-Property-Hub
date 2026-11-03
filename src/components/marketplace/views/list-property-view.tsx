"use client";

// ============================================================
// ListPropertyView — seller marketing page that adapts to the
// visitor's auth state (guest / seller / builder / other).
// ============================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  Inbox,
  LineChart,
  ShieldCheck,
  UserPlus,
  LogIn,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppStore } from "@/store/use-app-store";
import { api } from "@/lib/api-client";
import type { SellerStats } from "@/lib/types";
import { StatCard } from "../shared/section";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const GUEST_BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Verified buyer enquiries",
    text: "Enquiries arrive from real accounts, with contact details and a unique reference you can track.",
  },
  {
    icon: ClipboardCheck,
    title: "Free listing",
    text: "Publishing your property on Vasati is free during early access. You pay nothing to list.",
  },
  {
    icon: LineChart,
    title: "Control availability & pricing",
    text: "Update price, mark the home reserved or sold, and pause enquiries — all from your dashboard.",
  },
];

const STEPS = [
  {
    icon: Camera,
    title: "Create your listing",
    text: "Add photographs, specifications and your asking price. Save as a draft and refine it at your own pace.",
  },
  {
    icon: ShieldCheck,
    title: "Verification & review",
    text: "Our team reviews every listing for accuracy and completeness before it can go live.",
  },
  {
    icon: Inbox,
    title: "Go live & receive enquiries",
    text: "Once published, buyers can enquire and request site visits, which land in your dashboard with full details.",
  },
  {
    icon: LineChart,
    title: "Track & close",
    text: "Follow every enquiry through visits and negotiation to a completed, platform-attributed sale.",
  },
];

const FAQS = [
  {
    q: "Does listing cost anything?",
    a: "No. Listing on Vasati is free during early access. We earn an agreed commission — a percentage of the sale value or a fixed fee, as defined in a written agreement signed with you — only on successful transactions attributed to the platform. If your sale does not come from Vasati, you owe us nothing.",
  },
  {
    q: "What documents do I need?",
    a: "For the listing itself, clear photographs and accurate property details are enough. As part of verification we may ask for proof of ownership or authorisation to sell, and where applicable your project's RERA registration number. Buyers will typically request title and encumbrance documents directly during negotiation.",
  },
  {
    q: "How does verification work?",
    a: "A Vasati team member reviews each listing before publication — checking photographs, pricing plausibility and completeness of details. Owners and builders who complete identity or RERA verification receive a Verified badge on their listings, which buyers can see.",
  },
  {
    q: "Can builders list on Vasati too?",
    a: "Yes. Builders and developers can create a builder account, publish dedicated project pages with inventory and pricing, and receive attributed enquiries. Visit the partner page to learn how the builder programme works.",
  },
];

type StatsState = { status: "idle" | "ok" | "error"; stats: SellerStats | null };

export function ListPropertyView() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);

  const [statsState, setStatsState] = useState<StatsState>({ status: "idle", stats: null });

  useEffect(() => {
    if (user?.role !== "SELLER") return;
    let active = true;
    api<SellerStats>("/api/stats")
      .then((res) => {
        if (active) setStatsState({ status: "ok", stats: res });
      })
      .catch(() => {
        if (active) setStatsState({ status: "error", stats: null });
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  return (
    <div className="pb-16">
      {/* ============ Hero ============ */}
      <section className="bg-accent/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sell with Vasati</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            List Your Property on Vasati
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Reach genuine, verified buyers with a listing that presents your home at its best — clear
            photographs, honest specifications and direct enquiries, all managed from one dashboard.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {user?.role === "SELLER" ? (
              <Button size="lg" onClick={() => navigate("/dashboard?tab=listings")}>
                Go to dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : user?.role === "BUILDER" ? (
              <Button size="lg" onClick={() => navigate("/dashboard?tab=projects")}>
                Manage projects &amp; inventory
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : !user ? (
              <>
                <Button size="lg" onClick={() => navigate("/register?role=seller")}>
                  <UserPlus className="size-4" aria-hidden="true" />
                  Create a seller account
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login?next=/list-property")}>
                  <LogIn className="size-4" aria-hidden="true" />
                  Sign in
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={() => navigate("/contact")}>
                Talk to our team
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ============ Auth-state panels ============ */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {/* Guest: role prompt + benefits */}
        {!user && (
          <motion.div {...fadeUp}>
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Create a seller account to start listing
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A free property-owner account unlocks the listing form, your enquiry dashboard and
                visit scheduling. Already registered? Sign in and pick up where you left off.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate("/register?role=seller")}>
                  <UserPlus className="size-4" aria-hidden="true" />
                  Register as a property owner
                </Button>
                <Button variant="outline" onClick={() => navigate("/login?next=/list-property")}>
                  <LogIn className="size-4" aria-hidden="true" />
                  Sign in to list
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {GUEST_BENEFITS.map((b) => (
                <div key={b.title} className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
                  <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <b.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Seller: starter panel with live stats */}
        {user?.role === "SELLER" && (
          <motion.div {...fadeUp} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Your listing workspace
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
                  Ready when you are, {user.name.split(" ")[0]}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Create your next listing from the dashboard, or review how your current ones are
                  performing.
                </p>
              </div>
              <Button size="lg" onClick={() => navigate("/dashboard?tab=listings")}>
                Go to dashboard — Add property
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statsState.status === "idle" ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              ) : statsState.stats ? (
                <>
                  <StatCard label="Total listings" value={statsState.stats.totalProperties} />
                  <StatCard
                    label="Published"
                    value={statsState.stats.published}
                    sub="Live on the marketplace"
                  />
                  <StatCard
                    label="Pending review"
                    value={statsState.stats.pending}
                    sub="Awaiting verification"
                  />
                  <StatCard label="Enquiries" value={statsState.stats.totalEnquiries} sub="All time" />
                </>
              ) : (
                <p className="col-span-full text-sm text-muted-foreground">
                  Could not load your stats right now. They remain available in your dashboard.
                </p>
              )}
            </div>

            {/* Steps overview */}
            <div className="mt-8 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Builder: use the builder dashboard */}
        {user?.role === "BUILDER" && (
          <motion.div {...fadeUp} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Building2 className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Manage projects &amp; inventory as a builder
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Builder accounts publish entire projects rather than single homes. Head to your
                  builder dashboard to create project pages, add inventory units and track attributed
                  enquiries and site visits.
                </p>
                <Button className="mt-5" onClick={() => navigate("/dashboard?tab=projects")}>
                  Open builder dashboard
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Buyer / Admin: role note */}
        {user && user.role !== "SELLER" && user.role !== "BUILDER" && (
          <motion.div {...fadeUp} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Listing requires an owner or builder account
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              You are signed in with a {user.role === "ADMIN" ? "platform administrator" : "buyer"}{" "}
              account. To list a property for sale, write to our team and we will help you set up the
              right account type.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => navigate("/contact")}>
              Contact our team
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* ============ Steps ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            From listing to closing
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A simple, transparent process — you always know where your listing stands.
          </p>
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              className="rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-display text-3xl font-semibold text-border" aria-hidden="true">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
          Listings are reviewed before going live. For under-construction projects, listings must
          comply with RERA disclosure requirements, and buyers are advised to verify RERA
          registration independently.
        </p>
      </section>

      {/* ============ FAQ ============ */}
      <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Frequently asked questions
          </h2>
        </motion.div>
        <motion.div {...fadeUp} className="mt-6 rounded-xl border bg-card px-6 shadow-sm">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-[15px] font-medium text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </section>
    </div>
  );
}
