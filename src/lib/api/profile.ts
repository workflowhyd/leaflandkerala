export interface Profile {
  name: string;
  email: string;
  role: string;
  employee?: {
    id?: string;
    territory?: string | null;
    commissionPercent: number;
    mobile?: string | null;
    address?: string | null;
    isActive?: boolean;
    createdAt?: string;
  };
}

export interface WeekEarning {
  label: string;
  weekStart: string;
  weekEnd: string;
  ordersDelivered: number;
  salesAmount: number;
  productsDelivered: number;
  earnings: number;
}

export interface EarningsData {
  commissionPercent: number;
  weeks: WeekEarning[];
}

export async function fetchProfile(): Promise<Profile> {
  const res = await fetch("/api/employee/profile");
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export async function fetchEarnings(): Promise<EarningsData> {
  const res = await fetch("/api/employee/earnings");
  if (!res.ok) throw new Error("Failed to load earnings");
  return res.json();
}
