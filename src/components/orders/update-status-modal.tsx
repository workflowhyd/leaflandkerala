"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
}

interface UpdateStatusModalProps {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PACKED", label: "Packed" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function UpdateStatusModal({ open, order, onClose, onSuccess }: UpdateStatusModalProps) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (status === order.status) {
      onClose();
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: notes || undefined }),
    });
    setLoading(false);
    if (res.ok) {
      setNotes("");
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update status");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Update Status — ${order.orderNumber}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Update</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="New Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Textarea
          label="Notes (optional)"
          placeholder="Reason or comment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        {error && <p className="text-sm text-[#D32F2F]">{error}</p>}
      </div>
    </Modal>
  );
}
