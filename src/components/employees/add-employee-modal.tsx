"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { compressImageToMaxSize } from "@/lib/compress-image";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
];

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

function IdPhotoCapture({
  label, preview, onCapture, onClear, error,
}: {
  label: string;
  preview: string;
  onCapture: (file: File) => void;
  onClear: () => void;
  error?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onCapture(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#1a1a1a]">{label} *</label>
      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-32 w-auto rounded-lg border border-[#e2e8f0] object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D32F2F] text-white hover:bg-[#B71C1C] transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#e2e8f0] py-5 hover:border-[#3B7A57] hover:bg-[#1E4D3D]/5 transition-colors"
          >
            <Camera className="h-5 w-5 text-[#64748b]" />
            <span className="text-xs text-[#64748b]">Camera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#e2e8f0] py-5 hover:border-[#3B7A57] hover:bg-[#1E4D3D]/5 transition-colors"
          >
            <ImageIcon className="h-5 w-5 text-[#64748b]" />
            <span className="text-xs text-[#64748b]">Gallery</span>
          </button>
        </div>
      )}
      {error && <p className="text-xs text-[#D32F2F]">{error}</p>}
    </div>
  );
}

const INITIAL_FORM = {
  name: "",
  email: "",
  mobile: "",
  password: "",
  address: "",
  territory: "",
  governmentIdType: "AADHAAR",
  governmentIdNumber: "",
  isActive: "true",
};

export function AddEmployeeModal({ open, onClose, onSuccess }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  async function handleFrontCapture(file: File) {
    const compressed = await compressImageToMaxSize(file, 300_000);
    setFrontPreview(compressed);
    setFieldErrors((prev) => ({ ...prev, front: "" }));
  }

  async function handleBackCapture(file: File) {
    const compressed = await compressImageToMaxSize(file, 300_000);
    setBackPreview(compressed);
    setFieldErrors((prev) => ({ ...prev, back: "" }));
  }

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2) errors.name = "Name must be at least 2 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
    if (!form.mobile || form.mobile.length < 10) errors.mobile = "Enter a valid mobile number";
    if (!form.password || form.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.governmentIdNumber.trim()) errors.governmentIdNumber = "Government ID number is required";
    if (!frontPreview) errors.front = "Front image is required";
    if (!backPreview) errors.back = "Back image is required";
    return errors;
  };

  const handleSubmit = async () => {
    setError("");
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const [frontUploadRes, backUploadRes] = await Promise.all([
        fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: frontPreview, folder: "employees" }),
        }),
        fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: backPreview, folder: "employees" }),
        }),
      ]);

      if (!frontUploadRes.ok || !backUploadRes.ok) {
        setError("Failed to upload government ID images. Please try again.");
        return;
      }

      const [frontUpload, backUpload] = await Promise.all([frontUploadRes.json(), backUploadRes.json()]);

      const payload = {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        address: form.address,
        territory: form.territory || undefined,
        isActive: form.isActive === "true",
        governmentIdType: form.governmentIdType,
        governmentIdNumber: form.governmentIdNumber,
        governmentIdFrontUrl: frontUpload.url,
        governmentIdFrontPublicId: frontUpload.publicId,
        governmentIdBackUrl: backUpload.url,
        governmentIdBackPublicId: backUpload.publicId,
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to add employee");
        return;
      }

      onSuccess();
      handleClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setError("");
    setFrontPreview("");
    setBackPreview("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Employee"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Add Employee
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
        {error && (
          <div className="rounded-md bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-4 py-3 text-sm text-[#D32F2F]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="Employee full name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="Mobile Number *"
            placeholder="10-digit mobile number"
            value={form.mobile}
            onChange={(e) => handleChange("mobile", e.target.value)}
            error={fieldErrors.mobile}
            maxLength={15}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email *"
            type="email"
            placeholder="employee@example.com"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={fieldErrors.email}
            helperText="Used as the employee's login"
          />
          <Input
            label="Password *"
            type="password"
            placeholder="Minimum 8 characters"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            error={fieldErrors.password}
          />
        </div>

        <Textarea
          label="Address *"
          placeholder="Full address"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          error={fieldErrors.address}
          rows={2}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Territory"
            placeholder="e.g. Ernakulam District"
            value={form.territory}
            onChange={(e) => handleChange("territory", e.target.value)}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.value)}
          />
        </div>
        <p className="text-xs text-[#94a3b8] -mt-2">
          Commission is fixed at 30% for every employee and calculated automatically — not editable here.
        </p>

        {/* Government ID */}
        <div className="rounded-lg border border-[#e2e8f0] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[#1a1a1a]">Government ID</h3>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Government ID Type *"
                options={DOCUMENT_TYPE_OPTIONS}
                value={form.governmentIdType}
                onChange={(e) => handleChange("governmentIdType", e.target.value)}
              />
              <Input
                label="Government ID Number *"
                placeholder="ID number"
                value={form.governmentIdNumber}
                onChange={(e) => handleChange("governmentIdNumber", e.target.value)}
                error={fieldErrors.governmentIdNumber}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <IdPhotoCapture
                label="Government ID — Front"
                preview={frontPreview}
                onCapture={handleFrontCapture}
                onClear={() => setFrontPreview("")}
                error={fieldErrors.front}
              />
              <IdPhotoCapture
                label="Government ID — Back"
                preview={backPreview}
                onCapture={handleBackCapture}
                onClear={() => setBackPreview("")}
                error={fieldErrors.back}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
