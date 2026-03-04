import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
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

export interface BarChartConfig {
  x_field: string;
  y_fields: string[];
  colors?: string[];
  stacked?: boolean;
  orientation?: "vertical" | "horizontal";
  show_values?: boolean;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  config: BarChartConfig;
}

export function BarChartComponent({ data, config }: BarChartProps) {
  const {
    x_field,
    y_fields,
    colors = [],
    stacked = false,
    orientation = "vertical",
    show_values = false,
  } = config;

  const isHorizontal = orientation === "horizontal";
  const layout = isHorizontal ? "vertical" : "horizontal";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 10, right: 20, bottom: 5, left: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              dataKey={x_field}
              type="category"
              tick={{ fontSize: 11 }}
              width={100}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={x_field} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        {y_fields.length > 1 && <Legend />}
        {y_fields.map((field, i) => (
          <Bar
            key={field}
            dataKey={field}
            fill={colors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            stackId={stacked ? "stack" : undefined}
            animationDuration={600}
            animationEasing="ease-out"
            label={
              show_values
                ? { position: "top", fontSize: 10, fill: "#6b7280" }
                : undefined
            }
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export default BarChartComponent;
