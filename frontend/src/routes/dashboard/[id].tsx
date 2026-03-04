import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { DashboardCanvas } from "@/components/canvas/DashboardCanvas";
import { PromptBar } from "@/components/prompt/PromptBar";

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { currentDashboard, isLoading, fetchDashboard } = useDashboardStore();
  const { fetchConnections } = useConnectionStore();
  const [showGrid, setShowGrid] = useState(false);
  const [title, setTitle] = useState("");
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardCanvas
          dashboardId={id!}
          showGrid={showGrid}
          onPromptFocus={() => promptRef.current?.querySelector("input")?.focus()}
        />

        <div ref={promptRef} className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <PromptBar dashboardId={id} />
        </div>
      </div>
    </div>
  );
}
