"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck, MapPin, Phone, Package, CheckCircle,
  ChevronRight, RefreshCw, Navigation, Undo2,
} from "lucide-react";
import { useOrdersList, useUpdateOrderStatus } from "@/hooks/use-employee-orders";
import type { EmployeeOrderListItem as DeliveryOrder } from "@/lib/api/orders";

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  PACKED: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-purple-100 text-purple-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  PACKED: "bg-orange-100 text-orange-700",
  OUT_FOR_DELIVERY: "bg-green-100 text-green-700",
  DELIVERED: "bg-gray-100 text-gray-500",
};

// Next action button for each status
const NEXT_ACTION: Record<string, { label: string; color: string }> = {
  NEW:              { label: "Mark as Received",    color: "bg-blue-600" },
  CONFIRMED:        { label: "Mark as Received",    color: "bg-blue-600" },
  PROCESSING:       { label: "Mark as Received",    color: "bg-blue-600" },
  PACKED:           { label: "Going for Delivery",  color: "bg-orange-500" },
  OUT_FOR_DELIVERY: { label: "Mark as Delivered",   color: "bg-green-600" },
};

const ACTIVE_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY"];

export default function DeliveryPage() {
  const router = useRouter();
  const ordersQuery = useOrdersList("all");
  const orders = (ordersQuery.data ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status));
  const loading = ordersQuery.isPending;
  const updateStatusMutation = useUpdateOrderStatus();
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gpsMap, setGpsMap] = useState<Record<string, { lat: number; lng: number } | null>>({});

  async function captureGPS(orderId: string): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGpsMap((prev) => ({ ...prev, [orderId]: coords }));
          resolve(coords);
        },
        () => resolve(null),
        { timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function updateStatus(order: DeliveryOrder) {
    setUpdating(order.id);
    try {
      let gps: { lat: number; lng: number } | null = gpsMap[order.id] ?? null;

      // For final delivery step, capture GPS first
      if (order.status === "OUT_FOR_DELIVERY" && !gps) {
        gps = await captureGPS(order.id);
      }

      await updateStatusMutation.mutateAsync({ orderId: order.id, coords: { lat: gps?.lat, lng: gps?.lng } });
      setExpandedId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(null);
    }
  }

  const grouped = {
    outForDelivery: orders.filter((o) => o.status === "OUT_FOR_DELIVERY"),
    packed:         orders.filter((o) => o.status === "PACKED"),
    pending:        orders.filter((o) => ["NEW", "CONFIRMED", "PROCESSING"].includes(o.status)),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">My Deliveries</h1>
            <p className="text-green-200 text-sm mt-0.5">{orders.length} active order{orders.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => ordersQuery.refetch()} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <RefreshCw size={18} className="text-white" />
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Truck size={36} className="text-green-500" />
          </div>
          <p className="font-semibold text-gray-700 text-lg">All deliveries done!</p>
          <p className="text-gray-400 text-sm mt-1">No pending orders for delivery.</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6">
          <Section title="Out for Delivery" icon={<Truck size={16} className="text-green-600" />} orders={grouped.outForDelivery} expandedId={expandedId} setExpandedId={setExpandedId} updating={updating} onUpdate={updateStatus} onReturnItems={(order) => router.push(`/employee/returns?orderId=${order.id}`)} />
          <Section title="Ready for Pickup" icon={<Package size={16} className="text-orange-500" />} orders={grouped.packed} expandedId={expandedId} setExpandedId={setExpandedId} updating={updating} onUpdate={updateStatus} />
          <Section title="Pending Orders" icon={<ChevronRight size={16} className="text-blue-500" />} orders={grouped.pending} expandedId={expandedId} setExpandedId={setExpandedId} updating={updating} onUpdate={updateStatus} />
        </div>
      )}
    </div>
  );
}

function Section({
  title, icon, orders, expandedId, setExpandedId, updating, onUpdate, onReturnItems,
}: {
  title: string;
  icon: React.ReactNode;
  orders: DeliveryOrder[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  updating: string | null;
  onUpdate: (order: DeliveryOrder) => void;
  onReturnItems?: (order: DeliveryOrder) => void;
}) {
  if (orders.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
        <span className="ml-auto text-xs text-gray-400">{orders.length}</span>
      </div>
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            expanded={expandedId === order.id}
            onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
            updating={updating === order.id}
            onUpdate={() => onUpdate(order)}
            onReturnItems={onReturnItems ? () => onReturnItems(order) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order, expanded, onToggle, updating, onUpdate, onReturnItems,
}: {
  order: DeliveryOrder;
  expanded: boolean;
  onToggle: () => void;
  updating: boolean;
  onUpdate: () => void;
  onReturnItems?: () => void;
}) {
  const action = NEXT_ACTION[order.status];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer.address + " " + (order.customer.village ?? ""))}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header — always visible */}
      <button onClick={onToggle} className="w-full text-left px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm truncate">{order.customer.name}</p>
              <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{order.orderNumber} · {order.items.length} item{order.items.length !== 1 ? "s" : ""} · ₹{order.totalAmount.toLocaleString("en-IN")}</p>
          </div>
          <ChevronRight size={16} className={`text-gray-300 shrink-0 mt-0.5 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-3">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Items</p>
            {order.items.map((item, i) => (
              <p key={i} className="text-sm text-gray-700">• {item.product.name} × {item.quantity}</p>
            ))}
          </div>

          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600">{order.customer.address}{order.customer.village ? `, ${order.customer.village}` : ""}</p>
          </div>

          {order.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{order.notes}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <a href={`tel:${order.customer.mobile}`}
              className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600">
              <Phone size={15} /> Call
            </a>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600">
              <Navigation size={15} /> Navigate
            </a>
          </div>

          <div className="flex gap-2">
            {action && (
              <button onClick={onUpdate} disabled={updating}
                className={`flex-1 ${action.color} text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60`}>
                {updating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                ) : order.status === "OUT_FOR_DELIVERY" ? (
                  <><CheckCircle size={16} /> {action.label}</>
                ) : (
                  <><Truck size={16} /> {action.label}</>
                )}
              </button>
            )}
            {onReturnItems && (
              <button onClick={onReturnItems}
                className="flex-1 border-2 border-orange-500 text-orange-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:bg-orange-50">
                <Undo2 size={16} /> Return Items
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
