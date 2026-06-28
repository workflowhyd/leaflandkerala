"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Minus, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  district: string;
  pincode: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ["Select Customer", "Add Products", "Review & Confirm"];

export function CreateOrderModal({ open, onClose, onSuccess }: CreateOrderModalProps) {
  const [step, setStep] = useState(0);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchCustomers = useCallback(async (q: string) => {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
    }
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&isActive=true&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
  }, []);

  useEffect(() => {
    if (open) {
      searchCustomers("");
      searchProducts("");
    }
  }, [open, searchCustomers, searchProducts]);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch, searchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch, searchProducts]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1, price: product.salePrice || product.price }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleReset = () => {
    setStep(0);
    setCustomerSearch("");
    setSelectedCustomer(null);
    setProductSearch("");
    setCart([]);
    setNotes("");
    setDeliveryDate("");
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selectedCustomer.id,
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity, price: c.price })),
        notes: notes || undefined,
        deliveryDate: deliveryDate || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      handleReset();
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error?.message || data.error || "Failed to create order");
    }
  };

  const getInCartQty = (productId: string) => {
    return cart.find((c) => c.product.id === productId)?.quantity || 0;
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Order"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {step < 2 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && !selectedCustomer) || (step === 1 && cart.length === 0)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button loading={loading} onClick={handleSubmit}>
                Place Order
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${idx < step ? "bg-[#1E4D3D] text-white" : idx === step ? "bg-[#3B7A57] text-white" : "bg-[#e2e8f0] text-[#64748b]"}`}>
                {idx + 1}
              </div>
              <span className={`text-sm ${idx === step ? "font-semibold text-[#1a1a1a]" : "text-[#64748b]"}`}>{label}</span>
              {idx < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-[#e2e8f0]" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Search customer by name or mobile..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto divide-y divide-[#e2e8f0] rounded-md border border-[#e2e8f0]">
              {customers.length === 0 ? (
                <p className="p-4 text-sm text-[#64748b] text-center">No customers found</p>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#1E4D3D]/5 transition-colors ${selectedCustomer?.id === c.id ? "bg-[#1E4D3D]/10" : ""}`}
                  >
                    <div className="font-medium text-[#1a1a1a]">{c.name}</div>
                    <div className="text-xs text-[#64748b]">{c.mobile} · {c.address}, {c.district} - {c.pincode}</div>
                  </button>
                ))
              )}
            </div>
            {selectedCustomer && (
              <div className="flex items-center gap-2 rounded-md bg-[#1E4D3D]/5 px-3 py-2">
                <span className="text-sm font-medium text-[#1E4D3D]">Selected: {selectedCustomer.name}</span>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="max-h-52 overflow-y-auto divide-y divide-[#e2e8f0] rounded-md border border-[#e2e8f0]">
              {products.map((p) => {
                const qty = getInCartQty(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="font-medium text-[#1a1a1a]">{p.name}</div>
                      <div className="text-xs text-[#64748b]">{p.sku} · Stock: {p.stock}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#1E4D3D]">{formatCurrency(p.salePrice || p.price)}</span>
                      {qty === 0 ? (
                        <Button size="sm" onClick={() => addToCart(p)} disabled={p.stock === 0}>
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateQty(p.id, -1)} className="h-7 w-7 rounded-md border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f1f5f9]">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button type="button" onClick={() => updateQty(p.id, 1)} className="h-7 w-7 rounded-md border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f1f5f9]">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && (
              <div className="rounded-md border border-[#e2e8f0] divide-y divide-[#e2e8f0]">
                <div className="px-4 py-2 bg-[#f8f9fa]">
                  <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Cart ({cart.length} items)</span>
                </div>
                {cart.map((c) => (
                  <div key={c.product.id} className="flex items-center justify-between px-4 py-2">
                    <div className="text-sm font-medium text-[#1a1a1a]">{c.product.name}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#64748b]">{c.quantity} × {formatCurrency(c.price)}</span>
                      <span className="text-sm font-semibold">{formatCurrency(c.price * c.quantity)}</span>
                      <button type="button" onClick={() => removeFromCart(c.product.id)} className="text-[#D32F2F] hover:text-[#B71C1C]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 bg-[#f8f9fa]">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold text-[#1E4D3D]">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedCustomer && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-[#e2e8f0] p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Customer</p>
              <p className="font-medium">{selectedCustomer.name}</p>
              <p className="text-sm text-[#64748b]">{selectedCustomer.mobile} · {selectedCustomer.address}</p>
            </div>
            <div className="rounded-md border border-[#e2e8f0] divide-y divide-[#e2e8f0]">
              <div className="px-4 py-2 bg-[#f8f9fa]">
                <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Order Items</span>
              </div>
              {cart.map((c) => (
                <div key={c.product.id} className="flex justify-between px-4 py-2 text-sm">
                  <span>{c.product.name} × {c.quantity}</span>
                  <span className="font-medium">{formatCurrency(c.price * c.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 font-semibold">
                <span>Total</span>
                <span className="text-[#1E4D3D] text-base">{formatCurrency(cartTotal)}</span>
              </div>
            </div>
            <Input
              type="date"
              label="Delivery Date (optional)"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <Textarea
              label="Notes (optional)"
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            {error && <p className="text-sm text-[#D32F2F]">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
