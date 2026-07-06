"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, MessageSquare, Percent, MapPin, Plus, Trash2, ToggleLeft, ToggleRight, Upload, Gift, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { compressImageToTarget, ImageTooLargeError } from "@/lib/compress-image";

type TabId = "company" | "whatsapp" | "commission" | "pincodes" | "offers";

const TABS: { id: TabId; label: string; shortLabel: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "company", label: "Company Info", shortLabel: "Company", icon: Building2 },
  { id: "whatsapp", label: "WhatsApp", shortLabel: "WhatsApp", icon: MessageSquare },
  { id: "commission", label: "Commission", shortLabel: "Commission", icon: Percent },
  { id: "pincodes", label: "Pincodes", shortLabel: "Pincodes", icon: MapPin },
  { id: "offers", label: "Offers & Rewards", shortLabel: "Offers", icon: Gift },
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
  adminPhone: string;
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
  weeklyBonusThreshold: number;
  weeklyBonusRate: number;
  freeGiftEnabled: boolean;
  freeGiftTier1MinAmount: number;
  freeGiftTier1Choices: number;
  freeGiftTier2MinAmount: number;
  freeGiftTier2Choices: number;
}

interface GiftItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    serialNumber: number;
    imageUrl?: string | null;
    price: number;
    stock: number;
    isActive: boolean;
  };
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

interface Offer {
  id: string;
  title: string;
  description: string;
  bannerImage: string | null;
  offerType: string;
  startDate: string;
  endDate: string | null;
  targetGroup: string;
  isActive: boolean;
  createdAt: string;
  _count?: { rewards: number };
}

const OFFER_TYPE_LABELS: Record<string, string> = {
  SIX_MONTHS_BONUS: "6-Month Bonus",
  BEST_PERFORMER: "Best Performer",
  MONTHLY_INCENTIVE: "Monthly Incentive",
  FESTIVAL_BONUS: "Festival Bonus",
  REFERRAL_BONUS: "Referral Bonus",
  CUSTOM: "Custom",
};

const OFFER_TYPE_COLORS: Record<string, string> = {
  SIX_MONTHS_BONUS: "bg-amber-100 text-amber-800",
  BEST_PERFORMER: "bg-purple-100 text-purple-800",
  MONTHLY_INCENTIVE: "bg-blue-100 text-blue-800",
  FESTIVAL_BONUS: "bg-pink-100 text-pink-800",
  REFERRAL_BONUS: "bg-cyan-100 text-cyan-800",
  CUSTOM: "bg-gray-100 text-gray-700",
};

