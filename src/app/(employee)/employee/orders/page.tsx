"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Minus, Search, Trash2, MapPin, CheckCircle,
  ChevronLeft, ChevronRight, ShoppingCart, X, AlertCircle, Camera, MessageCircle,
  Home, ExternalLink, RefreshCw, Navigation, Check,
} from "lucide-react";
import { useCart, CartItem } from "@/components/employee/cart-context";
import { compressImageToTarget, ImageTooLargeError } from "@/lib/compress-image";
import { getCategoryMeta, CATEGORY_META } from "@/lib/category-images";
import { cloudinaryThumb } from "@/lib/image-thumb";
import { uploadHousePhoto, getGiftChoicesAllowed } from "@/lib/api/orders";
import { useOrdersList, useProductSearch, usePlaceOrder, useGiftItems } from "@/hooks/use-employee-orders";
import { useCustomerSearch, useCreateCustomer } from "@/hooks/use-employee-customers";
import { useFreeGift } from "@/hooks/use-employee-home";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; sku: string; serialNumber: number;
  price: number; salePrice?: number | null; imageUrl?: string | null; category: string;
}

interface Customer {
  id: string; name: string; mobile: string; address: string;
  village?: string | null; district: string; pincode: string;
}

interface OrderLine {
  quantity: number; price: number; subtotal: number;
  product: { id: string; name: string; sku: string; serialNumber: number; imageUrl?: string | null };
}

interface Order {
  id: string; orderNumber: string; status: string; totalAmount: number;
  notes?: string | null; createdAt: string;
  customer: { id: string; name: string; mobile: string; village?: string | null };
  items: OrderLine[];
}

interface PlacedOrder {
  id: string; orderNumber: string; totalAmount: number;
  deliveryDate: string; deliveryDateStr: string;
  whatsappUrl: string; whatsappMessage: string;
  adminWhatsappUrl?: string | null;
  customer: { name: string; mobile: string };
}

type Step = "list" | "products" | "cart" | "customer" | "gps" | "photo" | "confirm" | "success";

const HOUSE_PHOTO_MAX_BYTES = 160_000;

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  DELIVERED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-600",
};

// ─── Offline queue ─────────────────────────────────────────────────────────────

const QUEUE_KEY = "employee_order_queue";

