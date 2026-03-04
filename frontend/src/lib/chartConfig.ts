import {
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Hash,
  AreaChart,
  ScatterChart,
} from "lucide-react";

// ── Default color palette ────────────────────────────────────
export const DEFAULT_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
  "#a855f7", // purple-500
  "#84cc16", // lime-500
  "#e11d48", // rose-600
];

// ── Chart type to lucide icon mapping ────────────────────────
export const CHART_TYPE_ICONS: Record<string, typeof BarChart3> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  table: Table,
  kpi: Hash,
  area: AreaChart,
  scatter: ScatterChart,
};

// ── Default chart options per type ───────────────────────────
export const DEFAULT_CHART_OPTIONS: Record<string, Record<string, unknown>> = {
  bar: {
    stacked: false,
    show_values: false,
    orientation: "vertical",
    border_radius: 4,
    bar_gap: 4,
    show_grid: true,
    show_legend: true,
    animation_duration: 300,
  },
  line: {
    stroke_width: 2,
    show_dots: false,
    curve_type: "monotone",
    show_grid: true,
    show_legend: true,
    animation_duration: 300,
  },
  pie: {
    inner_radius: 0,
    outer_radius_percent: 80,
    show_labels: true,
    show_legend: true,
    animation_duration: 300,
  },
  area: {
    stroke_width: 2,
    fill_opacity: 0.3,
    curve_type: "monotone",
    stacked: false,
    show_grid: true,
    show_legend: true,
    animation_duration: 300,
  },
  scatter: {
    dot_size: 6,
    show_grid: true,
    show_legend: true,
    animation_duration: 300,
  },
  table: {
    page_size: 50,
    striped: true,
    sortable: true,
    show_row_numbers: false,
  },
  kpi: {
    font_size: "3xl",
    show_trend: true,
    trend_period: "previous",
    prefix: "",
    suffix: "",
  },
};

// ── Human-readable chart type labels ─────────────────────────
export const CHART_TYPE_LABELS: Record<string, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  pie: "Pie Chart",
  table: "Data Table",
  kpi: "KPI Card",
  area: "Area Chart",
  scatter: "Scatter Plot",
};
