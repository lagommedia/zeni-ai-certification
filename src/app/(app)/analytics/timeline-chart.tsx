"use client";

import { useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TimelinePoint } from "./timeline";

// Categorical pair, validated with the dataviz skill's six-checks script
// (all pass; a contrast WARN on --success against the light surface is
// covered by the direct legend values + tooltip + table view below, per
// that skill's rule that a WARN "obligates visible labels, not dismissal").
const SERIES = {
  enrolled: { label: "Enrolled", color: "var(--info)" },
  completed: { label: "Completed", color: "var(--success)" },
} as const;

const VIEW_W = 900;
const VIEW_H = 300;
const PAD = { top: 16, right: 20, bottom: 28, left: 40 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

function niceStep(value: number, targetTicks: number) {
  if (value <= 0) return 1;
  const rawStep = value / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  if (residual > 5) return 10 * magnitude;
  if (residual > 2) return 5 * magnitude;
  if (residual > 1) return 2 * magnitude;
  return magnitude;
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${dateKey}T00:00:00Z`)
  );
}

export function TimelineChart({ data }: { data: TimelinePoint[] }) {
  const [showTable, setShowTable] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { step, max } = useMemo(() => {
    const peak = data.reduce((m, d) => Math.max(m, d.enrolled, d.completed), 0);
    const s = niceStep(peak, 4);
    return { step: s, max: Math.max(s, Math.ceil(peak / s) * s) };
  }, [data]);

  const n = data.length;
  const x = (i: number) => (n <= 1 ? PAD.left : PAD.left + (i / (n - 1)) * PLOT_W);
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;

  const linePath = (key: "enrolled" | "completed") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(d[key]).toFixed(2)}`).join(" ");

  const gridValues: number[] = [];
  for (let v = 0; v <= max; v += step) gridValues.push(v);

  // ~6 evenly spaced x-axis labels regardless of how many days are plotted.
  const labelCount = Math.min(6, n);
  const labelIndices = new Set<number>();
  for (let i = 0; i < labelCount; i++) {
    labelIndices.add(Math.round((i / Math.max(1, labelCount - 1)) * (n - 1)));
  }

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const index = Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1))));
    setHoverIndex(index);
  }

  const latest = data[n - 1];

  if (n === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
        No enrollment activity yet.
      </div>
    );
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  // Tooltip position as a percentage of the container, converted from SVG
  // viewBox space — works regardless of the SVG's rendered pixel size.
  const tooltipLeftPct = hoverIndex !== null ? (x(hoverIndex) / VIEW_W) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((key) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: SERIES[key].color }}
              />
              <span className="text-muted-foreground">{SERIES[key].label}</span>
              <span className="font-medium text-onyx tabular-nums">{latest[key].toLocaleString()}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead className="text-right">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{formatDate(d.date)}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.enrolled}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.completed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full"
            role="img"
            aria-label={`Enrolled and completed counts from ${formatDate(data[0].date)} to ${formatDate(latest.date)}`}
          >
            {gridValues.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={VIEW_W - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text x={PAD.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">
                  {v.toLocaleString()}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              labelIndices.has(i) ? (
                <text
                  key={d.date}
                  x={x(i)}
                  y={VIEW_H - PAD.bottom + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatDate(d.date)}
                </text>
              ) : null
            )}

            <path d={linePath("enrolled")} fill="none" stroke={SERIES.enrolled.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <path d={linePath("completed")} fill="none" stroke={SERIES.completed.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {(["enrolled", "completed"] as const).map((key) => (
              <circle
                key={key}
                cx={x(n - 1)}
                cy={y(latest[key])}
                r={4}
                fill={SERIES[key].color}
                stroke="var(--card)"
                strokeWidth={2}
              />
            ))}

            {hoverIndex !== null && hovered && (
              <g>
                <line
                  x1={x(hoverIndex)}
                  x2={x(hoverIndex)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                {(["enrolled", "completed"] as const).map((key) => (
                  <circle
                    key={key}
                    cx={x(hoverIndex)}
                    cy={y(hovered[key])}
                    r={4}
                    fill={SERIES[key].color}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>

          {hoverIndex !== null && hovered && (
            <div
              className={cn(
                "pointer-events-none absolute top-2 flex w-40 -translate-x-1/2 flex-col gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md",
                tooltipLeftPct > 80 && "translate-x-[-90%]",
                tooltipLeftPct < 20 && "translate-x-[-10%]"
              )}
              style={{ left: `${tooltipLeftPct}%` }}
            >
              <span className="font-medium text-muted-foreground">{formatDate(hovered.date)}</span>
              {(["enrolled", "completed"] as const).map((key) => (
                <span key={key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES[key].color }} />
                    {SERIES[key].label}
                  </span>
                  <span className="font-semibold text-onyx tabular-nums">{hovered[key]}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
