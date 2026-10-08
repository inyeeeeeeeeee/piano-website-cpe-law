import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDate, parseJson, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/skeleton";
import { FilterBar, SelectFilter, TableShell, Td, Th, Tr } from "@/components/admin/table";
import { ScrollText } from "lucide-react";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 25;

/** Curated action list; "ALL" shows everything including legacy entries. */
const ACTIONS = [
  "ADMIN_UPDATED_SONG",
  "ADMIN_DELETED_SONG",
  "ADMIN_CREATED_SONG",
  "ADMIN_MODERATED_SUBMISSION",
  "ADMIN_UPDATED_USER",
  "ADMIN_DELETED_USER",
  "ADMIN_MODERATED_COMMENT",
  "ADMIN_DELETED_COMMENT",
  "ADMIN_RESOLVED_REPORT",
  "ADMIN_CREATED_ARTIST",
  "ADMIN_EDITED_ARTIST",
  "ADMIN_DELETED_ARTIST",
] as const;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin();
  const raw = await searchParams;

  const action = str(raw.action).trim();
  const page = Math.max(1, Number.parseInt(str(raw.page), 10) || 1);

  const where = action && action !== "ALL" ? { action } : {};

  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { admin: { select: { id: true, username: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Audit log</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every administrative change is appended here with the actor, target
          and a JSON snapshot of what changed. Entries are never edited or
          deleted.
        </p>
      </div>

      <FilterBar resetHref="/admin/audit">
        <SelectFilter
          label="Action"
          name="action"
          value={action || "ALL"}
          options={[
            { value: "ALL", label: "All actions" },
            ...ACTIONS.map((value) => ({ value, label: value })),
          ]}
        />
      </FilterBar>

      {entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" aria-hidden />}
          title="No audit entries"
          description="Administrative actions will appear here as they happen."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} entr{total === 1 ? "y" : "ies"}
          </p>
          <TableShell minWidth={880}>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Admin</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const meta = parseJson<Record<string, unknown> | null>(
                  entry.metadata,
                  null
                );
                return (
                  <Tr key={entry.id}>
                    <Td className="whitespace-nowrap">
                      <span className="block text-sm">{formatDate(entry.createdAt)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {timeAgo(entry.createdAt)}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">
                      {entry.admin.username}
                    </Td>
                    <Td>
                      <Badge className="bg-primary-soft text-primary ring-primary/20">
                        {entry.action}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {entry.entityType}
                      <span className="block max-w-40 truncate font-mono text-xs">
                        {entry.entityId}
                      </span>
                    </Td>
                    <Td className="max-w-md">
                      {meta ? (
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-2 font-mono text-xs leading-relaxed">
                          {JSON.stringify(meta, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/admin/audit"
              params={{ action: action && action !== "ALL" ? action : undefined }}
            />
          </div>
        </>
      )}
    </div>
  );
}
