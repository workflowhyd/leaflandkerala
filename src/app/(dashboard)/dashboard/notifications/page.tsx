"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle, XCircle, Clock, Eye, Download, Package, Truck, UserPlus, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RegistrationRequest {
  id: string;
  fullName: string;
  mobileNumber: string;
  governmentIdType: string;
  governmentIdImageUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  submittedAt: string;
  approvedAt: string | null;
}

interface NotificationItem {
  id: string;
  type: "REGISTRATION" | "NEW_ORDER" | "PENDING_DELIVERY";
  title: string;
  body: string;
  createdAt: string;
  href: string;
  urgent: boolean;
}

interface NotificationsData {
  totalCount: number;
  pendingRegistrations: number;
  lowStockCount: number;
  items: NotificationItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function idTypeLabel(type: string): string {
  const map: Record<string, string> = {
    AADHAAR: "Aadhaar", PAN: "PAN",
    DRIVING_LICENSE: "Driving License", VOTER_ID: "Voter ID",
  };
  return map[type] ?? type;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function downloadRegistrationPDF(reg: RegistrationRequest) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LeafLand Kerala", 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Employee Registration Application", 20, 28);

  doc.setDrawColor(30, 77, 61);
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);

  const fields: [string, string][] = [
    ["Full Name", reg.fullName],
    ["Mobile Number", reg.mobileNumber],
    ["Government ID Type", idTypeLabel(reg.governmentIdType)],
    ["Application Date", new Date(reg.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })],
    ["Status", reg.status],
    ...(reg.approvedAt ? [["Decision Date", new Date(reg.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })] as [string, string]] : []),
    ...(reg.adminNotes ? [["Admin Notes", reg.adminNotes] as [string, string]] : []),
  ];

  let y = 44;
  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), 20, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.text(value, 20, y + 7);
    y += 18;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, y, 190, y);
  y += 10;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Government ID image is available in the admin panel.`, 20, y);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")} · LeafLand Kerala ERP`, 20, y + 6);

  doc.save(`Registration_${reg.fullName.replace(/\s+/g, "_")}.pdf`);
}

// ─── Approve Modal ───────────────────────────────────────────────────────────

