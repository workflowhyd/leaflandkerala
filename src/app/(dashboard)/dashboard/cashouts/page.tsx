"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, Eye, CheckCircle, XCircle, Clock, BadgeIndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

type CashoutStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

interface CashoutListItem {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  requestedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  status: CashoutStatus;
  adminNotes: string | null;
  employee: { name: string; mobile: string };
}

const STATUS_STYLE: Record<CashoutStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function StatusIcon({ status }: { status: CashoutStatus }) {
  if (status === "PENDING") return <Clock className="h-3 w-3" />;
  if (status === "APPROVED") return <BadgeIndianRupee className="h-3 w-3" />;
  if (status === "PAID") return <CheckCircle className="h-3 w-3" />;
  return <XCircle className="h-3 w-3" />;
}

function StatusBadge({ status }: { status: CashoutStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      <StatusIcon status={status} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function weekLabel(c: { weekStartDate: string; weekEndDate: string }) {
  return `${formatDate(c.weekStartDate)} – ${formatDate(c.weekEndDate)}`;
}

/* ─── Action modals ─────────────────────────────────────────────────────────── */

function ActionModal({
  open, cashout, action, onClose, onSuccess,
}: {
  open: boolean;
  cashout: CashoutListItem | null;
  action: "approve" | "reject" | "markPaid" | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setAdminNotes(""); }, [open]);

  if (!action) return null;

  const copy = {
    approve: { title: "Approve Cash-Out", confirmLabel: "Approve", variant: "default" as const },
    reject: { title: "Reject Cash-Out", confirmLabel: "Reject", variant: "danger" as const },
    markPaid: { title: "Mark as Paid", confirmLabel: "Mark as Paid", variant: "default" as const },
  }[action];

  async function handleConfirm() {
    if (!cashout || !action) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cashouts/${cashout.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Action failed");
      } else {
        success(copy.title, `${cashout.employee.name} — ${weekLabel(cashout)}`);
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
      title={copy.title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={copy.variant} onClick={handleConfirm} loading={loading}>{copy.confirmLabel}</Button>
        </>
      }
    >
      {cashout && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>{cashout.employee.name}</span> — {weekLabel(cashout)} —{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>{formatCurrency(cashout.commissionAmount)}</span>
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Admin Notes (optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>{label}</p>
      <p className="mt-0.5 text-sm font-medium" style={{ color: "#1a1a1a" }}>{value}</p>
    </div>
  );
}

function DetailModal({
  open, cashout, onClose, onApprove, onReject, onMarkPaid,
}: {
  open: boolean; cashout: CashoutListItem | null; onClose: () => void;
  onApprove: () => void; onReject: () => void; onMarkPaid: () => void;
}) {
  if (!cashout) return null;
  return (
    <Modal open={open} onClose={onClose} title="Cash-Out Request" size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Employee" value={`${cashout.employee.name} (${cashout.employee.mobile})`} />
          <DetailRow label="Week" value={weekLabel(cashout)} />
          <DetailRow label="Weekly Sales" value={formatCurrency(cashout.weeklySales)} />
          <DetailRow label="Commission Rate" value={`${cashout.commissionRate}%`} />
          <DetailRow label="Commission Amount" value={formatCurrency(cashout.commissionAmount)} />
          <DetailRow label="Status" value={<StatusBadge status={cashout.status} />} />
          <DetailRow label="Requested" value={formatDate(cashout.requestedAt)} />
          {cashout.approvedAt && <DetailRow label="Approved" value={formatDate(cashout.approvedAt)} />}
          {cashout.paidAt && <DetailRow label="Paid" value={formatDate(cashout.paidAt)} />}
        </div>
        {cashout.adminNotes && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#94a3b8" }}>Admin Notes</p>
            <p className="mt-0.5 text-sm" style={{ color: "#64748b" }}>{cashout.adminNotes}</p>
          </div>
        )}
        {cashout.status === "PENDING" && (
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#e2e8f0" }}>
            <button onClick={onReject} className="flex-1 rounded-lg border py-2 text-sm font-medium transition-colors" style={{ borderColor: "#D32F2F", color: "#D32F2F" }}>
              Reject
            </button>
            <button onClick={onApprove} className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors" style={{ backgroundColor: "#1E4D3D", color: "#F8F5EE" }}>
              Approve
            </button>
          </div>
        )}
        {cashout.status === "APPROVED" && (
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "#e2e8f0" }}>
            <button onClick={onMarkPaid} className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors" style={{ backgroundColor: "#1E4D3D", color: "#F8F5EE" }}>
              Mark as Paid
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */

type StatusFilter = "ALL" | CashoutStatus;

export default function CashoutsPage() {
  const { error: toastError } = useToast();
  const [cashouts, setCashouts] = useState<CashoutListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detail, setDetail] = useState<CashoutListItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionModal, setActionModal] = useState<"approve" | "reject" | "markPaid" | null>(null);

  const fetchCashouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/cashouts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCashouts(data.cashouts);
        setTotal(data.total);
        setPendingCount(data.pendingCount);
      } else {
        toastError("Failed to load cash-out requests");
      }
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, toastError]);

  useEffect(() => { fetchCashouts(); }, [fetchCashouts]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  function openDetail(c: CashoutListItem) {
    setDetail(c);
    setShowDetailModal(true);
  }

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Paid", value: "PAID" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Cash-Out Requests</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Weekly commission payout requests from employees</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-[#e2e8f0] overflow-x-auto w-fit">
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : cashouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <Wallet className="h-12 w-12 text-[#64748b]/40 mb-3" />
          <p className="text-[#64748b] font-medium">No cash-out requests found</p>
          <p className="text-sm text-[#64748b]/70 mt-1">
            {statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` : "No requests yet"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {cashouts.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1a1a1a] truncate">{c.employee.name}</p>
                      <p className="text-xs text-[#64748b] mt-0.5">{weekLabel(c)}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1E4D3D]">{formatCurrency(c.commissionAmount)}</p>
                    <button
                      onClick={() => openDetail(c)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
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
                  <TableHead>Employee</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Weekly Sales</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashouts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.employee.name}</div>
                      <div className="text-xs text-[#64748b]">{c.employee.mobile}</div>
                    </TableCell>
                    <TableCell className="text-[#64748b]">{weekLabel(c)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.weeklySales)}</TableCell>
                    <TableCell className="text-right">{c.commissionRate}%</TableCell>
                    <TableCell className="text-right font-semibold text-[#1E4D3D]">{formatCurrency(c.commissionAmount)}</TableCell>
                    <TableCell className="text-[#64748b]">{formatDate(c.requestedAt)}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => openDetail(c)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-[#64748b]">
              <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <DetailModal
        open={showDetailModal}
        cashout={detail}
        onClose={() => setShowDetailModal(false)}
        onApprove={() => { setShowDetailModal(false); setActionModal("approve"); }}
        onReject={() => { setShowDetailModal(false); setActionModal("reject"); }}
        onMarkPaid={() => { setShowDetailModal(false); setActionModal("markPaid"); }}
      />
      <ActionModal
        open={!!actionModal}
        cashout={detail}
        action={actionModal}
        onClose={() => setActionModal(null)}
        onSuccess={fetchCashouts}
      />
    </div>
  );
}
