import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOrderNumber(): string {
  const prefix = "LLK";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${timestamp}${random}`;
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-indigo-100 text-indigo-800",
    PROCESSING: "bg-orange-100 text-orange-800",
    PACKED: "bg-teal-100 text-teal-800",
    OUT_FOR_DELIVERY: "bg-yellow-100 text-yellow-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    LEAD: "bg-blue-100 text-blue-700",
    VISITED: "bg-purple-100 text-purple-700",
    INTERESTED: "bg-green-100 text-green-700",
    FOLLOW_UP: "bg-yellow-100 text-yellow-700",
    ORDER_PLACED: "bg-emerald-100 text-emerald-700",
    ACTIVE: "bg-teal-100 text-teal-700",
  };
  return statusColors[status] || "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEW: "New",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    PACKED: "Packed",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    LEAD: "Lead",
    VISITED: "Visited",
    INTERESTED: "Interested",
    FOLLOW_UP: "Follow Up",
    ORDER_PLACED: "Order Placed",
    ACTIVE: "Active",
    SEEDS: "Seeds",
    FERTILIZERS: "Fertilizers",
    PESTICIDES: "Pesticides",
    ORGANIC_PRODUCTS: "Organic Products",
    FARMING_TOOLS: "Farming Tools",
    IRRIGATION_SUPPLIES: "Irrigation Supplies",
    AGRICULTURAL_EQUIPMENT: "Agricultural Equipment",
  };
  return labels[status] || status;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
