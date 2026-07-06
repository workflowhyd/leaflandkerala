"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface RegistrationRequest {
  id: string;
  fullName: string;
  mobileNumber: string;
  address: string | null;
  governmentIdType: string;
  governmentIdNumber: string | null;
  governmentIdFrontUrl: string;
  governmentIdBackUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  submittedAt: string;
  approvedAt: string | null;
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function idTypeLabel(type: string): string {
  switch (type) {
    case "AADHAAR":
      return "Aadhaar";
    case "PAN":
      return "PAN";
    case "DRIVING_LICENSE":
      return "Driving License";
    case "VOTER_ID":
      return "Voter ID";
    default:
      return type;
  }
}

function StatusBadge({ status }: { status: RegistrationRequest["status"] }) {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <XCircle className="h-3 w-3" />
      Rejected
    </span>
  );
}

/* ─── Approve Modal ─────────────────────────────────────────────────────────── */

function ApproveModal({
  open,
  request,
  onClose,
  onSuccess,
}: {
  open: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword(generatePassword());
      setCopied(false);
    }
  }, [open]);

  async function handleApprove() {
    if (!request) return;
    if (!email.trim()) {
      toastError("Email is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Approval failed");
      } else {
        success("Employee account created", `${data.employee?.name} — ${data.employee?.email}`);
        onSuccess();
        onClose();
      }
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve Registration"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} loading={loading}>
            Approve & Create Account
          </Button>
        </>
      }
    >
      {request && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Creating employee account for{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>
              {request.fullName}
            </span>
          </p>

          {/* Email */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#374151" }}
            >
              Email address <span style={{ color: "#D32F2F" }}>*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@example.com"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "#e2e8f0" }}
            />
          </div>

          {/* Temporary Password */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#374151" }}
            >
              Temporary Password
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono outline-none focus:ring-2"
                style={{ borderColor: "#e2e8f0" }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: "#e2e8f0",
                  color: copied ? "#2E7D32" : "#64748b",
                  backgroundColor: copied ? "#E8F5E9" : "#fafafa",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
              Share this password with the employee securely.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Reject Modal ──────────────────────────────────────────────────────────── */

function RejectModal({
  open,
  request,
  onClose,
  onSuccess,
}: {
  open: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setAdminNotes("");
  }, [open]);

  async function handleReject() {
    if (!request) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Rejection failed");
      } else {
        success("Request rejected", request.fullName);
        onSuccess();
        onClose();
      }
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject Registration"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject} loading={loading}>
            Reject
          </Button>
        </>
      }
    >
      {request && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Rejecting registration from{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>
              {request.fullName}
            </span>
          </p>
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#374151" }}
            >
              Reason (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
              style={{ borderColor: "#e2e8f0" }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Detail Modal ──────────────────────────────────────────────────────────── */

function DetailModal({
  open,
  request,
  onClose,
  onApprove,
  onReject,
}: {
  open: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!request) return null;

  return (
    <Modal open={open} onClose={onClose} title="Registration Details" size="lg">
      <div className="space-y-5">
        {/* ID Images — Front & Back */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
              ID Photo — Front
            </p>
            <img
              src={request.governmentIdFrontUrl}
              alt="Government ID — Front"
              loading="lazy"
              decoding="async"
              className="w-full rounded-lg border object-cover"
              style={{ aspectRatio: "3/2", objectFit: "cover", borderColor: "#e2e8f0" }}
            />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
              ID Photo — Back
            </p>
            {request.governmentIdBackUrl ? (
              <img
                src={request.governmentIdBackUrl}
                alt="Government ID — Back"
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg border object-cover"
                style={{ aspectRatio: "3/2", objectFit: "cover", borderColor: "#e2e8f0" }}
              />
            ) : (
              <div
                className="flex w-full items-center justify-center rounded-lg border text-xs"
                style={{ aspectRatio: "3/2", borderColor: "#e2e8f0", color: "#94a3b8" }}
              >
                Not provided
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Full Name
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>
              {request.fullName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Mobile
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>
              {request.mobileNumber}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Address
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>
              {request.address || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              ID Type
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>
              {idTypeLabel(request.governmentIdType)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              ID Number
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>
              {request.governmentIdNumber || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Submitted
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>
              {new Date(request.submittedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              Status
            </p>
            <div className="mt-0.5">
              <StatusBadge status={request.status} />
            </div>
          </div>
          {request.adminNotes && (
            <div className="col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>
                Admin Notes
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>
                {request.adminNotes}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons for PENDING */}
        {request.status === "PENDING" && (
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#e2e8f0" }}>
            <button
              onClick={onReject}
              className="flex-1 rounded-lg border py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: "#D32F2F",
                color: "#D32F2F",
              }}
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: "#1E4D3D",
                color: "#F8F5EE",
              }}
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */

export default function RegistrationsPage() {
  const { error: toastError } = useToast();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [detailRequest, setDetailRequest] =
    useState<RegistrationRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/registrations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
        setPendingCount(data.pendingCount);
      } else {
        toastError("Failed to load registrations");
      }
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toastError]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  function openDetail(req: RegistrationRequest) {
    setDetailRequest(req);
    setShowDetailModal(true);
  }

  function handleApproveFromDetail() {
    setShowDetailModal(false);
    setShowApproveModal(true);
  }

  function handleRejectFromDetail() {
    setShowDetailModal(false);
    setShowRejectModal(true);
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">
            Registrations
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Review and approve employee registration requests
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-[#e2e8f0]">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className="flex-1 relative rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                statusFilter === tab.value ? "#1E4D3D" : "transparent",
              color:
                statusFilter === tab.value ? "#F8F5EE" : "#64748b",
            }}
          >
            {tab.label}
            {tab.value === "PENDING" && pendingCount > 0 && (
              <span
                className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{
                  backgroundColor:
                    statusFilter === "PENDING" ? "#F8F5EE" : "#1E4D3D",
                  color:
                    statusFilter === "PENDING" ? "#1E4D3D" : "#F8F5EE",
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <ClipboardList className="h-12 w-12 text-[#64748b]/40 mb-3" />
          <p className="text-[#64748b] font-medium">No registrations found</p>
          <p className="text-sm text-[#64748b]/70 mt-1">
            {statusFilter !== "ALL"
              ? `No ${statusFilter.toLowerCase()} requests`
              : "No registration requests yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-sm font-bold text-[#1E4D3D]">
                      {req.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1a1a1a] truncate">
                        {req.fullName}
                      </p>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        {req.mobileNumber} &middot; {idTypeLabel(req.governmentIdType)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-[#94a3b8]">
                    Submitted{" "}
                    {new Date(req.submittedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => openDetail(req)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View & Action
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <DetailModal
        open={showDetailModal}
        request={detailRequest}
        onClose={() => setShowDetailModal(false)}
        onApprove={handleApproveFromDetail}
        onReject={handleRejectFromDetail}
      />
      <ApproveModal
        open={showApproveModal}
        request={detailRequest}
        onClose={() => setShowApproveModal(false)}
        onSuccess={fetchRequests}
      />
      <RejectModal
        open={showRejectModal}
        request={detailRequest}
        onClose={() => setShowRejectModal(false)}
        onSuccess={fetchRequests}
      />
    </div>
  );
}
