import { BarChartComponent } from "@/components/charts/BarChart";
import { LineChartComponent } from "@/components/charts/LineChart";
import { PieChartComponent } from "@/components/charts/PieChart";
import { AreaChartComponent } from "@/components/charts/AreaChart";
import { ScatterPlotComponent } from "@/components/charts/ScatterPlot";
import { HeatmapComponent } from "@/components/charts/Heatmap";
import type { ChartConfig } from "@/types/widget";

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "donut"
  | "area"
  | "scatter"
  | "heatmap";

interface ChartWidgetProps {
  type: ChartType;
  data: Record<string, unknown>[];
  chartConfig: ChartConfig;
  onChartClick?: (payload: Record<string, unknown>) => void;
}

export function ChartWidget({
  type,
  data,
  chartConfig,
  onChartClick,
}: ChartWidgetProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        No matching data found for this query
      </div>
    );
  }

  // Ensure chartConfig has valid fields by falling back to data columns
  const allKeys = Object.keys(data[0]);
  const numericKeys = allKeys.filter((k) => typeof data[0][k] === "number");
  const stringKeys = allKeys.filter((k) => typeof data[0][k] === "string");

  const config = {
    x_field: chartConfig?.x_field || stringKeys[0] || allKeys[0] || "",
    y_fields:
      chartConfig?.y_fields?.length > 0
        ? chartConfig.y_fields
        : numericKeys.length > 0
          ? numericKeys.slice(0, 3)
          : [allKeys[1] || allKeys[0] || ""],
    colors: chartConfig?.colors,
    stacked: chartConfig?.stacked,
    orientation: (chartConfig?.orientation as "vertical" | "horizontal") || "vertical",
    show_values: chartConfig?.show_values ?? true,
    group_field: chartConfig?.group_field,
  };

  return (
    <div
      className="h-full w-full animate-fade-in"
      onClick={
        onChartClick
          ? (e) => {
              // Recharts click events are handled per-element; this is a container fallback
              const target = e.target as HTMLElement;
              const dataIndex = target.getAttribute("data-index");
              if (dataIndex !== null) {
                const idx = parseInt(dataIndex, 10);
                if (data[idx]) onChartClick(data[idx]);
              }
            }
          : undefined
      }
    >
      {type === "bar" && <BarChartComponent data={data} config={config} />}
      {type === "line" && <LineChartComponent data={data} config={config} />}
      {type === "pie" && <PieChartComponent data={data} config={config} />}
      {type === "donut" && <PieChartComponent data={data} config={{ ...config, donut: true }} />}
      {type === "area" && <AreaChartComponent data={data} config={config} />}
      {type === "scatter" && (
        <ScatterPlotComponent data={data} config={config} />
      )}
      {type === "heatmap" && <HeatmapComponent data={data} config={config} />}
    </div>
  );
}

export default ChartWidget;
