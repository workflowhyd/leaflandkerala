"use client";

import { useEffect, useState, useCallback } from "react";
import { Undo2, Eye, CheckCircle, XCircle, Clock, PackageCheck, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { formatDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";

type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

interface ReturnListItem {
  id: string;
  returnNumber: string;
  status: ReturnStatus;
  reason: string;
  createdAt: string;
  customer: { name: string; mobile: string };
  order: { orderNumber: string };
  employee: { name: string };
  items: { quantity: number }[];
  images: { id: string }[];
}

interface ReturnDetail extends ReturnListItem {
  reasonNotes: string | null;
  notes: string | null;
  adminNotes: string | null;
  customer: ReturnListItem["customer"] & { address: string; village: string | null; district: string };
  order: ReturnListItem["order"] & { createdAt: string; totalAmount: number };
  employee: ReturnListItem["employee"] & { mobile: string };
  items: {
    quantity: number;
    product: { name: string; serialNumber: number; sku: string };
  }[];
  images: { id: string; imageUrl: string }[];
}

type StatusFilter = "ALL" | ReturnStatus;

const NON_REUSABLE_REASONS = new Set(["DAMAGED_PRODUCT", "EXPIRED_PRODUCT"]);

function StatusIcon({ status }: { status: ReturnStatus }) {
  if (status === "PENDING") return <Clock className="h-3 w-3" />;
  if (status === "APPROVED") return <CheckCircle className="h-3 w-3" />;
  if (status === "COMPLETED") return <PackageCheck className="h-3 w-3" />;
  return <XCircle className="h-3 w-3" />;
}

function StatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)}`}>
      <StatusIcon status={status} />
      {getStatusLabel(status)}
    </span>
  );
}

/* ─── Approve Modal ─────────────────────────────────────────────────────────── */

function ApproveModal({
  open, ret, onClose, onSuccess,
}: {
  open: boolean; ret: ReturnDetail | null; onClose: () => void; onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [restock, setRestock] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ret) {
      setAdminNotes("");
      setRestock(!NON_REUSABLE_REASONS.has(ret.reason));
    }
  }, [open, ret]);

  async function handleApprove() {
    if (!ret) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/returns/${ret.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", adminNotes, restock }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Approval failed");
      } else {
        success("Return approved", ret.returnNumber);
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
      title="Approve Return"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleApprove} loading={loading}>Approve Return</Button>
        </>
      }
    >
      {ret && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Approving <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ret.returnNumber}</span> for{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ret.customer.name}</span>
          </p>

          <label className="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer" style={{ borderColor: "#e2e8f0" }}>
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="mt-0.5 w-4 h-4"
              style={{ accentColor: "#1E4D3D" }}
            />
            <span>
              <span className="block text-sm font-medium" style={{ color: "#1a1a1a" }}>
                Restock returned items to inventory
              </span>
              <span className="block text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                Uncheck if the product isn&apos;t reusable (e.g. damaged or expired).
              </span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
              Admin Notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this approval..."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
              style={{ borderColor: "#e2e8f0" }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Reject Modal ──────────────────────────────────────────────────────────── */

function RejectModal({
  open, ret, onClose, onSuccess,
}: {
  open: boolean; ret: ReturnDetail | null; onClose: () => void; onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setAdminNotes(""); }, [open]);

  async function handleReject() {
    if (!ret) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/returns/${ret.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Rejection failed");
      } else {
        success("Return rejected", ret.returnNumber);
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
      title="Reject Return"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} loading={loading}>Reject</Button>
        </>
      }
    >
      {ret && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Rejecting <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ret.returnNumber}</span> from{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ret.customer.name}</span>
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Reason (optional)</label>
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

/* ─── Complete Modal ────────────────────────────────────────────────────────── */

function CompleteModal({
  open, ret, onClose, onSuccess,
}: {
  open: boolean; ret: ReturnDetail | null; onClose: () => void; onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (!ret) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/returns/${ret.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Failed to mark completed");
      } else {
        success("Return marked completed", ret.returnNumber);
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
      title="Mark Return Completed"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleComplete} loading={loading}>Mark Completed</Button>
        </>
      }
    >
      {ret && (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Confirm that <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ret.returnNumber}</span> has
          been fully processed (refund/replacement issued) for{" "}
          <span className="font-semibold" style={{ color: "#1a1a1a" }}>{ret.customer.name}</span>.
        </p>
      )}
    </Modal>
  );
}

/* ─── Detail Modal ──────────────────────────────────────────────────────────── */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>{label}</p>
      <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>{value}</p>
    </div>
  );
}

function DetailModal({
  open, ret, onClose, onApprove, onReject, onComplete,
}: {
  open: boolean; ret: ReturnDetail | null; onClose: () => void;
  onApprove: () => void; onReject: () => void; onComplete: () => void;
}) {
  if (!ret) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Return ${ret.returnNumber}`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Customer" value={`${ret.customer.name} (${ret.customer.mobile})`} />
          <DetailRow label="Order" value={ret.order.orderNumber} />
          <DetailRow label="Employee" value={ret.employee.name} />
          <DetailRow label="Return Date" value={formatDateTime(ret.createdAt)} />
          <DetailRow label="Status" value={<StatusBadge status={ret.status} />} />
          <DetailRow label="Reason" value={getStatusLabel(ret.reason)} />
        </div>

        {ret.reasonNotes && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>Reason Details</p>
            <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>{ret.reasonNotes}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
            Returned Items
          </p>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ret.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell className="text-[#64748b]">#{item.product.serialNumber}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {ret.images.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
              Photos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ret.images.map((img) => (
                <a key={img.id} href={img.imageUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.imageUrl} alt="Return evidence" className="w-full aspect-square object-cover rounded-lg border" style={{ borderColor: "#e2e8f0" }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {ret.notes && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>Employee Notes</p>
            <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>{ret.notes}</p>
          </div>
        )}

        {ret.adminNotes && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>Admin Notes</p>
            <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>{ret.adminNotes}</p>
          </div>
        )}

        {ret.status === "PENDING" && (
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#e2e8f0" }}>
            <button onClick={onReject} className="flex-1 rounded-lg border py-2 text-sm font-medium transition-colors" style={{ borderColor: "#D32F2F", color: "#D32F2F" }}>
              Reject
            </button>
            <button onClick={onApprove} className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors" style={{ backgroundColor: "#1E4D3D", color: "#F8F5EE" }}>
              Approve
            </button>
          </div>
        )}
        {ret.status === "APPROVED" && (
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#e2e8f0" }}>
            <button onClick={onComplete} className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors" style={{ backgroundColor: "#1E4D3D", color: "#F8F5EE" }}>
              Mark Completed
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */

export default function ReturnsPage() {
  const { error: toastError } = useToast();
  const [returns, setReturns] = useState<ReturnListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detail, setDetail] = useState<ReturnDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/returns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns);
        setTotal(data.total);
        setPendingCount(data.pendingCount);
      } else {
        toastError("Failed to load returns");
      }
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, toastError]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  async function openDetail(id: string) {
    setLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const res = await fetch(`/api/returns/${id}`);
      if (res.ok) setDetail(await res.json());
      else toastError("Failed to load return details");
    } finally {
      setLoadingDetail(false);
    }
  }

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Completed", value: "COMPLETED" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Returns</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Review and process customer return requests</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-[#e2e8f0] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className="relative rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: statusFilter === tab.value ? "#1E4D3D" : "transparent",
                color: statusFilter === tab.value ? "#F8F5EE" : "#64748b",
              }}
            >
              {tab.label}
              {tab.value === "PENDING" && pendingCount > 0 && (
                <span
                  className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{
                    backgroundColor: statusFilter === "PENDING" ? "#F8F5EE" : "#1E4D3D",
                    color: statusFilter === "PENDING" ? "#1E4D3D" : "#F8F5EE",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return #, order #, customer..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
            style={{ borderColor: "#e2e8f0" }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <Undo2 className="h-12 w-12 text-[#64748b]/40 mb-3" />
          <p className="text-[#64748b] font-medium">No returns found</p>
          <p className="text-sm text-[#64748b]/70 mt-1">
            {statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} returns` : "No return requests yet"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {returns.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1a1a1a] truncate">{r.customer.name}</p>
                      <p className="text-xs text-[#64748b] mt-0.5">{r.returnNumber} · Order {r.order.orderNumber}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-[#94a3b8]">{formatDateTime(r.createdAt)}</p>
                    <button
                      onClick={() => openDetail(r.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View & Action
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden !p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-[#1E4D3D]">{r.returnNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.customer.name}</div>
                      <div className="text-xs text-[#64748b]">{r.customer.mobile}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.order.orderNumber}</TableCell>
                    <TableCell className="text-[#64748b]">{r.employee.name}</TableCell>
                    <TableCell className="text-[#64748b]">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-[#64748b]">
              <span>
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <DetailModal
        open={showDetailModal}
        ret={loadingDetail ? null : detail}
        onClose={() => setShowDetailModal(false)}
        onApprove={() => { setShowDetailModal(false); setShowApproveModal(true); }}
        onReject={() => { setShowDetailModal(false); setShowRejectModal(true); }}
        onComplete={() => { setShowDetailModal(false); setShowCompleteModal(true); }}
      />
      <ApproveModal open={showApproveModal} ret={detail} onClose={() => setShowApproveModal(false)} onSuccess={fetchReturns} />
      <RejectModal open={showRejectModal} ret={detail} onClose={() => setShowRejectModal(false)} onSuccess={fetchReturns} />
      <CompleteModal open={showCompleteModal} ret={detail} onClose={() => setShowCompleteModal(false)} onSuccess={fetchReturns} />
    </div>
  );
}
