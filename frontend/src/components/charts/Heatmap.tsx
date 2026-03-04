import React, { useMemo } from "react";

export interface HeatmapConfig {
  x_field: string;
  y_fields: string[];
  value_field?: string;
  colors?: string[];
}

interface HeatmapProps {
  data: Record<string, unknown>[];
  config: HeatmapConfig;
}

/** Linearly interpolate between two colors represented as [r,g,b] */
function lerpColor(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Map a normalized 0-1 value to a green->yellow->red color scale */
function getHeatColor(normalized: number): string {
  const green = [16, 185, 129]; // #10b981
  const yellow = [245, 158, 11]; // #f59e0b
  const red = [239, 68, 68]; // #ef4444

  if (normalized <= 0.5) {
    return lerpColor(green, yellow, normalized * 2);
  }
  return lerpColor(yellow, red, (normalized - 0.5) * 2);
}

export function HeatmapComponent({ data, config }: HeatmapProps) {
  const { x_field, y_fields, value_field } = config;
  const vField = value_field || y_fields[0];

  const { xLabels, yLabels, grid, minVal, maxVal } = useMemo(() => {
    const xSet = new Set<string>();
    const ySet = new Set<string>();
    const map = new Map<string, number>();

    let min = Infinity;
    let max = -Infinity;

    // If y_fields has more than one field, treat each y_field as a row
    if (y_fields.length > 1) {
      data.forEach((row) => {
        const xVal = String(row[x_field] ?? "");
        xSet.add(xVal);
        y_fields.forEach((yf) => {
          ySet.add(yf);
          const val = Number(row[yf]) || 0;
          map.set(`${yf}|${xVal}`, val);
          if (val < min) min = val;
          if (val > max) max = val;
        });
      });
    } else {
      // Use group_field-like pattern: x_field as columns, first non-x/non-v field as rows
      const fields = Object.keys(data[0] || {});
      const rowField = fields.find(
        (f) => f !== x_field && f !== vField
      ) || x_field;

      data.forEach((row) => {
        const xVal = String(row[x_field] ?? "");
        const yVal = String(row[rowField] ?? "");
        const val = Number(row[vField]) || 0;

        xSet.add(xVal);
        ySet.add(yVal);
        map.set(`${yVal}|${xVal}`, val);
        if (val < min) min = val;
        if (val > max) max = val;
      });
    }

    const xArr = Array.from(xSet);
    const yArr = Array.from(ySet);
    const gridData: (number | null)[][] = yArr.map((y) =>
      xArr.map((x) => {
        const key = `${y}|${x}`;
        return map.has(key) ? map.get(key)! : null;
      })
    );

    return {
      xLabels: xArr,
      yLabels: yArr,
      grid: gridData,
      minVal: min === Infinity ? 0 : min,
      maxVal: max === -Infinity ? 1 : max,
    };
  }, [data, x_field, y_fields, vField]);

  const range = maxVal - minVal || 1;

  const cellPadding = 2;
  const labelWidth = 100;
  const labelHeight = 30;
  const cellWidth = 50;
  const cellHeight = 36;

  const svgWidth = labelWidth + xLabels.length * (cellWidth + cellPadding);
  const svgHeight = labelHeight + yLabels.length * (cellHeight + cellPadding);

  return (
    <div className="h-full w-full overflow-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="min-w-full"
        style={{ minWidth: svgWidth, minHeight: svgHeight }}
      >
        {/* X-axis labels */}
        {xLabels.map((label, xi) => (
          <text
            key={`x-${xi}`}
            x={labelWidth + xi * (cellWidth + cellPadding) + cellWidth / 2}
            y={labelHeight - 6}
            textAnchor="middle"
            fontSize={10}
            className="fill-gray-600 dark:fill-gray-400"
          >
            {label.length > 8 ? `${label.slice(0, 8)}...` : label}
          </text>
        ))}

        {/* Y-axis labels and cells */}
        {yLabels.map((yLabel, yi) => (
          <g key={`row-${yi}`}>
            <text
              x={labelWidth - 8}
              y={
                labelHeight +
                yi * (cellHeight + cellPadding) +
                cellHeight / 2 +
                4
              }
              textAnchor="end"
              fontSize={10}
              className="fill-gray-600 dark:fill-gray-400"
            >
              {yLabel.length > 12 ? `${yLabel.slice(0, 12)}...` : yLabel}
            </text>

            {xLabels.map((_, xi) => {
              const val = grid[yi][xi];
              const normalized =
                val !== null ? (val - minVal) / range : 0;
              const color =
                val !== null ? getHeatColor(normalized) : "#e5e7eb";

              return (
                <g key={`cell-${yi}-${xi}`}>
                  <rect
                    x={labelWidth + xi * (cellWidth + cellPadding)}
                    y={labelHeight + yi * (cellHeight + cellPadding)}
                    width={cellWidth}
                    height={cellHeight}
                    rx={4}
                    fill={color}
                    opacity={val !== null ? 0.85 : 0.3}
                  >
                    <title>
                      {`${yLabel}, ${xLabels[xi]}: ${val !== null ? val.toLocaleString() : "N/A"}`}
                    </title>
                  </rect>
                  {val !== null && (
                    <text
                      x={
                        labelWidth +
                        xi * (cellWidth + cellPadding) +
                        cellWidth / 2
                      }
                      y={
                        labelHeight +
                        yi * (cellHeight + cellPadding) +
                        cellHeight / 2 +
                        4
                      }
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={500}
                      fill="#fff"
                    >
                      {typeof val === "number" && Math.abs(val) >= 1000
                        ? `${(val / 1000).toFixed(1)}k`
                        : val?.toFixed(1)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default HeatmapComponent;
