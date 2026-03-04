import { useState } from "react";
import { GripVertical, MoreVertical, RefreshCw, Trash2, Copy, Download } from "lucide-react";
import { clsx } from "clsx";
import { useDashboardStore } from "@/stores/dashboardStore";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { toast } from "@/components/shared/Toast";
import type { Widget } from "@/types/widget";

interface Props {
  widget: Widget;
}

export function WidgetWrapper({ widget }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { removeWidget, refreshWidget } = useDashboardStore();

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

  return (
    <div className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="drag-handle cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing">
          <GripVertical size={16} />
        </div>
        <h4 className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
          {widget.title || "Untitled"}
        </h4>

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
