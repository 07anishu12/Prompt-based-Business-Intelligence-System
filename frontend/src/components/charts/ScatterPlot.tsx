import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
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

export interface ScatterPlotConfig {
  x_field: string;
  y_fields: string[];
  colors?: string[];
  group_field?: string;
  z_field?: string;
}

interface ScatterPlotProps {
  data: Record<string, unknown>[];
  config: ScatterPlotConfig;
}

export function ScatterPlotComponent({ data, config }: ScatterPlotProps) {
  const { x_field, y_fields, colors = [], group_field, z_field } = config;

  const yField = y_fields[0];

  // If group_field is provided, split data into groups
  const groups: Record<string, Record<string, unknown>[]> = {};
  if (group_field) {
    data.forEach((item) => {
      const group = String(item[group_field] ?? "Other");
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
  } else {
    groups["All"] = data;
  }

  const groupNames = Object.keys(groups);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 20, bottom: 5, left: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        <XAxis
          dataKey={x_field}
          type="number"
          name={x_field}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          dataKey={yField}
          type="number"
          name={yField}
          tick={{ fontSize: 11 }}
        />
        {z_field && <ZAxis dataKey={z_field} range={[30, 300]} name={z_field} />}
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        {groupNames.length > 1 && <Legend />}
        {groupNames.map((name, i) => (
          <Scatter
            key={name}
            name={name}
            data={groups[name]}
            fill={colors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            animationDuration={600}
            animationEasing="ease-out"
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export default ScatterPlotComponent;
