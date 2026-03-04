import { useCallback, useRef, useMemo } from "react";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import { Plus, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useDashboardStore } from "@/stores/dashboardStore";
import { WidgetWrapper } from "./WidgetWrapper";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  dashboardId: string;
  showGrid: boolean;
  onPromptFocus: () => void;
}

export function DashboardCanvas({ dashboardId, showGrid, onPromptFocus }: Props) {
  const { widgets, updateLayout } = useDashboardStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const layouts = useMemo(() => {
    return widgets.map((w) => ({
      i: w.id,
      x: w.layout_position.x,
      y: w.layout_position.y,
      w: w.layout_position.w,
      h: w.layout_position.h,
      minW: w.layout_position.min_w ?? 2,
      minH: w.layout_position.min_h ?? 2,
    }));
  }, [widgets]);

  const handleLayoutChange = useCallback(
    (layout: Layout[]) => {
      // Debounce save to 2 seconds
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const items = layout.map((l) => ({
          id: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        }));
        updateLayout(dashboardId, items);
      }, 2000);
    },
    [dashboardId, updateLayout],
  );

  if (widgets.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Plus size={32} className="text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Create your first widget
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Use the prompt bar below to ask about your data
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["Show monthly revenue", "Top 10 customers", "Sales by region"].map(
            (example) => (
              <button
                key={example}
                onClick={onPromptFocus}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                <Sparkles size={14} />
                {example}
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex-1 overflow-auto p-4", showGrid && "dot-grid-bg")}>
      <ResponsiveGridLayout
        layouts={{ lg: layouts }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 24, md: 16, sm: 8, xs: 4 }}
        rowHeight={40}
        margin={[8, 8]}
        compactType="vertical"
        preventCollision={false}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <WidgetWrapper widget={widget} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
