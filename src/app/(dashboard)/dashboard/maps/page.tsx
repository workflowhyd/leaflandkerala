"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Navigation, ExternalLink, MapPin, Map } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Map Dashboard</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Customer and field visit locations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E4D3D]/10">
            <Users className="h-6 w-6 text-[#1E4D3D]" />
          </div>
          <div>
            <p className="text-sm text-[#64748b]">Customers with GPS</p>
            <p className="text-3xl font-bold text-[#1a1a1a]">{customersWithGps.length}</p>
            <p className="text-xs text-[#64748b]">of {customers.length} total customers</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B7A57]/10">
            <Navigation className="h-6 w-6 text-[#3B7A57]" />
          </div>
          <div>
            <p className="text-sm text-[#64748b]">Visits with GPS</p>
            <p className="text-3xl font-bold text-[#1a1a1a]">{visitsWithGps.length}</p>
            <p className="text-xs text-[#64748b]">of {visits.length} total visits</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={view === "customers" ? "default" : "outline"}
          onClick={() => { setView("customers"); setSelectedLocation(null); }}
        >
          <Users className="h-4 w-4" /> Customer Locations
        </Button>
        <Button
          variant={view === "visits" ? "default" : "outline"}
          onClick={() => { setView("visits"); setSelectedLocation(null); }}
        >
          <Navigation className="h-4 w-4" /> Field Visit Locations
        </Button>
      </div>

      {selectedLocation && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#3B7A57]" />
              <span className="font-medium text-sm">{selectedLocation.label}</span>
              <span className="text-xs text-[#64748b] font-mono">{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={mapsUrl(selectedLocation.lat, selectedLocation.lng)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3" /> Open in Maps</Button>
              </a>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(null)}>Close</Button>
            </div>
          </div>
          {embedUrl(selectedLocation.lat, selectedLocation.lng) ? (
            <iframe
              title="map"
              width="100%"
              height="300"
              loading="lazy"
              src={embedUrl(selectedLocation.lat, selectedLocation.lng)!}
              className="border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3 bg-[#f8f9fa]">
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
            <span className="text-sm text-[#64748b]">{customersWithGps.length} with coordinates</span>
          </div>
          {customersWithGps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <MapPin className="h-10 w-10 text-[#e2e8f0]" />
              <p className="text-[#64748b]">No customer GPS data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersWithGps.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-[#64748b]">{c.mobile}</div>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <span className="truncate block text-[#64748b]">{c.address}</span>
                    </TableCell>
                    <TableCell>{c.district}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-[#64748b]">
                        {c.location!.latitude.toFixed(5)}, {c.location!.longitude.toFixed(5)}
                      </span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <span className="font-medium text-[#1a1a1a]">Field Visit Locations</span>
            <span className="text-sm text-[#64748b]">{visitsWithGps.length} with coordinates</span>
          </div>
          {visitsWithGps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Navigation className="h-10 w-10 text-[#e2e8f0]" />
              <p className="text-[#64748b]">No field visit GPS data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitsWithGps.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.employee.name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{v.customer.name}</div>
                      <div className="text-xs text-[#64748b]">{v.customer.mobile}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[#64748b] text-xs">
                      {new Date(v.visitDate).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-[#64748b]">
                        {v.latitude!.toFixed(5)}, {v.longitude!.toFixed(5)}
                      </span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
