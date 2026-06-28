"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Navigation, ExternalLink, MapPin, Map } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ViewMode = "customers" | "visits";

interface CustomerLocation {
  id: string;
  name: string;
  mobile: string;
  address: string;
  district: string;
  pincode: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

interface VisitLocation {
  id: string;
  visitDate: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  customer: { name: string; mobile: string };
  employee: { name: string };
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function embedUrl(lat: number, lng: number) {
  if (GOOGLE_MAPS_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${lat},${lng}&zoom=14`;
  }
  return null;
}

export default function MapsPage() {
  const [view, setView] = useState<ViewMode>("customers");
  const [customers, setCustomers] = useState<CustomerLocation[]>([]);
  const [visits, setVisits] = useState<VisitLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch("/api/customers?limit=500");
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
    }
  }, []);

  const fetchVisits = useCallback(async () => {
    const res = await fetch("/api/field-visits?limit=500");
    if (res.ok) {
      const data = await res.json();
      setVisits(data.visits);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCustomers(), fetchVisits()]).finally(() => setLoading(false));
  }, [fetchCustomers, fetchVisits]);

  const customersWithGps = customers.filter((c) => c.location?.latitude && c.location?.longitude);
  const visitsWithGps = visits.filter((v) => v.latitude && v.longitude);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a] lg:text-2xl">Map Dashboard</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Customer and field visit locations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <Card className="p-3 lg:p-4 flex items-center gap-3 lg:gap-4">
          <div className="flex h-10 w-10 lg:h-12 lg:w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#1E4D3D]/10">
            <Users className="h-5 w-5 lg:h-6 lg:w-6 text-[#1E4D3D]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#64748b] leading-tight">Customers with GPS</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#1a1a1a]">{customersWithGps.length}</p>
            <p className="text-xs text-[#64748b]">of {customers.length} total</p>
          </div>
        </Card>
        <Card className="p-3 lg:p-4 flex items-center gap-3 lg:gap-4">
          <div className="flex h-10 w-10 lg:h-12 lg:w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#3B7A57]/10">
            <Navigation className="h-5 w-5 lg:h-6 lg:w-6 text-[#3B7A57]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#64748b] leading-tight">Visits with GPS</p>
            <p className="text-2xl lg:text-3xl font-bold text-[#1a1a1a]">{visitsWithGps.length}</p>
            <p className="text-xs text-[#64748b]">of {visits.length} total</p>
          </div>
        </Card>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={view === "customers" ? "default" : "outline"}
          size="sm"
          onClick={() => { setView("customers"); setSelectedLocation(null); }}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Customer Locations</span>
          <span className="sm:hidden">Customers</span>
        </Button>
        <Button
          variant={view === "visits" ? "default" : "outline"}
          size="sm"
          onClick={() => { setView("visits"); setSelectedLocation(null); }}
        >
          <Navigation className="h-4 w-4" />
          <span className="hidden sm:inline">Field Visit Locations</span>
          <span className="sm:hidden">Visits</span>
        </Button>
      </div>

      {/* Map preview */}
      {selectedLocation && (
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-[#3B7A57] flex-shrink-0" />
              <span className="font-medium text-sm truncate">{selectedLocation.label}</span>
              <span className="hidden sm:inline text-xs text-[#64748b] font-mono flex-shrink-0">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={mapsUrl(selectedLocation.lat, selectedLocation.lng)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3" /> Maps</Button>
              </a>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(null)}>Close</Button>
            </div>
          </div>
          {embedUrl(selectedLocation.lat, selectedLocation.lng) ? (
            <iframe
              title="map"
              width="100%"
              height="280"
              loading="lazy"
              src={embedUrl(selectedLocation.lat, selectedLocation.lng)!}
              className="border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3 bg-[#f8f9fa]">
              <Map className="h-10 w-10 text-[#e2e8f0]" />
              <p className="text-sm text-[#64748b]">Google Maps API key not configured.</p>
              <a
                href={mapsUrl(selectedLocation.lat, selectedLocation.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#1E4D3D] hover:underline font-medium"
              >
                View on Google Maps →
              </a>
            </div>
          )}
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#64748b]">Loading locations...</div>
      ) : view === "customers" ? (
        <Card>
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <span className="font-medium text-[#1a1a1a]">Customer Locations</span>
            <span className="text-sm text-[#64748b]">{customersWithGps.length} with GPS</span>
          </div>
          {customersWithGps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <MapPin className="h-10 w-10 text-[#e2e8f0]" />
              <p className="text-[#64748b]">No customer GPS data available</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="flex flex-col divide-y divide-[#e2e8f0] md:hidden">
                {customersWithGps.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[#1a1a1a] truncate">{c.name}</p>
                        <p className="text-xs text-[#64748b]">{c.mobile}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5 font-mono">
                          {c.location!.latitude.toFixed(5)}, {c.location!.longitude.toFixed(5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setSelectedLocation({ lat: c.location!.latitude, lng: c.location!.longitude, label: c.name })}
                          className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                        >
                          Preview
                        </button>
                        <a
                          href={mapsUrl(c.location!.latitude, c.location!.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                        >
                          Maps
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">District</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Coordinates</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {customersWithGps.map((c) => (
                      <tr key={c.id} className="hover:bg-[#f8f9fa]">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#1a1a1a]">{c.name}</div>
                          <div className="text-xs text-[#64748b]">{c.mobile}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <span className="truncate block text-[#64748b] text-xs">{c.address}</span>
                        </td>
                        <td className="px-4 py-3 text-[#64748b]">{c.district}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-[#64748b]">
                            {c.location!.latitude.toFixed(5)}, {c.location!.longitude.toFixed(5)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLocation({ lat: c.location!.latitude, lng: c.location!.longitude, label: c.name })}
                            >
                              <MapPin className="h-4 w-4" /> Preview
                            </Button>
                            <a
                              href={mapsUrl(c.location!.latitude, c.location!.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-3 w-3" /> Maps
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <span className="font-medium text-[#1a1a1a]">Field Visit Locations</span>
            <span className="text-sm text-[#64748b]">{visitsWithGps.length} with GPS</span>
          </div>
          {visitsWithGps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Navigation className="h-10 w-10 text-[#e2e8f0]" />
              <p className="text-[#64748b]">No field visit GPS data available</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="flex flex-col divide-y divide-[#e2e8f0] md:hidden">
                {visitsWithGps.map((v) => (
                  <div key={v.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[#1a1a1a] truncate">{v.customer.name}</p>
                        <p className="text-xs text-[#64748b]">by {v.employee.name}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          {new Date(v.visitDate).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-xs font-mono text-[#94a3b8]">
                          {v.latitude!.toFixed(5)}, {v.longitude!.toFixed(5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setSelectedLocation({ lat: v.latitude!, lng: v.longitude!, label: `${v.customer.name} — ${v.employee.name}` })}
                          className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                        >
                          Preview
                        </button>
                        <a
                          href={mapsUrl(v.latitude!, v.longitude!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                        >
                          Maps
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Visit Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Coordinates</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {visitsWithGps.map((v) => (
                      <tr key={v.id} className="hover:bg-[#f8f9fa]">
                        <td className="px-4 py-3 text-[#1a1a1a]">{v.employee.name}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#1a1a1a]">{v.customer.name}</div>
                          <div className="text-xs text-[#64748b]">{v.customer.mobile}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[#64748b] text-xs">
                          {new Date(v.visitDate).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-[#64748b]">
                            {v.latitude!.toFixed(5)}, {v.longitude!.toFixed(5)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLocation({ lat: v.latitude!, lng: v.longitude!, label: `${v.customer.name} — ${v.employee.name}` })}
                            >
                              <MapPin className="h-4 w-4" /> Preview
                            </Button>
                            <a
                              href={mapsUrl(v.latitude!, v.longitude!)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-3 w-3" /> Maps
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
