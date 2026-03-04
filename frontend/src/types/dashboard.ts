import type { Widget } from "./widget";

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  layout: Record<string, unknown>;
  settings: Record<string, unknown>;
  is_public: boolean;
  widget_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardDetail extends Dashboard {
  widgets: Widget[];
}

export interface DashboardCreate {
  title: string;
  description?: string;
}

export interface DashboardUpdate {
  title?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
