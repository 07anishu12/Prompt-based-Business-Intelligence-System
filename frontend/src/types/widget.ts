export interface ChartConfig {
  x_field: string;
  y_fields: string[];
  group_field?: string;
  aggregation: string;
  colors: string[];
  stacked: boolean;
  show_values: boolean;
  orientation: string;
  /** Allow extra properties used by KPI, text, and filter widgets */
  [key: string]: unknown;
}

export interface LayoutPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  min_w?: number;
  min_h?: number;
}

export interface Widget {
  id: string;
  dashboard_id: string;
  type: string;
  title?: string;
  prompt_used?: string;
  chart_config: ChartConfig;
  layout_position: LayoutPosition;
  data?: Record<string, unknown>[];
  cached_data?: Record<string, unknown>[];
  created_at: string;
}

export interface WidgetCreate {
  dashboard_id: string;
  type: string;
  title?: string;
  connection_id?: string;
  query_config: Record<string, unknown>;
  chart_config: Record<string, unknown>;
  layout_position: Record<string, unknown>;
}

export interface WidgetUpdate {
  title?: string;
  chart_config?: Record<string, unknown>;
  layout_position?: Record<string, unknown>;
}
