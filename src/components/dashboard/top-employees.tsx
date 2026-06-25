import { formatCurrency } from "@/lib/utils";
import { Trophy, TrendingUp } from "lucide-react";

interface TopEmployee {
  id: string;
  name: string;
  totalRevenue: number;
  ordersCount: number;
  customersCount: number;
  commission: number;
}

interface TopEmployeesProps {
  employees: TopEmployee[];
}

const RANK_COLORS = ["#F9A825", "#94a3b8", "#cd7f32", "#1E4D3D", "#3B7A57"];
const RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];

export function TopEmployees({ employees }: TopEmployeesProps) {
  if (!employees.length) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-[#64748b]">No employee data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {employees.map((emp, index) => (
        <div
          key={emp.id}
          className="flex items-center gap-4 rounded-xl border border-[#e2e8f0] bg-[#fafafa] px-4 py-3 transition-all hover:border-[#1E4D3D]/20 hover:bg-[#1E4D3D]/[0.03]"
        >
          {/* Rank badge */}
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: RANK_COLORS[index] || "#94a3b8" }}
          >
            {index === 0 ? (
              <Trophy className="h-4 w-4" />
            ) : (
              RANK_LABELS[index]
            )}
          </div>

          {/* Employee info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[#1a1a1a]">{emp.name}</p>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-[#64748b]">
              <span>{emp.ordersCount} orders</span>
              <span className="h-1 w-1 rounded-full bg-[#cbd5e1]" />
              <span>{emp.customersCount} customers</span>
            </div>
          </div>

          {/* Revenue & commission */}
          <div className="flex-shrink-0 text-right">
            <p className="font-bold text-[#1E4D3D]">{formatCurrency(emp.totalRevenue)}</p>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-[#2E7D32]">
              <TrendingUp className="h-3 w-3" />
              <span>{formatCurrency(emp.commission)} commission</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
