import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export interface LineChartConfig {
  x_field: string;
  y_fields: string[];
  colors?: string[];
  show_values?: boolean;
  show_dots?: boolean;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  config: LineChartConfig;
}

export function LineChartComponent({ data, config }: LineChartProps) {
  const {
    x_field,
    y_fields,
    colors = [],
    show_values = false,
    show_dots = false,
  } = config;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{ top: 10, right: 20, bottom: 5, left: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        <XAxis dataKey={x_field} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        {y_fields.length > 1 && <Legend />}
        {y_fields.map((field, i) => {
          const color =
            colors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <Line
              key={field}
              type="monotone"
              dataKey={field}
              stroke={color}
              strokeWidth={2}
              dot={show_dots ? { r: 3, fill: color } : false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              animationDuration={800}
              animationEasing="ease-out"
              label={
                show_values
                  ? { position: "top", fontSize: 10, fill: "#6b7280" }
                  : undefined
              }
            />
          );
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

export default LineChartComponent;
