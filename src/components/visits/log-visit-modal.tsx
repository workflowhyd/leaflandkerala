"use client";

import { useState, useEffect, useCallback } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
}

interface LogVisitModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogVisitModal({ open, onClose, onSuccess }: LogVisitModalProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchCustomers = useCallback(async (q: string) => {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
    }
  }, []);

  useEffect(() => {
    if (open) searchCustomers("");
  }, [open, searchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch, searchCustomers]);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError("Unable to get location: " + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReset = () => {
    setCustomerSearch("");
    setSelectedCustomer(null);
    setVisitDate(new Date().toISOString().slice(0, 16));
    setNotes("");
    setLatitude(null);
    setLongitude(null);
    setGpsError("");
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer.");
      return;
    }
    setLoading(true);
    setError("");
    const body: Record<string, unknown> = {
      customerId: selectedCustomer.id,
      visitDate,
      notes: notes || undefined,
    };
    if (latitude !== null) body.latitude = latitude;
    if (longitude !== null) body.longitude = longitude;

    const res = await fetch("/api/field-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      handleReset();
      onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to log visit");
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Log Field Visit"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Log Visit</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#1a1a1a]">Customer</label>
          <input
            type="text"
            placeholder="Search customer..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent"
          />
          {customers.length > 0 && !selectedCustomer && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-[#e2e8f0] divide-y divide-[#e2e8f0]">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setCustomers([]); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#1E4D3D]/5 transition-colors text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[#64748b] ml-2">{c.mobile}</span>
                </button>
              ))}
            </div>
          )}
          {selectedCustomer && (
            <div className="flex items-center justify-between rounded-md bg-[#1E4D3D]/5 px-3 py-2">
              <span className="text-sm font-medium text-[#1E4D3D]">{selectedCustomer.name} · {selectedCustomer.mobile}</span>
              <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); searchCustomers(""); }} className="text-xs text-[#64748b] hover:text-[#D32F2F]">Clear</button>
            </div>
          )}
        </div>

        <Input
          type="datetime-local"
          label="Visit Date & Time"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
        />

        <Textarea
          label="Notes"
          placeholder="Observations, follow-up actions, products discussed..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#1a1a1a]">GPS Location</label>
          <Button variant="outline" type="button" onClick={captureGPS} disabled={gpsLoading}>
            {gpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {gpsLoading ? "Getting Location..." : "Capture Current Location"}
          </Button>
          {latitude !== null && longitude !== null && (
            <div className="rounded-md bg-[#1E4D3D]/5 px-3 py-2">
              <p className="text-xs font-medium text-[#1E4D3D]">Location captured</p>
              <p className="text-xs font-mono text-[#64748b]">{latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
            </div>
          )}
          {gpsError && <p className="text-xs text-[#D32F2F]">{gpsError}</p>}
        </div>

        {error && <p className="text-sm text-[#D32F2F]">{error}</p>}
      </div>
    </Modal>
  );
}
