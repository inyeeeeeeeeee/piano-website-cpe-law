"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Admin analytics charts (Recharts, client-only).
 * The server page aggregates everything — these components only render the
 * plain serialisable data they receive, so no DB access happens here.
 */

const AXIS = { stroke: "currentColor", fontSize: 11 } as const;
const PALETTE = [
  "#4f7cff",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border, #e2e8f0)",
  background: "var(--card, #fff)",
  color: "var(--foreground, #0f172a)",
  fontSize: 12,
} as const;

export interface NamedCount {
  name: string;
  value: number;
}

export interface TimePoint {
  label: string;
  songs: number;
  users: number;
}

function ChartFrame({
  title,
  description,
  children,
  height = 260,
}: {
  title: string;
  description?: string;
  children: React.ReactElement;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBreakdownChart({ data }: { data: NamedCount[] }) {
  return (
    <ChartFrame title="Songs by status" description="Where the catalogue stands.">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ChartFrame>
  );
}

export function DifficultyChart({ data }: { data: NamedCount[] }) {
  return (
    <ChartFrame title="Songs by difficulty" description="Arrangement spread.">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", opacity: 0.06 }} />
        <Bar dataKey="value" fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export function RatingDistributionChart({ data }: { data: NamedCount[] }) {
  return (
    <ChartFrame title="Rating distribution" description="Every rating ever given.">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", opacity: 0.06 }} />
        <Bar dataKey="value" fill={PALETTE[4]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export function GrowthChart({ data }: { data: TimePoint[] }) {
  return (
    <ChartFrame
      title="Growth"
      description="New songs and new members per month."
      height={300}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="songs"
          name="Songs"
          stroke={PALETTE[0]}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="users"
          name="Users"
          stroke={PALETTE[1]}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartFrame>
  );
}

export function TopSongsChart({ data }: { data: NamedCount[] }) {
  return (
    <ChartFrame
      title="Most viewed songs"
      description="Published catalogue, top 10 by views."
      height={320}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", opacity: 0.06 }} />
        <Bar dataKey="value" fill={PALETTE[2]} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartFrame>
  );
}
