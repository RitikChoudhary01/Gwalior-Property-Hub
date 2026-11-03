"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { VISIT_TIME_SLOTS } from "@/lib/constants";
import type { PropertyCardDTO } from "@/lib/types";

export function VisitDialog({
  property,
  children,
}: {
  property: Pick<PropertyCardDTO, "id" | "title" | "city">;
  children?: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const loadNotifications = useAppStore((s) => s.loadNotifications);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openDialog() {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
    }
    setOpen(true);
  }

  const today = new Date().toISOString().split("T")[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !date || !time) {
      toast.error("Please fill in your name, phone, preferred date and time.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ id: string }>("/api/site-visits", {
        method: "POST",
        body: JSON.stringify({
          propertyId: property.id,
          contactName: name.trim(),
          contactPhone: phone.trim(),
          preferredDate: date,
          preferredTime: time,
          notes: notes.trim() || undefined,
        }),
      });
      toast.success("Visit requested", {
        description: `We will confirm your visit to ${property.locality ?? property.city} shortly.`,
      });
      setOpen(false);
      setDate("");
      setTime("");
      setNotes("");
      if (user) loadNotifications();
      void res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request a visit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openDialog();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            openDialog();
          }
        }}
      >
        {children ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarCheck className="size-4" aria-hidden="true" />
            Schedule a visit
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Schedule a site visit</DialogTitle>
            <DialogDescription className="line-clamp-1">
              {property.title} · {property.city}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="visit-name">Full name *</Label>
                <Input id="visit-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visit-phone">Phone *</Label>
                <Input id="visit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" inputMode="tel" placeholder="+91 98xxx xxxxx" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="visit-date">Preferred date *</Label>
                <Input id="visit-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred time *</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visit-notes">Notes</Label>
              <Textarea id="visit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the representative should know…" maxLength={500} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Requesting…" : "Request visit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
