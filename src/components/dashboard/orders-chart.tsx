"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OrderStatusCount {
  status: string;
  _count: { status: number };
}

interface OrdersChartProps {
  data: OrderStatusCount[];
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#3B82F6",
  CONFIRMED: "#6366F1",
  PROCESSING: "#F9A825",
  PACKED: "#3B7A57",
  OUT_FOR_DELIVERY: "#F97316",
  DELIVERED: "#2E7D32",
  CANCELLED: "#D32F2F",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-lg">
        <p className="mb-1 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
          {payload[0].name}
        </p>
        <p className="text-lg font-bold" style={{ color: payload[0].payload.fill }}>
          {payload[0].value} orders
        </p>
      </div>
    );
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLegend({ payload }: any) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2 pt-2">
      {payload.map((entry: { color: string; value: string }, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[#64748b]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function OrdersChart({ data }: OrdersChartProps) {
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] || d.status,
    value: d._count.status,
    fill: STATUS_COLORS[d.status] || "#94a3b8",
  }));

  if (!chartData.length) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="text-sm text-[#64748b]">No order data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
