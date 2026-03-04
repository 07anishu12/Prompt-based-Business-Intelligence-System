import React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
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

export interface PieChartConfig {
  x_field: string;
  y_fields: string[];
  colors?: string[];
  donut?: boolean;
  show_values?: boolean;
}

interface PieChartProps {
  data: Record<string, unknown>[];
  config: PieChartConfig;
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const RADIAN = Math.PI / 180;

function renderPercentageLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: LabelProps) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.03) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#6b7280"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
    >
      {name} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

export function PieChartComponent({ data, config }: PieChartProps) {
  const {
    x_field,
    y_fields,
    colors = [],
    donut = false,
    show_values = true,
  } = config;

  const valueField = y_fields[0];
  const innerRadius = donut ? "50%" : "0%";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey={valueField}
          nameKey={x_field}
          cx="50%"
          cy="50%"
          outerRadius="75%"
          innerRadius={innerRadius}
          label={show_values ? renderPercentageLabel : false}
          labelLine={show_values}
          animationDuration={600}
          animationEasing="ease-out"
        >
          {data.map((_, i) => (
            <Cell
              key={`cell-${i}`}
              fill={colors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

export default PieChartComponent;
