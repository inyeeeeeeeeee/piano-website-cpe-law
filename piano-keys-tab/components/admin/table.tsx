import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the admin tables and filter bars.
 * Everything here is server-renderable HTML — the interactive bits live in the
 * dedicated action components under `components/admin/`.
 */

const cellClass =
  "px-4 py-3 text-sm align-middle text-foreground";

export function TableShell({
  children,
  minWidth = 720,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={cn(cellClass, className)}>{children}</td>;
}

/** Two rows of a table body — keeps row markup readable in page files. */
export function Tr({ children }: { children: ReactNode }) {
  return <tr className="border-t border-border hover:bg-muted/40">{children}</tr>;
}

const controlClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring cursor-pointer";

/**
 * Filter bar as a plain GET form — results are URL-driven, shareable and work
 * without JavaScript.
 */
export function FilterBar({
  children,
  resetHref,
  action,
}: {
  children: ReactNode;
  resetHref: string;
  action?: string;
}) {
  return (
    <form
      method="get"
      action={action}
      className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
    >
      {children}
      <div className="flex items-center gap-2">
        <button type="submit" className={buttonClasses("primary", "sm")}>
          Apply
        </button>
        <a href={resetHref} className={buttonClasses("ghost", "sm")}>
          Reset
        </a>
      </div>
    </form>
  );
}

export function SelectFilter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block min-w-40">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select name={name} defaultValue={value} className={controlClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextFilter({
  label,
  name,
  value,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-48 flex-1">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type="search"
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        className={cn(controlClass, "cursor-text")}
      />
    </label>
  );
}
