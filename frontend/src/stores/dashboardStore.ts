import { create } from "zustand";
import { dashboardApi, widgetApi } from "@/lib/api";
import type { Dashboard, DashboardCreate, DashboardDetail, LayoutItem } from "@/types/dashboard";
import type { Widget, WidgetUpdate } from "@/types/widget";

interface DashboardState {
  dashboards: Dashboard[];
  currentDashboard: DashboardDetail | null;
  widgets: Widget[];
  isLoading: boolean;

  fetchDashboards: () => Promise<void>;
  fetchDashboard: (id: string) => Promise<void>;
  createDashboard: (data: DashboardCreate) => Promise<Dashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  updateLayout: (id: string, items: LayoutItem[]) => Promise<void>;

  addWidget: (widget: Widget) => void;
  updateWidget: (id: string, data: WidgetUpdate) => Promise<void>;
  removeWidget: (id: string) => Promise<void>;
  refreshWidget: (id: string) => Promise<void>;
  setWidgets: (widgets: Widget[]) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  currentDashboard: null,
  widgets: [],
  isLoading: false,

  fetchDashboards: async () => {
    set({ isLoading: true });
    try {
      const dashboards = await dashboardApi.list();
      set({ dashboards });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDashboard: async (id) => {
    set({ isLoading: true });
    try {
      const dashboard = await dashboardApi.get(id);
      set({
        currentDashboard: dashboard,
        widgets: dashboard.widgets || [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createDashboard: async (data) => {
    const dashboard = await dashboardApi.create(data);
    set({ dashboards: [...get().dashboards, dashboard] });
    return dashboard;
  },

  deleteDashboard: async (id) => {
    await dashboardApi.delete(id);
    set({ dashboards: get().dashboards.filter((d) => d.id !== id) });
  },

  updateLayout: async (id, items) => {
    await dashboardApi.updateLayout(id, items);
  },

  addWidget: (widget) => {
    set({ widgets: [...get().widgets, widget] });
  },

  updateWidget: async (id, data) => {
    const updated = await widgetApi.update(id, data);
    set({ widgets: get().widgets.map((w) => (w.id === id ? updated : w)) });
  },

  removeWidget: async (id) => {
    await widgetApi.delete(id);
    set({ widgets: get().widgets.filter((w) => w.id !== id) });
  },

  refreshWidget: async (id) => {
    const updated = await widgetApi.refresh(id);
    set({ widgets: get().widgets.map((w) => (w.id === id ? updated : w)) });
  },

  setWidgets: (widgets) => set({ widgets }),
}));
