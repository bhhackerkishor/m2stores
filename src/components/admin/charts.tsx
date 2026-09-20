"use client";

function niceMax(values: number[]): number {
  const m = Math.max(1, ...values);
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const n = m / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

export function LineChart({ points, height = 180 }: { points: Array<{ x: string; y: number }>; height?: number }) {
  const W = 720;
  const H = height;
  const P = 28;
  const max = niceMax(points.map((p) => p.y));
  const coords: Array<{ x: string; y: number; cx: number; cy: number }> = points.map((p, i) => {
    const cx = points.length === 1 ? W / 2 : P + ((W - P * 2) * i) / (points.length - 1);
    const cy = H - P - ((H - P * 2) * p.y) / max;
    return { x: p.x, y: p.y, cx, cy };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(" ");
  const base = H - P;
  const lastX = coords.length ? coords[coords.length - 1].cx.toFixed(1) : P;
  const firstX = coords.length ? coords[0].cx.toFixed(1) : P;
  const area = coords.length ? `${path} L${lastX},${base} L${firstX},${base} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue over time">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={P} x2={W - 8} y1={H - P - (H - P * 2) * f} y2={H - P - (H - P * 2) * f} stroke="#e2e8f0" strokeDasharray="4 4" />
      ))}
      <path d={area} fill="#2563eb" opacity={0.12} />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" />
      {coords.filter((_, i) => i % Math.ceil(coords.length / 8) === 0).map((c, i) => (
        <text key={i} x={c.cx} y={H - 8} fontSize={10} fill="#64748b" textAnchor="middle">{c.x.slice(5)}</text>
      ))}
      {coords.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={3} fill="#2563eb"><title>{`${c.x}: ₹${c.y}`}</title></circle>
      ))}
    </svg>
  );
}

export function BarChart({ bars, height = 180 }: { bars: Array<{ label: string; value: number }>; height?: number }) {
  const max = niceMax(bars.map((b) => b.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {bars.map((b) => (
        <div key={b.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs font-semibold">{b.value}</span>
          <div className="w-full bg-surface-100 rounded-t-md overflow-hidden flex items-end" style={{ height: height - 44 }}>
            <div className="w-full bg-indigo-500 rounded-t-md" style={{ height: `${(b.value / max) * 100}%` }} title={`${b.label}: ${b.value}`} />
          </div>
          <span className="text-[10px] text-surface-500 truncate w-full text-center">{b.label.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ slices }: { slices: Array<{ label: string; value: number; color: string }> }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0" role="img" aria-label="Breakdown">
        <circle cx={70} cy={70} r={R} fill="none" stroke="#f1f5f9" strokeWidth={18} />
        {slices.map((s) => {
          const frac = s.value / total;
          const dash = frac * C;
          const off = -acc * C;
          acc += frac;
          return <circle key={s.label} cx={70} cy={70} r={R} fill="none" stroke={s.color} strokeWidth={18} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} strokeLinecap="butt" />;
        })}
        <text x={70} y={70} textAnchor="middle" fontSize={18} fontWeight={800} fill="#0f172a">{total}</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-surface-600">{s.label}</span>
            <span className="font-semibold ml-auto">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
