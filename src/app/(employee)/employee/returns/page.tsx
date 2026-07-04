"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Plus, Search, ChevronRight, Check, X, AlertCircle,
  Camera, Image as ImageIcon, CheckCircle, Minus, PackageX, Undo2,
} from "lucide-react";
import { compressImageToMaxSize } from "@/lib/compress-image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string; name: string; mobile: string; village?: string | null; district?: string;
}

interface CustomerOrder {
  id: string; orderNumber: string; createdAt: string; deliveryDate: string | null;
  totalAmount: number; status: string;
}

interface ReturnEligibleItem {
  orderItemId: string; productId: string; name: string; serialNumber: number;
  sku: string; orderedQuantity: number; returnableQuantity: number;
}

interface OrderDetail {
  id: string; orderNumber: string; createdAt: string; deliveryDate: string | null;
  totalAmount: number; status: string;
  customer: { id: string; name: string; mobile: string };
  items: ReturnEligibleItem[];
}

interface SelectedItem extends ReturnEligibleItem {
  quantity: number;
}

interface MyReturn {
  id: string; returnNumber: string; status: string; reason: string; createdAt: string;
  order: { orderNumber: string };
  customer: { name: string; mobile: string };
  items: { quantity: number; product: { name: string } }[];
}

type Step = "list" | "customer" | "orders" | "items" | "reason" | "photos" | "confirm" | "success";

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "DAMAGED_PRODUCT", label: "Damaged Product" },
  { value: "WRONG_PRODUCT_DELIVERED", label: "Wrong Product Delivered" },
  { value: "EXPIRED_PRODUCT", label: "Expired Product" },
  { value: "POOR_QUALITY", label: "Poor Quality" },
  { value: "CUSTOMER_CHANGED_MIND", label: "Customer Changed Mind" },
  { value: "EXCESS_QUANTITY_ORDERED", label: "Excess Quantity Ordered" },
  { value: "PACKAGING_ISSUE", label: "Packaging Issue" },
  { value: "OTHER", label: "Other" },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-teal-100 text-teal-700",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Return Completed",
};

// ─── Small shared pieces ───────────────────────────────────────────────────────

function Header({ onBack, title, children }: { onBack: () => void; title: string; children?: React.ReactNode }) {
  return (
    <div className="bg-green-600 px-4 pt-12 pb-4 flex items-center gap-3 shrink-0">
      <button onClick={onBack} className="text-white p-1"><ArrowLeft size={22} /></button>
      <h1 className="text-white font-semibold text-lg flex-1">{title}</h1>
      {children}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, loading }: {
  value: string; onChange: (_v: string) => void; placeholder: string; loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
      <Search size={18} className="text-gray-400 shrink-0" />
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="flex-1 text-sm outline-none bg-transparent" />
      {loading && <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin shrink-0" />}
      {value && <button onClick={() => onChange("")}><X size={15} className="text-gray-300" /></button>}
    </div>
  );
}

function Spinner({ className = "border-white" }: { className?: string }) {
  return <div className={`w-4 h-4 border-2 ${className} border-t-transparent rounded-full animate-spin`} />;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ReturnsPageContent />
    </Suspense>
  );
}