function ApproveModal({ open, request, onClose, onSuccess }: {
  open: boolean; request: RegistrationRequest | null;
  onClose: () => void; onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setEmail(""); setPassword(generatePassword()); setCopied(false); }
  }, [open]);

  async function handleApprove() {
    if (!request) return;
    if (!email.trim()) { toastError("Email is required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Approval failed");
      } else {
        success("Employee account created", `${data.employee?.name}`);
        onSuccess();
        onClose();
      }
    } catch { toastError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Approve Registration" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleApprove} loading={loading}>Approve &amp; Create Account</Button></>}>
      {request && (
        <div className="space-y-4">
          <p className="text-sm text-[#64748b]">Creating account for <span className="font-semibold text-[#1a1a1a]">{request.fullName}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#374151]">Email <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@example.com"
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7A57]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#374151]">Temporary Password</label>
            <div className="flex gap-2">
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[#3B7A57]" />
              <button onClick={() => { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${copied ? "border-green-200 bg-green-50 text-green-700" : "border-[#e2e8f0] bg-gray-50 text-[#64748b]"}`}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Reject Modal ────────────────────────────────────────────────────────────

function RejectModal({ open, request, onClose, onSuccess }: {
  open: boolean; request: RegistrationRequest | null;
  onClose: () => void; onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setAdminNotes(""); }, [open]);

  async function handleReject() {
    if (!request) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminNotes }),
      });
      if (res.ok) { success("Registration rejected"); onSuccess(); onClose(); }
      else { const d = await res.json(); toastError(d.error || "Failed"); }
    } catch { toastError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Reject Registration" size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button variant="danger" onClick={handleReject} loading={loading}>Reject</Button></>}>
      {request && (
        <div className="space-y-3">
          <p className="text-sm text-[#64748b]">Rejecting <span className="font-semibold text-[#1a1a1a]">{request.fullName}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#374151]">Reason (optional)</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3}
              placeholder="Reason for rejection..."
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7A57] resize-none" />
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({ open, request, onClose }: {
  open: boolean; request: RegistrationRequest | null; onClose: () => void;
}) {
  if (!request) return null;
  return (
    <Modal open={open} onClose={onClose} title="Registration Details" size="md"
      footer={
        <Button variant="outline" onClick={() => downloadRegistrationPDF(request)}>
          <Download className="h-4 w-4 mr-1.5" /> Download PDF
        </Button>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Full Name", request.fullName],
            ["Mobile", request.mobileNumber],
            ["ID Type", idTypeLabel(request.governmentIdType)],
            ["Submitted", new Date(request.submittedAt).toLocaleDateString("en-IN")],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-[#64748b] uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-[#1a1a1a] mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        {request.governmentIdImageUrl && (
          <div>
            <p className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Government ID</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.governmentIdImageUrl} alt="Government ID" loading="lazy" decoding="async" className="w-full max-h-64 object-contain rounded-lg border border-[#e2e8f0]" />
          </div>
        )}
        {request.adminNotes && (
          <div>
            <p className="text-xs text-[#64748b] uppercase tracking-wide mb-1">Admin Notes</p>
            <p className="text-sm text-[#1a1a1a] bg-gray-50 rounded-lg p-3">{request.adminNotes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type ActiveTab = "registrations" | "notifications";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("registrations");
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [detailRequest, setDetailRequest] = useState<RegistrationRequest | null>(null);
  const [approveRequest, setApproveRequest] = useState<RegistrationRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<RegistrationRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, notifRes] = await Promise.all([
        fetch("/api/admin/registrations"),
        fetch("/api/admin/notifications"),
      ]);
      const [regData, notifData] = await Promise.all([regRes.json(), notifRes.json()]);
      // API returns { requests, total, pendingCount }
      const regs = Array.isArray(regData) ? regData : (regData.requests ?? []);
      setRegistrations(regs);
      if (notifData && !notifData.error) setNotifications(notifData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredRegs = registrations.filter((r) => statusFilter === "ALL" || r.status === statusFilter);
  const pendingCount = registrations.filter((r) => r.status === "PENDING").length;

  const TABS: { id: ActiveTab; label: string; count?: number }[] = [
    { id: "registrations", label: "Registrations", count: pendingCount },
    { id: "notifications", label: "System Alerts", count: notifications?.items.length },
  ];

  const notifIcon = (type: string) => {
    if (type === "REGISTRATION") return <UserPlus className="h-4 w-4 text-purple-500" />;
    if (type === "NEW_ORDER") return <Package className="h-4 w-4 text-blue-500" />;
    return <Truck className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Notifications</h1>
          <p className="mt-0.5 text-sm text-[#64748b]">
            {pendingCount > 0 ? `${pendingCount} registration${pendingCount !== 1 ? "s" : ""} awaiting approval` : "All caught up!"}
          </p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#64748b] hover:bg-[#f8f9fa]">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[#f1f5f9] p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#64748b] hover:text-[#1a1a1a]"
            }`}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab.id === "registrations" && pendingCount > 0 ? "bg-red-100 text-red-700" : "bg-[#e2e8f0] text-[#64748b]"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : activeTab === "registrations" ? (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  statusFilter === s ? "bg-[#1E4D3D] text-white" : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8f9fa]"
                }`}>
                {s === "ALL" ? `All (${registrations.length})` :
                 s === "PENDING" ? `Pending (${registrations.filter(r => r.status === "PENDING").length})` :
                 s === "APPROVED" ? `Approved (${registrations.filter(r => r.status === "APPROVED").length})` :
                 `Rejected (${registrations.filter(r => r.status === "REJECTED").length})`}
              </button>
            ))}
          </div>

          {filteredRegs.length === 0 ? (
            <div className="rounded-xl bg-white border border-[#e2e8f0] p-12 text-center">
              <Bell className="h-10 w-10 text-[#94a3b8] mx-auto mb-3" />
              <p className="font-medium text-[#1a1a1a]">No {statusFilter.toLowerCase()} registrations</p>
              <p className="text-sm text-[#64748b] mt-1">Registration requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegs.map((reg) => (
                <div key={reg.id} className="rounded-xl bg-white border border-[#e2e8f0] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-sm font-bold text-[#1E4D3D]">
                        {reg.fullName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1a1a1a]">{reg.fullName}</p>
                        <p className="text-sm text-[#64748b]">{reg.mobileNumber} · {idTypeLabel(reg.governmentIdType)}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">{timeAgo(reg.submittedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {reg.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                      {reg.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" /> Approved
                        </span>
                      )}
                      {reg.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setDetailRequest(reg)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f8f9fa]">
                      <Eye className="h-3.5 w-3.5" /> View ID
                    </button>
                    <button onClick={() => downloadRegistrationPDF(reg)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f8f9fa]">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                    {reg.status === "PENDING" && (
                      <>
                        <button onClick={() => setApproveRequest(reg)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#1E4D3D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3B7A57]">
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => setRejectRequest(reg)}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications?.lowStockCount !== undefined && notifications.lowStockCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <Package className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-900">Low Stock Alert</p>
                <p className="text-sm text-orange-700">{notifications.lowStockCount} product{notifications.lowStockCount !== 1 ? "s" : ""} with stock below 10 units</p>
              </div>
              <a href="/dashboard/products" className="text-xs font-semibold text-orange-700 hover:underline">View</a>
            </div>
          )}

          {(notifications?.items.length ?? 0) === 0 ? (
            <div className="rounded-xl bg-white border border-[#e2e8f0] p-12 text-center">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="font-medium text-[#1a1a1a]">No recent alerts</p>
              <p className="text-sm text-[#64748b] mt-1">New orders and deliveries will appear here</p>
            </div>
          ) : (
            notifications?.items.map((item) => (
              <a key={item.id} href={item.href}
                className="flex items-start gap-3 rounded-xl bg-white border border-[#e2e8f0] p-4 hover:bg-[#f8f9fa] transition-colors">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                  item.urgent ? "bg-red-50" : "bg-[#f1f5f9]"
                }`}>
                  {notifIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#1a1a1a] text-sm">{item.title}</p>
                    {item.urgent && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Urgent</span>
                    )}
                  </div>
                  <p className="text-sm text-[#64748b] mt-0.5 truncate">{item.body}</p>
                  <p className="text-xs text-[#94a3b8] mt-1">{timeAgo(item.createdAt)}</p>
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <DetailModal open={!!detailRequest} request={detailRequest} onClose={() => setDetailRequest(null)} />
      <ApproveModal open={!!approveRequest} request={approveRequest} onClose={() => setApproveRequest(null)} onSuccess={fetchAll} />
      <RejectModal open={!!rejectRequest} request={rejectRequest} onClose={() => setRejectRequest(null)} onSuccess={fetchAll} />
    </div>
  );
}