const EMPTY_OFFER_FORM = {
  title: "",
  description: "",
  bannerImage: "",
  offerType: "CUSTOM",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  targetGroup: "ALL",
  isActive: true,
};

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
  const [whatsapp, setWhatsapp] = useState<WhatsAppSetting>({ isEnabled: false, apiKey: "", phoneNumberId: "", adminPhone: "", templateOrderPlaced: "", templateConfirmed: "", templateProcessing: "", templateDispatched: "", templateDelivery: "", templateDelivered: "", templateReminder: "" });
  const [commission, setCommission] = useState<CommissionSetting>({
    defaultPercentage: 10, minPercentage: 5, maxPercentage: 15,
    weeklyBonusThreshold: 50000, weeklyBonusRate: 35,
    freeGiftEnabled: false,
    freeGiftTier1MinAmount: 5000, freeGiftTier1Choices: 1,
    freeGiftTier2MinAmount: 10000, freeGiftTier2Choices: 2,
  });

  // Gift item pool state
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [giftItemsLoading, setGiftItemsLoading] = useState(false);
  const [newGiftSerial, setNewGiftSerial] = useState("");
  const [addingGiftItem, setAddingGiftItem] = useState(false);
  const [giftItemError, setGiftItemError] = useState("");
  const [removingGiftItemId, setRemovingGiftItemId] = useState<string | null>(null);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [newPincode, setNewPincode] = useState({ code: "", area: "", district: "" });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [deletePin, setDeletePin] = useState<Pincode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoStage, setLogoStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [logoError, setLogoError] = useState("");

  // Offers state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerLoading, setOfferLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER_FORM);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState<Offer | null>(null);
  const [deleteOfferLoading, setDeleteOfferLoading] = useState(false);

  const fetchPincodes = async () => {
    const res = await fetch("/api/pincodes");
    if (res.ok) setPincodes(await res.json());
  };

  const fetchOffers = async () => {
    const res = await fetch("/api/admin/offers");
    if (res.ok) setOffers(await res.json());
  };

  const fetchGiftItems = async () => {
    setGiftItemsLoading(true);
    try {
      const res = await fetch("/api/admin/gift-items");
      if (res.ok) setGiftItems(await res.json());
    } finally {
      setGiftItemsLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      if (data.company) setCompany({ businessName: data.company.businessName || "", contactNumber: data.company.contactNumber || "", email: data.company.email || "", gstNumber: data.company.gstNumber || "", address: data.company.address || "", logoUrl: data.company.logoUrl || "" });
      if (data.whatsapp) setWhatsapp({ isEnabled: data.whatsapp.isEnabled, apiKey: data.whatsapp.apiKey || "", phoneNumberId: data.whatsapp.phoneNumberId || "", adminPhone: data.whatsapp.adminPhone || "", templateOrderPlaced: data.whatsapp.templateOrderPlaced || "", templateConfirmed: data.whatsapp.templateConfirmed || "", templateProcessing: data.whatsapp.templateProcessing || "", templateDispatched: data.whatsapp.templateDispatched || "", templateDelivery: data.whatsapp.templateDelivery || "", templateDelivered: data.whatsapp.templateDelivered || "", templateReminder: data.whatsapp.templateReminder || "" });
      if (data.commission) setCommission({
        defaultPercentage: data.commission.defaultPercentage,
        minPercentage: data.commission.minPercentage,
        maxPercentage: data.commission.maxPercentage,
        weeklyBonusThreshold: data.commission.weeklyBonusThreshold ?? 50000,
        weeklyBonusRate: data.commission.weeklyBonusRate ?? 35,
        freeGiftEnabled: data.commission.freeGiftEnabled ?? false,
        freeGiftTier1MinAmount: data.commission.freeGiftTier1MinAmount ?? 5000,
        freeGiftTier1Choices: data.commission.freeGiftTier1Choices ?? 1,
        freeGiftTier2MinAmount: data.commission.freeGiftTier2MinAmount ?? 10000,
        freeGiftTier2Choices: data.commission.freeGiftTier2Choices ?? 2,
      });
    });
    fetchPincodes();
    fetchOffers();
    fetchGiftItems();
  }, []);

  async function handleAddGiftItem() {
    const serialNumber = newGiftSerial.trim();
    if (!serialNumber) return;
    setAddingGiftItem(true);
    setGiftItemError("");
    try {
      const res = await fetch("/api/admin/gift-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGiftItemError(data.error || "Failed to add gift item");
        return;
      }
      setNewGiftSerial("");
      await fetchGiftItems();
    } catch {
      setGiftItemError("Network error. Please try again.");
    } finally {
      setAddingGiftItem(false);
    }
  }

  async function handleRemoveGiftItem(id: string) {
    setRemovingGiftItemId(id);
    try {
      await fetch(`/api/admin/gift-items/${id}`, { method: "DELETE" });
      setGiftItems((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setRemovingGiftItemId(null);
    }
  }

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
    e.target.value = "";
    if (!file) return;
    setLogoError("");
    setLogoStage("compressing");
    try {
      const compressed = await compressImageToTarget(file);
      setLogoStage("uploading");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: compressed, folder: "company" }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setCompany((prev) => ({ ...prev, logoUrl: data.url }));
    } catch (err) {
      setLogoError(err instanceof ImageTooLargeError ? err.message : "Logo upload failed. Please try again.");
    } finally {
      setLogoStage("idle");
    }
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

  // Offer handlers
  const openNewOffer = () => {
    setEditOffer(null);
    setOfferForm(EMPTY_OFFER_FORM);
    setShowOfferModal(true);
  };

  const openEditOffer = (offer: Offer) => {
    setEditOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description,
      bannerImage: offer.bannerImage || "",
      offerType: offer.offerType,
      startDate: offer.startDate.split("T")[0],
      endDate: offer.endDate ? offer.endDate.split("T")[0] : "",
      targetGroup: offer.targetGroup,
      isActive: offer.isActive,
    });
    setShowOfferModal(true);
  };

  const saveOffer = async () => {
    if (!offerForm.title || !offerForm.description || !offerForm.offerType) return;
    setOfferLoading(true);
    const payload = {
      title: offerForm.title,
      description: offerForm.description,
      bannerImage: offerForm.bannerImage || null,
      offerType: offerForm.offerType,
      startDate: offerForm.startDate,
      endDate: offerForm.endDate || null,
      targetGroup: offerForm.targetGroup,
      isActive: offerForm.isActive,
    };
    const url = editOffer ? `/api/admin/offers/${editOffer.id}` : "/api/admin/offers";
    const method = editOffer ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setOfferLoading(false);
    if (res.ok) {
      setShowOfferModal(false);
      fetchOffers();
      showSaved(editOffer ? "Offer updated." : "Offer created.");
    }
  };

  const toggleOfferStatus = async (offer: Offer) => {
    await fetch(`/api/admin/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !offer.isActive }),
    });
    fetchOffers();
  };

  const handleDeleteOffer = async () => {
    if (!deleteOfferTarget) return;
    setDeleteOfferLoading(true);
    await fetch(`/api/admin/offers/${deleteOfferTarget.id}`, { method: "DELETE" });
    setDeleteOfferLoading(false);
    setDeleteOfferTarget(null);
    fetchOffers();
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
                  <img src={company.logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-md border border-[#e2e8f0]" loading="lazy" decoding="async" />
                )}
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" className="w-fit" loading={logoStage !== "idle"} onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> {logoStage === "compressing" ? "Compressing..." : logoStage === "uploading" ? "Uploading..." : "Upload Logo"}
                </Button>
                {logoError && <p className="text-xs text-[#D32F2F]">{logoError}</p>}
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
                <Input label="Admin WhatsApp Number" value={whatsapp.adminPhone} onChange={(e) => setWhatsapp((p) => ({ ...p, adminPhone: e.target.value }))} placeholder="91XXXXXXXXXX (with country code)" />
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
              <Button loading={saving} onClick={() => saveSettings("whatsapp", { isEnabled: whatsapp.isEnabled, apiKey: whatsapp.apiKey || null, phoneNumberId: whatsapp.phoneNumberId || null, adminPhone: whatsapp.adminPhone || null, templateOrderPlaced: whatsapp.templateOrderPlaced, templateConfirmed: whatsapp.templateConfirmed, templateProcessing: whatsapp.templateProcessing, templateDispatched: whatsapp.templateDispatched, templateDelivery: whatsapp.templateDelivery, templateDelivered: whatsapp.templateDelivered, templateReminder: whatsapp.templateReminder })}>
                Save WhatsApp Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "commission" && (
        <Card>
          <CardHeader><CardTitle>Commission Structure</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 max-w-md">
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a] mb-1">Weekly Commission Slabs</p>
                <p className="text-xs text-[#64748b] mb-3">
                  Commission is calculated automatically from each employee&apos;s weekly sales — this is not configurable from the admin panel.
                </p>
                <div className="rounded-md bg-[#1E4D3D]/5 px-4 py-3 text-sm text-[#1E4D3D] space-y-1">
                  <p>Weekly sales below <strong>₹15,000</strong> → <strong>30%</strong> commission</p>
                  <p>Weekly sales <strong>₹15,000–₹39,999</strong> → <strong>35%</strong> commission</p>
                  <p>Weekly sales <strong>₹40,000+</strong> → <strong>40%</strong> commission</p>
                </div>
              </div>

              {/* Free Gift */}
              <div className="border-t border-[#e2e8f0] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a1a]">Customer Free Gift</p>
                    <p className="text-xs text-[#64748b]">Automatically offer a free item when the cart total meets the minimum.</p>
                  </div>
                  <button type="button" onClick={() => setCommission((p) => ({ ...p, freeGiftEnabled: !p.freeGiftEnabled }))} className="text-[#1E4D3D] flex-shrink-0 ml-4">
                    {commission.freeGiftEnabled
                      ? <ToggleRight className="h-8 w-8" />
                      : <ToggleLeft className="h-8 w-8 text-[#64748b]" />}
                  </button>
                </div>
                {commission.freeGiftEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[#1a1a1a]">Tier 1 — Minimum Amount (₹)</label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={commission.freeGiftTier1MinAmount}
                          onChange={(e) => setCommission((p) => ({ ...p, freeGiftTier1MinAmount: parseFloat(e.target.value) || 0 }))}
                          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[#1a1a1a]">Tier 1 — Choices Allowed</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={commission.freeGiftTier1Choices}
                          onChange={(e) => setCommission((p) => ({ ...p, freeGiftTier1Choices: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[#1a1a1a]">Tier 2 — Minimum Amount (₹)</label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={commission.freeGiftTier2MinAmount}
                          onChange={(e) => setCommission((p) => ({ ...p, freeGiftTier2MinAmount: parseFloat(e.target.value) || 0 }))}
                          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[#1a1a1a]">Tier 2 — Choices Allowed</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={commission.freeGiftTier2Choices}
                          onChange={(e) => setCommission((p) => ({ ...p, freeGiftTier2Choices: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#64748b]">
                      e.g. orders of ₹{commission.freeGiftTier1MinAmount.toLocaleString("en-IN")}+ get {commission.freeGiftTier1Choices} free item choice{commission.freeGiftTier1Choices !== 1 ? "s" : ""};
                      {" "}orders of ₹{commission.freeGiftTier2MinAmount.toLocaleString("en-IN")}+ get {commission.freeGiftTier2Choices}.
                    </p>

                    {/* Gift Product Pool */}
                    <div className="border-t border-[#e2e8f0] pt-4">
                      <p className="text-sm font-semibold text-[#1a1a1a] mb-1">Gift Product Pool</p>
                      <p className="text-xs text-[#64748b] mb-3">
                        Products the customer can choose from as their free gift (up to 5). Add by product serial number.
                      </p>

                      <div className="flex items-end gap-2 mb-3">
                        <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
                          <label className="text-sm font-medium text-[#1a1a1a]">Product Serial Number</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newGiftSerial}
                            onChange={(e) => setNewGiftSerial(e.target.value.replace(/\D/g, ""))}
                            placeholder="e.g. 42"
                            disabled={giftItems.length >= 5}
                            className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] disabled:opacity-50"
                          />
                        </div>
                        <Button
                          variant="outline"
                          loading={addingGiftItem}
                          disabled={giftItems.length >= 5 || !newGiftSerial.trim()}
                          onClick={handleAddGiftItem}
                        >
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      </div>
                      {giftItemError && <p className="text-xs text-[#D32F2F] mb-3">{giftItemError}</p>}
                      {giftItems.length >= 5 && (
                        <p className="text-xs text-[#64748b] mb-3">Maximum of 5 gift items reached — remove one to add another.</p>
                      )}

                      {giftItemsLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1E4D3D] border-t-transparent" />
                        </div>
                      ) : giftItems.length === 0 ? (
                        <p className="text-sm text-[#64748b] py-3">No gift items configured yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {giftItems.map((g) => (
                            <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] px-3 py-2">
                              <div className="flex items-center gap-3 min-w-0">
                                {g.product.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={g.product.imageUrl} alt={g.product.name} loading="lazy" decoding="async" className="h-10 w-10 rounded-md object-cover bg-gray-100 flex-shrink-0" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-gray-100 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{g.product.name}</p>
                                  <p className="text-xs text-[#64748b]">
                                    #{g.product.serialNumber} · {g.product.sku} · Stock: {g.product.stock}
                                    {!g.product.isActive && <span className="text-[#D32F2F]"> · Inactive</span>}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveGiftItem(g.id)}
                                disabled={removingGiftItemId === g.id}
                                className="text-[#D32F2F] hover:text-[#B71C1C] flex-shrink-0 disabled:opacity-50"
                                aria-label={`Remove ${g.product.name} from gift pool`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button loading={saving} onClick={() => saveSettings("commission", {
                freeGiftEnabled: commission.freeGiftEnabled,
                freeGiftTier1MinAmount: commission.freeGiftTier1MinAmount,
                freeGiftTier1Choices: commission.freeGiftTier1Choices,
                freeGiftTier2MinAmount: commission.freeGiftTier2MinAmount,
                freeGiftTier2Choices: commission.freeGiftTier2Choices,
              })}>
                Save Free Gift Settings
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

      {activeTab === "offers" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1a1a1a]">Offers &amp; Rewards</h2>
              <p className="text-sm text-[#64748b]">Manage reward campaigns for employees</p>
            </div>
            <Button onClick={openNewOffer}>
              <Plus className="h-4 w-4" /> Add Offer
            </Button>
          </div>

          {offers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="h-10 w-10 text-[#e2e8f0] mx-auto mb-3" />
                <p className="text-sm text-[#64748b]">No offers yet. Create one to reward your employees.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => (
                <div key={offer.id} className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mb-1 ${OFFER_TYPE_COLORS[offer.offerType] ?? "bg-gray-100 text-gray-700"}`}>
                        {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType}
                      </span>
                      <h3 className="font-semibold text-[#1a1a1a] text-sm leading-tight">{offer.title}</h3>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${offer.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748b] line-clamp-2">{offer.description}</p>

                  <div className="text-xs text-[#64748b] space-y-0.5">
                    <p>From: {new Date(offer.startDate).toLocaleDateString("en-IN")}</p>
                    {offer.endDate && <p>Until: {new Date(offer.endDate).toLocaleDateString("en-IN")}</p>}
                    <p>Target: {offer.targetGroup === "ALL" ? "All Employees" : "Active Only"}</p>
                    {offer._count !== undefined && <p>{offer._count.rewards} reward{offer._count.rewards !== 1 ? "s" : ""} assigned</p>}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#f1f5f9]">
                    <button
                      type="button"
                      onClick={() => toggleOfferStatus(offer)}
                      className="text-[#1E4D3D]"
                      title={offer.isActive ? "Deactivate" : "Activate"}
                    >
                      {offer.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5 text-[#64748b]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditOffer(offer)}
                      className="text-[#64748b] hover:text-[#1a1a1a] ml-1"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteOfferTarget(offer)}
                      className="text-[#D32F2F] hover:text-[#B71C1C] ml-auto"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DeletePincodeModal
        open={!!deletePin}
        pincode={deletePin}
        loading={deleteLoading}
        onConfirm={handleDeletePincode}
        onCancel={() => setDeletePin(null)}
      />

      {/* Offer Add/Edit Modal */}
      <Modal
        open={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title={editOffer ? "Edit Offer" : "Add Offer"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowOfferModal(false)}>Cancel</Button>
            <Button loading={offerLoading} onClick={saveOffer} disabled={!offerForm.title || !offerForm.description}>
              {editOffer ? "Save Changes" : "Create Offer"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title *"
            placeholder="e.g. 6-Month Loyalty Bonus"
            value={offerForm.title}
            onChange={(e) => setOfferForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Textarea
            label="Description *"
            placeholder="Describe the reward..."
            rows={3}
            value={offerForm.description}
            onChange={(e) => setOfferForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Input
            label="Banner Image URL"
            placeholder="https://..."
            value={offerForm.bannerImage}
            onChange={(e) => setOfferForm((p) => ({ ...p, bannerImage: e.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1a1a1a]">Offer Type *</label>
              <select
                value={offerForm.offerType}
                onChange={(e) => setOfferForm((p) => ({ ...p, offerType: e.target.value }))}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
              >
                {Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1a1a1a]">Target Group</label>
              <select
                value={offerForm.targetGroup}
                onChange={(e) => setOfferForm((p) => ({ ...p, targetGroup: e.target.value }))}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
              >
                <option value="ALL">All Employees</option>
                <option value="ACTIVE_ONLY">Active Only</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1a1a1a]">Start Date</label>
              <input
                type="date"
                value={offerForm.startDate}
                onChange={(e) => setOfferForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1a1a1a]">End Date <span className="text-[#64748b] font-normal">(optional)</span></label>
              <input
                type="date"
                value={offerForm.endDate}
                onChange={(e) => setOfferForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-[#e2e8f0] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">Active</p>
              <p className="text-xs text-[#64748b]">Visible to eligible employees</p>
            </div>
            <button type="button" onClick={() => setOfferForm((p) => ({ ...p, isActive: !p.isActive }))} className="text-[#1E4D3D] flex-shrink-0 ml-4">
              {offerForm.isActive ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7 text-[#64748b]" />}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Offer Confirmation */}
      {deleteOfferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteOfferTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D32F2F]/10">
              <Trash2 className="h-6 w-6 text-[#D32F2F]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">Delete Offer</h3>
            <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{deleteOfferTarget.title}</p>
            <p className="mb-6 text-sm text-[#64748b]">
              This will permanently delete this offer and all associated employee rewards.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteOfferTarget(null)} disabled={deleteOfferLoading}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleDeleteOffer} loading={deleteOfferLoading}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
