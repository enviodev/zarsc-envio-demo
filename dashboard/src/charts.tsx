import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { num, shortDay } from "./format";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round "nice" upper bound and tick step for a y axis. */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Bar path with 4px rounded data-end, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <div className="tooltip" style={{ left, top: y }}>
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export type Point = { day: string; a: number; b: number };

/**
 * Daily bars. `a` sits at the baseline and `b` stacks above it; leave `b` at 0
 * for a single series. The tooltip formats values with `format`.
 */
export function DailyBars({
  data,
  label,
  aLabel,
  bLabel,
  format = num,
  axisFormat = compact,
}: {
  data: Point[];
  label: string;
  aLabel: string;
  bLabel?: string;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number>();
  const height = 240;
  const m = { top: 12, right: 8, bottom: 28, left: 44 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const { top, step } = niceScale(Math.max(1, ...data.map((d) => d.a + d.b)));
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(1.5, Math.min(24, band - 2));
  const y = (v: number) => innerH - (v / top) * innerH;
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64)));
  const h = hover !== undefined ? data[hover] : undefined;

  return (
    <div ref={ref} className="chart" onMouseLeave={() => setHover(undefined)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          <g transform={`translate(${m.left},${m.top})`}>
            {Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={innerW} className={t === 0 ? "axis" : "grid"} />
                <text x={-8} dy="0.32em" textAnchor="end" className="tick">
                  {axisFormat(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = i * band + (band - barW) / 2;
              const aH = innerH - y(d.a);
              const bH = innerH - y(d.b);
              const gap = aH > 0 && bH > 0 ? 2 : 0;
              const dim = hover !== undefined && hover !== i;
              return (
                <g key={d.day} opacity={dim ? 0.45 : 1}>
                  {d.b === 0 ? (
                    <path d={barPath(x, innerH - aH, barW, aH)} fill="var(--series-1)" />
                  ) : (
                    <>
                      <rect x={x} y={innerH - aH} width={barW} height={aH} fill="var(--series-1)" />
                      <path d={barPath(x, innerH - aH - bH, barW, Math.max(0, bH - gap))} fill="var(--series-2)" />
                    </>
                  )}
                  <rect x={i * band} y={0} width={band} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
                  {i % labelEvery === 0 && (
                    <text x={i * band + band / 2} y={innerH + 18} textAnchor="middle" className="tick">
                      {shortDay(d.day)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {h && hover !== undefined && (
        <Tooltip x={m.left + hover * band + band / 2} y={m.top + y(h.a + h.b) - 8} width={width}>
          <strong>{shortDay(h.day)}</strong>
          <span>
            <i style={{ background: "var(--series-1)" }} /> {aLabel} <b>{format(h.a)}</b>
          </span>
          {bLabel && (
            <span>
              <i style={{ background: "var(--series-2)" }} /> {bLabel} <b>{format(h.b)}</b>
            </span>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/** A filled line over days, e.g. holders over time. */
export function DailyLine({
  data,
  label,
  seriesLabel,
  format = num,
}: {
  data: { day: string; value: number }[];
  label: string;
  seriesLabel: string;
  format?: (n: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number>();
  const height = 240;
  const m = { top: 12, right: 12, bottom: 28, left: 44 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const { top, step } = niceScale(Math.max(1, ...data.map((d) => d.value)));
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => innerH - (v / top) * innerH;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join("");
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64)));
  const h = hover !== undefined ? data[hover] : undefined;

  return (
    <div
      ref={ref}
      className="chart"
      onMouseLeave={() => setHover(undefined)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const i = Math.round(((e.clientX - rect.left - m.left) / Math.max(1, innerW)) * (data.length - 1));
        setHover(Math.min(data.length - 1, Math.max(0, i)));
      }}
    >
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          <g transform={`translate(${m.left},${m.top})`}>
            {Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={innerW} className={t === 0 ? "axis" : "grid"} />
                <text x={-8} dy="0.32em" textAnchor="end" className="tick">
                  {compact(t)}
                </text>
              </g>
            ))}
            <path d={`${line}L${x(data.length - 1)},${innerH}L0,${innerH}Z`} fill="var(--series-1)" opacity={0.14} />
            <path d={line} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />
            {data.map(
              (d, i) =>
                i % labelEvery === 0 && (
                  <text key={d.day} x={x(i)} y={innerH + 18} textAnchor="middle" className="tick">
                    {shortDay(d.day)}
                  </text>
                ),
            )}
            {hover !== undefined && h && <circle cx={x(hover)} cy={y(h.value)} r={4} fill="var(--series-1)" stroke="var(--surface-2)" strokeWidth={2} />}
          </g>
        </svg>
      )}
      {h && hover !== undefined && (
        <Tooltip x={m.left + x(hover)} y={m.top + y(h.value) - 8} width={width}>
          <strong>{shortDay(h.day)}</strong>
          <span>
            {seriesLabel} <b>{format(h.value)}</b>
          </span>
        </Tooltip>
      )}
    </div>
  );
}

/** Horizontal bars for a set of buckets; each value labelled with its share of the total. */
export function BucketBars({ rows, unit }: { rows: { label: string; value: number; hint?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <div className="funnel">
      {rows.map((r) => (
        <div key={r.label} className="funnel-row" title={r.hint}>
          <div className="funnel-label">
            <span>{r.label}</span>
            <span className="funnel-value">
              {num(r.value)} {unit}
              <em>{total ? Math.round((r.value / total) * 100) : 0}%</em>
            </span>
          </div>
          <div className="funnel-track">
            <div className="funnel-bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
