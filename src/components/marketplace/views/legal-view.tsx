"use client";

// ============================================================
// LegalView — shared layout for the Privacy Policy and Terms
// of Service documents. Honest, professional language only.
// ============================================================

import { ShieldCheck, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import { BRAND } from "@/lib/constants";

const LAST_UPDATED = "1 January 2026";

interface LegalSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "Information we collect",
    body: [
      "When you browse Gwalior Property Hub, we collect basic technical information such as pages viewed and device type, which helps us keep the platform stable and secure.",
      "When you create an account, submit a listing, send an enquiry or schedule a site visit, we collect the information you provide: your name, email address, phone number, city, and the content of your listings and messages.",
    ],
    bullets: [
      "Account details: name, email, phone, city and role.",
      "Listing content: photographs, specifications, pricing and RERA numbers you submit.",
      "Enquiry and visit records: messages, contact preferences and scheduling details.",
      "Technical data: session cookies required for sign-in and basic usage analytics.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "We use your information to operate the marketplace: to publish and display listings, deliver enquiries and site-visit requests to the right owner or builder, provide dashboard analytics and send service notifications such as visit confirmations.",
      "We do not sell your personal data. We do not use your enquiry history to send unrelated marketing.",
    ],
  },
  {
    heading: "Sharing with property representatives",
    body: [
      "When you enquire about a property or request a site visit, your name, phone number and message are shared with the listing owner or builder so they can respond to you. This is the core purpose of the platform and cannot be avoided if you wish to be contacted.",
      "When a listing owner responds to your enquiry or a transaction is recorded, the corresponding seller-side information is shared with you in return.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "Gwalior Property Hub uses a small number of cookies. A session cookie keeps you signed in. Analytics cookies, where enabled, help us understand aggregate usage. You may block or delete cookies in your browser; the platform will continue to work for browsing, though sign-in sessions will not persist.",
    ],
  },
  {
    heading: "Data security",
    body: [
      "We store your data on secured infrastructure, restrict access to team members who need it to operate the platform, and use encrypted connections for all traffic. No system is perfectly secure, and we cannot guarantee absolute security, but we take reasonable and ongoing measures to protect your information.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You may access and correct your profile information from your dashboard at any time. You may request deletion of your account and personal data by writing to us; we will remove it except where we are required to retain records (for example, completed transaction records for tax purposes).",
    ],
  },
  {
    heading: "Contact",
    body: [
      `Questions about this policy can be sent to ${BRAND.supportEmail} or raised by phone on ${BRAND.supportPhone} during working hours.`,
    ],
  },
];

const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "The platform",
    body: [
      "Gwalior Property Hub is an online marketplace that connects residential property buyers with property owners and builders. Unless explicitly stated in a signed agreement, Gwalior Property Hub is not a broker, agent or representative of either buyers or sellers, and does not negotiate, execute or register transactions on anyone's behalf.",
      "Owners and builders list properties on the platform; buyers browse listings and send enquiries. Each party remains responsible for its own decisions, representations and agreements.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You are responsible for the accuracy of the information you provide and for keeping your password secure. You must be at least eighteen years old to create an account. We may suspend or deactivate accounts that abuse the platform, misrepresent properties or breach these terms.",
    ],
  },
  {
    heading: "Listing rules",
    body: [
      "Every listing is reviewed before publication. To remain on the platform, listings must be genuine, accurately described and lawfully offered.",
    ],
    bullets: [
      "No duplicate, bait or non-existent properties.",
      "No misleading photographs, prices or availability claims.",
      "No discriminatory, offensive or unlawful content.",
      "The lister must be the owner or an authorised representative.",
    ],
  },
  {
    heading: "RERA compliance",
    body: [
      "Listings on Gwalior Property Hub must comply with the Real Estate (Regulation and Development) Act, 2016 and applicable state rules, including disclosure requirements for projects. Where a RERA registration number is shown, it is provided by the lister.",
      "Buyers are strongly encouraged to independently verify RERA registration and project details on the official RERA portal for the relevant state before making any decision or payment.",
    ],
  },
  {
    heading: "Enquiries and consent",
    body: [
      "When you send an enquiry or schedule a site visit, you consent to your contact details being shared with the listing owner or builder for the purpose of that enquiry. Misuse of another party's contact details — spam, harassment or scraping — is prohibited.",
    ],
  },
  {
    heading: "Commissions and business model",
    body: [
      "Gwalior Property Hub earns an agreed commission on successful transactions attributed to the platform. The applicable commission — a percentage of the sale value or a fixed fee — is defined in a written agreement signed with each owner or builder before any obligation arises.",
      "Listing on Gwalior Property Hub is free during early access. Buyers are never charged a fee by Gwalior Property Hub for browsing, enquiring or visiting properties.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "Gwalior Property Hub provides the platform on an as-is basis and, to the maximum extent permitted by law, is not liable for losses arising from listings, negotiations, agreements or transactions between users, or from inaccuracies supplied by listers. We do not warrant that the platform will be uninterrupted or error-free.",
    ],
  },
  {
    heading: "Termination",
    body: [
      "You may stop using Gwalior Property Hub and request account deletion at any time. We may suspend or terminate accounts or remove listings that violate these terms, with notice where practical.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of India. Courts in Bengaluru, Karnataka shall have exclusive jurisdiction over disputes arising from your use of the platform.",
    ],
  },
  {
    heading: "Contact",
    body: [
      `For any questions about these terms, write to ${BRAND.supportEmail} or call ${BRAND.supportPhone}.`,
    ],
  },
];

export function LegalView({ kind }: { kind: "privacy" | "terms" }) {
  const navigate = useAppStore((s) => s.navigate);
  const isPrivacy = kind === "privacy";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="pb-16">
      {/* Header */}
      <section className="bg-accent/60">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
              {isPrivacy ? (
                <ShieldCheck className="size-5" aria-hidden="true" />
              ) : (
                <FileText className="size-5" aria-hidden="true" />
              )}
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Legal</p>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {isPrivacy ? "Privacy Policy" : "Terms of Service"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Document */}
      <article className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-12 lg:px-8">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {isPrivacy
            ? "This policy explains what information Gwalior Property Hub collects, how we use it, and the choices you have. It applies to the Gwalior Property Hub website and marketplace."
            : "These terms govern your use of the Gwalior Property Hub marketplace. By creating an account or using the platform, you agree to them."}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section, i) => (
            <section key={section.heading} aria-labelledby={`legal-${kind}-${i}`}>
              <h2
                id={`legal-${kind}-${i}`}
                className="font-display text-xl font-semibold tracking-tight text-foreground"
              >
                {i + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((para) => (
                  <p key={para.slice(0, 40)} className="text-[15px] leading-relaxed text-muted-foreground">
                    {para}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-2 space-y-2">
                    {section.bullets.map((b) => (
                      <li key={b} className="flex gap-2.5 text-[15px] leading-relaxed text-muted-foreground">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Cross-links + CTA */}
        <div className="mt-12 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Related documents
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isPrivacy
              ? "Our Terms of Service describe the rules for using the marketplace."
              : "Our Privacy Policy explains how we handle your information."}{" "}
            <a
              href={isPrivacy ? "#/terms" : "#/privacy"}
              className="font-medium text-primary hover:text-primary/80"
            >
              {isPrivacy ? "Read the Terms of Service" : "Read the Privacy Policy"}
            </a>
          </p>
          <Button variant="outline" className="mt-5" onClick={() => navigate("/contact")}>
            Contact us about this document
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </article>
    </div>
  );
}
