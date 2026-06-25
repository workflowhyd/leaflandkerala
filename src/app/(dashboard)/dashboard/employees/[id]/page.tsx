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
import { formatDate, formatCurrency, getStatusLabel } from "@/lib/utils";

type TabId = "overview" | "documents" | "performance" | "customers" | "pincodes";

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

interface Employee {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address: string | null;
  territory: string | null;
  commissionPercent: number;
  isActive: boolean;
  documents: Document[];
  pincodes: PincodeAssignment[];
  customers: CustomerRow[];
  orders: OrderRow[];
  commissions: Commission[];
  _count: { customers: number; orders: number; fieldVisits: number };
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "pincodes", label: "Pincode Assignments", icon: Map },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
];

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

  // Document upload state
  const [docType, setDocType] = useState("AADHAAR");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
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

  const handleStartEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSaveField = async (field: string) => {
    setSavingField(true);
    try {
      const body: Record<string, string | number> = { [field]: editValue };
      if (field === "commissionPercent") {
        body[field] = parseFloat(editValue);
      }
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

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setDocPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
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
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wide">Commission %</p>
                  {editingField === "commissionPercent" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="range"
                        min={5}
                        max={15}
                        step={0.5}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 accent-[#1E4D3D]"
                      />
                      <span className="text-sm font-medium text-[#1E4D3D] w-10">{editValue}%</span>
                      <button
                        onClick={() => handleSaveField("commissionPercent")}
                        disabled={savingField}
                        className="rounded p-1 text-[#1E4D3D] hover:bg-[#1E4D3D]/10 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="rounded p-1 text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[#1a1a1a]">{employee.commissionPercent}%</p>
                      <button
                        onClick={() => handleStartEdit("commissionPercent", String(employee.commissionPercent))}
                        className="rounded p-0.5 text-[#94a3b8] hover:text-[#1E4D3D] transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
                  {docPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={docPreview}
                        alt="Document preview"
                        className="h-24 w-auto rounded-lg border border-[#e2e8f0] object-contain"
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
                  disabled={!docFile}
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
                        src={doc.imageUrl}
                        alt={DOCUMENT_LABELS[doc.type] || doc.type}
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
            <StatCard title="Commission %" value={`${employee.commissionPercent}%`} icon={Percent} color="#7C3AED" />
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
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onEditValueChange: (v: string) => void;
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
