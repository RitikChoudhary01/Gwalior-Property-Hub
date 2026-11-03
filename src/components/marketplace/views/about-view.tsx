"use client";

// ============================================================
// AboutView — honest, professional company page: mission,
// values, how the platform serves each audience, and CTA.
// ============================================================

import { motion } from "framer-motion";
import { ShieldCheck, Heart, ReceiptText, Search, PlusCircle, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Trust & verification",
    text: "Every listing is reviewed by our team before it goes live. Verified owners and RERA-registered builders carry clear badges, so you always know who you are dealing with.",
  },
  {
    icon: Heart,
    title: "Buyer-first experience",
    text: "Clean search, honest information and direct enquiries — no clickbait listings, no buried contact details. The home hunt should feel calm, not chaotic.",
  },
  {
    icon: ReceiptText,
    title: "Transparent business",
    text: "We earn an agreed commission only on successful platform-attributed transactions. No hidden charges, no surprise fees — for buyers or sellers.",
  },
];

const AUDIENCES = [
  {
    icon: Search,
    title: "For Buyers",
    points: [
      "Search verified residential listings with precise filters for city, budget and configuration.",
      "Save favourites, enquire directly and schedule site visits from any listing.",
      "See seller verification status and RERA details before you commit your time.",
    ],
  },
  {
    icon: PlusCircle,
    title: "For Property Owners",
    points: [
      "Create a listing with photos, specifications and pricing at your own pace.",
      "Get reviewed and published to a curated audience of genuine buyers.",
      "Receive enquiries and visit requests with full contact details, in one dashboard.",
    ],
  },
  {
    icon: Building2,
    title: "For Builders & Developers",
    points: [
      "Publish dedicated project pages with inventory, pricing and possession timelines.",
      "Receive attributed, reference-tracked leads instead of anonymous walk-ins.",
      "Work under a transparent, signed commission agreement.",
    ],
  },
];

export function AboutView() {
  const navigate = useAppStore((s) => s.navigate);

  return (
    <div className="pb-16">
      {/* Page hero */}
      <section className="bg-accent/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">About Vasati</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            A calmer, more honest way to find and sell homes.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Vasati is a curated real-estate marketplace for residential India — built around verified
            listings, respectful conversations and a business model we are happy to explain in one
            sentence.
          </p>
        </div>
      </section>

      {/* Our mission */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <motion.div {...fadeUp} className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Our mission</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Curated, verified, transparent.
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              Buying or selling a home is one of the largest decisions a family makes, yet the
              process is too often exhausting and opaque. Vasati exists to change that. We operate a
              curated marketplace: listings are reviewed before publication, owners and builders are
              verified, and buyers get the information they need up front.
            </p>
            <p>
              We are selective rather than voluminous. A smaller set of genuine, well-presented
              listings serves everyone better than an endless wall of duplicates. And because our
              revenue comes from agreed commissions on successful, platform-attributed transactions,
              our incentives point the same way as yours — towards completed, satisfied deals.
            </p>
          </div>
        </motion.div>
      </section>

      {/* What we stand for */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            What we stand for
          </h2>
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <motion.div
              key={v.title}
              {...fadeUp}
              className="rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                <v.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How Vasati works — per audience */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            How Vasati works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            One platform, three audiences — each with a clear, guided path.
          </p>
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <motion.div
              key={a.title}
              {...fadeUp}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <a.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{a.title}</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {a.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mt-16 w-full bg-foreground text-background sm:mt-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              See the difference for yourself
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-background/75 sm:text-[15px]">
              Browse verified listings, or create an account and let Vasati work for you — whether
              you are buying, selling or building.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate("/properties")}
              className="bg-background text-foreground hover:bg-background/90"
            >
              Browse properties
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
              onClick={() => navigate("/register")}
            >
              Create an account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
