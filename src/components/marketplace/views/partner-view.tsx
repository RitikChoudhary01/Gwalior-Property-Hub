"use client";

// ============================================================
// PartnerView — builder partnership programme: value props,
// how the partnership works, and a role-aware CTA.
// ============================================================

import { motion } from "framer-motion";
import {
  ArrowRight,
  UserCheck,
  PenLine,
  Building2,
  Inbox,
  Handshake,
  Crosshair,
  CalendarCheck,
  LayoutDashboard,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const VALUE_PROPS = [
  {
    icon: Crosshair,
    title: "Qualified leads with unique references",
    text: "Every enquiry and site-visit request arrives with a unique reference, so you always know which Vasati buyer you are talking to and can reconcile commissions without guesswork.",
  },
  {
    icon: CalendarCheck,
    title: "Site-visit coordination",
    text: "Buyers request visits directly from your project pages with preferred dates and slots. Confirm or reschedule in a couple of clicks, and keep the full history in one place.",
  },
  {
    icon: LayoutDashboard,
    title: "Inventory & project pages",
    text: "Dedicated pages for each project — photographs, amenities, pricing ranges, possession timelines and unit-level inventory — kept current from your builder dashboard.",
  },
  {
    icon: FileText,
    title: "Transparent commission agreements",
    text: "A signed agreement defines your commission upfront — a percentage of sale value or a fixed fee, whichever you prefer. No hidden charges, no retroactive surprises.",
  },
];

const PARTNER_STEPS = [
  {
    icon: UserCheck,
    title: "Register & get verified",
    text: "Create a builder account with your company details. Our team verifies the company and, where applicable, RERA registration.",
  },
  {
    icon: PenLine,
    title: "Sign the commission agreement",
    text: "Agree the commercial terms in writing — percentage or fixed fee — before any obligation exists on either side.",
  },
  {
    icon: Building2,
    title: "Publish your projects",
    text: "Build project pages with inventory, pricing and possession timelines. Each project is reviewed, then goes live.",
  },
  {
    icon: Inbox,
    title: "Receive attributed leads",
    text: "Enquiries and site-visit requests flow in with unique references and full buyer contact details.",
  },
  {
    icon: Handshake,
    title: "Close & reconcile",
    text: "Complete the sale with the buyer. Attributed transactions are reconciled against your signed agreement.",
  },
];

export function PartnerView() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const isBuilder = user?.role === "BUILDER";

  return (
    <div className="pb-16">
      {/* ============ Hero ============ */}
      <section className="bg-accent/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Vasati Partner Network
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Grow Sales with the Vasati Partner Network
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Publish your projects to a curated audience of serious home buyers, receive attributed
            and reference-tracked enquiries, and work under a commission agreement you have read and
            signed.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {isBuilder ? (
              <Button size="lg" onClick={() => navigate("/dashboard?tab=projects")}>
                Manage projects &amp; inventory
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate("/register?role=builder")}>
                Register as a builder
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => navigate("/contact")}>
              Talk to our team
            </Button>
          </div>
        </div>
      </section>

      {/* ============ Value props ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Why builders partner with Vasati
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Everything a developer needs to market, sell and reconcile — without losing sight of
            which channel brought the buyer.
          </p>
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {VALUE_PROPS.map((prop) => (
            <motion.div
              key={prop.title}
              {...fadeUp}
              className="flex gap-5 rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <prop.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  {prop.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{prop.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ How the partnership works ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            How the partnership works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            From verification to reconciliation, in five clear steps.
          </p>
        </motion.div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {PARTNER_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              className="relative rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-display text-3xl font-semibold text-border" aria-hidden="true">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp} className="mt-8 flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Partnership terms are governed by a written agreement signed between Vasati and your
            company. The agreement specifies whether commission is a percentage of the sale value or
            a fixed fee, and it applies only to transactions attributed to the platform. Listing is
            free during early access.
          </p>
        </motion.div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div
          {...fadeUp}
          className="flex flex-col items-start gap-6 rounded-2xl bg-foreground p-6 text-background sm:p-10 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {isBuilder ? "Continue on your builder dashboard" : "Start the partnership today"}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-background/75 sm:text-[15px]">
              {isBuilder
                ? "Your projects, inventory, enquiries and site visits are all waiting in one place."
                : "Create a builder account, complete verification and publish your first project. Our team will guide you through the commission agreement."}
            </p>
          </div>
          {isBuilder ? (
            <Button
              size="lg"
              className="shrink-0 bg-background text-foreground hover:bg-background/90"
              onClick={() => navigate("/dashboard?tab=projects")}
            >
              Open dashboard
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="shrink-0 bg-background text-foreground hover:bg-background/90"
              onClick={() => navigate("/register?role=builder")}
            >
              Register as a builder
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </motion.div>
      </section>
    </div>
  );
}
