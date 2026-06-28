"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Eye,
  Star,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
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
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { useToast } from "@/components/ui/toast";
import { getStatusLabel } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  village: string | null;
  district: string;
  pincode: string;
  interestedProduct: string | null;
  status: string;
  employee: { name: string } | null;
  _count: { orders: number; fieldVisits: number };
}

interface CustomerStats {
  LEAD: number;
  VISITED: number;
  INTERESTED: number;
  ACTIVE: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "LEAD", label: "Lead" },
  { value: "VISITED", label: "Visited" },
  { value: "INTERESTED", label: "Interested" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "ACTIVE", label: "Active" },
];

function DeleteConfirmModal({
  open,
  customerName,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  customerName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D32F2F]/10">
          <Trash2 className="h-6 w-6 text-[#D32F2F]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">Delete Customer</h3>
        <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{customerName}</p>
        <p className="mb-6 text-sm text-[#64748b]">
          This will permanently delete the customer and all associated data. This action cannot be undone.
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

export default function CustomersPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState<CustomerStats>({ LEAD: 0, VISITED: 0, INTERESTED: 0, ACTIVE: 0 });
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search, status: statusFilter });
      const res = await fetch(`/api/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchStats = useCallback(async () => {
    const statuses = ["LEAD", "VISITED", "INTERESTED", "ACTIVE"];
    const counts: Record<string, number> = {};
    await Promise.all(
      statuses.map(async (s) => {
        const res = await fetch(`/api/customers?status=${s}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          counts[s] = data.total;
        }
      })
    );
    setStats({ LEAD: counts.LEAD || 0, VISITED: counts.VISITED || 0, INTERESTED: counts.INTERESTED || 0, ACTIVE: counts.ACTIVE || 0 });
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${deleteCustomer.id}`, { method: "DELETE" });
      if (res.ok) {
        success("Customer deleted", deleteCustomer.name);
        setDeleteCustomer(null);
        fetchCustomers();
        fetchStats();
      } else {
        toastError("Failed to delete customer");
      }
    } catch {
      toastError("Failed to delete customer");
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Customers</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Manage and track your customer base</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="hidden sm:flex">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <StatCard title="Leads" value={stats.LEAD} icon={Users} color="#3B7A57" />
        <StatCard title="Visited" value={stats.VISITED} icon={Eye} color="#7C3AED" />
        <StatCard title="Interested" value={stats.INTERESTED} icon={Star} color="#F9A825" />
        <StatCard title="Active" value={stats.ACTIVE} icon={UserCheck} color="#1E4D3D" />
      </div>

      {/* Filters */}
      <Card className="p-3 lg:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search by name, mobile, village..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-md border border-[#e2e8f0] bg-white pl-10 pr-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent hover:border-[#3B7A57] transition-colors"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <Users className="h-12 w-12 text-[#64748b]/40 mb-3" />
          <p className="text-[#64748b] font-medium">No customers found</p>
          <p className="text-sm text-[#64748b]/70 mt-1">
            {search || statusFilter ? "Try adjusting your filters" : "Add your first customer to get started"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {customers.map((customer) => (
              <Card key={customer.id} className="overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-sm font-bold text-[#1E4D3D]">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1a1a1a] truncate">{customer.name}</p>
                        <div className="flex items-center gap-1 text-xs text-[#64748b]">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {customer.mobile}
                        </div>
                      </div>
                    </div>
                    <CustomerStatusBadge status={customer.status} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#64748b] mb-2">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {customer.village ? `${customer.village}, ` : ""}{customer.district} — {customer.pincode}
                    </span>
                  </div>
                  {customer.interestedProduct && (
                    <p className="text-xs text-[#64748b] mb-2">
                      Interest: {getStatusLabel(customer.interestedProduct)}
                    </p>
                  )}
                  {customer.employee && (
                    <p className="text-xs text-[#94a3b8]">Agent: {customer.employee.name}</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e2e8f0] px-3 py-2">
                  <button
                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#F9A825]/10 hover:text-[#F9A825] transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteCustomer(customer)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#D32F2F]/10 hover:text-[#D32F2F] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Village / District</TableHead>
                  <TableHead>Interested Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-xs font-bold text-[#1E4D3D]">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#1a1a1a]">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#64748b]">{customer.mobile}</TableCell>
                    <TableCell className="text-[#64748b]">
                      {customer.village ? `${customer.village}, ` : ""}{customer.district}
                    </TableCell>
                    <TableCell className="text-[#64748b]">
                      {customer.interestedProduct
                        ? getStatusLabel(customer.interestedProduct)
                        : <span className="text-[#94a3b8]">—</span>}
                    </TableCell>
                    <TableCell>
                      <CustomerStatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell className="text-[#64748b]">
                      {customer.employee?.name || <span className="text-[#94a3b8]">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                          className="rounded p-1.5 text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                          className="rounded p-1.5 text-[#64748b] hover:bg-[#F9A825]/10 hover:text-[#F9A825] transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCustomer(customer)}
                          className="rounded p-1.5 text-[#64748b] hover:bg-[#D32F2F]/10 hover:text-[#D32F2F] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#e2e8f0] px-4 py-3">
                <p className="text-sm text-[#64748b]">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} customers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded p-1.5 text-[#64748b] hover:bg-[#1E4D3D]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-[#1a1a1a] font-medium">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded p-1.5 text-[#64748b] hover:bg-[#1E4D3D]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between md:hidden">
              <p className="text-sm text-[#64748b]">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AddCustomerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          success("Customer added successfully");
          fetchCustomers();
          fetchStats();
        }}
      />

      <DeleteConfirmModal
        open={!!deleteCustomer}
        customerName={deleteCustomer?.name ?? ""}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteCustomer(null)}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E4D3D] text-white shadow-lg active:scale-95 transition-transform sm:hidden"
        aria-label="Add customer"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
