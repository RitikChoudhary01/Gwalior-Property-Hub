"use client";

// ============================================================
// Admin users — search, role filter, verify / unverify and
// activate / deactivate platform accounts.
// ============================================================

import { useState } from "react";
import { BadgeCheck, CheckCircle2, MoreHorizontal, Power, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { AdminUserDTO, Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "../../../shared/section";
import {
  AdminCard,
  AvatarInitials,
  FilterBar,
  LoadError,
  RoleBadge,
  TablePager,
  TableSkeleton,
  TabIntro,
  qs,
  runAction,
  useApiData,
  useDebounced,
} from "./parts-shared";

const ROLE_FILTERS = [
  { value: "ALL", label: "All roles" },
  { value: "BUYER", label: ROLE_LABELS.BUYER },
  { value: "SELLER", label: ROLE_LABELS.SELLER },
  { value: "BUILDER", label: ROLE_LABELS.BUILDER },
  { value: "TEAM", label: ROLE_LABELS.TEAM },
  { value: "ADMIN", label: ROLE_LABELS.ADMIN },
];

export function AdminUsers() {
  const currentUser = useAppStore((s) => s.user);
  const [role, setRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useApiData<Paginated<AdminUserDTO>>(
    () =>
      api(
        `/api/admin/users${qs({
          role: role !== "ALL" ? role : null,
          q: debouncedSearch || null,
          page,
          pageSize: 10,
        })}`
      ),
    [role, debouncedSearch, page]
  );

  function onRoleChange(value: string) {
    setRole(value);
    setPage(1);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function patchUser(user: AdminUserDTO, action: "verify" | "unverify" | "activate" | "deactivate") {
    await runAction(
      () =>
        api(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        }),
      "User updated",
      { description: user.name, onDone: refetch }
    );
  }

  const users = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Users"
        title="User accounts"
        description="Verify accounts, manage access and review everyone on the platform."
      />
      <AdminCard bodyClassName="">
        <FilterBar
          search={search}
          onSearchChange={onSearchChange}
          placeholder="Search by name or email…"
          ariaLabel="Search users"
        >
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r.value}
                type="button"
                aria-pressed={role === r.value}
                onClick={() => onRoleChange(r.value)}
                className={
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors " +
                  (role === r.value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </FilterBar>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : users.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<ShieldAlert className="size-6" aria-hidden="true" />}
              title="No users found"
              description="Try a different search term or role filter."
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={u.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {u.name}
                                {isSelf ? <span className="ml-1.5 text-xs text-muted-foreground">(you)</span> : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={u.role} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.phone ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.city ?? "—"}</TableCell>
                        <TableCell>
                          {u.isVerified ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="size-4" aria-hidden="true" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <ShieldAlert className="size-4" aria-hidden="true" />
                              Unverified
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-800">
                              Deactivated
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${u.name}`}
                                disabled={isSelf}
                              >
                                <MoreHorizontal className="size-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => patchUser(u, u.isVerified ? "unverify" : "verify")}>
                                <BadgeCheck className="size-4" aria-hidden="true" />
                                {u.isVerified ? "Unverify" : "Verify"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => patchUser(u, u.isActive ? "deactivate" : "activate")}
                                className={u.isActive ? "text-rose-600 focus:text-rose-600" : undefined}
                              >
                                <Power className="size-4" aria-hidden="true" />
                                {u.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="users" />
          </>
        )}
      </AdminCard>
    </div>
  );
}
