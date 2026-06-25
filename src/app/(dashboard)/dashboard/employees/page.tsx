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

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const limit = 20;

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });
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

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleToggleActive = async (emp: Employee) => {
    if (
      !confirm(
        `Are you sure you want to ${emp.isActive ? "disable" : "enable"} ${emp.name}?`
      )
    )
      return;
    setTogglingId(emp.id);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      if (res.ok) {
        fetchEmployees();
      }
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Employees</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Manage your field sales team
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search by name, email, mobile..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-[#e2e8f0] bg-white pl-10 pr-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent hover:border-[#3B7A57] transition-colors"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="h-12 w-12 text-[#64748b]/40 mb-3" />
            <p className="text-[#64748b] font-medium">No employees found</p>
            <p className="text-sm text-[#64748b]/70 mt-1">
              {search ? "Try a different search" : "Add your first employee to get started"}
            </p>
          </div>
        ) : (
          <>
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
                    <TableCell className="text-center text-[#64748b]">
                      {emp._count.customers}
                    </TableCell>
                    <TableCell className="text-center text-[#64748b]">
                      {emp._count.orders}
                    </TableCell>
                    <TableCell>
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          Disabled
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                          onClick={() => handleToggleActive(emp)}
                          disabled={togglingId === emp.id}
                          className={`rounded p-1.5 transition-colors disabled:opacity-50 ${
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

            {/* Pagination */}
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
                  <span className="text-sm text-[#1a1a1a] font-medium">
                    {page} / {totalPages}
                  </span>
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
          </>
        )}
      </Card>

      <AddEmployeeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => fetchEmployees()}
      />
    </div>
  );
}
