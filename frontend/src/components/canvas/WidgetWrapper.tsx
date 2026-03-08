import { useState, useRef, useEffect } from "react";
import {
  GripVertical,
  MoreVertical,
  RefreshCw,
  Trash2,
  Copy,
  Download,
  Pencil,
  Check,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  ScatterChart as ScatterChartIcon,
  Table,
  ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { useDashboardStore } from "@/stores/dashboardStore";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { toast } from "@/components/shared/Toast";
import type { Widget } from "@/types/widget";

// ── Chart type definitions ──────────────────────────────────

const CHART_TYPE_OPTIONS = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "area", label: "Area Chart", icon: AreaChartIcon },
  { value: "donut", label: "Donut Chart", icon: PieChartIcon },
  { value: "scatter", label: "Scatter Plot", icon: ScatterChartIcon },
  { value: "table", label: "Table View", icon: Table },
] as const;

interface Props {
  widget: Widget;
}

export function WidgetWrapper({ widget }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Editable title state ──
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(widget.title || "Untitled");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Chart type picker state ──
  const [chartPickerOpen, setChartPickerOpen] = useState(false);

  const { removeWidget, refreshWidget, updateWidget } = useDashboardStore();

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  // Sync draft when widget title changes externally
  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(widget.title || "Untitled");
    }
  }, [widget.title, isEditingTitle]);

  // ── Handlers ──────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshWidget(widget.id);
    } catch {
      toast("error", "Refresh failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm("Delete this widget?")) return;
    try {
      await removeWidget(widget.id);
      toast("success", "Widget deleted");
    } catch {
      toast("error", "Failed to delete widget");
    }
  };

  const handleDownloadCSV = () => {
    setMenuOpen(false);
    if (!widget.data?.length) return;
    const headers = Object.keys(widget.data[0]);
    const csv = [
      headers.join(","),
      ...widget.data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${widget.title || "widget"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Title editing ──
  const saveTitle = async () => {
    const newTitle = titleDraft.trim() || "Untitled";
    setTitleDraft(newTitle);
    setIsEditingTitle(false);
    if (newTitle !== (widget.title || "Untitled")) {
      try {
        await updateWidget(widget.id, { title: newTitle });
      } catch {
        toast("error", "Failed to update title");
        setTitleDraft(widget.title || "Untitled");
      }
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    }
    if (e.key === "Escape") {
      setTitleDraft(widget.title || "Untitled");
      setIsEditingTitle(false);
    }
  };

  // ── Chart type switching (no query re-run — same data, different visualization) ──
  const handleChangeChartType = async (newType: string) => {
    setChartPickerOpen(false);
    if (newType === widget.type) return;
    try {
      await updateWidget(widget.id, { type: newType });
      toast("success", `Changed to ${CHART_TYPE_OPTIONS.find((o) => o.value === newType)?.label || newType}`);
    } catch {
      toast("error", "Failed to change chart type");
    }
  };

  // Allow switching for any data-bearing widget (charts, tables, kpi, heatmap)
  // Only text and filter widgets don't support chart switching
  const canSwitchType = widget.type !== "text" && widget.type !== "filter";
  const currentTypeOption = CHART_TYPE_OPTIONS.find((o) => o.value === widget.type);

  return (
    <div className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="drag-handle cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing">
          <GripVertical size={16} />
        </div>

        {/* Editable title */}
        {isEditingTitle ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={saveTitle}
              className="flex-1 rounded border border-blue-400 bg-transparent px-1 py-0.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-200"
              maxLength={100}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); saveTitle(); }}
              className="rounded p-0.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <h4
            className="flex-1 cursor-pointer truncate text-sm font-medium text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit title"
          >
            {widget.title || "Untitled"}
            <Pencil size={10} className="ml-1 inline opacity-0 group-hover:opacity-50" />
          </h4>
        )}

        {/* Chart type switcher */}
        {canSwitchType && (
          <div className="relative">
            <button
              onClick={() => setChartPickerOpen(!chartPickerOpen)}
              className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Change chart type"
            >
              {currentTypeOption && <currentTypeOption.icon size={12} />}
              <ChevronDown size={10} />
            </button>
            {chartPickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setChartPickerOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {CHART_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChangeChartType(opt.value)}
                      className={clsx(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                        opt.value === widget.type
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800",
                      )}
                    >
                      <opt.icon size={14} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {isLoading && (
          <RefreshCw size={14} className="animate-spin text-blue-500" />
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  onClick={() => { setMenuOpen(false); setIsEditingTitle(true); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Pencil size={14} /> Rename
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleRefresh(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Download size={14} /> Download CSV
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  onClick={() => { setMenuOpen(false); toast("info", "Duplicate coming soon"); }}
                >
                  <Copy size={14} /> Duplicate
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button
                  onClick={handleDelete}
                  className={clsx(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-sm",
                    "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
                  )}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-hidden p-2">
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  );
}
