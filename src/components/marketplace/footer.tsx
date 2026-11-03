"use client";

import { useAppStore } from "@/store/use-app-store";
import { Logo } from "./shared/logo";
import { BRAND, PROPERTY_TYPES } from "@/lib/constants";
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const navigate = useAppStore((s) => s.navigate);

  const explore = [
    { label: "Properties for Sale", href: "/properties" },
    { label: "Builder Projects", href: "/projects" },
    ...PROPERTY_TYPES.slice(0, 3).map((t) => ({
      label: `${t}s`,
      href: `/properties?type=${encodeURIComponent(t)}`,
    })),
  ];

  const partners = [
    { label: "List Your Property", href: "/list-property" },
    { label: "Builder Partnership", href: "/partner" },
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
  ];

  return (
    <footer className="mt-auto border-t bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="[&_span:last-child]:text-background">
              <Logo />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/70">
              A curated marketplace for Indian residential real estate — connecting genuine buyers
              with verified property owners and trusted developers.
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { icon: Facebook, label: "Facebook" },
                { icon: Instagram, label: "Instagram" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Twitter, label: "Twitter" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={`${BRAND.name} on ${label}`}
                  onClick={(e) => e.preventDefault()}
                  className="grid size-9 place-items-center rounded-full border border-background/20 text-background/70 transition-colors hover:border-background/50 hover:text-background"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <nav aria-label="Explore">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-background/50">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {explore.map((l) => (
                <li key={l.href + l.label}>
                  <a
                    href={`#${l.href}`}
                    className="text-sm text-background/75 transition-colors hover:text-background"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(l.href);
                    }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Partners */}
          <nav aria-label="Partners">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-background/50">Partners</h3>
            <ul className="mt-4 space-y-2.5">
              {partners.map((l) => (
                <li key={l.href}>
                  <a
                    href={`#${l.href}`}
                    className="text-sm text-background/75 transition-colors hover:text-background"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(l.href);
                    }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-background/50">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-background/75">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-background">
                  {BRAND.supportEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a href={`tel:${BRAND.supportPhone.replace(/\s/g, "")}`} className="hover:text-background">
                  {BRAND.supportPhone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Vasati Realty Pvt. Ltd.
                  <br />
                  Bengaluru, Karnataka 560001
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-background/15 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-background/55 sm:flex-row">
            <p>© {new Date().getFullYear()} Vasati Realty Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a
                href="#/privacy"
                className="hover:text-background"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/privacy");
                }}
              >
                Privacy Policy
              </a>
              <a
                href="#/terms"
                className="hover:text-background"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/terms");
                }}
              >
                Terms &amp; Conditions
              </a>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-background/40 sm:text-left">
            Vasati is a real estate marketplace platform. Properties are listed by owners and
            builders; buyers are advised to independently verify property documents, title and
            applicable RERA registration details before making any purchase decision.
          </p>
        </div>
      </div>
    </footer>
  );
}