function ReturnsPageContent() {
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get("orderId");

  const [step, setStep] = useState<Step>(prefillOrderId ? "items" : "list");

  const [myReturns, setMyReturns] = useState<MyReturn[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});

  const [reason, setReason] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdReturn, setCreatedReturn] = useState<{ returnNumber: string } | null>(null);

  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const loadMyReturns = useCallback(async () => {
    setLoadingReturns(true);
    try {
      const res = await fetch("/api/employee/returns");
      if (res.ok) setMyReturns(await res.json());
    } finally {
      setLoadingReturns(false);
    }
  }, []);

  useEffect(() => { if (step === "list") loadMyReturns(); }, [step, loadMyReturns]);

  // Deep link from the Delivery screen — jump straight to item selection for this order.
  useEffect(() => {
    if (!prefillOrderId) return;
    (async () => {
      setLoadingOrderDetail(true);
      try {
        const res = await fetch(`/api/employee/returns/orders/${prefillOrderId}`);
        if (res.ok) {
          const detail: OrderDetail = await res.json();
          setSelectedOrder(detail);
          setSelectedCustomer(detail.customer);
          setSelectedItems({});
        }
      } finally {
        setLoadingOrderDetail(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [prefillOrderId]);

  useEffect(() => {
    if (!customerQuery || step !== "customer") return;
    if (customerTimer.current) clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const res = await fetch(`/api/employee/customers?q=${encodeURIComponent(customerQuery)}`);
        if (res.ok) setCustomers(await res.json());
      } finally { setSearchingCustomers(false); }
    }, 250);
    return () => { if (customerTimer.current) clearTimeout(customerTimer.current); };
  }, [customerQuery, step]);

  async function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setOrders([]);
    setLoadingOrders(true);
    setStep("orders");
    try {
      const res = await fetch(`/api/employee/returns/orders?customerId=${customer.id}`);
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleSelectOrder(order: CustomerOrder) {
    setLoadingOrderDetail(true);
    setStep("items");
    try {
      const res = await fetch(`/api/employee/returns/orders/${order.id}`);
      if (res.ok) {
        const detail: OrderDetail = await res.json();
        setSelectedOrder(detail);
        setSelectedItems({});
      }
    } finally {
      setLoadingOrderDetail(false);
    }
  }

  function toggleItem(item: ReturnEligibleItem) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.orderItemId]) {
        delete next[item.orderItemId];
      } else {
        next[item.orderItemId] = { ...item, quantity: Math.min(1, item.returnableQuantity) };
      }
      return next;
    });
  }

  function setItemQuantity(orderItemId: string, quantity: number) {
    setSelectedItems((prev) => {
      const current = prev[orderItemId];
      if (!current) return prev;
      const clamped = Math.max(1, Math.min(quantity, current.returnableQuantity));
      return { ...prev, [orderItemId]: { ...current, quantity: clamped } };
    });
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (photos.length >= 3) {
      setPhotoError("You can upload a maximum of 3 photos");
      return;
    }
    try {
      const compressed = await compressImageToMaxSize(file, 500_000);
      setPhotos((prev) => [...prev, compressed]);
      setPhotoError("");
    } catch {
      setPhotoError("Could not process that photo. Please try another.");
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const selectedList = Object.values(selectedItems);

  async function handleSubmit() {
    if (!selectedOrder || !selectedList.length || !reason) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/employee/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          items: selectedList.map((i) => ({
            orderItemId: i.orderItemId,
            productId: i.productId,
            quantity: i.quantity,
          })),
          reason,
          reasonNotes: reason === "OTHER" ? reasonNotes : undefined,
          notes: notes || undefined,
          images: photos.length ? photos : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedReturn({ returnNumber: data.returnNumber });
        setStep("success");
      } else {
        setSubmitError(data.error || "Failed to submit return. Please try again.");
      }
    } catch {
      setSubmitError("Connection error. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("list");
    setSelectedCustomer(null);
    setOrders([]);
    setSelectedOrder(null);
    setSelectedItems({});
    setReason("");
    setReasonNotes("");
    setNotes("");
    setPhotos([]);
    setPhotoError("");
    setSubmitError("");
    setCreatedReturn(null);
    setCustomerQuery("");
    setCustomers([]);
  }

  // ─── Step: list ───────────────────────────────────────────────────────────

  if (step === "list") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-600 px-4 pt-8 pb-4">
          <h1 className="text-white text-xl font-bold">Return Items</h1>
          <p className="text-green-100 text-sm mt-0.5">
            {myReturns.length} return{myReturns.length !== 1 ? "s" : ""} submitted
          </p>
        </div>

        <div className="px-4 py-3 space-y-2 pb-24">
          {loadingReturns && <div className="flex justify-center pt-8"><Spinner className="border-green-500" /></div>}
          {!loadingReturns && myReturns.length === 0 && (
            <div className="text-center pt-12">
              <Undo2 size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No returns yet</p>
              <p className="text-gray-400 text-sm mt-1">Tap the + button to record a customer return</p>
            </div>
          )}

          {myReturns.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{r.customer.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.returnNumber} · Order {r.order.orderNumber}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {r.items.map((i) => `${i.product.name} ×${i.quantity}`).join(", ")}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep("customer")}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center active:bg-green-700"
          aria-label="New return"
        >
          <Plus size={26} />
        </button>
      </div>
    );
  }

  // ─── Step: customer ─────────────────────────────────────────────────────────

  if (step === "customer") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("list")} title="Select Customer" />
      <div className="px-4 py-3">
        <SearchBar value={customerQuery} onChange={setCustomerQuery} placeholder="Search by name or mobile..." loading={searchingCustomers} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {customers.map((c) => (
          <button key={c.id} onClick={() => handleSelectCustomer(c)}
            className="w-full bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-left flex items-center gap-3 active:bg-green-50">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">{c.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{c.name}</p>
              <p className="text-xs text-gray-400">{c.mobile} · {c.village ?? c.district}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}
        {!searchingCustomers && customerQuery && customers.length === 0 && (
          <p className="text-center text-gray-400 text-sm pt-6">No customers found</p>
        )}
        {!customerQuery && <p className="text-center text-gray-400 text-sm pt-6">Search by mobile number or name</p>}
      </div>
    </div>
  );

  // ─── Step: orders ───────────────────────────────────────────────────────────

  if (step === "orders") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("customer")} title="Select Order" />
      <div className="px-4 py-3">
        <p className="text-sm text-gray-500">
          {selectedCustomer?.name} · {selectedCustomer?.mobile}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {loadingOrders && <div className="flex justify-center pt-8"><Spinner className="border-green-500" /></div>}
        {!loadingOrders && orders.length === 0 && (
          <div className="text-center pt-12">
            <PackageX size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-gray-400 text-sm mt-1">This customer has no eligible orders</p>
          </div>
        )}
        {orders.map((o) => (
          <button key={o.id} onClick={() => handleSelectOrder(o)}
            className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left active:bg-green-50">
            <div className="flex items-center justify-between">
              <p className="font-mono font-semibold text-gray-800 text-sm">{o.orderNumber}</p>
              <p className="font-bold text-green-700 text-sm">₹{o.totalAmount.toLocaleString("en-IN")}</p>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
              <span>Ordered {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              {o.deliveryDate && (
                <span>Delivered {new Date(o.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Step: items ────────────────────────────────────────────────────────────

  if (step === "items") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep(prefillOrderId ? "list" : "orders")} title="Select Products" />
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loadingOrderDetail && <div className="flex justify-center pt-8"><Spinner className="border-green-500" /></div>}
        {!loadingOrderDetail && selectedOrder?.items.map((item) => {
          const selected = selectedItems[item.orderItemId];
          const disabled = item.returnableQuantity <= 0;
          return (
            <div key={item.orderItemId}
              className={`bg-white rounded-xl p-3 shadow-sm border ${selected ? "border-green-300 bg-green-50/40" : "border-gray-100"} ${disabled ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <button
                  disabled={disabled}
                  onClick={() => toggleItem(item)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "bg-green-600 border-green-600" : "border-gray-300"}`}
                >
                  {selected && <Check size={14} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Serial #{item.serialNumber} · Ordered {item.orderedQuantity}
                    {disabled && <span className="text-red-400"> · Fully returned</span>}
                  </p>
                </div>
              </div>
              {selected && (
                <div className="mt-3 flex items-center justify-between pl-9">
                  <span className="text-xs text-gray-500">Return quantity (max {item.returnableQuantity})</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setItemQuantity(item.orderItemId, selected.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-semibold text-gray-800">{selected.quantity}</span>
                    <button onClick={() => setItemQuantity(item.orderItemId, selected.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => setStep("reason")}
          disabled={selectedList.length === 0}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Continue ({selectedList.length} selected) <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // ─── Step: reason ───────────────────────────────────────────────────────────

  if (step === "reason") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("items")} title="Return Reason" />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Why is this being returned?</p>
        <div className="space-y-2">
          {REASON_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setReason(opt.value)}
              className={`w-full text-left rounded-xl px-4 py-3 border text-sm font-medium transition-colors ${
                reason === opt.value ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-white text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {reason === "OTHER" && (
          <div>
            <label className="text-xs font-medium text-gray-500">Please specify *</label>
            <textarea
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              rows={3}
              placeholder="Describe the reason for this return..."
              className="w-full mt-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 resize-none"
            />
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => setStep("photos")}
          disabled={!reason || (reason === "OTHER" && !reasonNotes.trim())}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // ─── Step: photos ───────────────────────────────────────────────────────────

  if (step === "photos") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("reason")} title="Photos (Optional)" />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p className="text-sm text-gray-500">Add up to 3 photos of the returned item.</p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square">
                <img src={p} alt={`Return photo ${i + 1}`} className="w-full h-full object-cover rounded-xl" />
                <button onClick={() => removePhoto(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center">
                  <X size={13} className="text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photoError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
            <AlertCircle size={16} />{photoError}
          </div>
        )}

        {photos.length < 3 && (
          <div className="flex gap-3">
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoFile} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
            <button onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 text-gray-500 active:bg-gray-50">
              <Camera size={24} />
              <span className="text-xs font-medium">Camera</span>
            </button>
            <button onClick={() => galleryInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 text-gray-500 active:bg-gray-50">
              <ImageIcon size={24} />
              <span className="text-xs font-medium">Gallery</span>
            </button>
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        <button onClick={() => setStep("confirm")}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 flex items-center justify-center gap-2">
          {photos.length ? "Continue" : "Skip"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // ─── Step: confirm ──────────────────────────────────────────────────────────

  if (step === "confirm") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("photos")} title="Confirm Return" />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
            <button onClick={() => setStep("customer")} className="text-xs text-green-600">Change</button>
          </div>
          <p className="font-semibold text-gray-800">{selectedCustomer?.name}</p>
          <p className="text-sm text-gray-500">{selectedCustomer?.mobile}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</p>
            <button onClick={() => setStep("orders")} className="text-xs text-green-600">Change</button>
          </div>
          <p className="font-mono text-sm font-semibold text-gray-800">{selectedOrder?.orderNumber}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items ({selectedList.length})</p>
            <button onClick={() => setStep("items")} className="text-xs text-green-600">Edit</button>
          </div>
          {selectedList.map((i) => (
            <div key={i.orderItemId} className="flex justify-between text-sm py-1">
              <span className="text-gray-700">{i.name}</span>
              <span className="font-medium">×{i.quantity}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</p>
            <button onClick={() => setStep("reason")} className="text-xs text-green-600">Change</button>
          </div>
          <p className="text-sm text-gray-700">{REASON_OPTIONS.find((r) => r.value === reason)?.label}</p>
          {reason === "OTHER" && <p className="text-xs text-gray-400 mt-1">{reasonNotes}</p>}
        </div>

        {photos.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Photos</p>
              <button onClick={() => setStep("photos")} className="text-xs text-green-600">Edit</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional remarks (optional)..." rows={2}
            className="w-full text-sm outline-none resize-none text-gray-700 placeholder-gray-300" />
        </div>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
            <AlertCircle size={16} />{submitError}
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting ? <><Spinner /> Completing...</> : <><CheckCircle size={18} /> Complete Return</>}
        </button>
      </div>
    </div>
  );

  // ─── Step: success ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 w-full max-w-sm">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={52} className="text-green-500" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Return Completed</h1>
          <p className="text-gray-400 text-sm mt-1">Inventory and records have been updated</p>
        </div>
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Return Number</span>
            <span className="font-mono font-semibold text-gray-800">{createdReturn?.returnNumber}</span>
          </div>
        </div>
      </div>
      <button onClick={resetFlow}
        className="w-full max-w-sm flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-4 rounded-xl font-medium bg-white shadow-sm active:bg-gray-50">
        Back to Returns
      </button>
    </div>
  );
}