function enqueueOrder(payload: object) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    q.push({ payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

async function flushQueue() {
  try {
    const q: { payload: object }[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    if (!q.length) return;
    const remaining: typeof q = [];
    for (const entry of q) {
      const res = await fetch("/api/employee/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.payload),
      });
      if (!res.ok) remaining.push(entry);
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {}
}

// ─── Page Shell (Suspense boundary for useSearchParams) ───────────────────────

export default function OrdersPage() {
  return (
    <Suspense fallback={<Loader />}>
      <OrdersPageContent />
    </Suspense>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Product Thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ imageUrl, category, serialNumber }: { imageUrl?: string | null; category: string; serialNumber: number }) {
  const [imgError, setImgError] = useState(false);
  const meta = getCategoryMeta(category);
  if (imageUrl && !imgError) {
    return (
      <img
        src={cloudinaryThumb(imageUrl, 96, 96)}
        alt={category}
        loading="lazy"
        decoding="async"
        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`w-12 h-12 rounded-lg ${meta.bg} flex flex-col items-center justify-center shrink-0 gap-0.5`}>
      <span className="text-lg leading-none">{meta.emoji}</span>
      <span className="text-[9px] font-mono text-gray-400">#{serialNumber}</span>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items: cartItems, addItem, removeItem, setQuantity, clearCart, total, itemCount } = useCart();

  const [step, setStep] = useState<Step>(searchParams.get("new") === "1" ? "products" : "list");
  const [productQuery, setProductQuery] = useState("");
  const [debouncedProductQuery, setDebouncedProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productCategory, setProductCategory] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [debouncedCustomerQuery, setDebouncedCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", mobile: "", address: "", village: "", district: "", pincode: "" });
  const [notes, setNotes] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoCompressError, setPhotoCompressError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);

  const productTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => flushQueue();
    window.addEventListener("online", handler);
    if (navigator.onLine) flushQueue();
    return () => window.removeEventListener("online", handler);
  }, []);

  const { data: freeGift } = useFreeGift();
  const { data: giftPool = [] } = useGiftItems();
  const [selectedGiftProductIds, setSelectedGiftProductIds] = useState<string[]>([]);
  const allowedGiftChoices = freeGift ? getGiftChoicesAllowed(total, freeGift) : 0;

  // Trim selections if the cart total drops below a tier (fewer choices allowed than before).
  useEffect(() => {
    if (selectedGiftProductIds.length > allowedGiftChoices) {
      setSelectedGiftProductIds((prev) => prev.slice(0, allowedGiftChoices));
    }
  }, [allowedGiftChoices, selectedGiftProductIds.length]);

  function toggleGiftSelection(productId: string) {
    setSelectedGiftProductIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= allowedGiftChoices) return prev;
      return [...prev, productId];
    });
  }

  const ordersQuery = useOrdersList("week", step === "list");
  const orders = ordersQuery.data ?? [];
  const loadingOrders = ordersQuery.isFetching;

  const productSearchQuery = useProductSearch(debouncedProductQuery, productPage, productCategory);
  const products = productSearchQuery.data?.products ?? [];
  const productTotal = productSearchQuery.data?.total ?? 0;
  const productTotalPages = Math.max(1, Math.ceil(productTotal / 10));
  const searchingProducts = productSearchQuery.isFetching;

  const customerSearchEnabled = step === "customer" && debouncedCustomerQuery.length > 0;
  const customerSearchQuery = useCustomerSearch(debouncedCustomerQuery, customerSearchEnabled);
  const customers = customerSearchQuery.data ?? [];
  const searchingCustomers = customerSearchQuery.isFetching;

  const placeOrderMutation = usePlaceOrder();
  const createCustomerMutation = useCreateCustomer();

  function selectProductCategory(cat: string) {
    setProductCategory(cat);
    setProductPage(1);
  }

  useEffect(() => {
    if (productTimer.current) clearTimeout(productTimer.current);
    productTimer.current = setTimeout(() => {
      setDebouncedProductQuery(productQuery);
      setProductPage(1);
    }, 250);
    return () => { if (productTimer.current) clearTimeout(productTimer.current); };
  }, [productQuery]);

  useEffect(() => {
    if (customerTimer.current) clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(() => setDebouncedCustomerQuery(customerQuery), 250);
    return () => { if (customerTimer.current) clearTimeout(customerTimer.current); };
  }, [customerQuery]);

  function captureGPS() {
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported on this device.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError("Location permission denied. Please allow location access in your browser settings and try again.");
        } else if (err.code === 2) {
          setGpsError("Location unavailable. Please move to an open area and try again.");
        } else {
          setGpsError("Could not capture location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoCompressError("");
    setCompressingPhoto(true);
    try {
      const compressed = await compressImageToTarget(file, { maxBytes: HOUSE_PHOTO_MAX_BYTES });
      setPhotoPreview(compressed);
      setPhotoData(compressed);
      setPhotoUploadStatus("idle");
    } catch (err) {
      setPhotoPreview(null);
      setPhotoData(null);
      setPhotoCompressError(err instanceof ImageTooLargeError ? err.message : "Could not process that photo. Please try another.");
    } finally {
      setCompressingPhoto(false);
    }
  }

  async function submitHousePhoto(customerId: string, orderId: string, data: string) {
    setPhotoUploadStatus("uploading");
    const ok = await uploadHousePhoto(customerId, orderId, data);
    setPhotoUploadStatus(ok ? "success" : "error");
  }

  async function handleCreateCustomer() {
    const { name, mobile, address, district, pincode } = newCustomer;
    if (!name || !mobile || !address || !district || !pincode) return;
    try {
      const customer = await createCustomerMutation.mutateAsync(newCustomer);
      setSelectedCustomer(customer);
      setShowNewCustomer(false);
      setGps(null);
      setGpsError(null);
      setStep("gps");
    } catch {
      // Keep the form open; createCustomerMutation.error can be surfaced by the form if needed.
    }
  }

  async function handleSubmitOrder() {
    if (!selectedCustomer || !cartItems.length) return;
    setSubmitting(true);
    setSubmitError("");

    const payload = {
      customerId: selectedCustomer.id,
      items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
      notes: notes || undefined,
      latitude: gps?.lat,
      longitude: gps?.lng,
      accuracy: gps?.accuracy,
      giftProductIds: selectedGiftProductIds.length ? selectedGiftProductIds : undefined,
    };

    try {
      const data = await placeOrderMutation.mutateAsync(payload);
      setPlacedOrder(data);
      clearCart();

      // Upload the house photo — awaited with retries so a failure is never silent.
      if (photoData && selectedCustomer) {
        await submitHousePhoto(selectedCustomer.id, data.id, photoData);
      }

      setStep("success");
    } catch (err) {
      if (!navigator.onLine) {
        enqueueOrder(payload);
        clearCart();
        setStep("list");
      } else {
        const unavailableIds = (err as { unavailableProductIds?: string[] })?.unavailableProductIds;
        if (unavailableIds?.length) {
          const removedNames = cartItems.filter((i) => unavailableIds.includes(i.productId)).map((i) => i.name);
          unavailableIds.forEach((id) => removeItem(id));
          const plural = removedNames.length !== 1;
          setSubmitError(
            `${removedNames.join(", ") || "Some items"} ${plural ? "are" : "is"} no longer available and ${plural ? "have" : "has"} been removed from your cart. Please review and place the order again.`
          );
          setStep("cart");
        } else {
          setSubmitError(err instanceof Error ? err.message : "Connection error. Please check your internet and try again.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("list");
    setSelectedCustomer(null);
    setNotes("");
    setGps(null);
    setPhotoPreview(null);
    setPhotoData(null);
    setPhotoUploadStatus("idle");
    setPlacedOrder(null);
    setCustomerQuery("");
    setProductQuery("");
    setSubmitError("");
    setSelectedGiftProductIds([]);
    router.replace("/employee/orders");
  }

  // ── Step renders ────────────────────────────────────────────────────────────

  if (step === "list") return <OrdersList orders={orders} loading={loadingOrders} onNew={() => setStep("products")} />;

  if (step === "success" && placedOrder) return (
    <SuccessScreen
      order={placedOrder}
      onDone={resetFlow}
      photoUploadStatus={photoData ? photoUploadStatus : "idle"}
      onRetryPhoto={() => {
        if (photoData && selectedCustomer) submitHousePhoto(selectedCustomer.id, placedOrder.id, photoData);
      }}
    />
  );

  if (step === "products") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("list")} title="Search Products">
        {itemCount > 0 && (
          <button onClick={() => setStep("cart")} className="relative text-white">
            <ShoppingCart size={22} />
            <span className="absolute -top-1.5 -right-1.5 bg-orange-400 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{itemCount}</span>
          </button>
        )}
      </Header>

      <div className="px-4 py-3 space-y-2">
        <SearchBar value={productQuery} onChange={setProductQuery} placeholder="Name, serial number or SKU..." loading={searchingProducts} />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => selectProductCategory("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              productCategory === "" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            All
          </button>
          {Object.entries(CATEGORY_META).map(([value, meta]) => (
            <button
              key={value}
              onClick={() => selectProductCategory(value)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                productCategory === value ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              <span>{meta.emoji}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {products.map((p) => {
          const inCart = cartItems.find((i) => i.productId === p.id);
          const price = p.salePrice ?? p.price;
          return (
            <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
              <ProductThumb imageUrl={p.imageUrl} category={p.category} serialNumber={p.serialNumber} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm line-clamp-2">{p.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="font-mono">#{p.serialNumber}</span>
                  <span>·</span>
                  <span>{p.category}</span>
                </div>
                <p className="text-green-700 font-semibold text-sm">₹{price}</p>
              </div>
              {inCart ? (
                <div className="flex items-center gap-2">
                  <QtyBtn onClick={() => setQuantity(p.id, inCart.quantity - 1)} icon={<Minus size={14} />} />
                  <span className="w-5 text-center font-semibold text-sm">{inCart.quantity}</span>
                  <QtyBtn onClick={() => setQuantity(p.id, inCart.quantity + 1)} icon={<Plus size={14} />} />
                </div>
              ) : (
                <button onClick={() => addItem({ productId: p.id, name: p.name, sku: p.sku, price, imageUrl: p.imageUrl })}
                  className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-sm active:bg-green-700">
                  <Plus size={16} />
                </button>
              )}
            </div>
          );
        })}
        {!searchingProducts && products.length === 0 && (
          <p className="text-center text-gray-400 text-sm pt-8">{productQuery ? "No products found" : "No products available"}</p>
        )}
        {productTotal > 10 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              {(productPage - 1) * 10 + 1}–{Math.min(productPage * 10, productTotal)} of {productTotal}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                disabled={productPage === 1}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-gray-500 font-medium min-w-[3.5rem] text-center">
                Page {productPage} / {productTotalPages}
              </span>
              <button
                onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
                disabled={productPage === productTotalPages}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <div className="px-4 pb-4">
          <button onClick={() => setStep("cart")} className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 flex items-center justify-center gap-2">
            <ShoppingCart size={18} />
            View Cart ({itemCount}) · ₹{total.toLocaleString("en-IN")}
          </button>
        </div>
      )}
    </div>
  );

  if (step === "cart") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("products")} title="Your Cart" />

      {submitError && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
          <AlertCircle size={16} />{submitError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {cartItems.map((item: CartItem) => (
          <div key={item.productId} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{item.name}</p>
              <p className="text-xs text-gray-400">{item.sku}</p>
              <p className="text-green-700 font-semibold text-sm">₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
            </div>
            <div className="flex items-center gap-2">
              <QtyBtn onClick={() => setQuantity(item.productId, item.quantity - 1)} icon={<Minus size={14} />} />
              <span className="w-5 text-center font-semibold text-sm">{item.quantity}</span>
              <QtyBtn onClick={() => setQuantity(item.productId, item.quantity + 1)} icon={<Plus size={14} />} />
              <button onClick={() => removeItem(item.productId)} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center ml-1"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {cartItems.length === 0 && (
          <div className="text-center pt-16">
            <ShoppingCart size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">Cart is empty</p>
            <button onClick={() => setStep("products")} className="mt-4 text-green-600 font-medium text-sm">Add products</button>
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {/* Free gift picker */}
          {freeGift?.enabled && allowedGiftChoices > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl leading-none">🎁</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Free Gift Unlocked! Choose {allowedGiftChoices}
                  </p>
                  <p className="text-xs text-green-600">
                    {selectedGiftProductIds.length}/{allowedGiftChoices} selected
                  </p>
                </div>
              </div>
              {giftPool.length === 0 ? (
                <p className="text-xs text-green-700">No gift items configured yet — check back soon.</p>
              ) : (
                <div className="space-y-1.5">
                  {giftPool.map((g) => {
                    const selected = selectedGiftProductIds.includes(g.product.id);
                    const disabled = !selected && selectedGiftProductIds.length >= allowedGiftChoices;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGiftSelection(g.product.id)}
                        disabled={disabled}
                        className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-green-500 bg-white"
                            : disabled
                            ? "border-green-100 bg-green-50/50 opacity-50"
                            : "border-green-200 bg-white"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selected ? "bg-green-600 border-green-600" : "border-gray-300"}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{g.product.name}</span>
                        <span className="text-xs text-gray-400">Free</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* Nudge: how much more to unlock a free gift */}
          {freeGift?.enabled && allowedGiftChoices === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl leading-none">🎁</span>
              <p className="text-xs text-amber-700">
                Add ₹{(freeGift.tier1MinAmount - total).toLocaleString("en-IN")} more to unlock a free gift!
              </p>
            </div>
          )}
          <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-gray-100">
            <span className="text-gray-600 font-medium">Total</span>
            <span className="text-green-700 font-bold text-lg">₹{total.toLocaleString("en-IN")}</span>
          </div>
          <button onClick={() => setStep("customer")} className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 flex items-center justify-center gap-2">
            Select Customer <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );

  if (step === "customer") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("cart")} title="Select Customer" />

      {!showNewCustomer ? (
        <>
          <div className="px-4 py-3">
            <SearchBar value={customerQuery} onChange={setCustomerQuery} placeholder="Search by name or mobile..." loading={searchingCustomers} />
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2">
            {customers.map((c) => (
              <button key={c.id} onClick={() => { setSelectedCustomer(c); setGps(null); setGpsError(null); setStep("gps"); }}
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
            {!customerQuery && <p className="text-center text-gray-400 text-sm pt-6">Search to find existing customer</p>}
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => { setNewCustomer((p) => ({ ...p, mobile: /^\d+$/.test(customerQuery) ? customerQuery : "" })); setShowNewCustomer(true); }}
              className="w-full border-2 border-dashed border-green-300 text-green-600 py-4 rounded-xl font-medium text-sm active:bg-green-50 flex items-center justify-center gap-2">
              <Plus size={16} /> New Customer
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <h2 className="font-semibold text-gray-700">New Customer</h2>
          {(["name", "mobile", "address", "village", "district", "pincode"] as const).map((key) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 capitalize">{key}{["name","mobile","address","district","pincode"].includes(key) ? " *" : ""}</label>
              <input
                type={key === "mobile" || key === "pincode" ? "tel" : "text"}
                value={newCustomer[key]}
                onChange={(e) => setNewCustomer((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowNewCustomer(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm">Cancel</button>
            <button onClick={handleCreateCustomer} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:bg-green-700">Save & Select</button>
          </div>
        </div>
      )}
    </div>
  );

  if (step === "gps") return (
    <GpsStep
      gps={gps}
      gpsLoading={gpsLoading}
      gpsError={gpsError}
      onCapture={captureGPS}
      onContinue={() => setStep("photo")}
      onBack={() => setStep("customer")}
    />
  );

  if (step === "photo") return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("gps")} title="House Photo" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {compressingPhoto ? (
          <div className="w-full max-w-xs aspect-video rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Compressing photo...</p>
          </div>
        ) : photoPreview ? (
          <div className="relative w-full max-w-xs">
            <img src={photoPreview} alt="Preview" className="w-full rounded-2xl shadow-md object-cover max-h-72" />
            <button onClick={() => { setPhotoPreview(null); setPhotoData(null); }}
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs aspect-video rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3">
            <Camera size={36} className="text-gray-300" />
            <p className="text-gray-400 text-sm">No photo yet</p>
          </div>
        )}

        {photoCompressError && (
          <p className="text-xs text-red-500 text-center max-w-xs">{photoCompressError}</p>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        <div className="flex gap-3">
          <button onClick={() => fileInputRef.current?.click()} disabled={compressingPhoto}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-medium shadow-sm active:bg-green-700 disabled:opacity-60">
            <Camera size={18} /> {photoPreview ? "Retake" : "Camera"}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center">Take a photo of the customer&apos;s house entrance</p>
      </div>

      <div className="px-4 pb-4 space-y-2">
        <button onClick={() => setStep("confirm")} className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 flex items-center justify-center gap-2">
          {photoPreview ? "Continue" : "Skip Photo"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // step === "confirm"
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={() => setStep("photo")} title="Confirm Order" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
            <button onClick={() => setStep("customer")} className="text-xs text-green-600">Change</button>
          </div>
          <p className="font-semibold text-gray-800">{selectedCustomer?.name}</p>
          <p className="text-sm text-gray-500">{selectedCustomer?.mobile}</p>
          <p className="text-xs text-gray-400 mt-1">{selectedCustomer?.address}, {selectedCustomer?.district}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items ({itemCount})</p>
            <button onClick={() => setStep("cart")} className="text-xs text-green-600">Edit</button>
          </div>
          {cartItems.map((i: CartItem) => (
            <div key={i.productId} className="flex justify-between text-sm py-1">
              <span className="text-gray-700">{i.name} × {i.quantity}</span>
              <span className="font-medium">₹{(i.price * i.quantity).toLocaleString("en-IN")}</span>
            </div>
          ))}
          {selectedGiftProductIds.map((productId) => {
            const gift = giftPool.find((g) => g.product.id === productId);
            if (!gift) return null;
            return (
              <div key={productId} className="flex justify-between text-sm py-1 text-green-600">
                <span className="flex items-center gap-1">🎁 {gift.product.name} <span className="text-xs text-green-500">(Free)</span></span>
                <span className="font-medium">₹0</span>
              </div>
            );
          })}
          <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span className="text-green-700">₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* GPS */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</p>
          {gps ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              <span>{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>
              {gps.accuracy && <span className="text-xs text-gray-400">±{Math.round(gps.accuracy)}m</span>}
              <button onClick={() => { setGps(null); setGpsError(null); }} className="ml-auto text-gray-300"><X size={14} /></button>
            </div>
          ) : gpsError ? (
            <div className="space-y-2">
              <p className="text-xs text-red-500">{gpsError}</p>
              <button onClick={captureGPS}
                className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          ) : (
            <button onClick={captureGPS} disabled={gpsLoading}
              className="flex items-center gap-2 text-sm text-green-600 font-medium disabled:opacity-50">
              <MapPin size={16} />{gpsLoading ? "Capturing GPS..." : "Capture Current Location"}
            </button>
          )}
        </div>

        {/* Photo thumbnail */}
        {photoPreview && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">House Photo</p>
              <button onClick={() => setStep("photo")} className="text-xs text-green-600">Retake</button>
            </div>
            <img src={photoPreview} alt="House" className="w-full rounded-lg max-h-32 object-cover" />
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery instructions..." rows={2}
            className="w-full text-sm outline-none resize-none text-gray-700 placeholder-gray-300" />
        </div>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
            <AlertCircle size={16} />{submitError}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button onClick={handleSubmitOrder} disabled={submitting}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting
            ? <><Spinner /> Placing Order...</>
            : <><CheckCircle size={18} /> Place Order</>}
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  order, onDone, photoUploadStatus, onRetryPhoto,
}: {
  order: PlacedOrder;
  onDone: () => void;
  photoUploadStatus?: "idle" | "uploading" | "success" | "error";
  onRetryPhoto?: () => void;
}) {
  const delivery = order.deliveryDateStr ?? new Date(order.deliveryDate).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-between py-12 px-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 w-full max-w-sm">
        {/* Success icon */}
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={52} className="text-green-500" strokeWidth={1.5} />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Order Placed!</h1>
          <p className="text-gray-400 text-sm mt-1">for {order.customer.name}</p>
        </div>

        {photoUploadStatus === "error" && (
          <div className="w-full flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-600 font-medium">House photo failed to upload</p>
              <p className="text-xs text-red-400">The order was placed successfully. Please retry the photo.</p>
            </div>
            <button onClick={onRetryPhoto}
              className="shrink-0 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 active:bg-red-100">
              Retry
            </button>
          </div>
        )}
        {photoUploadStatus === "uploading" && (
          <div className="w-full flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3 text-gray-500 text-sm">
            <Spinner className="border-gray-400" /> Uploading house photo...
          </div>
        )}

        {/* Order details */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Order Number</span>
              <span className="font-mono font-semibold text-gray-800">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="font-bold text-green-700">₹{order.totalAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Delivery</span>
              <span className="font-medium text-gray-700 text-right max-w-[55%]">{delivery}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp buttons */}
        <a
          href={order.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-semibold shadow-sm active:opacity-90"
        >
          <MessageCircle size={20} />
          Send WhatsApp to Customer
        </a>

        {order.adminWhatsappUrl && (
          <a
            href={order.adminWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#1E4D3D] text-white py-4 rounded-xl font-semibold shadow-sm active:opacity-90"
          >
            <MessageCircle size={20} />
            Notify Admin on WhatsApp
          </a>
        )}

        <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-gray-400 flex items-center gap-1">
          <ExternalLink size={11} /> Opens WhatsApp with pre-filled message
        </a>
      </div>

      {/* Done button */}
      <button onClick={onDone}
        className="w-full max-w-sm flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-4 rounded-xl font-medium bg-white shadow-sm active:bg-gray-50">
        <Home size={16} /> Back to Home
      </button>
    </div>
  );
}

// ─── Orders List ──────────────────────────────────────────────────────────────

function OrdersList({ orders, loading, onNew }: { orders: Order[]; loading: boolean; onNew: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-4">
        <h1 className="text-white text-xl font-bold">This Week&apos;s Orders</h1>
        <p className="text-green-100 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {loading && <div className="flex justify-center pt-8"><Spinner className="text-green-500" /></div>}
        {!loading && orders.length === 0 && (
          <div className="text-center pt-12">
            <ShoppingCart size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No orders this week</p>
          </div>
        )}

        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              className="w-full px-4 py-3 text-left flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{order.customer.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{order.orderNumber} · {order.customer.mobile}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-green-700 text-sm">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
              </div>
            </button>
            {expanded === order.id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-1.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">#{item.product.serialNumber} {item.product.name} × {item.quantity}</span>
                    <span className="text-gray-800 font-medium">₹{item.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {order.notes && <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 mt-2">Note: {order.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-20 right-4">
        <button onClick={onNew} className="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-green-700">
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function QtyBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">{icon}</button>
  );
}

function Spinner({ className = "border-white" }: { className?: string }) {
  return <div className={`w-4 h-4 border-2 ${className} border-t-transparent rounded-full animate-spin`} />;
}

function GpsStep({
  gps, gpsLoading, gpsError, onCapture, onContinue, onBack,
}: {
  gps: { lat: number; lng: number; accuracy?: number } | null;
  gpsLoading: boolean;
  gpsError: string | null;
  onCapture: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  useEffect(() => {
    if (!gps && !gpsLoading) onCapture();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onBack={onBack} title="Capture Location" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${gps ? "bg-green-100" : "bg-gray-100"}`}>
          {gpsLoading ? (
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          ) : gps ? (
            <CheckCircle size={44} className="text-green-500" />
          ) : (
            <Navigation size={44} className="text-gray-400" />
          )}
        </div>

        {gps ? (
          <div className="text-center">
            <p className="font-semibold text-gray-800">Location Captured!</p>
            <p className="text-sm text-gray-500 mt-1">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
            {gps.accuracy && <p className="text-xs text-gray-400 mt-0.5">±{Math.round(gps.accuracy)}m accuracy</p>}
          </div>
        ) : gpsLoading ? (
          <div className="text-center">
            <p className="font-semibold text-gray-700">Getting your location...</p>
            <p className="text-sm text-gray-400 mt-1">Please wait, this may take a few seconds</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-semibold text-gray-700">Location Required</p>
            <p className="text-sm text-gray-400 mt-1">
              {gpsError ?? "Tap below to capture your current GPS location"}
            </p>
          </div>
        )}

        {gpsError && (
          <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-xs text-center">
            {gpsError}
          </div>
        )}
      </div>

      <div className="px-4 pb-6 space-y-3">
        {!gps && (
          <button onClick={onCapture} disabled={gpsLoading}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            <Navigation size={18} />{gpsLoading ? "Capturing..." : "Capture My Location"}
          </button>
        )}
        {gps && (
          <button onClick={onContinue}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
            <ChevronRight size={18} /> Continue to Photo
          </button>
        )}
        <button onClick={onContinue}
          className="w-full text-gray-500 py-3 text-sm font-medium">
          Skip Location
        </button>
      </div>
    </div>
  );
}
