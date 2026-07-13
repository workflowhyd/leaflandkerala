"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { useToast } from "@/components/ui/toast";
import { cloudinaryThumb } from "@/lib/image-thumb";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getCategoryMeta } from "@/lib/category-images";

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
}

const CATEGORY_OPTIONS = [
  { value: "MANGO", label: "Mango" },
  { value: "JACKFRUIT", label: "Jackfruit" },
  { value: "COCONUT", label: "Coconut" },
  { value: "FRUIT_PLANTS", label: "Fruit Plants" },
  { value: "SPICES", label: "Spices & Arecanut" },
  { value: "ORNAMENTAL_PALMS", label: "Ornamental Palms" },
  { value: "FLOWERS", label: "Flowers" },
  { value: "INDOOR_PLANTS", label: "Indoor Plants" },
  { value: "ORNAMENTAL_PLANTS", label: "Ornamental Plants" },
  { value: "TIMBER_TREES", label: "Timber Trees" },
  { value: "GROW_SUPPLIES", label: "Grow Supplies" },
  { value: "SEEDS", label: "Seeds" },
  { value: "FERTILIZERS", label: "Fertilizers" },
  { value: "PESTICIDES", label: "Pesticides" },
  { value: "ORGANIC_PRODUCTS", label: "Organic Products" },
  { value: "FARMING_TOOLS", label: "Farming Tools" },
  { value: "IRRIGATION_SUPPLIES", label: "Irrigation Supplies" },
  { value: "AGRICULTURAL_EQUIPMENT", label: "Agricultural Equipment" },
];

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: "default",
  FERTILIZERS: "success",
  PESTICIDES: "danger",
  ORGANIC_PRODUCTS: "success",
  FARMING_TOOLS: "info",
  IRRIGATION_SUPPLIES: "info",
  AGRICULTURAL_EQUIPMENT: "warning",
};

function StockBadge({ stock }: { stock: number }) {
  if (stock < 10) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#D32F2F]/10 px-2.5 py-0.5 text-xs font-medium text-[#D32F2F]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#D32F2F]" />
        {stock} — Low
      </span>
    );
  }
  if (stock <= 50) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F9A825]/15 px-2.5 py-0.5 text-xs font-medium text-[#E65100]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F9A825]" />
        {stock} — Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#2E7D32]/10 px-2.5 py-0.5 text-xs font-medium text-[#2E7D32]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]" />
      {stock} — Good
    </span>
  );
}

