"use client";

// ============================================================
// Admin moderation — approval queues for property listings and
// builder projects, with reject-with-reason and featuring.
// ============================================================

import { useState } from "react";
import {
  Building2,
  Check,
  Eye,
  Home,
  Loader2,
  Star,
  StarOff,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate, formatNumber, formatPrice, formatPriceRange } from "@/lib/format";
import type { Paginated, ProjectCardDTO, PropertyCardDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../../../shared/section";
import { StatusBadge } from "../../../shared/status-badge";
import {
  AdminCard,
  ChipBar,
  FilterBar,
  ImgThumb,
  LoadError,
  TablePager,
  TableSkeleton,
  TabIntro,
  qs,
  runAction,
  useApiData,
  useDebounced,
} from "./parts-shared";

const MODERATION_CHIPS = [
  { value: "PENDING", label: "Pending" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft" },
  { value: "ALL", label: "All" },
];

// ------------------------------------------------------------
// Shared reject dialog with quick reasons
// ------------------------------------------------------------

function RejectDialog({
  onClose,
  onSubmit,
  entityLabel,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
  entityLabel: string;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const QUICK_REASONS = [
    "Insufficient listing details",
    "Poor quality or missing photos",
    "Pricing appears inaccurate",
    "Duplicate listing",
  ];

  async function submit() {
    if (reason.trim().length < 10) {
      setError("Please provide a reason of at least 10 characters.");
      return;
    }
    setBusy(true);
    const ok = await onSubmit(reason.trim());
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this {entityLabel}?</DialogTitle>
          <DialogDescription>
            The submitter will see this reason on their dashboard and can resubmit after fixing it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setReason(r);
                  setError(null);
                }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Explain what needs to change before this can go live…"
            rows={4}
            aria-label="Rejection reason"
            aria-invalid={!!error}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Properties moderation
// ------------------------------------------------------------

export function AdminProperties() {
  const navigate = useAppStore((s) => s.navigate);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<PropertyCardDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiData<Paginated<PropertyCardDTO>>(
    () =>
      api(
        `/api/properties${qs({
          scope: "admin",
          status: status !== "ALL" ? status : null,
          q: debouncedSearch || null,
          page,
          pageSize: 10,
        })}`
      ),
    [status, debouncedSearch, page]
  );

  function onStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function patchProperty(
    property: PropertyCardDTO,
    body: Record<string, unknown>,
    success: string
  ) {
    setBusyId(property.id);
    await runAction(
      () =>
        api(`/api/properties/${property.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      success,
      { description: property.title, onDone: refetch }
    );
    setBusyId(null);
  }

  const properties = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Moderation"
        title="Property approvals"
        description="Review new listings before they go live on the marketplace."
      />
      <AdminCard bodyClassName="">
        <FilterBar
          search={search}
          onSearchChange={onSearchChange}
          placeholder="Search by title, city or owner…"
          ariaLabel="Search listings"
        >
          <ChipBar value={status} onChange={onStatusChange} options={MODERATION_CHIPS} />
        </FilterBar>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : properties.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Home className="size-6" aria-hidden="true" />}
              title={
                status === "PENDING"
                  ? "Nothing waiting for approval"
                  : "No listings match this filter"
              }
              description={
                status === "PENDING"
                  ? "New submissions will appear here for review."
                  : "Try a different status filter or search term."
              }
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Listed by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((p) => {
                    const sellerRole = p.builderName ? "Builder" : "Owner";
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ImgThumb src={p.mainImage} alt="" className="size-10 rounded-lg" />
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate font-medium text-foreground">
                                {p.title}
                                {p.featured ? (
                                  <Star
                                    className="ml-1.5 inline size-3.5 fill-amber-400 text-amber-400"
                                    aria-label="Featured"
                                  />
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {p.locality}, {p.city}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatPrice(p.price)}</TableCell>
                        <TableCell>
                          <p className="max-w-[160px] truncate text-foreground">{p.sellerName}</p>
                          <p className="text-xs text-muted-foreground">{sellerRole}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatNumber(p.views)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === "PENDING" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={busyId === p.id}
                                  onClick={() =>
                                    patchProperty(p, { status: "PUBLISHED" }, "Listing approved")
                                  }
                                >
                                  <Check className="size-4" aria-hidden="true" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-600 hover:text-rose-700"
                                  disabled={busyId === p.id}
                                  onClick={() => setRejecting(p)}
                                >
                                  <X className="size-4" aria-hidden="true" />
                                  Reject
                                </Button>
                              </>
                            ) : null}
                            {p.status === "PUBLISHED" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === p.id}
                                onClick={() =>
                                  patchProperty(
                                    p,
                                    { featured: !p.featured },
                                    p.featured ? "Removed from featured" : "Marked as featured"
                                  )
                                }
                              >
                                {p.featured ? (
                                  <StarOff className="size-4" aria-hidden="true" />
                                ) : (
                                  <Star className="size-4" aria-hidden="true" />
                                )}
                                {p.featured ? "Unfeature" : "Feature"}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/properties/${p.slug}`)}
                              aria-label={`View ${p.title}`}
                            >
                              <Eye className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="listings" />
          </>
        )}
      </AdminCard>

      {rejecting ? (
        <RejectDialog
          key={rejecting.id}
          entityLabel="listing"
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => {
            if (!rejecting) return false;
            return runAction(
              () =>
                api(`/api/properties/${rejecting.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "REJECTED", rejectionReason: reason }),
                }),
              "Listing rejected",
              { description: rejecting.title, onDone: refetch }
            );
          }}
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------
// Projects moderation
// ------------------------------------------------------------

export function AdminProjects() {
  const navigate = useAppStore((s) => s.navigate);
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<ProjectCardDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiData<Paginated<ProjectCardDTO>>(
    () =>
      api(
        `/api/projects${qs({
          scope: "admin",
          status: status !== "ALL" ? status : null,
          page,
          pageSize: 10,
        })}`
      ),
    [status, page]
  );

  function onStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  async function patchProject(
    project: ProjectCardDTO,
    body: Record<string, unknown>,
    success: string
  ) {
    setBusyId(project.id);
    await runAction(
      () =>
        api(`/api/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      success,
      { description: project.name, onDone: refetch }
    );
    setBusyId(null);
  }

  const projects = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Moderation"
        title="Project approvals"
        description="Review builder projects before they are showcased on the marketplace."
      />
      <AdminCard bodyClassName="">
        <div className="border-b p-4 sm:px-5">
          <ChipBar value={status} onChange={onStatusChange} options={MODERATION_CHIPS} />
        </div>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : projects.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Building2 className="size-6" aria-hidden="true" />}
              title={
                status === "PENDING"
                  ? "No projects awaiting review"
                  : "No projects match this filter"
              }
              description={
                status === "PENDING"
                  ? "New project submissions from builders will appear here."
                  : "Try a different status filter."
              }
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Builder</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Price range</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ImgThumb src={p.mainImage} alt="" className="size-10 rounded-lg" />
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-medium text-foreground">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.locality}, {p.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.builderName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.configuration ?? p.propertyType}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatPriceRange(p.priceMin, p.priceMax)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNumber(p.availableUnits)} / {formatNumber(p.totalUnits)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={busyId === p.id}
                                onClick={() => patchProject(p, { status: "PUBLISHED" }, "Project approved")}
                              >
                                <Check className="size-4" aria-hidden="true" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 hover:text-rose-700"
                                disabled={busyId === p.id}
                                onClick={() => setRejecting(p)}
                              >
                                <X className="size-4" aria-hidden="true" />
                                Reject
                              </Button>
                            </>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/projects/${p.slug}`)}
                            aria-label={`View ${p.name}`}
                          >
                            <Eye className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="projects" />
          </>
        )}
      </AdminCard>

      {rejecting ? (
        <RejectDialog
          key={rejecting.id}
          entityLabel="project"
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => {
            if (!rejecting) return false;
            return runAction(
              () =>
                api(`/api/projects/${rejecting.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: "REJECTED", rejectionReason: reason }),
                }),
              "Project rejected",
              { description: rejecting.name, onDone: refetch }
            );
          }}
        />
      ) : null}
    </div>
  );
}
