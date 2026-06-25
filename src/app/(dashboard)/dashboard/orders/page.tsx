"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Download, Eye, RefreshCw, XCircle, ShoppingCart, Package, Truck, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { CreateOrderModal } from "@/components/orders/create-order-modal";
import { UpdateStatusModal } from "@/components/orders/update-status-modal";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  deliveryDate?: string;
  customer: { name: string; mobile: string };
  employee: { name: string };
  items: OrderItem[];
}

interface OrderStats {
  total: number;
  NEW: number;
  PROCESSING: number;
  DELIVERED: number;
  CANCELLED: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "NEW", label: "New" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PACKED", label: "Packed" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, NEW: 0, PROCESSING: 0, DELIVERED: 0, CANCELLED: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOrder, setUpdateOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);

      const allRes = await fetch("/api/orders?limit=1000");
      if (allRes.ok) {
        const allData = await allRes.json();
        const all: Order[] = allData.orders;
        setStats({
          total: allData.total,
          NEW: all.filter((o) => o.status === "NEW").length,
          PROCESSING: all.filter((o) => o.status === "PROCESSING").length,
          DELIVERED: all.filter((o) => o.status === "DELIVERED").length,
          CANCELLED: all.filter((o) => o.status === "CANCELLED").length,
        });
      }
    }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleExport = () => {
    const rows = orders.map((o) => ({
      "Order #": o.orderNumber,
      Customer: o.customer.name,
      Mobile: o.customer.mobile,
      Employee: o.employee.name,
      Items: o.items.length,
      "Total (₹)": o.totalAmount,
      Status: getStatusLabel(o.status),
      Date: formatDate(o.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders.xlsx");
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this order?")) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    fetchOrders();
  };

  const statsItems = [
    { label: "Total Orders", value: stats.total, icon: ShoppingCart, color: "#1E4D3D" },
    { label: "New", value: stats.NEW, icon: Package, color: "#1565C0" },
    { label: "Processing", value: stats.PROCESSING, icon: RefreshCw, color: "#E65100" },
    { label: "Delivered", value: stats.DELIVERED, icon: CheckCircle, color: "#2E7D32" },
    { label: "Cancelled", value: stats.CANCELLED, icon: AlertCircle, color: "#D32F2F" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Orders</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Manage and track all customer orders</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statsItems.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs text-[#64748b]">{s.label}</p>
                <p className="text-xl font-bold text-[#1a1a1a]">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#e2e8f0]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search by order # or customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-[#e2e8f0] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent"
            />
          </div>
          <div className="w-48">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent"
          />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#64748b]">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <ShoppingCart className="h-10 w-10 text-[#e2e8f0]" />
            <p className="text-[#64748b]">No orders found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-[#1E4D3D] hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customer.name}</div>
                    <div className="text-xs text-[#64748b]">{order.customer.mobile}</div>
                  </TableCell>
                  <TableCell>{order.employee.name}</TableCell>
                  <TableCell>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUpdateOrder(order)}
                        disabled={order.status === "CANCELLED" || order.status === "DELIVERED"}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#D32F2F] hover:text-[#D32F2F]"
                        onClick={() => handleCancel(order.id)}
                        disabled={order.status === "CANCELLED" || order.status === "DELIVERED"}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-sm text-[#64748b]">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={fetchOrders} />
      {updateOrder && (
        <UpdateStatusModal
          open={!!updateOrder}
          order={updateOrder}
          onClose={() => setUpdateOrder(null)}
          onSuccess={() => { setUpdateOrder(null); fetchOrders(); }}
        />
      )}
    </div>
  );
}
