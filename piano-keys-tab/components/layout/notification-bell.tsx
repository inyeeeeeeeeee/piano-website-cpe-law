"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Dropdown, MenuLabel } from "@/components/ui/dropdown";
import { timeAgo } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Header bell with unread badge + latest notifications. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: NotificationItem[];
        unread: number;
      };
      setItems(data.items);
      setUnread(data.unread);
      setLoaded(true);
    } catch {
      // Network hiccup — keep whatever we have.
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markAllRead = async () => {
    const previous = { items, unread };
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      setItems(previous.items);
      setUnread(previous.unread);
    }
  };

  return (
    <Dropdown
      label="Notifications"
      className="hidden sm:block"
      panelClassName="w-80 p-0"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={
            unread > 0
              ? `Notifications, ${unread} unread`
              : "Notifications"
          }
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
        >
          <Bell aria-hidden="true" className="h-4.5 w-4.5" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <MenuLabel>Notifications</MenuLabel>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-primary hover:bg-muted"
              >
                <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!loaded && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                You are all caught up.
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/dashboard"}
                  onClick={close}
                  className={`block border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted ${
                    n.isRead ? "opacity-70" : ""
                  }`}
                >
                  <p className="flex items-start gap-2 text-sm font-medium text-foreground">
                    {!n.isRead ? (
                      <span
                        aria-label="Unread"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">{n.title}</span>
                  </p>
                  {n.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  ) : null}
                  <time className="mt-1 block text-[11px] text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </time>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
