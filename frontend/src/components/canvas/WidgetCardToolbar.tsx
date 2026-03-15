import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Copy,
  Download,
  MoreVertical,
  Paintbrush2,
  Pencil,
  RefreshCw,
  Sigma,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { CHART_TYPE_ICONS, CHART_TYPE_LABELS } from "@/lib/chartConfig";
import { CHART_TYPE_OPTIONS, normalizeWidgetType } from "@/lib/widgetConfig";

export type EditorTab = "chart_settings" | "mathematical_summary" | "style_editor";

interface Props {
  type: string;
  disabled?: boolean;
  onChangeChartType: (type: string) => void;
  onOpenTab: (tab: EditorTab) => void;
  onToggleMetrics: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onDownloadCsv: () => void;
}

const buttonClassName =
  "rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-100";

export function WidgetCardToolbar({
  type,
  disabled = false,
  onChangeChartType,
  onOpenTab,
  onToggleMetrics,
  onDuplicate,
  onDelete,
  onRefresh,
  onDownloadCsv,
}: Props) {
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const normalizedType = normalizeWidgetType(type);
  const currentType = useMemo(() => {
    const option = CHART_TYPE_OPTIONS.find((availableType) => availableType.value === normalizedType);

    return {
      icon: option?.icon || CHART_TYPE_ICONS[normalizedType] || BarChart3,
      label: option?.label || CHART_TYPE_LABELS[normalizedType] || "Change chart type",
    };
  }, [normalizedType]);

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenTab("chart_settings");
        }}
        className={buttonClassName}
        title="Edit chart"
      >
        <Pencil size={14} />
      </button>

      {!disabled && currentType && (
        <div className="relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setChartPickerOpen((open) => !open);
              setMenuOpen(false);
            }}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-xs text-gray-700 shadow-sm transition-colors hover:bg-white dark:bg-gray-800/80 dark:text-gray-200"
            title="Change chart type"
          >
            <currentType.icon size={12} />
            <ChevronDown size={12} />
          </button>
          {chartPickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setChartPickerOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                {CHART_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setChartPickerOpen(false);
                      onChangeChartType(option.value);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      option.value === normalizedType
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800",
                    )}
                  >
                    <option.icon size={14} />
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenTab("style_editor");
        }}
        className={buttonClassName}
        title="Open style editor"
      >
        <Paintbrush2 size={14} />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleMetrics();
        }}
        className={buttonClassName}
        title="Show metrics"
      >
        <Sigma size={14} />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDuplicate();
        }}
        className={buttonClassName}
        title="Duplicate card"
      >
        <Copy size={14} />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
            setChartPickerOpen(false);
          }}
          className={buttonClassName}
          title="More actions"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onRefresh();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onDownloadCsv();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Download size={14} /> Download CSV
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
