"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, MessageSquare, Percent, MapPin, Plus, Trash2, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type TabId = "company" | "whatsapp" | "commission" | "pincodes";

const TABS: { id: TabId; label: string; shortLabel: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "company", label: "Company Info", shortLabel: "Company", icon: Building2 },
  { id: "whatsapp", label: "WhatsApp", shortLabel: "WhatsApp", icon: MessageSquare },
  { id: "commission", label: "Commission", shortLabel: "Commission", icon: Percent },
  { id: "pincodes", label: "Pincodes", shortLabel: "Pincodes", icon: MapPin },
];

interface CompanyInfo {
  businessName: string;
  contactNumber: string;
  email: string;
  gstNumber: string;
  address: string;
  logoUrl?: string;
}

interface WhatsAppSetting {
  isEnabled: boolean;
  apiKey: string;
  phoneNumberId: string;
  templateOrderPlaced: string;
  templateConfirmed: string;
  templateProcessing: string;
  templateDispatched: string;
  templateDelivery: string;
  templateDelivered: string;
  templateReminder: string;
}

interface CommissionSetting {
  defaultPercentage: number;
  minPercentage: number;
  maxPercentage: number;
}

interface Pincode {
  id: string;
  code: string;
  area?: string;
  district?: string;
  state: string;
  isActive: boolean;
  _count?: { customers: number };
}

