"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Send } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { BUDGET_OPTIONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  propertyId: string;
  propertyTitle: string;
}

export function EnquiryForm({ propertyId, propertyTitle }: Props) {
  const user = useAppStore((s) => s.user);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null); // lead reference

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || user.email);
      setPhone((p) => p || (user.phone ?? ""));
    }
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in your name and phone number.");
      return;
    }
    if (!/^[+\d][\d\s-]{7,14}$/.test(phone.trim())) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (!consent) {
      toast.error("Please allow us to contact you about this enquiry.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ reference: string; duplicate?: boolean }>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          propertyId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          budget: budget ? Number(budget) : undefined,
          message: message.trim() || undefined,
          consent: true,
        }),
      });
      setDone(res.reference);
      if (res.duplicate) {
        toast.info("We already have your enquiry", {
          description: `Your reference is ${res.reference}. Our team will reach out shortly.`,
        });
      } else {
        toast.success("Enquiry sent successfully", {
          description: `Your reference is ${res.reference}.`,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden="true" />
        <h3 className="mt-3 font-display text-lg font-semibold text-emerald-900">Thank you — enquiry received</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
          Your reference number is <span className="font-semibold">{done}</span>. The property
          representative and our team will contact you shortly.
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          Enquiry for: <span className="line-clamp-1">{propertyTitle}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" aria-label="Property enquiry form">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="eq-name">Full name *</Label>
          <Input id="eq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eq-phone">Phone *</Label>
          <Input id="eq-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" required autoComplete="tel" inputMode="tel" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="eq-email">Email</Label>
          <Input id="eq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.in" autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label>Budget</Label>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="eq-msg">Message</Label>
        <Textarea
          id="eq-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I'm interested in this property. Please share more details…"
          rows={3}
          maxLength={1000}
        />
      </div>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" aria-label="Consent to be contacted" />
        I agree to be contacted by Vasati and the property representative regarding this enquiry.
      </label>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Skeleton className="size-4 rounded-full bg-primary-foreground/30" />
            Sending…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            Send enquiry
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Your details are only shared with the verified property representative.
      </p>
    </form>
  );
}
