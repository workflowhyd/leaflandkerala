"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, MapPin, Map, List, Navigation, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { LogVisitModal } from "@/components/visits/log-visit-modal";

interface Employee {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  visitDate: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  employee: { name: string };
  customer: { name: string; mobile: string; address: string };
}

export default function FieldVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [logOpen, setLogOpen] = useState(false);
  const [mapView, setMapView] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (employeeId) params.set("employeeId", employeeId);
    const res = await fetch(`/api/field-visits?${params}`);
    if (res.ok) {
      const data = await res.json();
      let filtered: Visit[] = data.visits;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((v) =>
          v.customer.name.toLowerCase().includes(q) ||
          v.customer.mobile.includes(q)
        );
      }
      if (dateFrom) filtered = filtered.filter((v) => new Date(v.visitDate) >= new Date(dateFrom));
      if (dateTo) filtered = filtered.filter((v) => new Date(v.visitDate) <= new Date(dateTo + "T23:59:59"));
      setVisits(filtered);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, employeeId, search, dateFrom, dateTo]);

  const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/employees?limit=100");
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees || []);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const employeeOptions = [
    { value: "", label: "All Employees" },
    ...employees.map((e) => ({ value: e.id, label: e.name })),
  ];

  const visitsWithGps = visits.filter((v) => v.latitude && v.longitude);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Field Visits</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Track all employee field visits</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMapView((v) => !v)}
            className="hidden sm:flex"
          >
            {mapView ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            {mapView ? "List" : "Map"}
          </Button>
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Log Visit</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 lg:p-4">
        <div className="flex flex-col gap-3">
          {/* Search + employee row */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search by customer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-md border border-[#e2e8f0] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent"
              />
            </div>
            {/* Map toggle on mobile */}
            <button
              onClick={() => setMapView((v) => !v)}
              className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-md border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] sm:hidden"
              title={mapView ? "List view" : "Map view"}
            >
              {mapView ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            </button>
          </div>
          {/* Date + employee row */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[130px]">
              <Select
                options={employeeOptions}
                value={employeeId}
                onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-4 w-4 text-[#64748b]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-[#e2e8f0] bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent w-[130px]"
              />
              <span className="text-[#64748b] text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-[#e2e8f0] bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7A57] focus:border-transparent w-[130px]"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      <Card>
        {mapView ? (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Navigation className="h-4 w-4 text-[#3B7A57]" />
              <span className="text-sm font-medium text-[#1a1a1a]">
                {visitsWithGps.length} visit{visitsWithGps.length !== 1 ? "s" : ""} with GPS coordinates
              </span>
            </div>
            {visitsWithGps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 bg-[#f8f9fa] rounded-lg">
                <MapPin className="h-10 w-10 text-[#e2e8f0]" />
                <p className="text-[#64748b]">No visits with GPS data in current filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visitsWithGps.map((visit) => (
                  <div key={visit.id} className="rounded-lg border border-[#e2e8f0] p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{visit.customer.name}</p>
                        <p className="text-xs text-[#64748b]">{visit.employee.name}</p>
                      </div>
                      <MapPin className="h-4 w-4 text-[#3B7A57] shrink-0" />
                    </div>
                    <p className="text-xs text-[#64748b]">{formatDateTime(visit.visitDate)}</p>
                    <p className="text-xs font-mono text-[#64748b]">
                      {visit.latitude?.toFixed(6)}, {visit.longitude?.toFixed(6)}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#1E4D3D] hover:underline font-medium"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-[#64748b]">Loading...</div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <MapPin className="h-10 w-10 text-[#e2e8f0]" />
            <p className="text-[#64748b]">No field visits found</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-[#e2e8f0] md:hidden">
              {visits.map((visit) => (
                <div key={visit.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1a1a1a] truncate">{visit.customer.name}</p>
                      <p className="text-xs text-[#64748b]">{visit.customer.mobile}</p>
                      <p className="text-xs text-[#94a3b8] mt-1">by {visit.employee.name}</p>
                      <p className="text-xs text-[#94a3b8]">{formatDateTime(visit.visitDate)}</p>
                      {visit.notes && (
                        <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{visit.notes}</p>
                      )}
                    </div>
                    {visit.latitude && visit.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#3B7A57] hover:bg-[#3B7A57]/10 transition-colors"
                        title="View on Google Maps"
                      >
                        <MapPin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Date / Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-[#f8f9fa]">
                      <td className="px-4 py-3 whitespace-nowrap text-[#64748b] text-xs">{formatDateTime(visit.visitDate)}</td>
                      <td className="px-4 py-3 text-[#1a1a1a]">{visit.employee.name}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1a1a1a]">{visit.customer.name}</div>
                        <div className="text-xs text-[#64748b]">{visit.customer.mobile}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="truncate block text-[#64748b] text-xs">{visit.notes || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {visit.latitude && visit.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${visit.latitude}, ${visit.longitude}`}
                          >
                            <MapPin className="h-4 w-4 text-[#3B7A57] hover:text-[#1E4D3D]" />
                          </a>
                        ) : (
                          <span className="text-[#e2e8f0]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!mapView && total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
            <p className="text-sm text-[#64748b]">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Mobile FAB */}
      <button
        onClick={() => setLogOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E4D3D] text-white shadow-lg active:scale-95 transition-transform sm:hidden"
        aria-label="Log visit"
      >
        <Plus className="h-6 w-6" />
      </button>

      <LogVisitModal open={logOpen} onClose={() => setLogOpen(false)} onSuccess={fetchVisits} />
    </div>
  );
}
