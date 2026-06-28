"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Upload, X } from "lucide-react";

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

interface DocumentEntry {
  type: string;
  file: File | null;
  preview: string;
}

export function AddEmployeeModal({ open, onClose, onSuccess }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    address: "",
    commissionPercent: 10,
    territory: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [document, setDocument] = useState<DocumentEntry>({
    type: "AADHAAR",
    file: null,
    preview: "",
  });

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDocumentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocument((prev) => ({
        ...prev,
        file,
        preview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearDocument = () => {
    setDocument((prev) => ({ ...prev, file: null, preview: "" }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2) errors.name = "Name must be at least 2 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
    if (!form.mobile || form.mobile.length < 10) errors.mobile = "Enter a valid mobile number";
    if (!form.password || form.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (form.commissionPercent < 5 || form.commissionPercent > 15) errors.commissionPercent = "Commission must be between 5% and 15%";
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
      // Upload document image first if provided
      let documentUrl = "";
      if (document.file && document.preview) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: document.preview, folder: "employees" }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          documentUrl = uploadData.url || "";
        }
      }

      const payload = {
        ...form,
        address: form.address || undefined,
        territory: form.territory || undefined,
        document: document.file
          ? { type: document.type, imageUrl: documentUrl }
          : undefined,
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
    setForm({
      name: "",
      email: "",
      mobile: "",
      password: "",
      address: "",
      commissionPercent: 10,
      territory: "",
    });
    setFieldErrors({});
    setError("");
    setDocument({ type: "AADHAAR", file: null, preview: "" });
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
            label="Email *"
            type="email"
            placeholder="employee@example.com"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={fieldErrors.email}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Mobile *"
            placeholder="10-digit mobile number"
            value={form.mobile}
            onChange={(e) => handleChange("mobile", e.target.value)}
            error={fieldErrors.mobile}
            maxLength={15}
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
          label="Address"
          placeholder="Full address (optional)"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Territory"
            placeholder="e.g. Ernakulam District"
            value={form.territory}
            onChange={(e) => handleChange("territory", e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1a1a1a]">
              Commission % ({form.commissionPercent}%)
            </label>
            <input
              type="range"
              min={5}
              max={15}
              step={0.5}
              value={form.commissionPercent}
              onChange={(e) => handleChange("commissionPercent", parseFloat(e.target.value))}
              className="w-full accent-[#1E4D3D]"
            />
            <div className="flex justify-between text-xs text-[#64748b]">
              <span>5%</span>
              <span className="font-medium text-[#1E4D3D]">{form.commissionPercent}%</span>
              <span>15%</span>
            </div>
            {fieldErrors.commissionPercent && (
              <p className="text-xs text-[#D32F2F]">{fieldErrors.commissionPercent}</p>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div className="rounded-lg border border-[#e2e8f0] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[#1a1a1a]">Document Upload (Optional)</h3>
          <div className="flex flex-col gap-3">
            <Select
              label="Document Type"
              options={DOCUMENT_TYPE_OPTIONS}
              value={document.type}
              onChange={(e) => setDocument((prev) => ({ ...prev, type: e.target.value }))}
            />
            {document.preview ? (
              <div className="relative inline-block">
                <Image
                  src={document.preview}
                  alt="Document preview"
                  width={128}
                  height={128}
                  className="h-32 w-auto rounded-lg border border-[#e2e8f0] object-contain"
                />
                <button
                  onClick={clearDocument}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D32F2F] text-white hover:bg-[#B71C1C] transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e2e8f0] py-6 hover:border-[#3B7A57] hover:bg-[#1E4D3D]/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleDocumentFile}
                />
                <Upload className="h-6 w-6 text-[#64748b]" />
                <div className="text-center">
                  <p className="text-sm text-[#64748b]">Click to upload document image</p>
                  <p className="text-xs text-[#94a3b8]">JPG, PNG up to 5MB</p>
                </div>
              </label>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
