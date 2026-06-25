import { Badge } from "@/components/ui/badge";
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

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "danger" | "info" | "outline" {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED") return "danger";
  if (["OUT_FOR_DELIVERY", "PROCESSING", "PACKED"].includes(status)) return "warning";
  if (status === "NEW") return "info";
  return "outline";
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
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
              >
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
  );
}
