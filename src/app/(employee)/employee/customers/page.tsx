"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Plus, Phone, MapPin, X, Navigation } from "lucide-react";
import { useCustomerSearch, useCreateCustomer } from "@/hooks/use-employee-customers";
import type { CustomerSearchResult as Customer } from "@/lib/api/customers";

const STATUS_COLOR: Record<string, string> = {
  LEAD: "bg-blue-100 text-blue-700",
  VISITED: "bg-purple-100 text-purple-700",
  INTERESTED: "bg-yellow-100 text-yellow-700",
  ORDER_PLACED: "bg-green-100 text-green-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

function mapsUrl(c: Customer): string {
  if (c.location?.latitude && c.location?.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${c.location.latitude},${c.location.longitude}`;
  }
  const q = encodeURIComponent(`${c.address}, ${c.district}, ${c.pincode}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", address: "", village: "", district: "", pincode: "" });
  const [formError, setFormError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchQuery = useCustomerSearch(debouncedQuery);
  const customers = searchQuery.data ?? [];
  const loading = searchQuery.isFetching;

  const createCustomerMutation = useCreateCustomer();
  const saving = createCustomerMutation.isPending;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 280);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  async function handleSave() {
    const { name, mobile, address, district, pincode } = form;
    if (!name || !mobile || !address || !district || !pincode) {
      setFormError("Please fill all required fields");
      return;
    }
    setFormError("");
    try {
      await createCustomerMutation.mutateAsync(form);
      setShowForm(false);
      setForm({ name: "", mobile: "", address: "", village: "", district: "", pincode: "" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  if (showForm) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => { setShowForm(false); setFormError(""); }} className="text-white p-1"><X size={22} /></button>
        <h1 className="text-white font-semibold text-lg">New Customer</h1>
      </div>
      <div className="px-4 py-4 space-y-3">
        {([
          { key: "name", label: "Full Name *" },
          { key: "mobile", label: "Mobile Number *" },
          { key: "address", label: "Address *" },
          { key: "village", label: "Village / Area" },
          { key: "district", label: "District *" },
          { key: "pincode", label: "Pincode *" },
        ] as const).map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
              type={["mobile", "pincode"].includes(key) ? "tel" : "text"}
              inputMode={["mobile", "pincode"].includes(key) ? "numeric" : "text"}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full mt-1 px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400"
            />
          </div>
        ))}
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold shadow-sm active:bg-green-700 disabled:opacity-60 mt-2">
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
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or mobile..."
            className="flex-1 text-sm outline-none bg-transparent" />
          {loading && <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />}
          {query && <button onClick={() => setQuery("")}><X size={16} className="text-gray-300" /></button>}
        </div>
      </div>

      <div className="px-4 space-y-2 pb-24">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3">
              {/* Row 1: avatar + name + status + call */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0 mt-0.5">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status ?? ""] ?? "bg-gray-100 text-gray-500"}`}>
                      {(c.status ?? "").replace("_", " ")}
                    </span>
                  </div>

                  {/* Mobile + Call */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <a href={`tel:+91${c.mobile.replace(/\D/g, "")}`}
                      className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg active:bg-gray-100">
                      <Phone size={12} className="text-green-600" />
                      {c.mobile}
                    </a>
                    <a href={mapsUrl(c)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg active:bg-blue-100">
                      <Navigation size={12} />
                      {c.location ? "Open GPS" : "Open Maps"}
                    </a>
                  </div>

                  {/* Address */}
                  <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1">
                    <MapPin size={11} className="shrink-0 mt-0.5" />
                    {[c.village, c.district, c.pincode].filter(Boolean).join(", ")}
                  </p>

                  {c.interestedProduct && (
                    <p className="text-xs text-green-600 mt-1 truncate">Interested: {c.interestedProduct}</p>
                  )}
                </div>
              </div>
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
          onClick={() => { setForm((p) => ({ ...p, mobile: /^\d+$/.test(query) ? query : "" })); setShowForm(true); }}
          className="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-green-700">
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}