function DeletePincodeModal({
  open,
  pincode,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  pincode: Pincode | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !pincode) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D32F2F]/10">
          <Trash2 className="h-6 w-6 text-[#D32F2F]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">Delete Pincode</h3>
        <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{pincode.code} — {pincode.area || pincode.district || "No area"}</p>
        <p className="mb-6 text-sm text-[#64748b]">
          This will remove the pincode from the system. Existing customers linked to this pincode will not be affected.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} loading={loading}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [company, setCompany] = useState<CompanyInfo>({ businessName: "LeafLand Kerala", contactNumber: "", email: "", gstNumber: "", address: "", logoUrl: "" });
  const [whatsapp, setWhatsapp] = useState<WhatsAppSetting>({ isEnabled: false, apiKey: "", phoneNumberId: "", templateOrderPlaced: "", templateConfirmed: "", templateProcessing: "", templateDispatched: "", templateDelivery: "", templateDelivered: "", templateReminder: "" });
  const [commission, setCommission] = useState<CommissionSetting>({ defaultPercentage: 10, minPercentage: 5, maxPercentage: 15 });
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [newPincode, setNewPincode] = useState({ code: "", area: "", district: "" });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [deletePin, setDeletePin] = useState<Pincode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fetchPincodes = async () => {
    const res = await fetch("/api/pincodes");
    if (res.ok) setPincodes(await res.json());
  };

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      if (data.company) setCompany({ businessName: data.company.businessName || "", contactNumber: data.company.contactNumber || "", email: data.company.email || "", gstNumber: data.company.gstNumber || "", address: data.company.address || "", logoUrl: data.company.logoUrl || "" });
      if (data.whatsapp) setWhatsapp({ isEnabled: data.whatsapp.isEnabled, apiKey: data.whatsapp.apiKey || "", phoneNumberId: data.whatsapp.phoneNumberId || "", templateOrderPlaced: data.whatsapp.templateOrderPlaced || "", templateConfirmed: data.whatsapp.templateConfirmed || "", templateProcessing: data.whatsapp.templateProcessing || "", templateDispatched: data.whatsapp.templateDispatched || "", templateDelivery: data.whatsapp.templateDelivery || "", templateDelivered: data.whatsapp.templateDelivered || "", templateReminder: data.whatsapp.templateReminder || "" });
      if (data.commission) setCommission({ defaultPercentage: data.commission.defaultPercentage, minPercentage: data.commission.minPercentage, maxPercentage: data.commission.maxPercentage });
    });
    fetchPincodes();
  }, []);

  const showSaved = (msg = "Settings saved successfully.") => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const saveSettings = async (type: string, data: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
    setSaving(false);
    if (res.ok) showSaved();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, folder: "logos" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompany((prev) => ({ ...prev, logoUrl: data.url }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddPincode = async () => {
    if (!newPincode.code || newPincode.code.length !== 6) return;
    setPincodeLoading(true);
    const res = await fetch("/api/pincodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPincode),
    });
    setPincodeLoading(false);
    if (res.ok) {
      setNewPincode({ code: "", area: "", district: "" });
      fetchPincodes();
    }
  };

  const handleTogglePincode = async (id: string, isActive: boolean) => {
    await fetch(`/api/pincodes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchPincodes();
  };

  const handleDeletePincode = async () => {
    if (!deletePin) return;
    setDeleteLoading(true);
    await fetch(`/api/pincodes/${deletePin.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeletePin(null);
    fetchPincodes();
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Settings</h1>
        <p className="text-sm text-[#64748b] mt-0.5">Configure system preferences and business settings</p>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
        <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-white p-1 w-max lg:w-fit min-w-full lg:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-[#1E4D3D] text-white" : "text-[#64748b] hover:text-[#1a1a1a] hover:bg-[#f8f9fa]"}`}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {saveMsg && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {saveMsg}
        </div>
      )}

      {activeTab === "company" && (
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Business Name" value={company.businessName} onChange={(e) => setCompany((p) => ({ ...p, businessName: e.target.value }))} />
              <Input label="Contact Number" value={company.contactNumber} onChange={(e) => setCompany((p) => ({ ...p, contactNumber: e.target.value }))} />
              <Input label="Email" type="email" value={company.email} onChange={(e) => setCompany((p) => ({ ...p, email: e.target.value }))} />
              <Input label="GST Number" value={company.gstNumber} onChange={(e) => setCompany((p) => ({ ...p, gstNumber: e.target.value }))} />
              <div className="sm:col-span-2">
                <Textarea label="Address" value={company.address} onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))} rows={2} />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-2">
                <label className="text-sm font-medium text-[#1a1a1a]">Company Logo</label>
                {company.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-md border border-[#e2e8f0]" />
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" className="w-fit" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload Logo
                </Button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button loading={saving} onClick={() => saveSettings("company", { businessName: company.businessName, contactNumber: company.contactNumber || null, email: company.email || null, gstNumber: company.gstNumber || null, address: company.address || null, logoUrl: company.logoUrl || null })}>
                Save Company Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "whatsapp" && (
        <Card>
          <CardHeader><CardTitle>WhatsApp Notification Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between rounded-md border border-[#e2e8f0] px-4 py-3">
                <div>
                  <p className="font-medium text-[#1a1a1a]">Enable WhatsApp Notifications</p>
                  <p className="text-sm text-[#64748b]">Send automated messages to customers</p>
                </div>
                <button type="button" onClick={() => setWhatsapp((p) => ({ ...p, isEnabled: !p.isEnabled }))} className="text-[#1E4D3D] flex-shrink-0 ml-4">
                  {whatsapp.isEnabled ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-[#64748b]" />}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="API Key" type="password" value={whatsapp.apiKey} onChange={(e) => setWhatsapp((p) => ({ ...p, apiKey: e.target.value }))} placeholder="WhatsApp Business API key" />
                <Input label="Phone Number ID" value={whatsapp.phoneNumberId} onChange={(e) => setWhatsapp((p) => ({ ...p, phoneNumberId: e.target.value }))} placeholder="Meta Phone Number ID" />
              </div>
              <div className="border-t border-[#e2e8f0] pt-4">
                <p className="text-sm font-semibold text-[#1a1a1a] mb-3">Message Templates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ["templateOrderPlaced", "Order Placed"],
                    ["templateConfirmed", "Order Confirmed"],
                    ["templateProcessing", "Processing"],
                    ["templateDispatched", "Dispatched"],
                    ["templateDelivery", "Out for Delivery"],
                    ["templateDelivered", "Delivered"],
                    ["templateReminder", "Delivery Reminder"],
                  ] as const).map(([key, label]) => (
                    <Textarea
                      key={key}
                      label={label}
                      value={whatsapp[key]}
                      onChange={(e) => setWhatsapp((p) => ({ ...p, [key]: e.target.value }))}
                      rows={2}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button loading={saving} onClick={() => saveSettings("whatsapp", { isEnabled: whatsapp.isEnabled, apiKey: whatsapp.apiKey || null, phoneNumberId: whatsapp.phoneNumberId || null, templateOrderPlaced: whatsapp.templateOrderPlaced, templateConfirmed: whatsapp.templateConfirmed, templateProcessing: whatsapp.templateProcessing, templateDispatched: whatsapp.templateDispatched, templateDelivery: whatsapp.templateDelivery, templateDelivered: whatsapp.templateDelivered, templateReminder: whatsapp.templateReminder })}>
                Save WhatsApp Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "commission" && (
        <Card>
          <CardHeader><CardTitle>Commission Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 max-w-md">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#1a1a1a]">
                  Default Commission: <span className="text-[#1E4D3D] font-bold">{commission.defaultPercentage}%</span>
                </label>
                <input
                  type="range"
                  min={commission.minPercentage}
                  max={commission.maxPercentage}
                  step={0.5}
                  value={commission.defaultPercentage}
                  onChange={(e) => setCommission((p) => ({ ...p, defaultPercentage: parseFloat(e.target.value) }))}
                  className="w-full accent-[#1E4D3D]"
                />
                <div className="flex justify-between text-xs text-[#64748b]">
                  <span>{commission.minPercentage}%</span>
                  <span>{commission.maxPercentage}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#1a1a1a]">Minimum %</label>
                  <input
                    type="number"
                    min={0}
                    max={commission.defaultPercentage}
                    step={0.5}
                    value={commission.minPercentage}
                    onChange={(e) => setCommission((p) => ({ ...p, minPercentage: parseFloat(e.target.value) }))}
                    className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#1a1a1a]">Maximum %</label>
                  <input
                    type="number"
                    min={commission.defaultPercentage}
                    max={100}
                    step={0.5}
                    value={commission.maxPercentage}
                    onChange={(e) => setCommission((p) => ({ ...p, maxPercentage: parseFloat(e.target.value) }))}
                    className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
                  />
                </div>
              </div>
              <div className="rounded-md bg-[#1E4D3D]/5 px-4 py-3 text-sm text-[#1E4D3D]">
                Employees will earn {commission.defaultPercentage}% commission by default (range: {commission.minPercentage}%–{commission.maxPercentage}%).
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button loading={saving} onClick={() => saveSettings("commission", { defaultPercentage: commission.defaultPercentage, minPercentage: commission.minPercentage, maxPercentage: commission.maxPercentage })}>
                Save Commission Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "pincodes" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Add New Pincode</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-32 flex-shrink-0">
                  <Input
                    label="Pincode"
                    placeholder="600001"
                    maxLength={6}
                    value={newPincode.code}
                    onChange={(e) => setNewPincode((p) => ({ ...p, code: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Input
                    label="Area"
                    placeholder="Area name"
                    value={newPincode.area}
                    onChange={(e) => setNewPincode((p) => ({ ...p, area: e.target.value }))}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Input
                    label="District"
                    placeholder="District"
                    value={newPincode.district}
                    onChange={(e) => setNewPincode((p) => ({ ...p, district: e.target.value }))}
                  />
                </div>
                <Button loading={pincodeLoading} onClick={handleAddPincode} disabled={newPincode.code.length !== 6} className="flex-shrink-0">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Allowed Pincodes ({pincodes.length})</CardTitle></CardHeader>
            <CardContent className="!px-0 !pb-0">
              {pincodes.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-[#64748b]">No pincodes configured yet.</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="flex flex-col divide-y divide-[#e2e8f0] md:hidden">
                    {pincodes.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-[#1a1a1a]">{p.code}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {p.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748b] mt-0.5">
                            {[p.area, p.district].filter(Boolean).join(", ") || "No area"}
                            {(p._count?.customers ?? 0) > 0 && ` · ${p._count?.customers} customers`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePincode(p.id, p.isActive)}
                            className="text-[#1E4D3D]"
                            title={p.isActive ? "Deactivate" : "Activate"}
                          >
                            {p.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-[#64748b]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletePin(p)}
                            className="text-[#D32F2F]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pincode</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>District</TableHead>
                          <TableHead>Customers</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pincodes.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono font-medium">{p.code}</TableCell>
                            <TableCell>{p.area || "—"}</TableCell>
                            <TableCell>{p.district || "—"}</TableCell>
                            <TableCell>{p._count?.customers ?? 0}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                {p.isActive ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePincode(p.id, p.isActive)}
                                  title={p.isActive ? "Deactivate" : "Activate"}
                                  className="text-[#1E4D3D] hover:text-[#3B7A57]"
                                >
                                  {p.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5 text-[#64748b]" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletePin(p)}
                                  className="text-[#D32F2F] hover:text-[#B71C1C]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <DeletePincodeModal
        open={!!deletePin}
        pincode={deletePin}
        loading={deleteLoading}
        onConfirm={handleDeletePincode}
        onCancel={() => setDeletePin(null)}
      />
    </div>
  );
}