function ProductImage({
  url, name, category,
  containerClass = "h-10 w-10 rounded-lg",
  imgClass = "h-10 w-10 rounded-lg object-cover",
  emojiClass = "text-xl",
}: {
  url?: string | null; name: string; category: string;
  containerClass?: string; imgClass?: string; emojiClass?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const meta = getCategoryMeta(category);
  if (url && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cloudinaryThumb(url, 300, 300)} alt={name} className={`${imgClass} bg-gray-100`} loading="lazy" decoding="async" onError={() => setImgError(true)} />
    );
  }
  return (
    <div className={`flex items-center justify-center ${meta.bg} ${containerClass}`}>
      <span className={`leading-none ${emojiClass}`}>{meta.emoji}</span>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  productName,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  productName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D32F2F]/10">
          <Trash2 className="h-6 w-6 text-[#D32F2F]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">
          Delete Product
        </h3>
        <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{productName}</p>
        <p className="mb-6 text-sm text-[#64748b]">
          This will permanently delete the product and its associated image. This
          action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "grid">("table");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category) params.set("category", category);
      if (isActive !== "") params.set("isActive", isActive);

      const res = await fetch(`/api/products?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to fetch");
      setProducts(data.products);
      setTotal(data.total);
    } catch {
      toastError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, isActive, page, toastError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Refetch when the tab regains focus so edits made elsewhere aren't missed.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) fetchProducts();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProducts]);

  async function handleToggleStatus(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error();
      success(
        product.isActive ? "Product deactivated" : "Product activated",
        product.name
      );
      fetchProducts();
    } catch {
      toastError("Failed to update product status");
    }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${deleteProduct.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toastError("Failed to delete product", body.error);
        return;
      }
      success("Product deleted", deleteProduct.name);
      setDeleteProduct(null);
      if (products.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchProducts();
    } catch {
      toastError("Failed to delete product");
    } finally {
      setDeleteLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">
            Products
          </h1>
          <p className="mt-0.5 text-sm text-[#64748b]">
            {total} product{total !== 1 ? "s" : ""} in catalogue
          </p>
        </div>
        {/* Desktop add button */}
        <Button onClick={() => setShowAddModal(true)} className="hidden sm:flex">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3 lg:p-4">
        <div className="flex flex-wrap items-end gap-2 lg:gap-3">
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                name="product-search"
                id="product-search"
                autoComplete="off"
                aria-label="Search products by name or SKU"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-[#e2e8f0] bg-white py-2 pl-9 pr-3 text-sm text-[#1a1a1a] placeholder:text-[#64748b] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3B7A57] hover:border-[#3B7A57]"
              />
            </div>
          </div>
          <div className="w-full sm:w-[180px]">
            <Select
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              placeholder="All Categories"
            />
          </div>
          <div className="w-full sm:w-[130px]">
            <Select
              options={STATUS_OPTIONS}
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
              }}
              placeholder="All Status"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-[#e2e8f0] p-1">
            <button
              onClick={() => setView("table")}
              className={cn(
                "rounded p-1.5 transition-colors",
                view === "table"
                  ? "bg-[#1E4D3D] text-white"
                  : "text-[#64748b] hover:bg-[#f1f5f9]"
              )}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "rounded p-1.5 transition-colors",
                view === "grid"
                  ? "bg-[#1E4D3D] text-white"
                  : "text-[#64748b] hover:bg-[#f1f5f9]"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2e8f0] border-t-[#1E4D3D]" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <PackageOpen className="h-12 w-12 text-[#cbd5e1]" />
          <div className="text-center">
            <p className="font-semibold text-[#1a1a1a]">No products found</p>
            <p className="mt-1 text-sm text-[#64748b]">
              {search || category || isActive
                ? "Try adjusting your filters"
                : "Add your first product to get started"}
            </p>
          </div>
          {!search && !category && !isActive && (
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        /* Grid view — works well on all sizes */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <ProductImage
                  url={product.imageUrl}
                  name={product.name}
                  category={product.category}
                  containerClass="h-40 w-full"
                  imgClass="h-full w-full object-cover"
                  emojiClass="text-5xl"
                />
                {!product.isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#D32F2F]">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <a
                    href={`/dashboard/products/${product.id}`}
                    className="line-clamp-2 font-semibold leading-tight text-[#1a1a1a] hover:text-[#1E4D3D] hover:underline"
                  >
                    {product.name}
                  </a>
                  <Badge
                    variant={
                      (CATEGORY_COLORS[product.category] as
                        | "default"
                        | "success"
                        | "warning"
                        | "danger"
                        | "info"
                        | "outline") || "default"
                    }
                    className="flex-shrink-0 text-[10px]"
                  >
                    {getCategoryMeta(product.category).label}
                  </Badge>
                </div>
                <p className="mb-3 font-mono text-xs text-[#94a3b8]">
                  {product.sku}
                </p>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg font-bold text-[#1E4D3D]">
                    {formatCurrency(product.price)}
                  </span>
                  {product.salePrice && (
                    <span className="text-sm font-medium text-[#2E7D32]">
                      Sale: {formatCurrency(product.salePrice)}
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <StockBadge stock={product.stock} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[#e2e8f0] pt-3">
                  <button
                    onClick={() => handleToggleStatus(product)}
                    className={cn(
                      "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200",
                      product.isActive ? "bg-[#1E4D3D]" : "bg-[#cbd5e1]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                        product.isActive
                          ? "translate-x-[18px]"
                          : "translate-x-[3px]"
                      )}
                    />
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditProduct(product)}
                      className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D]"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteProduct(product)}
                      className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#D32F2F]/10 hover:text-[#D32F2F]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile card list — hidden on md+ */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="flex gap-3 p-3">
                  <div className="flex-shrink-0">
                    <ProductImage
                      url={product.imageUrl}
                      name={product.name}
                      category={product.category}
                      containerClass="h-16 w-16 rounded-lg"
                      imgClass="h-16 w-16 rounded-lg object-cover"
                      emojiClass="text-3xl"
                    />
                  </div>
                  <div className="flex flex-1 flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <a
                        href={`/dashboard/products/${product.id}`}
                        className="font-semibold text-[#1a1a1a] leading-tight line-clamp-2 hover:text-[#1E4D3D]"
                      >
                        {product.name}
                      </a>
                      <Badge
                        variant={
                          (CATEGORY_COLORS[product.category] as
                            | "default"
                            | "success"
                            | "warning"
                            | "danger"
                            | "info"
                            | "outline") || "default"
                        }
                        className="flex-shrink-0 text-[10px]"
                      >
                        {getCategoryMeta(product.category).label}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">
                      {product.sku}
                    </p>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-[#1E4D3D]">
                        {formatCurrency(product.price)}
                      </span>
                      {product.salePrice && (
                        <span className="text-xs font-medium text-[#2E7D32]">
                          Sale: {formatCurrency(product.salePrice)}
                        </span>
                      )}
                    </div>
                    <StockBadge stock={product.stock} />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#e2e8f0] px-3 py-2">
                  <button
                    onClick={() => handleToggleStatus(product)}
                    className={cn(
                      "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200",
                      product.isActive ? "bg-[#1E4D3D]" : "bg-[#cbd5e1]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                        product.isActive
                          ? "translate-x-[18px]"
                          : "translate-x-[3px]"
                      )}
                    />
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditProduct(product)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteProduct(product)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#D32F2F]/10 hover:text-[#D32F2F] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table — hidden on mobile */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <ProductImage
                        url={product.imageUrl}
                        name={product.name}
                        category={product.category}
                      />
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/dashboard/products/${product.id}`}
                        className="font-semibold text-[#1a1a1a] hover:text-[#1E4D3D] hover:underline"
                      >
                        {product.name}
                      </a>
                      {product.description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-[#64748b]">
                          {product.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-[#64748b]">
                        {product.sku}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (CATEGORY_COLORS[product.category] as
                            | "default"
                            | "success"
                            | "warning"
                            | "danger"
                            | "info"
                            | "outline") || "default"
                        }
                      >
                        {getCategoryMeta(product.category).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell>
                      {product.salePrice ? (
                        <span className="font-medium text-[#2E7D32]">
                          {formatCurrency(product.salePrice)}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StockBadge stock={product.stock} />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className={cn(
                          "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200",
                          product.isActive ? "bg-[#1E4D3D]" : "bg-[#cbd5e1]"
                        )}
                        title={product.isActive ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                            product.isActive
                              ? "translate-x-[18px]"
                              : "translate-x-[3px]"
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditProduct(product)}
                          className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D]"
                          title="Edit product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteProduct(product)}
                          className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#D32F2F]/10 hover:text-[#D32F2F]"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white px-4 py-3">
          <p className="text-sm text-[#64748b]">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p =
                totalPages <= 5
                  ? i + 1
                  : Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    p === page
                      ? "bg-[#1E4D3D] text-white"
                      : "text-[#64748b] hover:bg-[#f1f5f9]"
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md p-1.5 text-[#64748b] transition-colors hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      <ProductFormModal
        open={showAddModal || !!editProduct}
        onClose={() => {
          setShowAddModal(false);
          setEditProduct(null);
        }}
        onSuccess={() => {
          fetchProducts();
          success(
            editProduct ? "Product updated" : "Product added",
            editProduct?.name
          );
        }}
        product={editProduct}
      />

      {/* Delete confirmation */}
      <DeleteConfirmModal
        open={!!deleteProduct}
        productName={deleteProduct?.name ?? ""}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteProduct(null)}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E4D3D] text-white shadow-lg active:scale-95 transition-transform sm:hidden"
        aria-label="Add product"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
