"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageToTarget, ImageTooLargeError } from "@/lib/compress-image";

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
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

interface FormState {
  name: string;
  category: string;
  description: string;
  price: string;
  salePrice: string;
  sku: string;
  stock: string;
  isActive: boolean;
  imageUrl: string;
  imagePublicId: string;
}

const defaultForm: FormState = {
  name: "",
  category: "",
  description: "",
  price: "",
  salePrice: "",
  sku: "",
  stock: "",
  isActive: true,
  imageUrl: "",
  imagePublicId: "",
};

export function ProductFormModal({
  open,
  onClose,
  onSuccess,
  product,
}: ProductFormModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [imageStage, setImageStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageLoading = imageStage !== "idle";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!product;

  useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          name: product.name,
          category: product.category,
          description: product.description ?? "",
          price: String(product.price),
          salePrice: product.salePrice != null ? String(product.salePrice) : "",
          sku: product.sku,
          stock: String(product.stock),
          isActive: product.isActive,
          imageUrl: product.imageUrl ?? "",
          imagePublicId: product.imagePublicId ?? "",
        });
        setImagePreview(product.imageUrl ?? null);
      } else {
        setForm(defaultForm);
        setImagePreview(null);
      }
      setErrors({});
    }
  }, [open, product]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.category) newErrors.category = "Category is required";
    if (!form.sku.trim()) newErrors.sku = "SKU is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      newErrors.price = "Enter a valid price";
    if (form.salePrice && (isNaN(Number(form.salePrice)) || Number(form.salePrice) <= 0))
      newErrors.salePrice = "Enter a valid sale price";
    if (form.stock === "" || isNaN(Number(form.stock)) || Number(form.stock) < 0)
      newErrors.stock = "Enter a valid stock quantity";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrors((prev) => ({ ...prev, imageUrl: undefined }));
    setImageStage("compressing");
    try {
      const compressed = await compressImageToTarget(file);
      setImagePreview(compressed);

      setImageStage("uploading");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: compressed, folder: "products" }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setField("imageUrl", result.url || result.secure_url || "");
      setField("imagePublicId", result.public_id || "");
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        imageUrl: err instanceof ImageTooLargeError ? err.message : "Image upload failed",
      }));
    } finally {
      setImageStage("idle");
    }
  }

  function removeImage() {
    setImagePreview(null);
    setField("imageUrl", "");
    setField("imagePublicId", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        price: Number(form.price),
        salePrice: form.salePrice ? Number(form.salePrice) : null,
        sku: form.sku.trim(),
        stock: Number(form.stock),
        isActive: form.isActive,
        imageUrl: form.imageUrl || null,
        imagePublicId: form.imagePublicId || null,
      };

      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error?.fieldErrors) {
          const fe: Partial<Record<keyof FormState, string>> = {};
          for (const [k, msgs] of Object.entries(err.error.fieldErrors)) {
            fe[k as keyof FormState] = (msgs as string[])[0];
          }
          setErrors(fe);
        } else {
          setErrors({ name: err.error || "Something went wrong" });
        }
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setErrors({ name: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "Add New Product"}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image upload */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#1a1a1a]">Product Image</span>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "relative flex h-24 w-24 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors",
                imagePreview
                  ? "border-[#3B7A57]"
                  : "border-[#e2e8f0] hover:border-[#3B7A57]"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {imageLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#3B7A57]" />
              ) : imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[#94a3b8]">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-xs">Upload</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#64748b]">
                {imageStage === "compressing"
                  ? "Compressing image..."
                  : imageStage === "uploading"
                  ? "Uploading..."
                  : "Click to upload a product image. Automatically compressed to under 200 KB."}
              </p>
              {imagePreview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="mt-2 flex items-center gap-1 text-xs text-[#D32F2F] hover:underline"
                >
                  <X className="h-3 w-3" />
                  Remove image
                </button>
              )}
              {errors.imageUrl && (
                <p className="mt-1 text-xs text-[#D32F2F]">{errors.imageUrl}</p>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* Name + SKU */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Product Name *"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            error={errors.name}
            placeholder="e.g. Tomato Seeds Premium"
          />
          <Input
            label="SKU *"
            value={form.sku}
            onChange={(e) => setField("sku", e.target.value)}
            error={errors.sku}
            placeholder="e.g. SEED-TOM-001"
            disabled={isEdit}
          />
        </div>

        {/* Category */}
        <Select
          label="Category *"
          value={form.category}
          onChange={(e) => setField("category", e.target.value)}
          error={errors.category}
          options={CATEGORY_OPTIONS}
          placeholder="Select a category"
        />

        {/* Description */}
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Describe the product..."
          rows={3}
        />

        {/* Price + Sale Price + Stock */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Price (₹) *"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            error={errors.price}
            placeholder="0.00"
          />
          <Input
            label="Sale Price (₹)"
            type="number"
            min="0"
            step="0.01"
            value={form.salePrice}
            onChange={(e) => setField("salePrice", e.target.value)}
            error={errors.salePrice}
            placeholder="Optional"
          />
          <Input
            label="Stock *"
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(e) => setField("stock", e.target.value)}
            error={errors.stock}
            placeholder="0"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#fafafa] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">Active</p>
            <p className="text-xs text-[#64748b]">Product is visible and available for ordering</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isActive}
            onClick={() => setField("isActive", !form.isActive)}
            className={cn(
              "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200",
              form.isActive ? "bg-[#1E4D3D]" : "bg-[#cbd5e1]"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                form.isActive ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </form>
    </Modal>
  );
}
