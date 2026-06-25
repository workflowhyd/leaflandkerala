"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, XCircle, MapPin, Phone, User, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import { UpdateStatusModal } from "@/components/orders/update-status-modal";

interface TrackingEntry {
  id: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: { name: string; sku: string };
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  notes?: string;
  deliveryDate?: string;
  createdAt: string;
  customer: {
    name: string;
    mobile: string;
    alternateMobile?: string;
    address: string;
    village?: string;
    district: string;
    pincode: string;
  };
  employee: { name: string; mobile: string };
  items: OrderItem[];
  tracking: TrackingEntry[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateOpen, setUpdateOpen] = useState(false);

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) setOrder(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleCancel = async () => {
    if (!confirm("Cancel this order?")) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    fetchOrder();
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFillColor(30, 77, 61);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(248, 245, 238);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("LeafLand Kerala", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Agricultural Products & Services", 14, 26);
    doc.text("INVOICE", 170, 18);
    doc.setFontSize(9);
    doc.text(`Invoice #: ${order.orderNumber}`, 155, 26);
    doc.text(`Date: ${formatDate(order.createdAt)}`, 155, 32);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(order.customer.name, 14, 63);
    doc.text(order.customer.mobile, 14, 70);
    doc.text(order.customer.address, 14, 77);
    doc.text(`${order.customer.district}, ${order.customer.pincode}`, 14, 84);

    doc.setFont("helvetica", "bold");
    doc.text("Employee:", 130, 55);
    doc.setFont("helvetica", "normal");
    doc.text(order.employee.name, 130, 63);
    if (order.deliveryDate) {
      doc.setFont("helvetica", "bold");
      doc.text("Delivery Date:", 130, 70);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(order.deliveryDate), 130, 77);
    }

    doc.setFillColor(30, 77, 61);
    doc.rect(14, 95, 182, 8, "F");
    doc.setTextColor(248, 245, 238);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Product", 16, 100.5);
    doc.text("Qty", 120, 100.5);
    doc.text("Unit Price", 140, 100.5);
    doc.text("Subtotal", 172, 100.5);

    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "normal");
    let y = 110;
    order.items.forEach((item, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 245, 238);
        doc.rect(14, y - 5, 182, 8, "F");
      }
      doc.text(item.product.name, 16, y);
      doc.text(String(item.quantity), 122, y);
      doc.text(formatCurrency(item.price), 138, y);
      doc.text(formatCurrency(item.subtotal), 170, y);
      y += 9;
    });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total Amount:", 138, y);
    doc.text(formatCurrency(order.totalAmount), 170, y);

    y += 20;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for choosing LeafLand Kerala.", 14, y);
    doc.text("For support: leaflandkerala@email.com", 14, y + 6);

    doc.setFillColor(30, 77, 61);
    doc.rect(0, 282, 210, 15, "F");
    doc.setTextColor(248, 245, 238);
    doc.setFontSize(8);
    doc.text("LeafLand Kerala - Growing Together", 85, 290);

    doc.save(`invoice-${order.orderNumber}.pdf`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#64748b]">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-[#64748b]">Order not found.</p>
        <Link href="/dashboard/orders"><Button variant="outline">Back to Orders</Button></Link>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1a1a1a]">{order.orderNumber}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
            <span className="text-sm text-[#64748b]">{formatDateTime(order.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4" />
            Download Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpdateOpen(true)}
            disabled={order.status === "CANCELLED" || order.status === "DELIVERED"}
          >
            <RefreshCw className="h-4 w-4" />
            Update Status
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleCancel}
            disabled={order.status === "CANCELLED" || order.status === "DELIVERED"}
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#3B7A57]" /> Customer & Order Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Customer</p>
                  <p className="font-semibold text-[#1a1a1a]">{order.customer.name}</p>
                  <div className="flex items-center gap-1 text-sm text-[#64748b]">
                    <Phone className="h-3 w-3" /> {order.customer.mobile}
                  </div>
                  {order.customer.alternateMobile && (
                    <div className="flex items-center gap-1 text-sm text-[#64748b]">
                      <Phone className="h-3 w-3" /> {order.customer.alternateMobile}
                    </div>
                  )}
                  <div className="flex items-start gap-1 text-sm text-[#64748b]">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{order.customer.address}, {order.customer.village && `${order.customer.village}, `}{order.customer.district} - {order.customer.pincode}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Employee</p>
                    <p className="font-medium text-[#1a1a1a] mt-1">{order.employee.name}</p>
                    <p className="text-sm text-[#64748b]">{order.employee.mobile}</p>
                  </div>
                  {order.deliveryDate && (
                    <div>
                      <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Delivery Date</p>
                      <div className="flex items-center gap-1 mt-1 text-sm font-medium text-[#1a1a1a]">
                        <Calendar className="h-3 w-3 text-[#3B7A57]" />
                        {formatDate(order.deliveryDate)}
                      </div>
                    </div>
                  )}
                  {order.notes && (
                    <div>
                      <p className="text-xs font-medium text-[#64748b] uppercase tracking-wide">Notes</p>
                      <p className="text-sm text-[#1a1a1a] mt-1">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-[#3B7A57]" /> Order Items</CardTitle>
            </CardHeader>
            <CardContent className="!px-0 !pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell className="text-[#64748b]">{item.product.sku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-[#e2e8f0] px-6 py-4">
                <div className="flex justify-end">
                  <div className="w-64 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748b]">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t border-[#e2e8f0] pt-2">
                      <span>Total</span>
                      <span className="text-[#1E4D3D]">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {order.tracking.length === 0 ? (
                  <p className="text-sm text-[#64748b]">No tracking history.</p>
                ) : (
                  <ol className="relative border-l border-[#e2e8f0] ml-2">
                    {[...order.tracking].reverse().map((entry) => (
                      <li key={entry.id} className="mb-6 ml-6">
                        <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ${entry.status === "DELIVERED" ? "bg-[#2E7D32]" : entry.status === "CANCELLED" ? "bg-[#D32F2F]" : "bg-[#1E4D3D]"}`}>
                          <span className="h-2 w-2 rounded-full bg-white" />
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {getStatusLabel(entry.status)}
                          </span>
                          <time className="text-xs text-[#64748b]">{formatDateTime(entry.createdAt)}</time>
                          {entry.notes && <p className="text-sm text-[#1a1a1a]">{entry.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <UpdateStatusModal
        open={updateOpen}
        order={order}
        onClose={() => setUpdateOpen(false)}
        onSuccess={() => { setUpdateOpen(false); fetchOrder(); }}
      />
    </div>
  );
}
