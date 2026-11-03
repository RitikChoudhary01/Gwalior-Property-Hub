"use client";

// ============================================================
// BuilderDashboard — company command centre for builder /
// developer accounts: projects, unit inventory, enquiries,
// site visits and the read-only company profile.
// ============================================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  DoorOpen,
  Eye,
  Home,
  Inbox,
  Info,
  LayoutDashboard,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { cn } from "@/lib/utils";
import {
  AMENITIES,
  BRAND,
  CITIES,
  CONSTRUCTION_STATUSES,
  FURNISHINGS,
  POSSESSION_PERIODS,
  PROJECT_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/constants";
import {
  formatDate,
  formatMonthYear,
  formatNumber,
  formatPrice,
  formatPriceFull,
  formatPriceRange,
  formatConfig,
} from "@/lib/format";
import type {
  BuilderStats,
  LeadDTO,
  Paginated,
  ProjectCardDTO,
  ProjectDetailDTO,
  PropertyCardDTO,
  PropertyDetailDTO,
} from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, StatCard } from "../../shared/section";
import { StatusBadge, VerifiedBadge } from "../../shared/status-badge";
import { ImageUploader, ProjectForm, type UploadImage } from "./project-form";
import {
  AdminCard,
  ImgThumb,
  LoadError,
  TablePager,
  TableSkeleton,
  TabIntro,
  VisitsBoard,
  runAction,
  useApiData,
  useDashboardTab,
} from "./admin/parts-shared";
import { CommissionsTab } from "./commissions-tab";

const BUILDER_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: Building2 },
  { id: "inventory", label: "Inventory", icon: Home },
  { id: "enquiries", label: "Enquiries", icon: Inbox },
  { id: "visits", label: "Site visits", icon: CalendarDays },
  { id: "commissions", label: "Commissions", icon: Wallet },
  { id: "profile", label: "Company profile", icon: User },
] as const;

const BUILDER_TAB_IDS = BUILDER_TABS.map((t) => t.id);

// ============================================================
// Shell
// ============================================================

export function BuilderDashboard({ initialTab }: { initialTab?: string }) {
  const user = useAppStore((s) => s.user);
  const [tab, selectTab] = useDashboardTab(BUILDER_TAB_IDS, initialTab);

  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [formProject, setFormProject] = useState<ProjectDetailDTO | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  async function openEditProject(project: ProjectCardDTO) {
    setFormLoading(true);
    try {
      const detail = await api<ProjectDetailDTO>(`/api/projects/${project.id}`);
      setFormProject(detail);
      setProjectFormOpen(true);
    } catch {
      toast.error("Could not load the project for editing.");
    } finally {
      setFormLoading(false);
    }
  }

  function openCreateProject() {
    setFormProject(null);
    setProjectFormOpen(true);
  }

  function createFromOverview() {
    selectTab("projects");
    openCreateProject();
  }

  const company = user?.builderProfile?.companyName ?? user?.name ?? "Builder dashboard";
  const verified = user?.builderProfile?.isVerified ?? false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Builder dashboard
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {company}
            </h1>
            <VerifiedBadge verified={verified} label="RERA Verified" />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {user?.name} · Member since {formatMonthYear(user?.createdAt)}
          </p>
        </div>
        <Button onClick={openCreateProject} disabled={formLoading}>
          <Plus className="size-4" aria-hidden="true" />
          Create project
        </Button>
      </header>

      <div className="mt-6 lg:flex lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav
            aria-label="Dashboard sections"
            className="sticky top-24 space-y-1 rounded-xl border bg-card p-2 shadow-sm"
          >
            {BUILDER_TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <t.icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile tab bar */}
          <div className="mb-6 flex gap-2 overflow-x-auto vasati-scroll pb-1 lg:hidden">
            {BUILDER_TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <t.icon className="size-4" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "overview" ? <BuilderOverviewTab onCreateProject={createFromOverview} /> : null}
          {tab === "projects" ? (
            <BuilderProjectsTab
              refreshKey={savedTick}
              onEdit={openEditProject}
              onCreate={openCreateProject}
              editLoading={formLoading}
            />
          ) : null}
          {tab === "inventory" ? <BuilderInventoryTab /> : null}
          {tab === "enquiries" ? <BuilderEnquiriesTab /> : null}
          {tab === "visits" ? (
            <VisitsBoard
              title="Site visits"
              description="Confirm, reschedule and complete property visits booked by buyers."
            />
          ) : null}
          {tab === "commissions" ? <CommissionsTab partyLabel="Builder" /> : null}
          {tab === "profile" ? <BuilderProfileTab /> : null}
        </div>
      </div>

      {projectFormOpen ? (
        <ProjectForm
          project={formProject}
          onSaved={() => setSavedTick((t) => t + 1)}
          onClose={() => {
            setProjectFormOpen(false);
            setFormProject(null);
          }}
        />
      ) : null}
    </div>
  );
}

