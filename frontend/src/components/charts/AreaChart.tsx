import React from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
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

export interface AreaChartConfig {
  x_field: string;
  y_fields: string[];
  colors?: string[];
  stacked?: boolean;
  show_values?: boolean;
}

interface AreaChartProps {
  data: Record<string, unknown>[];
  config: AreaChartConfig;
}

export function AreaChartComponent({ data, config }: AreaChartProps) {
  const {
    x_field,
    y_fields,
    colors = [],
    stacked = false,
    show_values = false,
  } = config;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart
        data={data}
        margin={{ top: 10, right: 20, bottom: 5, left: 5 }}
      >
        <defs>
          {y_fields.map((field, i) => {
            const color =
              colors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            return (
              <linearGradient
                key={`gradient-${field}`}
                id={`gradient-${field}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            );
          })}
        </defs>
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
            <Area
              key={field}
              type="monotone"
              dataKey={field}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${field})`}
              fillOpacity={1}
              stackId={stacked ? "stack" : undefined}
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
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

export default AreaChartComponent;
