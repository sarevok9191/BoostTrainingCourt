/**
 * LineChart — simple SVG-based line chart, no external dependencies.
 * data: [{ date: "YYYY-MM-DD", value: number }]
 */
export default function LineChart({ data = [], color = "#F5A623", unit = "", height = 110 }) {
  const sorted = [...data]
    .filter((d) => d.value !== null && d.value !== undefined && !isNaN(d.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) {
    return (
      <div className="chart-empty">
        <p>Add at least 2 entries to see the chart.</p>
      </div>
    );
  }

  const W = 320;
  const H = height;
  const padX = 8;
  const padY = 14;

  const vals  = sorted.map((d) => parseFloat(d.value));
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;

  const pts = sorted.map((d, i) => {
    const x = padX + (i / (sorted.length - 1)) * (W - padX * 2);
    const y = padY + ((max - parseFloat(d.value)) / range) * (H - padY * 2);
    return [x, y];
  });

  const polyline  = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPts   = [`${pts[0][0]},${H}`, ...pts.map(([x, y]) => `${x},${y}`), `${pts[pts.length - 1][0]},${H}`].join(" ");

  const lastVal  = vals[vals.length - 1];
  const firstVal = vals[0];
  const diff     = lastVal - firstVal;
  const diffClr  = diff > 0 ? "#4caf50" : diff < 0 ? "#e57373" : "#888";

  const fmtLabel = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="line-chart">
      <div className="chart-meta">
        <span className="chart-latest">{lastVal.toFixed(1)}{unit}</span>
        <span className="chart-diff" style={{ color: diffClr }}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit} total
        </span>
      </div>

      <div className="chart-svg-wrapper">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
          <defs>
            <linearGradient id={`cg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0"    />
            </linearGradient>
          </defs>
          <polygon points={areaPts} fill={`url(#cg-${color.slice(1)})`} />
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={color} />
          ))}
        </svg>
      </div>

      <div className="chart-labels">
        <span>{fmtLabel(sorted[0].date)}</span>
        <span>{fmtLabel(sorted[sorted.length - 1].date)}</span>
      </div>
    </div>
  );
}
