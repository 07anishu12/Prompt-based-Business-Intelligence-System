import type { Widget } from "@/types/widget";
import { ChartWidget, type ChartType } from "./ChartWidget";
import { TableWidget } from "./TableWidget";
import { KPIWidget } from "./KPIWidget";
import { TextWidget } from "./TextWidget";
import { FilterWidget, type FilterType } from "./FilterWidget";

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
  "area",
  "scatter",
  "heatmap",
]);

export function WidgetRenderer({
  widget,
  onFilterChange,
  onTextChange,
  onChartClick,
}: Props) {
  const data = widget.data || widget.cached_data || [];
  const config = widget.chart_config;

  if (CHART_TYPES.has(widget.type)) {
    return (
      <ChartWidget
        type={widget.type as ChartType}
        data={data as Record<string, unknown>[]}
        chartConfig={config}
        onChartClick={onChartClick}
      />
    );
  }

  switch (widget.type) {
    case "table":
      return (
        <TableWidget
          data={data as Record<string, unknown>[]}
          columns={config?.y_fields}
        />
      );

    case "kpi": {
      const firstRow = (data as Record<string, unknown>[])[0];
      const valueField = config?.y_fields?.[0];
      const value = firstRow ? Number(firstRow[valueField] ?? 0) : 0;
      const label =
        config?.x_field && firstRow
          ? String(firstRow[config.x_field] ?? valueField)
          : valueField ?? widget.title ?? "Metric";

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
      const filterType: FilterType =
        (config?.filter_type as FilterType) ?? "select";
      const options = (config?.options as string[]) ?? [];
      const filterValue =
        (config?.current_value as string | { start: string; end: string }) ??
        "";
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
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Unsupported widget type: {widget.type}
        </div>
      );
  }
}
