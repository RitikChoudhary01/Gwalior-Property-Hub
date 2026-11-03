"use client";

// ============================================================
// Vasati marketplace shell — hash-routed SPA on the single
// user-visible "/" route. Each view mirrors a classic page.
// ============================================================

import { useEffect } from "react";
import { useAppStore } from "@/store/use-app-store";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { HomeView } from "./views/home-view";
import { PropertiesView } from "./views/properties-view";
import { PropertyDetailView } from "./views/property-detail-view";
import { ProjectsView } from "./views/projects-view";
import { ProjectDetailView } from "./views/project-detail-view";
import { AboutView } from "./views/about-view";
import { ContactView } from "./views/contact-view";
import { LegalView } from "./views/legal-view";
import { LoginView } from "./views/login-view";
import { RegisterView } from "./views/register-view";
import { TeamActivateView } from "./views/team-activate-view";
import { ListPropertyView } from "./views/list-property-view";
import { PartnerView } from "./views/partner-view";
import { DashboardView } from "./views/dashboard/dashboard-view";
import { EmptyState } from "./shared/section";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

function NotFoundView() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <EmptyState
        icon={<Compass className="size-6" aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button onClick={() => navigate("/")}>Back to home</Button>
        }
        className="border-solid shadow-sm"
      />
    </div>
  );
}

function RouteView() {
  const route = useAppStore((s) => s.route);
  const authLoaded = useAppStore((s) => s.authLoaded);
  const [head, param] = route.segments;

  // wait for auth before rendering dashboard-guarded views
  if (!authLoaded && head === "dashboard") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  switch (head) {
    case undefined:
      return <HomeView />;
    case "properties":
      return param ? <PropertyDetailView slugOrId={param} /> : <PropertiesView />;
    case "projects":
      return param ? <ProjectDetailView slugOrId={param} /> : <ProjectsView />;
    case "about":
      return <AboutView />;
    case "contact":
      return <ContactView />;
    case "privacy":
      return <LegalView kind="privacy" />;
    case "terms":
      return <LegalView kind="terms" />;
    case "login":
      return <LoginView />;
    case "register":
      return <RegisterView />;
    case "team-activate":
      return <TeamActivateView />;
    case "list-property":
      return <ListPropertyView />;
    case "partner":
      return <PartnerView />;
    case "dashboard":
      return <DashboardView />;
    default:
      return <NotFoundView />;
  }
}

export function MarketplaceApp() {
  const initRoute = useAppStore((s) => s.initRoute);
  const loadUser = useAppStore((s) => s.loadUser);

  useEffect(() => {
    // Route init runs immediately so the hashchange listener is attached
    // before any early navigation. The auth restore is deferred until the
    // hydration window closes — its state update landing mid-hydration can
    // shift Radix useIds in boundaries that are still hydrating.
    initRoute();
    const t = setTimeout(() => void loadUser(), 50);
    return () => clearTimeout(t);
  }, [initRoute, loadUser]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main id="main" className="flex-1">
        <RouteView />
      </main>
      <Footer />
    </div>
  );
}
