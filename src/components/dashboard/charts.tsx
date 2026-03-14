"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const GRADE_COLORS: Record<string, string> = {
  WW180: "#1B4332",
  WW240: "#2D6A4F",
  WW320: "#52B788",
  Roasted: "#D4A017",
  Custom: "#94A3B8",
};

interface StockChartProps {
  data: { grade: string; weight: number }[];
}

export function StockPieChart({ data }: StockChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="weight"
          nameKey="grade"
          label={({ name, value }) => {
            const w = Number(value);
            return `${name}: ${w >= 1000 ? `${(w / 1000).toFixed(1)}t` : `${w}kg`}`;
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.grade}
              fill={GRADE_COLORS[entry.grade] || "#94A3B8"}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const v = Number(value);
            return `${v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`}`;
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface IntakeChartProps {
  data: { month: string; weight: number }[];
}

export function IntakeBarChart({ data }: IntakeChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis
          fontSize={12}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}t` : `${v}`
          }
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toLocaleString()}kg`,
            "Weight",
          ]}
        />
        <Bar dataKey="weight" fill="#1B4332" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
