"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Upload,
  X,
  Save,
  Edit,
  ShoppingCart,
  Percent,
  TrendingUp,
  Map,
  Clock,
  Navigation,
  Wallet,
  Download,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { formatDate, formatCurrency, getStatusLabel, getStatusColor } from "@/lib/utils";
import { compressImageToTarget, ImageTooLargeError } from "@/lib/compress-image";
import { cloudinaryThumb } from "@/lib/image-thumb";

type TabId = "overview" | "documents" | "performance" | "customers" | "pincodes" | "timeline" | "payments";

interface Document {
  id: string;
  type: string;
  imageUrl: string;
  createdAt: string;
}

interface PincodeAssignment {
  id: string;
  pincode: { code: string; area: string | null; district: string | null };
}

interface CustomerRow {
  id: string;
  name: string;
  status: string;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface Commission {
  amount: number;
}

interface PaymentOrder {
  commissionId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveredAt: string;
  amount: number;
  commission: number;
  items: { name: string; quantity: number }[];
}

interface Payment {
  id: string;
  referenceNumber: string;
  amount: number;
  salesAmount: number;
  ordersCount: number;
  weekStart: string | null;
  weekEnd: string | null;
  createdAt: string;
  commissions?: { order: { orderNumber: string; totalAmount: number; customer: { name: string }; items: { product: { name: string }; quantity: number }[] } }[];
}

interface PendingPayout {
  ordersCount: number;
  salesAmount: number;
  commissionAmount: number;
  periodStart: string | null;
  periodEnd: string | null;
  orders: PaymentOrder[];
}

interface PaymentsData {
  employee: { id: string; name: string; commissionPercent: number };
  pendingPayout: PendingPayout;
  payments: Payment[];
  totalPaid: number;
}

interface TimelineEntry {
  id: string;
  time: string;
  type: string;
  label: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
  source: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address: string | null;
  territory: string | null;
  commissionPercent: number;
  monthlySales: number;
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  isActive: boolean;
  governmentIdType: string | null;
  governmentIdNumber: string | null;
  governmentIdFrontUrl: string | null;
  governmentIdBackUrl: string | null;
  documents: Document[];
  pincodes: PincodeAssignment[];
  customers: CustomerRow[];
  orders: OrderRow[];
  commissions: Commission[];
  cashouts: CashoutRow[];
  _count: { customers: number; orders: number; fieldVisits: number };
}

interface CashoutRow {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "pincodes", label: "Pincode Assignments", icon: Map },
  { id: "timeline", label: "Activity Timeline", icon: Clock },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
];

const ID_TYPE_LABEL: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
};


