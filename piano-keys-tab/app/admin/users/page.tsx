import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { searchable, timeAgo } from "@/lib/utils";
import { USER_ROLES } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/skeleton";
import { UserRowActions } from "@/components/admin/user-row-actions";
import {
  FilterBar,
  SelectFilter,
  TableShell,
  Td,
  TextFilter,
  Th,
  Tr,
} from "@/components/admin/table";
import { Users } from "lucide-react";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const admin = await requireAdmin();
  const raw = await searchParams;

  const q = str(raw.q).trim();
  const role = str(raw.role).trim();
  const status = str(raw.status).trim();
  const page = Math.max(1, Number.parseInt(str(raw.page), 10) || 1);

  const and: Record<string, unknown>[] = [];
  if (q) {
    const needle = searchable(q);
    and.push({ OR: [{ username: { contains: needle } }, { email: { contains: needle } }] });
  }
  if (role === "USER" || role === "ADMIN") and.push({ role });
  if (status === "active") and.push({ isActive: true });
  if (status === "disabled") and.push({ isActive: false });
  const where = and.length > 0 ? { AND: and } : {};

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: { songs: true, comments: true, ratings: true, songbooks: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles and account state are enforced server-side; a disabled account
          loses access on its next request.
        </p>
      </div>

      <FilterBar resetHref="/admin/users">
        <TextFilter
          label="Search"
          name="q"
          value={q}
          placeholder="Username or email…"
        />
        <SelectFilter
          label="Role"
          name="role"
          value={role || "ALL"}
          options={[
            { value: "ALL", label: "All roles" },
            ...USER_ROLES.map((value) => ({ value, label: value })),
          ]}
        />
        <SelectFilter
          label="Account"
          name="status"
          value={status || "ALL"}
          options={[
            { value: "ALL", label: "Any state" },
            { value: "active", label: "Active" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
      </FilterBar>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden />}
          title="No users match"
          description="Try a different search or filter."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} user{total === 1 ? "" : "s"}
          </p>
          <TableShell minWidth={980}>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>State</Th>
                <Th>Activity</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.username} src={user.avatar} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.username}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge
                      className={
                        user.role === "ADMIN"
                          ? "bg-primary-soft text-primary ring-primary/20"
                          : "bg-muted text-muted-foreground ring-border"
                      }
                    >
                      {user.role}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      className={
                        user.isActive
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900"
                          : "bg-destructive/10 text-destructive ring-destructive/20"
                      }
                    >
                      {user.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {user._count.songs} songs · {user._count.comments} comments
                    <br />
                    {user._count.ratings} ratings · {user._count.songbooks} songbooks
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {timeAgo(user.createdAt)}
                  </Td>
                  <Td>
                    <UserRowActions
                      id={user.id}
                      username={user.username}
                      role={user.role}
                      isActive={user.isActive}
                      isSelf={user.id === admin.id}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/admin/users"
              params={{
                q: q || undefined,
                role: role || undefined,
                status: status || undefined,
              }}
            />
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: profile pages are at{" "}
        <Link href="/profile" className="text-primary hover:underline">
          /profile
        </Link>{" "}
        — moderation history lives in the{" "}
        <Link href="/admin/audit" className="text-primary hover:underline">
          audit log
        </Link>
        .
      </p>
    </div>
  );
}
