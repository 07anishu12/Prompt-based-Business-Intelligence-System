import { useState } from "react";
import { Check, Grid3X3, Share, Download, Settings, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { dashboardApi } from "@/lib/api";
import { toast } from "@/components/shared/Toast";

interface Props {
  dashboardId: string;
  title: string;
  onTitleChange: (title: string) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

export function CanvasToolbar({ dashboardId, title, onTitleChange, showGrid, onToggleGrid }: Props) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [saving, setSaving] = useState(false);

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await dashboardApi.update(dashboardId, { title: editTitle.trim() });
      onTitleChange(editTitle.trim());
      setEditing(false);
    } catch {
      toast("error", "Failed to save title");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/api/public/dashboard/${dashboardId}`;
    await navigator.clipboard.writeText(url);
    toast("success", "Share link copied");
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-950">
      {/* Left: title */}
      <div className="flex items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setEditing(false);
              }}
              className="rounded border border-gray-300 px-2 py-1 text-sm font-semibold focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button onClick={handleSaveTitle} disabled={saving} className="rounded p-1 text-blue-600 hover:bg-blue-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditTitle(title); setEditing(true); }}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 dark:text-white"
          >
            {title}
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleGrid}
          className={clsx(
            "rounded-lg p-2 text-sm",
            showGrid
              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800",
          )}
          title="Toggle grid"
        >
          <Grid3X3 size={18} />
        </button>
        <button
          onClick={handleShare}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Share"
        >
          <Share size={18} />
        </button>
        <button
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Export"
          onClick={() => toast("info", "Export coming soon")}
        >
          <Download size={18} />
        </button>
        <button
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Settings"
          onClick={() => toast("info", "Settings coming soon")}
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