// ============================================================
// Overview
// ============================================================

function BuilderOverviewTab({ onCreateProject }: { onCreateProject: () => void }) {
  const { data, loading, error, refetch } = useApiData<BuilderStats>(() => api("/api/stats"), []);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <AdminCard>
        <LoadError message={error ?? "Stats are unavailable."} onRetry={refetch} />
      </AdminCard>
    );
  }

  const unitsPct = data.totalUnits > 0 ? Math.round((data.availableUnits / data.totalUnits) * 100) : 0;

  return (
    <div>
      <TabIntro
        eyebrow="Overview"
        title="How your portfolio is doing"
        description="A snapshot of your projects, inventory and buyer interest."
        actions={
          <>
            <Button variant="outline" onClick={refetch}>
              Refresh
            </Button>
            <Button onClick={onCreateProject}>
              <Plus className="size-4" aria-hidden="true" />
              Create project
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={formatNumber(data.totalProjects)}
          sub={`${formatNumber(data.publishedProjects)} published`}
          icon={<Building2 className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Published projects"
          value={formatNumber(data.publishedProjects)}
          sub="Live on the marketplace"
          icon={<BadgeCheck className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Units listed"
          value={formatNumber(data.totalUnits)}
          sub="Across all projects"
          icon={<Home className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Units available"
          value={formatNumber(data.availableUnits)}
          sub={`${unitsPct}% of inventory unsold`}
          icon={<DoorOpen className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Total views"
          value={formatNumber(data.totalViews)}
          sub="Across your listings"
          icon={<Eye className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Enquiries"
          value={formatNumber(data.totalEnquiries)}
          sub="Buyer enquiries received"
          icon={<Inbox className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label="Upcoming visits"
          value={formatNumber(data.upcomingVisits)}
          sub="Scheduled site visits"
          icon={<CalendarDays className="size-5" aria-hidden="true" />}
        />
        <div className="flex flex-col justify-between rounded-xl border border-dashed bg-card/60 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Grow your portfolio
          </p>
          <Button className="mt-3 w-full" onClick={onCreateProject}>
            <Plus className="size-4" aria-hidden="true" />
            Create project
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Projects
// ============================================================

function BuilderProjectsTab({
  refreshKey,
  onEdit,
  onCreate,
  editLoading,
}: {
  refreshKey: number;
  onEdit: (project: ProjectCardDTO) => void;
  onCreate: () => void;
  editLoading: boolean;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const { data, loading, error, refetch } = useApiData<Paginated<ProjectCardDTO>>(
    () => api("/api/projects?scope=mine&pageSize=24"),
    [refreshKey]
  );
  const [deleting, setDeleting] = useState<ProjectCardDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    await runAction(
      () => api(`/api/projects/${deleting.id}`, { method: "DELETE" }),
      "Project deleted",
      { description: deleting.name, onDone: refetch }
    );
    setDeleteBusy(false);
    setDeleting(null);
  }

  const projects = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Projects"
        title="Your projects"
        description="Create, edit and track every project you are developing."
        actions={
          <Button onClick={onCreate} disabled={editLoading}>
            {editLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Create project
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <AdminCard>
          <LoadError message={error} onRetry={refetch} />
        </AdminCard>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" aria-hidden="true" />}
          title="No projects yet"
          description="Create your first project to start listing units on the Vasati marketplace."
          action={
            <Button onClick={onCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Create project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[16/10] bg-muted">
                {p.mainImage ? (
                  <img
                    src={p.mainImage}
                    alt={`${p.name} — ${p.locality}`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <Building2 className="size-8" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {p.featured ? (
                    <span className="rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                      Featured
                    </span>
                  ) : null}
                </div>
                <div className="absolute right-3 top-3">
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  {p.name}
                </h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {p.locality}, {p.city}
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {p.configuration ?? p.propertyType} ·{" "}
                  {PROJECT_STATUSES.find((s) => s.value === p.construction)?.label ?? p.construction}
                  {p.possessionDate ? ` · Possession ${p.possessionDate}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-base font-semibold text-foreground">
                    {formatPriceRange(p.priceMin, p.priceMax)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(p.availableUnits)} of {formatNumber(p.totalUnits)} units available
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-3.5">
                  {p.status === "PUBLISHED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/projects/${p.slug}`)}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      View
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => onEdit(p)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => setDeleting(p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.name}" will be permanently removed. Projects that still have units cannot be deleted.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Inventory (units)
// ============================================================

function BuilderInventoryTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApiData<Paginated<PropertyCardDTO>>(
    () => api(`/api/properties?scope=mine&pageSize=48&page=${page}`),
    [page]
  );
  const [unitForm, setUnitForm] = useState<{ open: boolean; propertyId: string | null }>({
    open: false,
    propertyId: null,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setAvailability(property: PropertyCardDTO, availability: string) {
    setBusyId(property.id);
    await runAction(
      () =>
        api(`/api/properties/${property.id}`, {
          method: "PATCH",
          body: JSON.stringify({ availability }),
        }),
      availability === "SOLD" ? "Unit marked as sold" : "Unit marked as available",
      { description: property.title, onDone: refetch }
    );
    setBusyId(null);
  }

  const units = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Inventory"
        title="Unit inventory"
        description="Every unit you have listed, including individual apartments, villas and plots."
        actions={
          <Button onClick={() => setUnitForm({ open: true, propertyId: null })}>
            <Plus className="size-4" aria-hidden="true" />
            Add unit
          </Button>
        }
      />

      <AdminCard bodyClassName="">
        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : units.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Home className="size-6" aria-hidden="true" />}
              title="No units listed yet"
              description="Add your first unit — it will appear under its project on the marketplace."
              action={
                <Button onClick={() => setUnitForm({ open: true, propertyId: null })}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add unit
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ImgThumb src={u.mainImage} alt="" className="size-10 rounded-lg" />
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-medium text-foreground">{u.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {u.locality}, {u.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.projectName ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">{formatPrice(u.price)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.type !== "Plot" && u.bhk ? formatConfig(u.bhk, u.type) : u.type}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.availability} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(u.views)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUnitForm({ open: true, propertyId: u.id })}
                            aria-label={`Edit ${u.title}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                            Edit
                          </Button>
                          {u.availability === "SOLD" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === u.id}
                              onClick={() => setAvailability(u, "AVAILABLE")}
                            >
                              <Check className="size-4" aria-hidden="true" />
                              Mark available
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === u.id}
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => setAvailability(u, "SOLD")}
                            >
                              Mark sold
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="units" />
          </>
        )}
      </AdminCard>

      {unitForm.open ? (
        <UnitForm
          propertyId={unitForm.propertyId}
          onSaved={refetch}
          onClose={() => setUnitForm({ open: false, propertyId: null })}
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------
// UnitForm — compact create / edit unit dialog
// ------------------------------------------------------------

interface UnitFormValues {
  title: string;
  description: string;
  type: string;
  price: string;
  bhk: string;
  bathrooms: string;
  carpetArea: string;
  builtUpArea: string;
  furnishing: string;
  constructionStatus: string;
  possessionDate: string;
  projectId: string;
  city: string;
  locality: string;
  address: string;
}

const EMPTY_UNIT: UnitFormValues = {
  title: "",
  description: "",
  type: "",
  price: "",
  bhk: "",
  bathrooms: "",
  carpetArea: "",
  builtUpArea: "",
  furnishing: "",
  constructionStatus: "",
  possessionDate: "",
  projectId: "NONE",
  city: "",
  locality: "",
  address: "",
};

function UnitForm({
  propertyId,
  onSaved,
  onClose,
}: {
  propertyId: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const editing = !!propertyId;
  const [values, setValues] = useState<UnitFormValues>(EMPTY_UNIT);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { data: projectsData } = useApiData<Paginated<ProjectCardDTO>>(
    () => api("/api/projects?scope=mine&pageSize=50"),
    []
  );
  const projects = projectsData?.data ?? [];

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setDetailError(null);
    api<PropertyDetailDTO>(`/api/properties/${propertyId}`)
      .then((p) => {
        if (cancelled) return;
        setValues({
          title: p.title,
          description: p.description,
          type: p.type,
          price: String(p.price),
          bhk: p.bhk != null ? String(p.bhk) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          carpetArea: p.carpetArea != null ? String(p.carpetArea) : "",
          builtUpArea: p.builtUpArea != null ? String(p.builtUpArea) : "",
          furnishing: p.furnishing ?? "",
          constructionStatus: p.constructionStatus ?? "",
          possessionDate: p.possessionDate ?? "",
          projectId: p.project?.id ?? "NONE",
          city: p.city,
          locality: p.locality,
          address: p.address,
        });
        setAmenities(p.amenities);
        setImages(p.images.map((im) => ({ key: `existing-${im.id}`, url: im.url })));
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err instanceof ApiError ? err.message : "Could not load the unit.");
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const cityData = CITIES.find((c) => c.city === values.city);
  const state = cityData?.state ?? "";
  const uploading = images.some((i) => i.uploading);
  const descLength = values.description.trim().length;

  function set<K extends keyof UnitFormValues>(key: K, value: UnitFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function onProjectChange(projectId: string) {
    set("projectId", projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setValues((prev) => ({
        ...prev,
        city: project.city,
        locality: project.locality,
        address: prev.address || `${project.name}, ${project.locality}`,
      }));
    }
  }

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (values.title.trim().length < 6) e.title = "Title must be at least 6 characters.";
    if (values.description.trim().length < 30)
      e.description = "Description must be at least 30 characters.";
    if (!values.type) e.type = "Select a property type.";
    const price = Number(values.price);
    if (!values.price || !Number.isFinite(price) || price <= 0) e.price = "Enter a valid price.";
    if (!values.city) e.city = "Select a city.";
    if (!values.locality) e.locality = "Select a locality.";
    if (!values.address.trim()) e.address = "Enter the unit address.";
    return e;
  }

  async function submit(draft: boolean) {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (uploading) {
      toast.info("Please wait for the photo uploads to finish.");
      return;
    }

    setBusy(true);
    setApiError(null);
    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      type: values.type,
      price: Number(values.price),
      city: values.city,
      state,
      locality: values.locality,
      address: values.address.trim(),
      bhk: values.bhk ? Number(values.bhk) : undefined,
      bathrooms: values.bathrooms ? Number(values.bathrooms) : undefined,
      carpetArea: values.carpetArea ? Number(values.carpetArea) : undefined,
      builtUpArea: values.builtUpArea ? Number(values.builtUpArea) : undefined,
      furnishing: values.furnishing || undefined,
      constructionStatus: values.constructionStatus || undefined,
      possessionDate: values.possessionDate || undefined,
      projectId: values.projectId !== "NONE" ? values.projectId : undefined,
      amenities,
      images: images
        .filter((i) => !i.uploading && i.url)
        .map((i, idx) => ({ url: i.url, isMain: idx === 0 })),
      draft,
    };

    try {
      await api(editing ? `/api/properties/${propertyId}` : "/api/properties", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(
        editing ? "Unit updated" : draft ? "Draft saved" : "Unit submitted for approval",
        { description: values.title.trim() }
      );
      onSaved();
      onClose();
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="font-display text-xl">
            {editing ? "Edit unit" : "Add a unit"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the unit details. Changes to a published unit go back for review."
              : "List an individual unit under one of your projects."}
          </DialogDescription>
        </DialogHeader>

        {detailError ? (
          <div className="px-6 py-5">
            <Alert variant="destructive">
              <X className="size-4" aria-hidden="true" />
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          </div>
        ) : editing && values.title === "" ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading unit details…
          </div>
        ) : (
          <>
            <div className="vasati-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="grid gap-2">
                <Label htmlFor="unit-project">Project</Label>
                <Select value={values.projectId} onValueChange={onProjectChange}>
                  <SelectTrigger id="unit-project" className="w-full">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Standalone (no project)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.locality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecting a project fills in the city and locality for the unit.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit-title">Title</Label>
                <Input
                  id="unit-title"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. 3 BHK East-facing apartment with balcony views"
                  aria-invalid={!!errors.title}
                />
                {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="unit-description">Description</Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      descLength < 30 ? "text-amber-600" : "text-muted-foreground"
                    )}
                  >
                    {descLength} / 30 characters minimum
                  </span>
                </div>
                <Textarea
                  id="unit-description"
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Layout, floor, view, furnishings, nearby conveniences…"
                  rows={4}
                  aria-invalid={!!errors.description}
                />
                {errors.description ? (
                  <p className="text-xs text-destructive">{errors.description}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="unit-type">Type</Label>
                  <Select value={values.type} onValueChange={(v) => set("type", v)}>
                    <SelectTrigger id="unit-type" className="w-full" aria-invalid={!!errors.type}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type ? <p className="text-xs text-destructive">{errors.type}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-price">Price (₹)</Label>
                  <Input
                    id="unit-price"
                    type="number"
                    min={0}
                    value={values.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="e.g. 12500000"
                    aria-invalid={!!errors.price}
                  />
                  <p className="text-xs text-muted-foreground">
                    {values.price && Number(values.price) > 0
                      ? formatPriceFull(Number(values.price))
                      : "Asking price for this unit"}
                  </p>
                  {errors.price ? <p className="text-xs text-destructive">{errors.price}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="unit-bhk">BHK</Label>
                  <Input
                    id="unit-bhk"
                    type="number"
                    min={0}
                    value={values.bhk}
                    onChange={(e) => set("bhk", e.target.value)}
                    placeholder="3"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-bathrooms">Bathrooms</Label>
                  <Input
                    id="unit-bathrooms"
                    type="number"
                    min={0}
                    value={values.bathrooms}
                    onChange={(e) => set("bathrooms", e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-carpet">Carpet (sq.ft)</Label>
                  <Input
                    id="unit-carpet"
                    type="number"
                    min={0}
                    value={values.carpetArea}
                    onChange={(e) => set("carpetArea", e.target.value)}
                    placeholder="1050"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-builtin">Built-up (sq.ft)</Label>
                  <Input
                    id="unit-builtin"
                    type="number"
                    min={0}
                    value={values.builtUpArea}
                    onChange={(e) => set("builtUpArea", e.target.value)}
                    placeholder="1250"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="unit-furnishing">Furnishing</Label>
                  <Select value={values.furnishing} onValueChange={(v) => set("furnishing", v)}>
                    <SelectTrigger id="unit-furnishing" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {FURNISHINGS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-construction">Construction</Label>
                  <Select
                    value={values.constructionStatus}
                    onValueChange={(v) => set("constructionStatus", v)}
                  >
                    <SelectTrigger id="unit-construction" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTRUCTION_STATUSES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-possession">Possession</Label>
                  <Select value={values.possessionDate} onValueChange={(v) => set("possessionDate", v)}>
                    <SelectTrigger id="unit-possession" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSSESSION_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="unit-city">City</Label>
                  <Select
                    value={values.city}
                    onValueChange={(v) => {
                      setValues((prev) => ({ ...prev, city: v, locality: "" }));
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.city;
                        delete next.locality;
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger id="unit-city" className="w-full" aria-invalid={!!errors.city}>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c.city} value={c.city}>
                          {c.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city ? <p className="text-xs text-destructive">{errors.city}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit-locality">Locality</Label>
                  <Select value={values.locality} onValueChange={(v) => set("locality", v)} disabled={!values.city}>
                    <SelectTrigger id="unit-locality" className="w-full" aria-invalid={!!errors.locality}>
                      <SelectValue placeholder={values.city ? "Select locality" : "Select a city first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(cityData?.localities ?? []).map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.locality ? <p className="text-xs text-destructive">{errors.locality}</p> : null}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit-address">Address</Label>
                <Input
                  id="unit-address"
                  value={values.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Tower, floor, street…"
                  aria-invalid={!!errors.address}
                />
                {errors.address ? <p className="text-xs text-destructive">{errors.address}</p> : null}
              </div>

              <div className="grid gap-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((a) => {
                    const active = amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleAmenity(a)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Photos</Label>
                <ImageUploader images={images} onChange={setImages} max={10} />
              </div>

              {apiError ? (
                <Alert variant="destructive">
                  <X className="size-4" aria-hidden="true" />
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <DialogFooter className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-6 py-4">
              <p className="text-xs text-muted-foreground">
                {uploading ? "Waiting for uploads to finish…" : "Units go live after review."}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => submit(true)} disabled={busy || uploading}>
                  Save draft
                </Button>
                <Button onClick={() => submit(false)} disabled={busy || uploading}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  Submit for approval
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Enquiries
// ============================================================

function BuilderEnquiriesTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApiData<Paginated<LeadDTO>>(
    () => api(`/api/leads?pageSize=20&page=${page}`),
    [page]
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateStatus(lead: LeadDTO, status: string) {
    setBusyId(lead.id);
    await runAction(
      () =>
        api(`/api/leads/${lead.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      status === "CONTACTED" ? "Lead marked contacted" : "Lead marked lost",
      { description: `${lead.name} · ${lead.property.title}`, onDone: refetch }
    );
    setBusyId(null);
  }

  const leads = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Enquiries"
        title="Buyer enquiries"
        description="Every enquiry received on your project units, with contact details."
      />
      <AdminCard bodyClassName="">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : leads.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Inbox className="size-6" aria-hidden="true" />}
              title="No enquiries yet"
              description="When buyers enquire on your units, their details appear here so you can follow up."
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enquirer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {lead.phone}
                        </a>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.email ?? "—"}</TableCell>
                      <TableCell>
                        <p className="max-w-[200px] truncate font-medium text-foreground">
                          {lead.property.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{lead.property.city}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {lead.reference}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-muted-foreground" title={lead.message ?? undefined}>
                          {lead.message ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "CONTACTED" && lead.status !== "CONVERTED" && lead.status !== "LOST" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === lead.id}
                              onClick={() => updateStatus(lead, "CONTACTED")}
                            >
                              <Phone className="size-4" aria-hidden="true" />
                              Mark contacted
                            </Button>
                          ) : null}
                          {lead.status !== "LOST" && lead.status !== "CONVERTED" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === lead.id}
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => updateStatus(lead, "LOST")}
                            >
                              Mark lost
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="enquiries" />
          </>
        )}
      </AdminCard>
    </div>
  );
}

// ============================================================
// Profile (read-only)
// ============================================================

function BuilderProfileTab() {
  const user = useAppStore((s) => s.user);
  const bp = user?.builderProfile ?? null;

  if (!bp) {
    return (
      <EmptyState
        icon={<Building2 className="size-6" aria-hidden="true" />}
        title="No company profile"
        description="Your builder profile could not be loaded. Please sign in again or contact support."
      />
    );
  }

  return (
    <div className="space-y-4">
      <TabIntro
        eyebrow="Company profile"
        title="Your company details"
        description="This information is shown to buyers on every project and unit you list."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard title="Company" description="Public profile shown on the marketplace">
          <div className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-xl font-semibold text-foreground">{bp.companyName}</h3>
              <VerifiedBadge verified={bp.isVerified} label="RERA Verified" />
            </div>
            {bp.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{bp.description}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">No company description added yet.</p>
            )}
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Website</dt>
                <dd className="mt-1 text-sm font-medium">
                  {bp.website ? (
                    <a
                      href={bp.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {bp.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">City</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{bp.city ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">RERA number</dt>
                <dd className="mt-1 font-mono text-sm font-medium text-foreground">
                  {bp.reraNumber ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Verification
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {bp.isVerified ? "Verified builder" : "Pending verification"}
                </dd>
              </div>
            </dl>
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard title="Account" description="Your sign-in details">
            <dl className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Member since</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {formatMonthYear(user?.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {user?.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {user?.phone ?? "—"}
                </dd>
              </div>
            </dl>
          </AdminCard>

          <Alert>
            <Info className="size-4" aria-hidden="true" />
            <AlertDescription>
              Company details are managed by the Vasati team. Contact support at{" "}
              <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-primary hover:underline">
                {BRAND.supportEmail}
              </a>{" "}
              or {BRAND.supportPhone} to update your company information.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
