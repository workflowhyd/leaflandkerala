"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search, CheckCircle, XCircle, Clock, Eye, Download,
  RefreshCw, UserPlus, Filter,
} from "lucide-react";
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

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function idTypeLabel(type: string): string {
  const map: Record<string, string> = {
    AADHAAR: "Aadhaar Card", PAN: "PAN Card",
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
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function downloadRegistrationPDF(reg: RegistrationRequest) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 77, 61);
  doc.text("LeafLand Kerala", 20, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(26, 26, 26);
  doc.text("Employee Registration Application", 20, 31);

  doc.setDrawColor(30, 77, 61);
  doc.setLineWidth(0.6);
  doc.line(20, 36, 190, 36);

  const fields: [string, string][] = [
    ["Full Name", reg.fullName],
    ["Mobile Number", reg.mobileNumber],
    ["Government ID Type", idTypeLabel(reg.governmentIdType)],
    ["Registration Date", new Date(reg.submittedAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    })],
    ["Status", reg.status],
    ...(reg.approvedAt ? [["Decision Date", new Date(reg.approvedAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    })] as [string, string]] : []),
    ...(reg.adminNotes ? [["Admin Notes", reg.adminNotes] as [string, string]] : []),
  ];

  let y = 50;
  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), 20, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    const lines = doc.splitTextToSize(value, 160);
    doc.text(lines, 20, y + 8);
    y += 8 + lines.length * 7 + 6;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, y + 4, 190, y + 4);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Government ID image available in the Admin Panel.", 20, y + 12);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")} · LeafLand Kerala ERP`, 20, y + 19);

  doc.save(`Registration_${reg.fullName.replace(/\s+/g, "_")}_${reg.id.slice(-6)}.pdf`);
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
    if (!email.trim()) { toastError("Email is required to create the account"); return; }
    if (!password.trim()) { toastError("Password is required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Approval failed. Please try again.");
      } else {
        success("Employee Approved", `Account created for ${data.employee?.name}`);
        onSuccess();
        onClose();
      }
    } catch { toastError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Approve Registration" size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleApprove} loading={loading}>Approve &amp; Create Account</Button>
        </>
      }>
      {request && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-100 p-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
              {request.fullName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-green-900">{request.fullName}</p>
              <p className="text-sm text-green-700">{request.mobileNumber} · {idTypeLabel(request.governmentIdType)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#374151]">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@example.com"
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent" />
            <p className="mt-1 text-xs text-[#94a3b8]">This will be the employee login email</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#374151]">Temporary Password</label>
            <div className="flex gap-2">
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-[#3B7A57]" />
              <button onClick={() => { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  copied ? "border-green-200 bg-green-50 text-green-700" : "border-[#e2e8f0] bg-gray-50 text-[#64748b] hover:bg-gray-100"
                }`}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#94a3b8]">Share this password with the employee securely</p>
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
      if (res.ok) {
        success("Registration rejected");
        onSuccess();
        onClose();
      } else {
        const d = await res.json();
        toastError(d.error || "Failed to reject");
      }
    } catch { toastError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Reject Registration" size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} loading={loading}>Confirm Rejection</Button>
        </>
      }>
      {request && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 p-3">
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-600">
              {request.fullName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-red-900">{request.fullName}</p>
              <p className="text-sm text-red-700">{request.mobileNumber}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#374151]">Reason for Rejection (optional)</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3}
              placeholder="Enter reason..."
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B7A57] resize-none" />
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({ open, request, onClose, onApprove, onReject }: {
  open: boolean; request: RegistrationRequest | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!request) return null;
  return (
    <Modal open={open} onClose={onClose} title="Registration Details" size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={() => downloadRegistrationPDF(request)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#64748b] hover:text-[#1a1a1a]">
            <Download className="h-4 w-4" /> Download PDF
          </button>
          {request.status === "PENDING" && (
            <div className="flex gap-2">
              <button onClick={() => { onClose(); onReject(); }}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button onClick={() => { onClose(); onApprove(); }}
                className="flex items-center gap-1.5 rounded-lg bg-[#1E4D3D] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B7A57]">
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
            </div>
          )}
        </div>
      }>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Full Name", request.fullName],
            ["Mobile Number", request.mobileNumber],
            ["ID Type", idTypeLabel(request.governmentIdType)],
            ["Submitted", new Date(request.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })],
            ...(request.approvedAt ? [["Decision Date", new Date(request.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })]] : []),
            ["Status", request.status],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wide">{label}</p>
              <p className={`text-sm font-medium mt-0.5 ${
                value === "PENDING" ? "text-yellow-700" :
                value === "APPROVED" ? "text-green-700" :
                value === "REJECTED" ? "text-red-700" :
                "text-[#1a1a1a]"
              }`}>{value}</p>
            </div>
          ))}
        </div>

        {request.adminNotes && (
          <div>
            <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Admin Notes</p>
            <p className="text-sm text-[#1a1a1a] bg-gray-50 rounded-lg p-3 border border-[#e2e8f0]">{request.adminNotes}</p>
          </div>
        )}

        {request.governmentIdImageUrl && (
          <div>
            <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">Government ID Photo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={request.governmentIdImageUrl} alt="Government ID" loading="lazy" decoding="async"
              className="w-full max-h-72 object-contain rounded-lg border border-[#e2e8f0] bg-gray-50" />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RegistrationRequest["status"] }) {
  if (status === "PENDING") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
  if (status === "APPROVED") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" /> Approved
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  const [detailRequest, setDetailRequest] = useState<RegistrationRequest | null>(null);
  const [approveRequest, setApproveRequest] = useState<RegistrationRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<RegistrationRequest | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/registrations");
      const data = await res.json();
      const regs = Array.isArray(data) ? data : (data.requests ?? []);
      setRegistrations(regs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const filtered = useMemo(() => {
    let list = registrations;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.mobileNumber.includes(q)
      );
    }
    return list;
  }, [registrations, statusFilter, searchQuery]);

  const counts = {
    ALL: registrations.length,
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    APPROVED: registrations.filter((r) => r.status === "APPROVED").length,
    REJECTED: registrations.filter((r) => r.status === "REJECTED").length,
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Employee Approvals</h1>
          <p className="mt-0.5 text-sm text-[#64748b]">
            {counts.PENDING > 0
              ? `${counts.PENDING} application${counts.PENDING !== 1 ? "s" : ""} awaiting review`
              : "All applications reviewed"}
          </p>
        </div>
        <button onClick={fetchRegistrations}
          className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#64748b] hover:bg-[#f8f9fa]">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          { label: "Total", key: "ALL" as const, color: "text-[#1a1a1a]", bg: "bg-gray-50", border: "border-gray-200" },
          { label: "Pending", key: "PENDING" as const, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
          { label: "Approved", key: "APPROVED" as const, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
          { label: "Rejected", key: "REJECTED" as const, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
        ] as const).map(({ label, key, color, bg, border }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`rounded-xl border p-4 text-left transition-all ${
              statusFilter === key ? `${bg} ${border} ring-1 ring-current/20` : "bg-white border-[#e2e8f0] hover:bg-[#f8f9fa]"
            }`}>
            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[#64748b] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#94a3b8] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-[#94a3b8] hover:text-[#64748b]">×</button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-white px-2">
          <Filter className="h-4 w-4 text-[#64748b]" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-transparent text-sm text-[#64748b] outline-none py-2 pr-1">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white border border-[#e2e8f0] p-12 text-center">
          <UserPlus className="h-12 w-12 text-[#94a3b8] mx-auto mb-3" />
          <p className="font-semibold text-[#1a1a1a]">
            {searchQuery ? "No results found" : `No ${statusFilter.toLowerCase()} registrations`}
          </p>
          <p className="text-sm text-[#64748b] mt-1">
            {searchQuery ? "Try a different name or phone number" : "New registrations will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => (
            <div key={reg.id} className="rounded-xl bg-white border border-[#e2e8f0] overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 flex-shrink-0 rounded-full bg-[#1E4D3D]/10 flex items-center justify-center text-sm font-bold text-[#1E4D3D]">
                      {reg.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1a1a1a] truncate">{reg.fullName}</p>
                      <p className="text-sm text-[#64748b]">{reg.mobileNumber}</p>
                      <p className="text-xs text-[#94a3b8] mt-0.5">{idTypeLabel(reg.governmentIdType)} · {timeAgo(reg.submittedAt)}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={reg.status} />
                    {reg.approvedAt && (
                      <p className="text-[10px] text-[#94a3b8] mt-1 text-right">
                        {new Date(reg.approvedAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>

                {reg.adminNotes && (
                  <div className="mt-2 rounded-md bg-gray-50 border border-[#e2e8f0] px-3 py-1.5">
                    <p className="text-xs text-[#64748b]">{reg.adminNotes}</p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => setDetailRequest(reg)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f8f9fa]">
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>
                  <button onClick={() => downloadRegistrationPDF(reg)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f8f9fa]">
                    <Download className="h-3.5 w-3.5" /> Download PDF
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
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <DetailModal
        open={!!detailRequest}
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        onApprove={() => setApproveRequest(detailRequest)}
        onReject={() => setRejectRequest(detailRequest)}
      />
      <ApproveModal
        open={!!approveRequest}
        request={approveRequest}
        onClose={() => setApproveRequest(null)}
        onSuccess={fetchRegistrations}
      />
      <RejectModal
        open={!!rejectRequest}
        request={rejectRequest}
        onClose={() => setRejectRequest(null)}
        onSuccess={fetchRegistrations}
      />
    </div>
  );
}
