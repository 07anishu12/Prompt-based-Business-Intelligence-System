import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Copy,
  Download,
  GripVertical,
  Loader2,
  Paintbrush2,
  Pencil,
  RefreshCw,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/components/shared/Toast";
import { useWidgetSummary } from "@/hooks/useWidgetSummary";
import { useDashboardStore } from "@/stores/dashboardStore";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { WidgetCardToolbar, type EditorTab } from "./WidgetCardToolbar";
import { InlineEditableText } from "./InlineEditableText";
import { WidgetSummaryStrip } from "./WidgetSummaryStrip";
import {
  buildChartTypeUpdate,
  createChartConfig,
  getCardDescription,
  getWidgetMetricConfig,
  getWidgetStyleConfig,
} from "@/lib/widgetConfig";
import { getCardContainerStyle, getWidgetTextStyle } from "@/lib/widgetStyles";
import type { Widget } from "@/types/widget";

interface Props {
  widget: Widget;
  isSelected: boolean;
  onSelect: (widgetId: string) => void;
  onOpenTab: (tab: EditorTab) => void;
}

export function WidgetWrapper({ widget, isSelected, onSelect, onOpenTab }: Props) {
  const { duplicateWidget, refreshWidget, removeWidget, updateWidget } = useDashboardStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const summary = useWidgetSummary(widget);
  const metricConfig = useMemo(() => getWidgetMetricConfig(widget), [widget]);
  const styleConfig = useMemo(() => getWidgetStyleConfig(widget), [widget]);
  const cardStyle = useMemo(
    () => getCardContainerStyle(styleConfig, isHovered || isSelected),
    [isHovered, isSelected, styleConfig],
  );
  const textStyle = useMemo(() => getWidgetTextStyle(styleConfig), [styleConfig]);
  const cardDescription = getCardDescription(widget);
  const showSummary = Boolean(metricConfig.show_in_header ?? true);

  useEffect(() => {
    if (!contextMenu) return undefined;

    const handleWindowClick = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("mousedown", handleWindowClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleWindowClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  const commitUpdate = async (updater: () => Promise<void>, errorMessage: string) => {
    try {
      await updater();
    } catch {
      toast("error", errorMessage);
    }
  };

  const handleChartTypeChange = async (nextType: string) => {
    onSelect(widget.id);
    await commitUpdate(
      () => updateWidget(widget.id, buildChartTypeUpdate(widget, nextType)),
      "Failed to change chart type",
    );
  };

  const handleSummaryToggle = async () => {
    onSelect(widget.id);
    onOpenTab("mathematical_summary");
    await commitUpdate(
      () =>
        updateWidget(widget.id, {
          chart_config: createChartConfig(widget, {
            metric_config: {
              ...metricConfig,
              show_in_header: !showSummary,
            },
          }),
        }),
      "Failed to update summary metrics",
    );
  };

  const handleDuplicate = async () => {
    setContextMenu(null);
    onSelect(widget.id);
    await commitUpdate(
      async () => {
        const duplicated = await duplicateWidget(widget.id);
        onSelect(duplicated.id);
      },
      "Failed to duplicate widget",
    );
  };

  const handleDelete = async () => {
    setContextMenu(null);
    onSelect(widget.id);
    if (!window.confirm("Delete this card?")) return;

    await commitUpdate(() => removeWidget(widget.id), "Failed to delete widget");
  };

  const handleRefresh = async () => {
    setContextMenu(null);
    setIsRefreshing(true);
    await commitUpdate(() => refreshWidget(widget.id), "Refresh failed");
    setIsRefreshing(false);
  };

  const handleDownloadCsv = () => {
    setContextMenu(null);
    const rows = widget.data || widget.cached_data || [];
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${widget.title || "widget"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={() => onSelect(widget.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        onSelect(widget.id);
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
        });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "group flex h-full min-h-0 flex-col overflow-hidden border",
        isSelected && "ring-2 ring-blue-500/25",
      )}
      style={cardStyle}
    >
      <div
        className="flex items-start gap-3 border-b border-black/5"
        style={{
          padding: styleConfig.padding,
        }}
      >
        <button
          type="button"
          className="drag-handle mt-1 cursor-grab rounded-lg p-1 text-gray-400 transition hover:bg-white/60 hover:text-gray-700 active:cursor-grabbing dark:hover:bg-gray-800/80 dark:hover:text-gray-100"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div style={textStyle}>
            <InlineEditableText
              value={widget.title || ""}
              placeholder="Untitled card"
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
              onSave={(value) =>
                commitUpdate(
                  () => updateWidget(widget.id, { title: value.trim() || "Untitled" }),
                  "Failed to update card title",
                )
              }
            />
          </div>

          <div style={textStyle}>
            <InlineEditableText
              value={cardDescription}
              placeholder="Add a card description"
              multiline
              className="text-xs text-gray-500 dark:text-gray-400"
              inputClassName="text-xs"
              onSave={(value) =>
                commitUpdate(
                  () =>
                    updateWidget(widget.id, {
                      chart_config: createChartConfig(widget, {
                        card_description: value,
                      }),
                    }),
                  "Failed to update card description",
                )
              }
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isRefreshing && <Loader2 size={14} className="animate-spin text-blue-500" />}
          <WidgetCardToolbar
            type={widget.type}
            onChangeChartType={(type) => void handleChartTypeChange(type)}
            onOpenTab={(tab) => {
              onSelect(widget.id);
              onOpenTab(tab);
            }}
            onToggleMetrics={() => void handleSummaryToggle()}
            onDuplicate={() => void handleDuplicate()}
            onDelete={() => void handleDelete()}
            onRefresh={() => void handleRefresh()}
            onDownloadCsv={handleDownloadCsv}
          />
        </div>
      </div>

      {showSummary && summary && summary.headerMetrics.length > 0 && (
        <div
          className="border-b border-black/5"
          style={{
            paddingLeft: styleConfig.padding,
            paddingRight: styleConfig.padding,
            paddingBottom: styleConfig.spacing,
          }}
        >
          <WidgetSummaryStrip metrics={summary.headerMetrics} compact />
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          padding: styleConfig.padding,
        }}
      >
        <div className="h-full min-h-0 overflow-hidden rounded-2xl bg-white/10 dark:bg-black/10">
          <WidgetRenderer widget={widget} />
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[220px] rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onSelect(widget.id);
              onOpenTab("chart_settings");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Pencil size={14} />
            Edit Chart
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onSelect(widget.id);
              onOpenTab("chart_settings");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <BarChart3 size={14} />
            Change Chart Type
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onSelect(widget.id);
              onOpenTab("style_editor");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Paintbrush2 size={14} />
            Change Color
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              onSelect(widget.id);
              onOpenTab("chart_settings");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <TextCursorInput size={14} />
            Edit Axis Labels
          </button>
          <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
          <button
            type="button"
            onClick={() => void handleDuplicate()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Copy size={14} />
            Duplicate Card
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} />
            Refresh Data
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Download size={14} />
            Export Data
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 size={14} />
            Delete Card
          </button>
        </div>
      )}
    </div>
  );
}
