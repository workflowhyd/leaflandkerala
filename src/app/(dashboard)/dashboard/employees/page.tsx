"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Plus,
  Search,
  Eye,
  Edit,
  UserX,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AddEmployeeModal } from "@/components/employees/add-employee-modal";
import { useToast } from "@/components/ui/toast";

interface Employee {
  id: string;
  name: string;
  mobile: string;
  email: string;
  territory: string | null;
  commissionPercent: number;
  isActive: boolean;
  _count: { customers: number; orders: number };
}

function ToggleConfirmModal({
  open,
  employee,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  employee: Employee | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !employee) return null;
  const action = employee.isActive ? "Disable" : "Enable";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${employee.isActive ? "bg-[#D32F2F]/10" : "bg-[#2E7D32]/10"}`}>
          <UserX className={`h-6 w-6 ${employee.isActive ? "text-[#D32F2F]" : "text-[#2E7D32]"}`} />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">{action} Employee</h3>
        <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{employee.name}</p>
        <p className="mb-6 text-sm text-[#64748b]">
          {employee.isActive
            ? "This employee will lose access to the system."
            : "This employee will regain access to the system."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={employee.isActive ? "danger" : "default"}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [toggleEmployee, setToggleEmployee] = useState<Employee | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const limit = 20;

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
      const res = await fetch(`/api/employees?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleToggleActive = async () => {
    if (!toggleEmployee) return;
    setToggleLoading(true);
    try {
      const res = await fetch(`/api/employees/${toggleEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleEmployee.isActive }),
      });
      if (res.ok) {
        success(
          toggleEmployee.isActive ? "Employee disabled" : "Employee enabled",
          toggleEmployee.name
        );
        setToggleEmployee(null);
        fetchEmployees();
      } else {
        toastError("Failed to update employee");
      }
    } catch {
      toastError("Failed to update employee");
    } finally {
      setToggleLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Employees</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Manage your field sales team</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="hidden sm:flex">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <Card className="p-3 lg:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search by name, email, mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-[#e2e8f0] bg-white pl-10 pr-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent hover:border-[#3B7A57] transition-colors"
          />
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-[#e2e8f0] bg-white">
          <UserCheck className="h-12 w-12 text-[#64748b]/40 mb-3" />
          <p className="text-[#64748b] font-medium">No employees found</p>
          <p className="text-sm text-[#64748b]/70 mt-1">
            {search ? "Try a different search" : "Add your first employee to get started"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {employees.map((emp) => (
              <Card key={emp.id} className="overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-sm font-bold text-[#1E4D3D]">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1a1a1a] truncate">{emp.name}</p>
                        <div className="flex items-center gap-1 text-xs text-[#64748b]">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {emp.mobile}
                        </div>
                      </div>
                    </div>
                    {emp.isActive ? (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" />
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#64748b]">
                    {emp.territory && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{emp.territory}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3 flex-shrink-0" />
                      {emp.commissionPercent}% commission
                    </div>
                    <div>
                      <span className="font-medium text-[#1a1a1a]">{emp._count.customers}</span> customers
                    </div>
                    <div>
                      <span className="font-medium text-[#1a1a1a]">{emp._count.orders}</span> orders
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e2e8f0] px-3 py-2">
                  <button
                    onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#F9A825]/10 hover:text-[#F9A825] transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setToggleEmployee(emp)}
                    className={`flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium transition-colors ${
                      emp.isActive
                        ? "text-[#64748b] hover:bg-[#D32F2F]/10 hover:text-[#D32F2F]"
                        : "text-[#64748b] hover:bg-green-100 hover:text-green-700"
                    }`}
                  >
                    <UserX className="h-3.5 w-3.5" />
                    {emp.isActive ? "Disable" : "Enable"}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-xs font-bold text-[#1E4D3D]">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#1a1a1a]">{emp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#64748b]">{emp.mobile}</TableCell>
                    <TableCell className="text-[#64748b]">{emp.email}</TableCell>
                    <TableCell className="text-[#64748b]">
                      {emp.territory || <span className="text-[#94a3b8]">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-[#1E4D3D]/10 px-2.5 py-0.5 text-xs font-medium text-[#1E4D3D]">
                        {emp.commissionPercent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-[#64748b]">{emp._count.customers}</TableCell>
                    <TableCell className="text-center text-[#64748b]">{emp._count.orders}</TableCell>
                    <TableCell>
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />Disabled
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                          className="rounded p-1.5 text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                          className="rounded p-1.5 text-[#64748b] hover:bg-[#F9A825]/10 hover:text-[#F9A825] transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToggleEmployee(emp)}
                          className={`rounded p-1.5 transition-colors ${
                            emp.isActive
                              ? "text-[#64748b] hover:bg-[#D32F2F]/10 hover:text-[#D32F2F]"
                              : "text-[#64748b] hover:bg-green-100 hover:text-green-700"
                          }`}
                          title={emp.isActive ? "Disable" : "Enable"}
                        >
                          <UserX className="h-4 w-4" />
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
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} employees
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

      <AddEmployeeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          success("Employee added successfully");
          fetchEmployees();
        }}
      />

      <ToggleConfirmModal
        open={!!toggleEmployee}
        employee={toggleEmployee}
        loading={toggleLoading}
        onConfirm={handleToggleActive}
        onCancel={() => setToggleEmployee(null)}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E4D3D] text-white shadow-lg active:scale-95 transition-transform sm:hidden"
        aria-label="Add employee"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
