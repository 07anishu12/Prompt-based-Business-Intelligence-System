import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { LayoutPosition, Widget } from "@/types/widget";

export function useWebSocket(dashboardId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const { addWidget, setWidgets } = useDashboardStore();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!dashboardId || !token) return;

    const socket = io("/dashboard", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_dashboard", { dashboard_id: dashboardId });
    });

    socket.on("widget:created", (widget: Widget) => {
      addWidget(widget);
    });

    socket.on("widget:updated", (widget: Widget) => {
      const current = useDashboardStore.getState().widgets;
      setWidgets(current.map((w) => (w.id === widget.id ? widget : w)));
    });

    socket.on("widget:deleted", (data: { id: string }) => {
      const current = useDashboardStore.getState().widgets;
      setWidgets(current.filter((w) => w.id !== data.id));
    });

    socket.on("widget:moved", (data: { id: string; layout_position: LayoutPosition }) => {
      const current = useDashboardStore.getState().widgets;
      setWidgets(
        current.map((w) =>
          w.id === data.id ? { ...w, layout_position: data.layout_position } : w,
        ),
      );
    });

    socket.on("dashboard:layout_changed", () => {
      // Re-fetch to get the latest layout
      useDashboardStore.getState().fetchDashboard(dashboardId);
    });

    return () => {
      socket.emit("leave_dashboard", { dashboard_id: dashboardId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dashboardId]);

  return socketRef;
}
