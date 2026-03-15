import { AlertCircle, Database } from "lucide-react";
import type { Widget } from "@/types/widget";
import { normalizeWidgetType } from "@/lib/widgetConfig";
import { ChartRenderer } from "./ChartWidget";
import { FilterWidget, type FilterType } from "./FilterWidget";
import { KPIWidget } from "./KPIWidget";
import { TableWidget } from "./TableWidget";
import { TextWidget } from "./TextWidget";

interface Props {
  widget: Widget;
  onFilterChange?: (value: string | { start: string; end: string }) => void;
  onTextChange?: (content: string) => void;
  onChartClick?: (payload: Record<string, unknown>) => void;
}

const CHART_TYPES = new Set<string>([
  "bar",
  "line",
  "pie",
  "donut",
  "area",
  "scatter",
  "heatmap",
  "radar",
  "histogram",
  "stacked_bar",
]);

const ALL_KNOWN_TYPES = new Set<string>([
  ...CHART_TYPES,
  "table",
  "kpi",
  "text",
  "filter",
]);

function validateChartData(
  data: Record<string, unknown>[],
  config: Widget["chart_config"],
  type: string,
): { valid: boolean; message?: string; fixedConfig?: Widget["chart_config"] } {
  if (!data || data.length === 0) {
    return { valid: false, message: "No matching data found for this query" };
  }

  if (!config) {
    return { valid: true };
  }

  const normalizedType = normalizeWidgetType(type);
  const sampleRow = data[0];
  const availableKeys = Object.keys(sampleRow);
  const numericCols = availableKeys.filter((key) => typeof sampleRow[key] === "number");
  const stringCols = availableKeys.filter((key) => typeof sampleRow[key] === "string");

  let xField = config.x_field;
  let yFields = config.y_fields || [];

  if (normalizedType === "histogram") {
    if (!numericCols.includes(xField)) {
      xField = numericCols[0] || availableKeys[0] || "";
    }
    return { valid: true, fixedConfig: { ...config, x_field: xField, y_fields: [xField] } };
  }

  if (normalizedType === "scatter") {
    if (!numericCols.includes(xField)) {
      xField = numericCols[0] || availableKeys[0] || "";
    }
    if (yFields.length === 0 || !numericCols.includes(yFields[0])) {
      yFields = numericCols.slice(0, 1);
    }
    return { valid: true, fixedConfig: { ...config, x_field: xField, y_fields: yFields } };
  }

  if (xField && !(xField in sampleRow)) {
    xField = stringCols[0] || availableKeys[0] || "";
  }

  if (yFields.length > 0) {
    const validYFields = yFields.filter((field) => field in sampleRow);
    if (validYFields.length === 0) {
      if (numericCols.length === 0) {
        return {
          valid: false,
          message: `No numeric columns found for chart. Available: ${availableKeys.join(", ")}`,
        };
      }
      yFields = numericCols.slice(0, 3);
    } else {
      yFields = validYFields;
    }
  }

  return {
    valid: true,
    fixedConfig:
      xField !== config.x_field || yFields !== config.y_fields
        ? { ...config, x_field: xField, y_fields: yFields }
        : config,
  };
}

function DataError({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
        <AlertCircle size={20} className="text-amber-500" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

function EmptyData() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Database size={20} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">No matching data found for this query</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">Try modifying your prompt or check the data source</p>
    </div>
  );
}

export function WidgetRenderer({
  widget,
  onFilterChange,
  onTextChange,
  onChartClick,
}: Props) {
  const data = widget.data || widget.cached_data || [];
  const config = widget.chart_config;
  const normalizedType = normalizeWidgetType(widget.type);

  if (CHART_TYPES.has(normalizedType) || normalizedType === "table") {
    const validation = validateChartData(data as Record<string, unknown>[], config, normalizedType);

    if (!validation.valid) {
      if (data && (data as Record<string, unknown>[]).length > 0) {
        return <TableWidget data={data as Record<string, unknown>[]} columns={config?.y_fields} />;
      }
      return validation.message ? <DataError message={validation.message} /> : <EmptyData />;
    }

    const effectiveConfig = validation.fixedConfig || config;

    if (normalizedType === "table") {
      return <TableWidget data={data as Record<string, unknown>[]} columns={effectiveConfig?.y_fields} />;
    }

    return (
      <ChartRenderer
        type={normalizedType}
        data={data as Record<string, unknown>[]}
        chartConfig={effectiveConfig}
        onChartClick={onChartClick}
      />
    );
  }

  switch (normalizedType) {
    case "kpi": {
      const kpiData = data as Record<string, unknown>[];
      if (!kpiData || kpiData.length === 0) {
        return <EmptyData />;
      }
      const firstRow = kpiData[0];
      const valueField = config?.metric_name || config?.y_fields?.[0];
      const value = firstRow ? Number(firstRow[valueField] ?? 0) : 0;
      const label =
        config?.x_axis_label ||
        config?.metric_name ||
        (config?.x_field && firstRow ? String(firstRow[config.x_field] ?? valueField) : valueField) ||
        widget.title ||
        "Metric";

      return (
        <KPIWidget
          value={value}
          title={label}
          subtitle={widget.prompt_used ?? undefined}
          prefix={config?.prefix as string | undefined}
          suffix={config?.suffix as string | undefined}
        />
      );
    }

    case "text":
      return (
        <TextWidget
          content={(config?.content as string) ?? widget.prompt_used ?? ""}
          onChange={onTextChange}
          readOnly={!onTextChange}
        />
      );

    case "filter": {
      const filterType: FilterType = (config?.filter_type as FilterType) ?? "select";
      const options = (config?.options as string[]) ?? [];
      const filterValue = (config?.current_value as string | { start: string; end: string }) ?? "";
      return (
        <FilterWidget
          type={filterType}
          options={options}
          value={filterValue}
          onChange={onFilterChange ?? (() => {})}
          label={widget.title ?? config?.x_field ?? undefined}
          placeholder={config?.placeholder as string | undefined}
        />
      );
    }

    default:
      if (data && (data as Record<string, unknown>[]).length > 0) {
        return <TableWidget data={data as Record<string, unknown>[]} columns={config?.y_fields} />;
      }
      return (
        <DataError
          message={
            ALL_KNOWN_TYPES.has(normalizedType)
              ? "No matching data found for this query"
              : "Unable to render widget. Try changing the chart type."
          }
        />
      );
  }
}
