"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INTERESTED_PRODUCT_OPTIONS = [
  { value: "", label: "Select product interest" },
  { value: "SEEDS", label: "Seeds" },
  { value: "FERTILIZERS", label: "Fertilizers" },
  { value: "PESTICIDES", label: "Pesticides" },
  { value: "ORGANIC_PRODUCTS", label: "Organic Products" },
  { value: "FARMING_TOOLS", label: "Farming Tools" },
  { value: "IRRIGATION_SUPPLIES", label: "Irrigation Supplies" },
  { value: "AGRICULTURAL_EQUIPMENT", label: "Agricultural Equipment" },
];

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "VISITED", label: "Visited" },
  { value: "INTERESTED", label: "Interested" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "ACTIVE", label: "Active" },
];

const STATE_OPTIONS = [
  { value: "Kerala", label: "Kerala" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
];

export function AddCustomerModal({ open, onClose, onSuccess }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    alternateMobile: "",
    address: "",
    village: "",
    district: "",
    state: "Kerala",
    pincode: "",
    landmark: "",
    interestedProduct: "",
    notes: "",
    status: "LEAD",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2) errors.name = "Name must be at least 2 characters";
    if (!form.mobile || form.mobile.length < 10) errors.mobile = "Enter a valid mobile number";
    if (!form.address.trim() || form.address.length < 5) errors.address = "Address must be at least 5 characters";
    if (!form.district.trim() || form.district.length < 2) errors.district = "District is required";
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) errors.pincode = "Pincode must be 6 digits";
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
      const payload = {
        ...form,
        alternateMobile: form.alternateMobile || null,
        village: form.village || null,
        landmark: form.landmark || null,
        interestedProduct: form.interestedProduct || null,
        notes: form.notes || null,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to add customer");
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
      mobile: "",
      alternateMobile: "",
      address: "",
      village: "",
      district: "",
      state: "Kerala",
      pincode: "",
      landmark: "",
      interestedProduct: "",
      notes: "",
      status: "LEAD",
    });
    setFieldErrors({});
    setError("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Customer"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Add Customer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
        {error && (
          <div className="rounded-md bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-4 py-3 text-sm text-[#D32F2F]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="Customer full name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="Mobile *"
            placeholder="10-digit mobile number"
            value={form.mobile}
            onChange={(e) => handleChange("mobile", e.target.value)}
            error={fieldErrors.mobile}
            maxLength={15}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Alternate Mobile"
            placeholder="Optional alternate number"
            value={form.alternateMobile}
            onChange={(e) => handleChange("alternateMobile", e.target.value)}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
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

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Village"
            placeholder="Village name"
            value={form.village}
            onChange={(e) => handleChange("village", e.target.value)}
          />
          <Input
            label="District *"
            placeholder="District"
            value={form.district}
            onChange={(e) => handleChange("district", e.target.value)}
            error={fieldErrors.district}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="State"
            options={STATE_OPTIONS}
            value={form.state}
            onChange={(e) => handleChange("state", e.target.value)}
          />
          <Input
            label="Pincode *"
            placeholder="6-digit pincode"
            value={form.pincode}
            onChange={(e) => handleChange("pincode", e.target.value)}
            error={fieldErrors.pincode}
            maxLength={6}
          />
          <Input
            label="Landmark"
            placeholder="Nearby landmark"
            value={form.landmark}
            onChange={(e) => handleChange("landmark", e.target.value)}
          />
        </div>

        <Select
          label="Interested Product"
          options={INTERESTED_PRODUCT_OPTIONS}
          value={form.interestedProduct}
          onChange={(e) => handleChange("interestedProduct", e.target.value)}
          placeholder="Select product interest"
        />

        <Textarea
          label="Notes"
          placeholder="Any additional notes about this customer"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={2}
        />
      </div>
    </Modal>
  );
}
