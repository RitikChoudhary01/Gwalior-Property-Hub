"use client";

// ============================================================
// ContactView — contact information cards alongside a
// validated enquiry form that posts to /api/contact.
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api-client";
import { BRAND } from "@/lib/constants";

const SUBJECTS = [
  { value: "buying", label: "Buying a property" },
  { value: "selling", label: "Selling a property" },
  { value: "builder", label: "Builder partnership" },
  { value: "other", label: "Other" },
];

const INFO_CARDS = [
  {
    icon: Mail,
    label: "Email us",
    lines: [BRAND.supportEmail],
    href: `mailto:${BRAND.supportEmail}`,
  },
  {
    icon: Phone,
    label: "Call us",
    lines: [BRAND.supportPhone],
    href: `tel:${BRAND.supportPhone.replace(/\s+/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Office",
    lines: ["Bengaluru", "Karnataka, India"],
  },
  {
    icon: Clock,
    label: "Working hours",
    lines: ["Mon–Sat", "9:30 AM – 6:30 PM IST"],
  },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", phone: "", subject: "", message: "" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s-]{7,14}$/;

export function ContactView() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setApiError(null);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!form.email.trim()) next.email = "Please enter your email address.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim()))
      next.phone = "Please enter a valid phone number.";
    if (!form.subject) next.subject = "Please choose a subject.";
    if (!form.message.trim()) next.message = "Please write your message.";
    else if (form.message.trim().length < 10) next.message = "Please provide a few more details (at least 10 characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setApiError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          subject: SUBJECTS.find((s) => s.value === form.subject)?.label ?? "Other",
          message: form.message.trim(),
        }),
      });
      setForm(EMPTY_FORM);
      toast.success("Message sent", {
        description: "Thank you for reaching out. We will reply within one working day.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again in a moment.";
      setApiError(message);
      toast.error("Could not send message", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 pb-16 sm:px-6 sm:py-16 lg:px-8">
      {/* Page header */}
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contact</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Talk to the Gwalior Property Hub team
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Questions about a listing, selling your home or partnering as a builder? Send us a message
          and we will get back to you.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
        {/* ---- Left: contact info ---- */}
        <div className="space-y-4 lg:col-span-2">
          {INFO_CARDS.map((card) => (
            <div key={card.label} className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <card.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                {card.lines.map((line, i) =>
                  card.href && i === 0 ? (
                    <a
                      key={line}
                      href={card.href}
                      className="block text-[15px] font-medium text-foreground hover:text-primary"
                    >
                      {line}
                    </a>
                  ) : (
                    <p key={line} className="text-[15px] leading-relaxed text-foreground">
                      {line}
                    </p>
                  )
                )}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-foreground">Response time</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              We typically reply to messages within one working day. Enquiries sent on Sunday or
              after working hours are answered the next working morning.
            </p>
          </div>
        </div>

        {/* ---- Right: form ---- */}
        <div className="lg:col-span-3">
          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-xl border bg-card p-6 shadow-sm sm:p-8"
            aria-label="Contact form"
          >
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Send us a message
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All fields marked with an asterisk are required.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name *</Label>
                <Input
                  id="contact-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your full name"
                  aria-invalid={!!errors.name}
                  autoComplete="name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email">Email *</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  aria-invalid={!!errors.phone}
                  autoComplete="tel"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject *</Label>
                <Select value={form.subject} onValueChange={(v) => set("subject", v)}>
                  <SelectTrigger id="contact-subject" className="w-full" aria-invalid={!!errors.subject}>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contact-message">Message *</Label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Tell us how we can help…"
                  rows={6}
                  aria-invalid={!!errors.message}
                />
                {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
              </div>
            </div>

            {apiError && (
              <Alert variant="destructive" className="mt-5">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                By sending this message you consent to Gwalior Property Hub contacting you about your enquiry.
              </p>
              <Button type="submit" size="lg" disabled={submitting} className="shrink-0">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden="true" />
                    Send message
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