const DOCUMENT_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState(false);

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Payments state
  const [paymentsData, setPaymentsData] = useState<PaymentsData | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paying, setPaying] = useState(false);
  const [generatingReceiptId, setGeneratingReceiptId] = useState<string | null>(null);

  // Document upload state
  const [docType, setDocType] = useState("AADHAAR");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [compressingDoc, setCompressingDoc] = useState(false);
  const [docError, setDocError] = useState("");

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (activeTab !== "timeline" || !id) return;
    setTimelineLoading(true);
    fetch(`/api/admin/employees/${id}/timeline`)
      .then((r) => r.json())
      .then((d) => setTimeline(d.timeline ?? []))
      .finally(() => setTimelineLoading(false));
  }, [activeTab, id]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    setPaymentsLoading(true);
    fetch(`/api/admin/employees/${id}/payments`)
      .then((r) => r.json())
      .then((d) => setPaymentsData(d))
      .finally(() => setPaymentsLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
  }, [activeTab, fetchPayments]);

  const handlePayNow = async () => {
    if (!paymentsData) return;
    // Snapshot pending orders before they're marked paid
    const pendingSnapshot = paymentsData.pendingPayout;
    setPaying(true);
    try {
      const res = await fetch(`/api/admin/employees/${id}/payments`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Payment failed");
        return;
      }
      const { payment } = await res.json();
      setShowPayDialog(false);
      await fetchPayments();
      // Build receipt Payment object using pre-payment order snapshot
      const receiptPayment: Payment = {
        ...payment,
        commissions: pendingSnapshot.orders.map((o) => ({
          order: {
            orderNumber: o.orderNumber,
            totalAmount: o.amount,
            customer: { name: o.customerName },
            items: o.items.map((i) => ({ product: { name: i.name }, quantity: i.quantity })),
          },
        })),
      };
      await downloadPaymentReceiptPDF(receiptPayment);
    } finally {
      setPaying(false);
    }
  };

  const handleStartEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    setSavingField(true);
    try {
      const body: Record<string, string | number> = { [field]: editValue };
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchEmployee();
        setEditingField(null);
      }
    } finally {
      setSavingField(false);
    }
  };

  const handleToggleActive = async () => {
    if (!employee) return;
    if (!confirm(`${employee.isActive ? "Disable" : "Enable"} this employee?`)) return;
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !employee.isActive }),
    });
    if (res.ok) fetchEmployee();
  };

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocError("");
    setCompressingDoc(true);
    try {
      const compressed = await compressImageToTarget(file);
      setDocFile(file);
      setDocPreview(compressed);
    } catch (err) {
      setDocError(err instanceof ImageTooLargeError ? err.message : "Could not process that image. Please try another.");
    } finally {
      setCompressingDoc(false);
    }
  };

  const handleDocUpload = async () => {
    if (!docFile || !docPreview) return;
    setDocError("");
    setUploadingDoc(true);
    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: docPreview, folder: "employees" }),
      });
      if (!uploadRes.ok) {
        setDocError("Failed to upload document");
        return;
      }
      const { url } = await uploadRes.json();

      // Patch employee documents via PATCH (storing via employee PATCH with document)
      // Since we POST to employees API normally for create, here we use a separate approach:
      // The employee PATCH endpoint handles documents addition
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addDocument: { type: docType, imageUrl: url },
        }),
      });
      if (res.ok) {
        await fetchEmployee();
        setDocFile(null);
        setDocPreview("");
        setDocType("AADHAAR");
      } else {
        setDocError("Failed to save document record");
      }
    } finally {
      setUploadingDoc(false);
    }
  };

  const totalRevenue =
    employee?.orders.reduce((sum, o) => sum + o.totalAmount, 0) || 0;
  const totalCommission =
    employee?.commissions.reduce((sum, c) => sum + c.amount, 0) || 0;

  async function downloadPaymentReceiptPDF(payment: Payment) {
    if (!employee || !paymentsData) return;
    setGeneratingReceiptId(payment.id);
    try {
      await buildAndSaveReceiptPDF(payment);
    } finally {
      setGeneratingReceiptId(null);
    }
  }

  async function buildAndSaveReceiptPDF(payment: Payment) {
    if (!employee || !paymentsData) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LeafLand Kerala", 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Payment Receipt", 20, 27);
    doc.setDrawColor(30, 77, 61);
    doc.line(20, 31, 190, 31);

    let y = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PAYMENT DETAILS", 20, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Reference: ${payment.referenceNumber}`, 20, y); y += 7;
    doc.text(`Payment Date: ${new Date(payment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 20, y); y += 7;
    if (payment.weekStart && payment.weekEnd) {
      doc.text(`Period: ${new Date(payment.weekStart).toLocaleDateString("en-IN")} – ${new Date(payment.weekEnd).toLocaleDateString("en-IN")}`, 20, y); y += 7;
    }
    y += 3;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("EMPLOYEE", 20, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${employee.name}`, 20, y); y += 7;
    doc.text(`Email: ${employee.email}`, 20, y); y += 7;
    doc.text(`Employee ID: EMP-${employee.id.slice(-6).toUpperCase()}`, 20, y); y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SUMMARY", 20, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Orders Included: ${payment.ordersCount}`, 20, y); y += 7;
    doc.text(`Total Sales: ₹${payment.salesAmount.toLocaleString("en-IN")}`, 20, y); y += 7;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 77, 61);
    doc.text(`Commission Paid: ₹${Math.round(payment.amount).toLocaleString("en-IN")}`, 20, y);
    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "normal");
    y += 12;

    if (payment.commissions && payment.commissions.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("ORDER DETAILS", 20, y); y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const comm of payment.commissions) {
        if (y > 255) { doc.addPage(); y = 20; }
        const o = comm.order;
        doc.setFont("helvetica", "bold");
        doc.text(`${o.orderNumber} · ${o.customer.name} · ₹${o.totalAmount.toLocaleString("en-IN")}`, 20, y); y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const itemStr = o.items.map((i: { product: { name: string }; quantity: number }) => `${i.product.name} ×${i.quantity}`).join(", ");
        const lines = doc.splitTextToSize(itemStr, 160);
        for (const line of lines) {
          if (y > 275) { doc.addPage(); y = 20; doc.setTextColor(100, 116, 139); }
          doc.text(`  ${line}`, 20, y); y += 5;
        }
        doc.setTextColor(26, 26, 26);
        y += 3;
      }
    }

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")} · LeafLand Kerala ERP`, 20, 285);
    doc.save(`Receipt_${payment.referenceNumber}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-[#64748b]">Employee not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/employees")}
          className="flex items-center gap-1.5 rounded-md p-1.5 text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E4D3D] text-xl font-bold text-[#F8F5EE]">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">{employee.name}</h1>
            <p className="text-sm text-[#64748b]">{employee.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {employee.isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              <XCircle className="h-4 w-4" />
              Disabled
            </span>
          )}
          <Button
            variant={employee.isActive ? "danger" : "success"}
            size="sm"
            onClick={handleToggleActive}
          >
            {employee.isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e2e8f0] gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-[#1E4D3D] text-[#1E4D3D]"
                  : "border-transparent text-[#64748b] hover:text-[#1a1a1a] hover:border-[#e2e8f0]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#3B7A57]" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <EditableField
                label="Mobile"
                icon={<Phone className="h-4 w-4 text-[#64748b]" />}
                value={employee.mobile}
                fieldKey="mobile"
                editingField={editingField}
                editValue={editValue}
                saving={savingField}
                onEdit={handleStartEdit}
                onSave={handleSaveField}
                onCancel={() => setEditingField(null)}
                onEditValueChange={setEditValue}
              />
              <EditableField
                label="Territory"
                icon={<MapPin className="h-4 w-4 text-[#64748b]" />}
                value={employee.territory || "—"}
                fieldKey="territory"
                editingField={editingField}
                editValue={editValue}
                saving={savingField}
                onEdit={handleStartEdit}
                onSave={handleSaveField}
                onCancel={() => setEditingField(null)}
                onEditValueChange={setEditValue}
              />
              <EditableField
                label="Address"
                icon={<MapPin className="h-4 w-4 text-[#64748b]" />}
                value={employee.address || "—"}
                fieldKey="address"
                editingField={editingField}
                editValue={editValue}
                saving={savingField}
                onEdit={handleStartEdit}
                onSave={handleSaveField}
                onCancel={() => setEditingField(null)}
                onEditValueChange={setEditValue}
              />
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-[#64748b]" />
                <div>
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wide">Email</p>
                  <p className="text-sm text-[#1a1a1a]">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="h-4 w-4 mt-0.5 text-[#64748b]" />
                <div className="flex-1">
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wide">Commission Rate</p>
                  <p className="text-sm text-[#1a1a1a]">{employee.commissionRate}% (this week&apos;s slab)</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    ₹{employee.weeklySales.toLocaleString("en-IN")} weekly sales · ₹{employee.commissionAmount.toLocaleString("en-IN")} earned this week
                  </p>
                  <p className="text-xs text-[#94a3b8]">
                    ₹{employee.monthlySales.toLocaleString("en-IN")} in monthly sales
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Customers Added"
                value={employee._count.customers}
                icon={Users}
                color="#1E4D3D"
              />
              <StatCard
                title="Orders Managed"
                value={employee._count.orders}
                icon={ShoppingCart}
                color="#3B7A57"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Revenue Generated"
                value={formatCurrency(totalRevenue)}
                icon={TrendingUp}
                color="#F9A825"
              />
              <StatCard
                title="Commission Earned"
                value={formatCurrency(totalCommission)}
                icon={Percent}
                color="#7C3AED"
              />
            </div>
          </div>

          {/* Government Documents */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#3B7A57]" />
                  Government Documents
                </CardTitle>
                {employee.governmentIdFrontUrl && employee.governmentIdBackUrl && (
                  <a
                    href={`/api/employees/${employee.id}/id-card-pdf`}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!employee.governmentIdFrontUrl && !employee.governmentIdBackUrl ? (
                <p className="text-sm text-[#64748b]">No government ID on file for this employee.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wide">ID Type</p>
                      <p className="mt-0.5 text-sm text-[#1a1a1a]">
                        {employee.governmentIdType ? ID_TYPE_LABEL[employee.governmentIdType] : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94a3b8] uppercase tracking-wide">ID Number</p>
                      <p className="mt-0.5 text-sm text-[#1a1a1a]">{employee.governmentIdNumber || "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Front", url: employee.governmentIdFrontUrl },
                      { label: "Back", url: employee.governmentIdBackUrl },
                    ].map(({ label, url }) => (
                      <div key={label} className="rounded-lg border border-[#e2e8f0] p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">{label}</p>
                        {url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cloudinaryThumb(url, 320, 200)}
                              alt={`Government ID ${label}`}
                              loading="lazy"
                              decoding="async"
                              className="w-full rounded-md border border-[#e2e8f0] object-cover"
                              style={{ aspectRatio: "16/10" }}
                            />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#3B7A57] hover:underline"
                            >
                              View {label} <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        ) : (
                          <p className="text-sm text-[#94a3b8]">Not uploaded</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cash-Out History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#3B7A57]" />
                Cash-Out History
                <span className="ml-auto text-sm font-normal text-[#64748b]">
                  {employee.cashouts.length} request{employee.cashouts.length !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              {employee.cashouts.length === 0 ? (
                <div className="px-6 pb-6 text-sm text-[#64748b]">No cash-out requests yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead className="text-right">Weekly Sales</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employee.cashouts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-[#64748b]">
                          {formatDate(c.weekStartDate)} – {formatDate(c.weekEndDate)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(c.weeklySales)}</TableCell>
                        <TableCell className="text-right">{c.commissionRate}%</TableCell>
                        <TableCell className="text-right font-semibold text-[#1E4D3D]">{formatCurrency(c.commissionAmount)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(c.status)}`}>
                            {getStatusLabel(c.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="flex flex-col gap-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload New Document</CardTitle>
            </CardHeader>
            <CardContent>
              {docError && (
                <div className="mb-3 rounded-md bg-[#D32F2F]/10 px-4 py-2 text-sm text-[#D32F2F]">
                  {docError}
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full sm:w-56">
                  <Select
                    label="Document Type"
                    options={DOCUMENT_TYPE_OPTIONS}
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  {compressingDoc ? (
                    <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[#e2e8f0] py-5 justify-center text-[#64748b]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Compressing image...</span>
                    </div>
                  ) : docPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={docPreview}
                        alt="Document preview"
                        className="h-24 w-auto rounded-lg border border-[#e2e8f0] object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                      <button
                        onClick={() => { setDocFile(null); setDocPreview(""); }}
                        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#e2e8f0] py-5 hover:border-[#3B7A57] hover:bg-[#1E4D3D]/5 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDocFileChange}
                      />
                      <Upload className="h-5 w-5 text-[#64748b]" />
                      <p className="text-xs text-[#64748b]">Click to select image</p>
                    </label>
                  )}
                </div>
                <Button
                  onClick={handleDocUpload}
                  disabled={!docFile || compressingDoc}
                  loading={uploadingDoc}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <FileText className="h-10 w-10 text-[#64748b]/40 mb-2" />
                  <p className="text-sm text-[#64748b]">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {employee.documents.map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-[#e2e8f0] overflow-hidden">
                      <img
                        src={cloudinaryThumb(doc.imageUrl, 320, 200)}
                        alt={DOCUMENT_LABELS[doc.type] || doc.type}
                        loading="lazy"
                        decoding="async"
                        className="h-36 w-full object-cover"
                      />
                      <div className="p-2">
                        <p className="text-xs font-medium text-[#1a1a1a]">
                          {DOCUMENT_LABELS[doc.type] || doc.type}
                        </p>
                        <p className="text-[10px] text-[#94a3b8]">{formatDate(doc.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard title="Customers" value={employee._count.customers} icon={Users} color="#1E4D3D" />
            <StatCard title="Orders" value={employee._count.orders} icon={ShoppingCart} color="#3B7A57" />
            <StatCard title="Field Visits" value={employee._count.fieldVisits} icon={MapPin} color="#F9A825" />
            <StatCard title="Commission Rate" value={`${employee.commissionRate}%`} icon={Percent} color="#7C3AED" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#3B7A57]" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              {employee.orders.length === 0 ? (
                <div className="px-6 pb-6 text-sm text-[#64748b]">No orders yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employee.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs text-[#1E4D3D]">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-[#1E4D3D]/10 px-2 py-0.5 text-xs font-medium text-[#1E4D3D]">
                            {getStatusLabel(order.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#64748b]">{formatDate(order.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "customers" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#3B7A57]" />
              Registered Customers
              <span className="ml-auto text-sm font-normal text-[#64748b]">
                {employee._count.customers} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            {employee.customers.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-[#64748b]">No customers registered yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.customers.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-xs font-bold text-[#1E4D3D]">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#1a1a1a]">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustomerStatusBadge status={c.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "payments" && (
        <div className="flex flex-col gap-6">
          {paymentsLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E4D3D] border-t-transparent" />
            </div>
          ) : !paymentsData ? (
            <div className="flex items-center gap-2 text-[#64748b]">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to load payment data.</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="text-xs text-[#64748b] uppercase tracking-wide">Available Earnings</p>
                  <p className="mt-1 text-2xl font-bold text-[#1E4D3D]">
                    {formatCurrency(paymentsData.pendingPayout.commissionAmount)}
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{paymentsData.pendingPayout.ordersCount} delivered orders unpaid</p>
                </div>
                <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="text-xs text-[#64748b] uppercase tracking-wide">Total Paid (All Time)</p>
                  <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">{formatCurrency(paymentsData.totalPaid)}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{paymentsData.payments.length} payments made</p>
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                  <Button
                    variant="default"
                    disabled={paymentsData.pendingPayout.ordersCount === 0}
                    onClick={() => setShowPayDialog(true)}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Wallet className="h-4 w-4" />
                    Pay Now
                  </Button>
                </div>
              </div>

              {/* Pay Now Confirmation Dialog */}
              {showPayDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                      <h3 className="font-semibold text-[#1a1a1a]">Confirm Payment</h3>
                      <button onClick={() => setShowPayDialog(false)} className="rounded p-1 text-[#94a3b8] hover:text-[#1a1a1a]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="px-6 py-5 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Employee</span>
                        <span className="font-medium text-[#1a1a1a]">{employee.name}</span>
                      </div>
                      {paymentsData.pendingPayout.periodStart && (
                        <div className="flex justify-between">
                          <span className="text-[#64748b]">Period</span>
                          <span className="font-medium text-[#1a1a1a]">
                            {new Date(paymentsData.pendingPayout.periodStart).toLocaleDateString("en-IN")}
                            {" – "}
                            {paymentsData.pendingPayout.periodEnd
                              ? new Date(paymentsData.pendingPayout.periodEnd).toLocaleDateString("en-IN")
                              : "—"}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Orders Included</span>
                        <span className="font-medium text-[#1a1a1a]">{paymentsData.pendingPayout.ordersCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Total Sales</span>
                        <span className="font-medium text-[#1a1a1a]">{formatCurrency(paymentsData.pendingPayout.salesAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#e2e8f0] pt-3">
                        <span className="font-semibold text-[#1a1a1a]">Commission to Pay</span>
                        <span className="text-lg font-bold text-[#1E4D3D]">
                          {formatCurrency(paymentsData.pendingPayout.commissionAmount)}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8]">A PDF receipt will be generated after payment. All included orders will be marked as paid.</p>
                    </div>
                    <div className="flex gap-3 border-t border-[#e2e8f0] px-6 py-4">
                      <Button variant="outline" className="flex-1" onClick={() => setShowPayDialog(false)} disabled={paying}>
                        Cancel
                      </Button>
                      <Button variant="default" className="flex-1" onClick={handlePayNow} loading={paying}>
                        Confirm & Pay
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Orders Preview */}
              {paymentsData.pendingPayout.orders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-[#3B7A57]" />
                      Pending Orders ({paymentsData.pendingPayout.ordersCount})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-0 pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsData.pendingPayout.orders.map((o) => (
                          <TableRow key={o.orderId}>
                            <TableCell className="font-mono text-xs text-[#1E4D3D]">{o.orderNumber}</TableCell>
                            <TableCell className="text-sm">{o.customerName}</TableCell>
                            <TableCell className="text-xs text-[#64748b] max-w-[200px]">
                              {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(o.amount)}</TableCell>
                            <TableCell className="text-right text-green-700 font-medium">{formatCurrency(o.commission)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#3B7A57]" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-0 pb-0">
                  {paymentsData.payments.length === 0 ? (
                    <div className="px-6 pb-6 pt-2 text-sm text-[#64748b]">No payments made yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Sales</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsData.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs text-[#1E4D3D]">{p.referenceNumber}</TableCell>
                            <TableCell className="text-sm">{formatDate(p.createdAt)}</TableCell>
                            <TableCell className="text-sm">{p.ordersCount}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(p.salesAmount)}</TableCell>
                            <TableCell className="text-right font-semibold text-[#1E4D3D]">{formatCurrency(p.amount)}</TableCell>
                            <TableCell>
                              <button
                                onClick={() => downloadPaymentReceiptPDF(p)}
                                disabled={generatingReceiptId === p.id}
                                className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#1E4D3D] transition-colors disabled:opacity-50"
                              >
                                {generatingReceiptId === p.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                {generatingReceiptId === p.id ? "Generating…" : "Receipt"}
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === "pincodes" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-4 w-4 text-[#3B7A57]" />
              Pincode Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            {employee.pincodes.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-[#64748b]">No pincodes assigned yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>District</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.pincodes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-medium text-[#1E4D3D]">
                        {p.pincode.code}
                      </TableCell>
                      <TableCell className="text-[#64748b]">
                        {p.pincode.area || <span className="text-[#94a3b8]">—</span>}
                      </TableCell>
                      <TableCell className="text-[#64748b]">
                        {p.pincode.district || <span className="text-[#94a3b8]">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#3B7A57]" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#3B7A57] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-[#64748b]">No activity recorded yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                {timeline.map((entry) => {
                  const time = new Date(entry.time);
                  const timeStr = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  const dateStr = time.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                  const isGPS = entry.type === "GPS_CAPTURE";
                  const isOrder = entry.type === "ORDER_CREATE";
                  const isLogin = entry.type === "LOGIN";
                  const dotColor = isOrder ? "bg-green-500" : isLogin ? "bg-blue-500" : isGPS ? "bg-orange-400" : "bg-gray-300";

                  return (
                    <li key={entry.id} className="ml-6">
                      <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${dotColor}`} />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1a1a1a] leading-snug">{entry.label}</p>
                          {entry.detail && (
                            <p className="text-xs text-[#64748b] mt-0.5">{entry.detail}</p>
                          )}
                          {isGPS && !!entry.metadata?.latitude && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${String(entry.metadata!.latitude)},${String(entry.metadata!.longitude)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 flex items-center gap-1 mt-1"
                            >
                              <Navigation className="h-3 w-3" /> Open in Maps
                            </a>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-[#1a1a1a]">{timeStr}</p>
                          <p className="text-xs text-[#94a3b8]">{dateStr}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditableField({
  label,
  icon,
  value,
  fieldKey,
  editingField,
  editValue,
  saving,
  onEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  fieldKey: string;
  editingField: string | null;
  editValue: string;
  saving: boolean;
  onEdit: (_field: string, _value: string) => void;
  onSave: (_field: string) => void;
  onCancel: () => void;
  onEditValueChange: (_v: string) => void;
}) {
  const isEditing = editingField === fieldKey;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#94a3b8] uppercase tracking-wide">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="h-7 py-1 text-sm"
            />
            <button
              onClick={() => onSave(fieldKey)}
              disabled={saving}
              className="rounded p-1 text-[#1E4D3D] hover:bg-[#1E4D3D]/10 transition-colors"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="rounded p-1 text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#1a1a1a] break-words">{value}</p>
            <button
              onClick={() => onEdit(fieldKey, value === "—" ? "" : value)}
              className="rounded p-0.5 text-[#94a3b8] hover:text-[#1E4D3D] transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
