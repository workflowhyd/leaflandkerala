"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus, Search, Download, Eye, RefreshCw, XCircle,
  ShoppingCart, Package, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Phone,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { CreateOrderModal } from "@/components/orders/create-order-modal";
import { UpdateStatusModal } from "@/components/orders/update-status-modal";
import { useToast } from "@/components/ui/toast";

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

function CancelConfirmModal({
  open,
  orderNumber,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  orderNumber: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D32F2F]/10">
          <XCircle className="h-6 w-6 text-[#D32F2F]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">Cancel Order</h3>
        <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{orderNumber}</p>
        <p className="mb-6 text-sm text-[#64748b]">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            Keep Order
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} loading={loading}>
            Cancel Order
          </Button>
        </div>
      </div>
    </div>
  );
}

function MobileOrderCard({
  order,
  onUpdateStatus,
  onCancel,
}: {
  order: Order;
  onUpdateStatus: (_o: Order) => void;
  onCancel: (_o: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canAct = order.status !== "CANCELLED" && order.status !== "DELIVERED";

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-3"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <span className="font-semibold text-[#1E4D3D] text-sm">{order.orderNumber}</span>
            <p className="font-medium text-[#1a1a1a] truncate">{order.customer.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
            <span className="font-bold text-[#1E4D3D] text-sm">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-[#64748b]">
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {order.customer.mobile}
          </div>
          <div className="flex items-center gap-1">
            <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{formatDate(order.createdAt)}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#e2e8f0]">
          {/* Items */}
          <div className="p-3 space-y-1.5 bg-[#f8f9fa]">
            <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide mb-1">Items</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-[#1a1a1a] truncate flex-1 pr-2">{item.product.name}</span>
                <span className="text-[#64748b] flex-shrink-0">×{item.quantity}</span>
                <span className="text-[#1E4D3D] font-medium ml-3 flex-shrink-0">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          {/* Actions */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[#e2e8f0]">
            <Link href={`/dashboard/orders/${order.id}`}>
              <button className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors">
                <Eye className="h-3.5 w-3.5" />
                View
              </button>
            </Link>
            <div className="flex gap-2">
              {canAct && (
                <button
                  onClick={() => onUpdateStatus(order)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#3B7A57]/10 hover:text-[#3B7A57] transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update
                </button>
              )}
              {canAct && (
                <button
                  onClick={() => onCancel(order)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#D32F2F]/10 hover:text-[#D32F2F] transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OrdersPage() {
  const { success, error: toastError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, NEW: 0, PROCESSING: 0, DELIVERED: 0, CANCELLED: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOrder, setUpdateOrder] = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    const res = await fetch(`/api/orders?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      if (data.counts) setStats(data.counts);
    }
    setLoading(false);
  }, [page, debouncedSearch, status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Refetch when the tab regains focus so edits made elsewhere aren't missed.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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

  const handleCancel = async () => {
    if (!cancelOrder) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/orders/${cancelOrder.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Order cancelled", cancelOrder.orderNumber);
        setCancelOrder(null);
        // Cancelling removes the order from the current page's result set
        // if filtering by a specific status other than CANCELLED.
        if (orders.length === 1 && page > 1 && status !== "") {
          setPage((p) => p - 1);
        } else {
          fetchOrders();
        }
      } else {
        toastError("Failed to cancel order");
      }
    } catch {
      toastError("Failed to cancel order");
    } finally {
      setCancelLoading(false);
    }
  };

  const statsItems = [
    { label: "Total", value: stats.total, icon: ShoppingCart, color: "#1E4D3D" },
    { label: "New", value: stats.NEW, icon: Package, color: "#1565C0" },
    { label: "Processing", value: stats.PROCESSING, icon: RefreshCw, color: "#E65100" },
    { label: "Delivered", value: stats.DELIVERED, icon: CheckCircle, color: "#2E7D32" },
    { label: "Cancelled", value: stats.CANCELLED, icon: AlertCircle, color: "#D32F2F" },
  ];

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Orders</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Manage and track all customer orders</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="hidden sm:flex">
          <Plus className="h-4 w-4" />
          Create Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:gap-3">
        {statsItems.map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[10px] text-[#64748b]">{s.label}</p>
                <p className="text-lg font-bold text-[#1a1a1a]">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-3 lg:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search orders or customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-[#e2e8f0] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <ShoppingCart className="h-10 w-10 text-[#e2e8f0]" />
          <p className="text-[#64748b]">No orders found</p>
        </div>
      ) : (
        <>
          {/* Mobile expandable cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                onUpdateStatus={setUpdateOrder}
                onCancel={setCancelOrder}
              />
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
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
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
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
                          onClick={() => setCancelOrder(order)}
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

          {/* Mobile pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between md:hidden">
              <p className="text-sm text-[#64748b]">Page {page} of {Math.ceil(total / 20)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateOrderModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => { fetchOrders(); success("Order created successfully"); }} />

      {updateOrder && (
        <UpdateStatusModal
          open={!!updateOrder}
          order={updateOrder}
          onClose={() => setUpdateOrder(null)}
          onSuccess={() => { setUpdateOrder(null); fetchOrders(); success("Order status updated"); }}
        />
      )}

      <CancelConfirmModal
        open={!!cancelOrder}
        orderNumber={cancelOrder?.orderNumber ?? ""}
        loading={cancelLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelOrder(null)}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E4D3D] text-white shadow-lg active:scale-95 transition-transform sm:hidden"
        aria-label="Create order"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
