"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Phone, MapPin, ChevronRight, X } from "lucide-react";

interface Customer {
  id: string; name: string; mobile: string; address: string;
  village?: string | null; district: string; pincode: string;
  status: string; interestedProduct?: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", village: "", district: "", pincode: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/customers?q=${encodeURIComponent(q)}`);
      if (res.ok) setCustomers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  // Load all on mount
  useEffect(() => { search(""); }, [search]);

  async function handleSave() {
    const { name, mobile, address, district, pincode } = form;
    if (!name || !mobile || !address || !district || !pincode) {
      setError("Please fill all required fields");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/employee/customers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok || res.status === 409) {
      setShowForm(false);
      setForm({ name: "", mobile: "", address: "", village: "", district: "", pincode: "" });
      search(query);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save customer");
    }
  }

  function callCustomer(mobile: string) {
    window.location.href = `tel:${mobile}`;
  }

  if (showForm) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => { setShowForm(false); setError(""); }} className="text-white p-1"><X size={22} /></button>
        <h1 className="text-white font-semibold text-lg">New Customer</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {([
          { key: "name", label: "Full Name *", type: "text", inputMode: "text" },
          { key: "mobile", label: "Mobile Number *", type: "tel", inputMode: "numeric" },
          { key: "address", label: "Address *", type: "text", inputMode: "text" },
          { key: "village", label: "Village / Area", type: "text", inputMode: "text" },
          { key: "district", label: "District *", type: "text", inputMode: "text" },
          { key: "pincode", label: "Pincode *", type: "text", inputMode: "numeric" },
        ] as const).map(({ key, label, type, inputMode }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
              type={type}
              inputMode={inputMode as "text" | "numeric"}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full mt-1 px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400"
            />
          </div>
        ))}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 disabled:opacity-60 mt-2"
        >
          {saving ? "Saving..." : "Save Customer"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-4">
        <h1 className="text-white text-xl font-bold">Customers</h1>
        <p className="text-green-100 text-sm mt-0.5">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or mobile..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {loading && <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />}
          {query && <button onClick={() => setQuery("")}><X size={16} className="text-gray-300" /></button>}
        </div>
      </div>

      <div className="px-4 space-y-2 pb-24">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone size={11} />{c.mobile}
                  </span>
                  {(c.village ?? c.district) && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={11} />{c.village ?? c.district}
                    </span>
                  )}
                </div>
                {c.interestedProduct && (
                  <p className="text-xs text-green-600 mt-0.5 truncate">Interested: {c.interestedProduct}</p>
                )}
              </div>
              <button onClick={() => callCustomer(c.mobile)} className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <Phone size={15} />
              </button>
            </div>
          </div>
        ))}

        {!loading && customers.length === 0 && (
          <div className="text-center pt-12">
            <p className="text-gray-400 text-sm">{query ? "No customers found" : "No customers yet"}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 right-4">
        <button
          onClick={() => { setForm((p) => ({ ...p, mobile: query.match(/^\d+$/) ? query : "" })); setShowForm(true); }}
          className="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-green-700"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}
