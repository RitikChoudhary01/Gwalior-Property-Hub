"use client";

// ============================================================
// Dashboard shell — the signed-in user's role decides which
// dashboard renders. Each role dashboard manages its own tabs,
// and the APIs behind every tab enforce the same role scoping
// server-side, so manually entering another dashboard's tab URL
// neither renders foreign UI nor returns foreign data.
// ============================================================

import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { BuyerDashboard } from "./buyer-dashboard";
import { SellerDashboard } from "./seller-dashboard";
import { BuilderDashboard } from "./builder-dashboard";
import { TeamDashboard } from "./team-dashboard";
import { AdminDashboard } from "./admin-dashboard";
import { EmptyState } from "../../shared/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LockKeyhole } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

export function DashboardView() {
  const user = useAppStore((s) => s.user);
  const authLoaded = useAppStore((s) => s.authLoaded);
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);

  useEffect(() => {
    if (authLoaded && !user) {
      toast.info("Please sign in to access your dashboard.");
      navigate("/login?next=/dashboard");
    }
  }, [authLoaded, user, navigate]);

  if (!authLoaded || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-8 h-96 rounded-xl" />
      </div>
    );
  }

  const initialTab = route.query.get("tab") ?? undefined;

  switch (user.role) {
    case "BUYER":
      return <BuyerDashboard initialTab={initialTab} />;
    case "SELLER":
      return <SellerDashboard initialTab={initialTab} />;
    case "BUILDER":
      return <BuilderDashboard initialTab={initialTab} />;
    case "TEAM":
      return <TeamDashboard initialTab={initialTab} />;
    case "ADMIN":
      return <AdminDashboard initialTab={initialTab} />;
    default:
      return (
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <EmptyState
            icon={<LockKeyhole className="size-6" aria-hidden="true" />}
            title={`No dashboard for ${ROLE_LABELS[user.role] ?? user.role}`}
            description="This account type does not have a dedicated dashboard."
            action={<Button onClick={() => navigate("/")}>Back to home</Button>}
          />
        </div>
      );
  }
}
