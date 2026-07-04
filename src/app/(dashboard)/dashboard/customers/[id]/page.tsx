"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Package,
  Camera,
  Navigation,
  Edit,
  Save,
  X,
  Calendar,
  ShoppingCart,
  Upload,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { formatDate, formatCurrency, getStatusLabel, getStatusColor } from "@/lib/utils";
import { compressImageToTarget, ImageTooLargeError } from "@/lib/compress-image";
import { cloudinaryThumb } from "@/lib/image-thumb";

interface CustomerLocation {
  latitude: number;
  longitude: number;
}

interface CustomerPhoto {
  id: string;
  imageUrl: string;
  isFront: boolean;
  createdAt: string;
}

interface FieldVisit {
  id: string;
  visitDate: string;
  notes: string | null;
  employee: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: { product: { name: string } }[];
}

interface CustomerReturn {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  createdAt: string;
  items: { quantity: number; product: { name: string } }[];
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternateMobile: string | null;
  address: string;
  village: string | null;
  district: string;
  state: string;
  pincode: string;
  landmark: string | null;
  interestedProduct: string | null;
  notes: string | null;
  status: string;
  employee: { name: string; mobile: string } | null;
  location: CustomerLocation | null;
  photos: CustomerPhoto[];
  fieldVisits: FieldVisit[];
  orders: Order[];
  returns: CustomerReturn[];
  _count: { orders: number; returns: number };
}

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "VISITED", label: "Visited" },
  { value: "INTERESTED", label: "Interested" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "ACTIVE", label: "Active" },
];

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
        setNewStatus(data.status);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleStatusSave = async () => {
    if (!customer || newStatus === customer.status) {
      setEditingStatus(false);
      return;
    }
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCustomer();
        setEditingStatus(false);
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoUploadError("");
    setCompressingPhoto(true);
    try {
      const compressed = await compressImageToTarget(file);
      setCompressingPhoto(false);
      setUploadingPhoto(true);
      const isFront = !customer?.photos.some((p) => p.isFront);
      const res = await fetch(`/api/customers/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: compressed, isFront }),
      });
      if (res.ok) {
        await fetchCustomer();
      } else {
        setPhotoUploadError("Photo upload failed. Please try again.");
      }
    } catch (err) {
      setPhotoUploadError(err instanceof ImageTooLargeError ? err.message : "Could not process that photo. Please try another.");
    } finally {
      setCompressingPhoto(false);
      setUploadingPhoto(false);
    }
  };

  const handleCaptureLocation = () => {
    setLocationError("");
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`/api/customers/${id}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });
          if (res.ok) {
            await fetchCustomer();
          }
        } finally {
          setCapturingLocation(false);
        }
      },
      (err) => {
        setLocationError(`Location error: ${err.message}`);
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1E4D3D] border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-[#64748b]">Customer not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/customers")}
          className="flex items-center gap-1.5 rounded-md p-1.5 text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E4D3D]/10 text-lg font-bold text-[#1E4D3D]">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">{customer.name}</h1>
            <p className="text-sm text-[#64748b]">{customer.mobile}</p>
          </div>
        </div>
        <CustomerStatusBadge status={customer.status} className="text-sm px-3 py-1" />
      </div>

      {/* Order/Return summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white border border-[#e2e8f0] p-4">
          <p className="text-2xl font-bold text-[#1a1a1a]">{customer._count.orders}</p>
          <p className="text-xs text-[#64748b] mt-0.5">Total Orders</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8f0] p-4">
          <p className="text-2xl font-bold text-[#1a1a1a]">{customer._count.returns}</p>
          <p className="text-xs text-[#64748b] mt-0.5">Total Returns</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8f0] p-4">
          <p className="text-lg font-bold text-[#1a1a1a]">
            {customer.orders[0] ? formatDate(customer.orders[0].createdAt) : "—"}
          </p>
          <p className="text-xs text-[#64748b] mt-0.5">Last Order Date</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e2e8f0] p-4">
          <p className="text-lg font-bold text-[#1a1a1a]">
            {customer.returns[0] ? formatDate(customer.returns[0].createdAt) : "—"}
          </p>
          <p className="text-xs text-[#64748b] mt-0.5">Last Return Date</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column — 40% */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#3B7A57]" />
                Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile" value={customer.mobile} />
              {customer.alternateMobile && (
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Alternate" value={customer.alternateMobile} />
              )}
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={[customer.address, customer.landmark].filter(Boolean).join(", ")}
              />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={[customer.village, customer.district, customer.state, customer.pincode]
                  .filter(Boolean)
                  .join(", ")}
              />
              {customer.employee && (
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Employee"
                  value={`${customer.employee.name} (${customer.employee.mobile})`}
                />
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Status</span>
                {!editingStatus && (
                  <button
                    onClick={() => setEditingStatus(true)}
                    className="rounded p-1 text-[#64748b] hover:bg-[#1E4D3D]/10 hover:text-[#1E4D3D] transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingStatus ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      options={STATUS_OPTIONS}
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={handleStatusSave} loading={savingStatus}>
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                  <button
                    onClick={() => {
                      setEditingStatus(false);
                      setNewStatus(customer.status);
                    }}
                    className="rounded p-2 text-[#64748b] hover:bg-[#e2e8f0] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <CustomerStatusBadge status={customer.status} className="text-sm px-3 py-1" />
              )}
            </CardContent>
          </Card>

          {/* Interested Product */}
          {customer.interestedProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#3B7A57]" />
                  Interested Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center rounded-full bg-[#1E4D3D]/10 px-3 py-1 text-sm font-medium text-[#1E4D3D]">
                  {getStatusLabel(customer.interestedProduct)}
                </span>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#64748b] leading-relaxed whitespace-pre-line">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — 60% */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[#3B7A57]" />
                  Photos
                </span>
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#1E4D3D] bg-transparent px-3 py-1.5 text-sm font-medium text-[#1E4D3D] transition-colors hover:bg-[#1E4D3D] hover:text-[#F8F5EE] ${
                    (uploadingPhoto || compressingPhoto || customer.photos.length >= 5)
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto || compressingPhoto || customer.photos.length >= 5}
                  />
                  <Upload className="h-3.5 w-3.5" />
                  {compressingPhoto ? "Compressing..." : uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {photoUploadError && (
                <p className="mb-3 text-xs text-[#D32F2F]">{photoUploadError}</p>
              )}
              {customer.photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#e2e8f0] py-10">
                  <Camera className="h-10 w-10 text-[#64748b]/40 mb-2" />
                  <p className="text-sm text-[#64748b]">No photos uploaded yet</p>
                  <p className="text-xs text-[#94a3b8] mt-1">Upload up to 5 photos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {customer.photos.map((photo) => (
                    <PhotoThumb key={photo.id} imageUrl={photo.imageUrl} isFront={photo.isFront} />
                  ))}
                </div>
              )}
              {customer.photos.length >= 5 && (
                <p className="mt-2 text-xs text-[#94a3b8]">Maximum 5 photos reached</p>
              )}
            </CardContent>
          </Card>

          {/* GPS Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-[#3B7A57]" />
                  GPS Location
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCaptureLocation}
                  loading={capturingLocation}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {capturingLocation ? "Capturing..." : "Capture Location"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationError && (
                <p className="mb-3 text-sm text-[#D32F2F]">{locationError}</p>
              )}
              {customer.location ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 rounded-lg bg-[#F8F5EE] p-3">
                    <div>
                      <p className="text-xs text-[#64748b]">Latitude</p>
                      <p className="text-sm font-mono font-medium text-[#1a1a1a]">
                        {customer.location.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-[#e2e8f0]" />
                    <div>
                      <p className="text-xs text-[#64748b]">Longitude</p>
                      <p className="text-sm font-mono font-medium text-[#1a1a1a]">
                        {customer.location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <iframe
                    src={`https://www.google.com/maps?q=${customer.location.latitude},${customer.location.longitude}&z=15&output=embed`}
                    width="100%"
                    height="220"
                    className="rounded-lg border border-[#e2e8f0]"
                    loading="lazy"
                    title="Customer location"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#e2e8f0] py-8">
                  <Navigation className="h-10 w-10 text-[#64748b]/40 mb-2" />
                  <p className="text-sm text-[#64748b]">No location captured yet</p>
                  <p className="text-xs text-[#94a3b8] mt-1">Use the button above to capture GPS location</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#3B7A57]" />
                Visit History
                <span className="ml-auto text-sm font-normal text-[#64748b]">
                  {customer.fieldVisits.length} visit{customer.fieldVisits.length !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              {customer.fieldVisits.length === 0 ? (
                <div className="px-6 pb-6 text-sm text-[#64748b]">No visits recorded yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.fieldVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="text-[#64748b]">{formatDate(visit.visitDate)}</TableCell>
                        <TableCell>{visit.employee.name}</TableCell>
                        <TableCell className="text-[#64748b]">
                          {visit.notes || <span className="text-[#94a3b8]">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#3B7A57]" />
                Orders
                <span className="ml-auto text-sm font-normal text-[#64748b]">
                  {customer.orders.length} order{customer.orders.length !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              {customer.orders.length === 0 ? (
                <div className="px-6 pb-6 text-sm text-[#64748b]">No orders yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs text-[#1E4D3D]">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-[#64748b]">
                          {order.items.map((i) => i.product.name).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                            order.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#64748b]">{formatDate(order.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Returns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Undo2 className="h-4 w-4 text-[#3B7A57]" />
                Returns
                <span className="ml-auto text-sm font-normal text-[#64748b]">
                  {customer.returns.length} return{customer.returns.length !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-0 pb-0">
              {customer.returns.length === 0 ? (
                <div className="px-6 pb-6 text-sm text-[#64748b]">No returns yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Products Returned</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="text-[#64748b]">{formatDate(ret.createdAt)}</TableCell>
                        <TableCell className="text-[#64748b]">
                          {ret.items.map((i) => i.product.name).join(", ") || "—"}
                        </TableCell>
                        <TableCell>{ret.items.reduce((sum, i) => sum + i.quantity, 0)}</TableCell>
                        <TableCell className="text-[#64748b]">{getStatusLabel(ret.reason)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(ret.status)}`}>
                            {getStatusLabel(ret.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PhotoThumb({ imageUrl, isFront }: { imageUrl: string; isFront: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative group">
      {failed ? (
        <div className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg bg-[#f1f5f9] text-[#94a3b8]">
          <Camera className="h-6 w-6" />
          <span className="text-[10px]">Image unavailable</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cloudinaryThumb(imageUrl, 240, 240)}
          alt="Customer photo"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-32 w-full rounded-lg object-cover bg-gray-100 ${isFront ? "ring-2 ring-[#1E4D3D] ring-offset-1" : ""}`}
        />
      )}
      {isFront && !failed && (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-[#1E4D3D] px-2 py-0.5 text-[10px] font-medium text-white">
          Front
        </span>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#64748b]">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#94a3b8] uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#1a1a1a] break-words">{value}</p>
      </div>
    </div>
  );
}
