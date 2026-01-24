"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LineChartData {
  period: string;
  value: number;
}

interface LineChartProps {
  title: string;
  description?: string;
  data: LineChartData[];
  valueFormatter?: (value: number) => string;
  height?: number;
  color?: string;
}

export default function LineChart({
  title,
  description,
  data,
  valueFormatter = (value) => value.toLocaleString(),
  height = 300,
  color = "hsl(221, 83%, 53%)",
}: LineChartProps) {
  // Filter out invalid data points
  const validData = data.filter(
    (d) =>
      d.value !== null &&
      d.value !== undefined &&
      !isNaN(Number(d.value)) &&
      isFinite(Number(d.value))
  );

  if (validData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const values = validData.map((d) => Number(d.value));
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  // Simple SVG line chart
  const chartWidth = 600;
  const chartHeight = height - 60;
  const padding = 40;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  const points = validData.map((item, index) => {
    const value = Number(item.value);
    const x = padding + (index / (validData.length - 1 || 1)) * innerWidth;
    const normalizedValue = (value - minValue) / range;
    const y = padding + innerHeight - normalizedValue * innerHeight;
    
    // Ensure y is a valid number
    const validY = isNaN(y) || !isFinite(y) ? padding + innerHeight / 2 : y;
    
    return { x, y: validY, value, period: item.period };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg width={chartWidth} height={chartHeight} className="w-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + innerHeight - ratio * innerHeight;
              const value = minValue + ratio * range;
              return (
                <g key={ratio}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.1"
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    fontSize="10"
                    fill="currentColor"
                    textAnchor="end"
                    className="text-muted-foreground"
                  >
                    {valueFormatter(value)}
                  </text>
                </g>
              );
            })}

            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={color}
                  className="hover:r-6 transition-all"
                />
                <title>
                  {point.period}: {valueFormatter(point.value)}
                </title>
              </g>
            ))}

            {/* X-axis labels */}
            {validData.map((item, index) => {
              if (index % Math.ceil(validData.length / 6) !== 0 && index !== validData.length - 1) {
                return null;
              }
              const x = padding + (index / (validData.length - 1 || 1)) * innerWidth;
              return (
                <text
                  key={index}
                  x={x}
                  y={chartHeight - padding + 20}
                  fontSize="10"
                  fill="currentColor"
                  textAnchor="middle"
                  className="text-muted-foreground"
                >
                  {item.period.length > 10
                    ? item.period.substring(0, 10) + "..."
                    : item.period}
                </text>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
