import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { DashboardCanvas } from "@/components/canvas/DashboardCanvas";
import { WidgetEditorPanel } from "@/components/canvas/WidgetEditorPanel";
import type { EditorTab } from "@/components/canvas/WidgetCardToolbar";
import { PromptBar } from "@/components/prompt/PromptBar";

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { currentDashboard, isLoading, fetchDashboard, widgets } = useDashboardStore();
  const { fetchConnections } = useConnectionStore();
  const [showGrid, setShowGrid] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("chart_settings");
  const promptRef = useRef<HTMLDivElement>(null);

  useWebSocket(id);

  useEffect(() => {
    if (id) {
      fetchDashboard(id);
      fetchConnections();
    }
  }, [id, fetchDashboard, fetchConnections]);

  useEffect(() => {
    if (currentDashboard) {
      setTitle(currentDashboard.title);
    }
  }, [currentDashboard]);

  useEffect(() => {
    if (!selectedWidgetId) return;
    if (!widgets.some((widget) => widget.id === selectedWidgetId)) {
      setSelectedWidgetId(null);
    }
  }, [selectedWidgetId, widgets]);

  const selectedWidget = useMemo(
    () => widgets.find((widget) => widget.id === selectedWidgetId) || null,
    [selectedWidgetId, widgets],
  );

  if (isLoading || !currentDashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <CanvasToolbar
        dashboardId={id!}
        title={title}
        onTitleChange={setTitle}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardCanvas
            dashboardId={id!}
            showGrid={showGrid}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={(widgetId) => {
              setSelectedWidgetId(widgetId);
              setActiveTab("chart_settings");
            }}
            onOpenWidgetTab={(widgetId, tab) => {
              setSelectedWidgetId(widgetId);
              setActiveTab(tab);
            }}
            onPromptFocus={() => promptRef.current?.querySelector("input")?.focus()}
          />

          <div
            ref={promptRef}
            className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <PromptBar dashboardId={id} />
          </div>
        </div>

        <WidgetEditorPanel
          widget={selectedWidget}
          activeTab={activeTab}
          onClose={() => setSelectedWidgetId(null)}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}
