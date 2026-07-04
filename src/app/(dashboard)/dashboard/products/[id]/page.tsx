"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ProductFormModal } from "@/components/products/product-form-modal";
import {
  ArrowLeft,
  Edit2,
  PackageOpen,
  Tag,
  BarChart2,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  sku: string;
  stock: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    customer: { name: string };
    employee?: { name: string } | null;
  };
}

function StockLevel({ stock }: { stock: number }) {
  const pct = Math.min(100, (stock / 100) * 100);
  const color = stock < 10 ? "#D32F2F" : stock <= 50 ? "#F9A825" : "#2E7D32";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#1a1a1a]">{stock} units</span>
        <span
          className="text-xs font-semibold"
          style={{ color }}
        >
          {stock < 10 ? "Low Stock" : stock <= 50 ? "Medium" : "Well Stocked"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderItem[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProduct(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoadingProduct(false);
    }
  }, [id]);

  const fetchOrderHistory = useCallback(async () => {
    try {
      // Fetch orders that include this product via the orders API with a product filter
      const res = await fetch(`/api/orders?limit=50`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Filter orders that contain this product
      const relevantItems: OrderItem[] = [];
      for (const order of data.orders ?? []) {
        for (const item of order.items ?? []) {
          if (item.productId === id) {
            relevantItems.push({
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              order: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                createdAt: order.createdAt,
                customer: { name: order.customer?.name ?? "Unknown" },
                employee: order.employee,
              },
            });
          }
        }
      }
      setOrderHistory(relevantItems);
    } catch {
      // silent
    } finally {
      setLoadingOrders(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchOrderHistory();
  }, [fetchProduct, fetchOrderHistory]);

  if (loadingProduct) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2e8f0] border-t-[#1E4D3D]" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <PackageOpen className="h-14 w-14 text-[#cbd5e1]" />
        <div className="text-center">
          <p className="text-lg font-semibold text-[#1a1a1a]">Product not found</p>
          <p className="mt-1 text-sm text-[#64748b]">This product may have been removed.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  const totalOrderedQty = orderHistory.reduce((s, i) => s + i.quantity, 0);
  const totalOrderRevenue = orderHistory.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-[#64748b] hover:text-[#1E4D3D]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </button>
        <Button onClick={() => setShowEditModal(true)}>
          <Edit2 className="h-4 w-4" />
          Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: image + quick stats */}
        <div className="space-y-4">
          {/* Product image */}
          <Card className="overflow-hidden">
            <div className="relative h-64 w-full bg-[#f8f9fa]">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <PackageOpen className="h-20 w-20 text-[#cbd5e1]" />
                </div>
              )}
              {/* Status pill */}
              <div className="absolute right-3 top-3">
                {product.isActive ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-[#2E7D32] px-3 py-1 text-xs font-semibold text-white shadow">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-[#D32F2F] px-3 py-1 text-xs font-semibold text-white shadow">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 text-center">
              <ShoppingCart className="mx-auto mb-2 h-6 w-6 text-[#3B7A57]" />
              <p className="text-2xl font-bold text-[#1a1a1a]">{orderHistory.length}</p>
              <p className="text-xs text-[#64748b]">Total Orders</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 text-center">
              <BarChart2 className="mx-auto mb-2 h-6 w-6 text-[#1E4D3D]" />
              <p className="text-2xl font-bold text-[#1a1a1a]">{totalOrderedQty}</p>
              <p className="text-xs text-[#64748b]">Units Sold</p>
            </div>
          </div>

          {/* Revenue from this product */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E4D3D]/10">
                <Tag className="h-5 w-5 text-[#1E4D3D]" />
              </div>
              <div>
                <p className="text-xs text-[#64748b]">Revenue Generated</p>
                <p className="text-xl font-bold text-[#1E4D3D]">
                  {formatCurrency(totalOrderRevenue)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Product info card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <p className="mt-1 font-mono text-sm text-[#94a3b8]">{product.sku}</p>
                </div>
                <Badge variant="default">{getStatusLabel(product.category)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {product.description && (
                <p className="mb-5 text-sm leading-relaxed text-[#64748b]">
                  {product.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-[#f8f9fa] p-3">
                  <p className="text-xs text-[#64748b]">Price</p>
                  <p className="mt-1 text-lg font-bold text-[#1a1a1a]">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#f8f9fa] p-3">
                  <p className="text-xs text-[#64748b]">Sale Price</p>
                  <p className="mt-1 text-lg font-bold text-[#2E7D32]">
                    {product.salePrice ? formatCurrency(product.salePrice) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-[#f8f9fa] p-3">
                  <p className="text-xs text-[#64748b]">Added</p>
                  <p className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                    {formatDate(product.createdAt)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#f8f9fa] p-3">
                  <p className="text-xs text-[#64748b]">Updated</p>
                  <p className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                    {formatDate(product.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Stock level */}
              <div className="mt-5 rounded-xl border border-[#e2e8f0] p-4">
                <div className="mb-3 flex items-center gap-2">
                  {product.stock < 10 && (
                    <AlertTriangle className="h-4 w-4 text-[#D32F2F]" />
                  )}
                  <p className="text-sm font-semibold text-[#1a1a1a]">Stock Level</p>
                </div>
                <StockLevel stock={product.stock} />
              </div>
            </CardContent>
          </Card>

          {/* Order history */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <p className="text-sm text-[#64748b]">
                Orders that include this product
              </p>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {loadingOrders ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#e2e8f0] border-t-[#1E4D3D]" />
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="flex h-24 flex-col items-center justify-center gap-2">
                  <ShoppingCart className="h-8 w-8 text-[#cbd5e1]" />
                  <p className="text-sm text-[#64748b]">No orders for this product yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <a
                            href={`/dashboard/orders/${item.order.id}`}
                            className="font-mono text-xs font-semibold text-[#1E4D3D] hover:underline"
                          >
                            {item.order.orderNumber}
                          </a>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-[#1a1a1a]">
                            {item.order.customer.name}
                          </p>
                          {item.order.employee && (
                            <p className="text-xs text-[#64748b]">
                              via {item.order.employee.name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell className="font-semibold text-[#1E4D3D]">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.order.status)}`}
                          >
                            {getStatusLabel(item.order.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#64748b]">
                          {formatDate(item.order.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <ProductFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          fetchProduct();
        }}
        product={product}
      />
    </div>
  );
}
