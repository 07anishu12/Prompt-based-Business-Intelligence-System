import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { Widget } from "@/types/widget";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

interface Props {
  widget: Widget;
}

export function WidgetRenderer({ widget }: Props) {
  const data = widget.data || [];
  const config = widget.chart_config;

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        No data
      </div>
    );
  }

  switch (widget.type) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={config.x_field} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {config.y_fields.map((field, i) => (
              <Bar
                key={field}
                dataKey={field}
                fill={config.colors[i] || COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
                stackId={config.stacked ? "stack" : undefined}
              />
            ))}
            {config.y_fields.length > 1 && <Legend />}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={config.x_field} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {config.y_fields.map((field, i) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={config.colors[i] || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
            {config.y_fields.length > 1 && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={config.y_fields[0]}
              nameKey={config.x_field}
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label={({ name }) => name}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );

    case "kpi": {
      const value = data[0]?.[config.y_fields[0]];
      const label = config.x_field ? String(data[0]?.[config.x_field] ?? "") : config.y_fields[0];
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : String(value ?? "—")}
          </span>
          <span className="mt-1 text-sm text-gray-500">{label}</span>
        </div>
      );
    }

    case "table":
      return (
        <div className="h-full overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr>
                {Object.keys(data[0] || {}).map((col) => (
                  <th key={col} className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                      {String(val ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Unsupported widget type: {widget.type}
        </div>
      );
  }
}
