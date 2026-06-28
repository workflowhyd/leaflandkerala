import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string | Date;
  customer: {
    name: string;
    mobile: string;
  };
  employee?: {
    name: string;
  } | null;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (!orders.length) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-[#64748b]">No recent orders</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile scrollable cards */}
      <div className="flex flex-col gap-2 px-4 pb-2 md:hidden">
        {orders.map((order) => (
          <a
            key={order.id}
            href={`/dashboard/orders/${order.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] p-3 hover:bg-[#f8f9fa] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs font-semibold text-[#1E4D3D]">
                  {order.orderNumber}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-sm font-medium text-[#1a1a1a] truncate">{order.customer.name}</p>
              <p className="text-xs text-[#64748b]">{formatDate(order.createdAt)}</p>
            </div>
            <span className="flex-shrink-0 font-bold text-[#1a1a1a]">
              {formatCurrency(order.totalAmount)}
            </span>
          </a>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-[#1E4D3D]">
                    {order.orderNumber}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">{order.customer.name}</p>
                    <p className="text-xs text-[#64748b]">{order.customer.mobile}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-[#1a1a1a]">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </TableCell>
                <TableCell className="text-[#64748b]">
                  {formatDate(order.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
