"use client";

// ============================================================
// Admin audit log — chronological trail of every platform
// action, filterable by entity with pagination.
// ============================================================

import { useState } from "react";
import { History, ScrollText } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import type { AuditLogDTO, Paginated } from "@/lib/types";
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
  ChipBar,
  LoadError,
  RoleBadge,
  TablePager,
  TableSkeleton,
  TabIntro,
  qs,
  useApiData,
} from "./parts-shared";

const ENTITY_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PROPERTY", label: "Properties" },
  { value: "USER", label: "Users" },
  { value: "LEAD", label: "Leads" },
  { value: "TRANSACTION", label: "Transactions" },
  { value: "COMMISSION", label: "Commissions" },
  { value: "AGREEMENT", label: "Agreements" },
  { value: "PROJECT", label: "Projects" },
  { value: "VISIT", label: "Visits" },
];

export function AdminAuditLog() {
  const [entity, setEntity] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useApiData<Paginated<AuditLogDTO>>(
    () =>
      api(
        `/api/admin/audit-logs${qs({
          entity: entity !== "ALL" ? entity : null,
          page,
          pageSize: 15,
        })}`
      ),
    [entity, page]
  );

  function onEntityChange(value: string) {
    setEntity(value);
    setPage(1);
  }

  const logs = data?.data ?? [];

  return (
    <div>
      <TabIntro
        eyebrow="Governance"
        title="Audit log"
        description="A chronological record of every action taken on the platform."
      />
      <AdminCard bodyClassName="">
        <div className="border-b p-4 sm:px-5">
          <ChipBar value={entity} onChange={onEntityChange} options={ENTITY_FILTERS} />
        </div>
        {loading ? (
          <TableSkeleton rows={10} />
        ) : error ? (
          <LoadError message={error} onRetry={refetch} />
        ) : logs.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<History className="size-6" aria-hidden="true" />}
              title="No audit entries"
              description="Actions performed on the platform will be recorded here."
            />
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] overflow-y-auto vasati-scroll [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 sm:px-5">When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap px-4 text-muted-foreground sm:px-5">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap font-medium text-foreground">
                              {log.user.name}
                            </span>
                            <RoleBadge role={log.user.role} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                          {log.action}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                          {log.entity}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <p className="truncate text-muted-foreground" title={log.details ?? undefined}>
                          {log.details ?? "—"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePager pagination={data?.pagination} onPage={setPage} unit="entries" />
          </>
        )}
      </AdminCard>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ScrollText className="size-3.5" aria-hidden="true" />
        Audit entries are immutable and retained for platform governance.
      </p>
    </div>
  );
}
