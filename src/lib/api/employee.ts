export interface HomeData {
  name: string;
  weekOrders: number;
  pendingOrders: number;
  totalEarnings: number;
  daysUntilDelivery: number;
  weekDays: { label: string; date: string; done: boolean; isToday: boolean }[];
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  nextSlabRate: number | null;
  nextSlabAmountRemaining: number | null;
  availableEarnings: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  lastPaymentRef: string | null;
}

export interface CashoutEligibility {
  weekStart: string;
  weekEnd: string;
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  eligible: boolean;
  reasons: string[];
  alreadyRequested: boolean;
  existingCashoutStatus: string | null;
}

export interface CashoutHistoryEntry {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  weeklySales: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
}

export interface CashoutData {
  eligibility: CashoutEligibility;
  history: CashoutHistoryEntry[];
}

export interface OfferItem {
  id: string;
  title: string;
  description: string;
  offerType: string;
  bannerImage: string | null;
}

export interface NewReward {
  id: string;
  offerId: string;
}

export interface OffersData {
  offers: OfferItem[];
  newRewards: NewReward[];
  monthsOfService: number;
  is6MonthEligible: boolean;
}

export interface FreeGiftSettings {
  enabled: boolean;
  tier1MinAmount: number;
  tier1Choices: number;
  tier2MinAmount: number;
  tier2Choices: number;
}

export async function fetchHome(): Promise<HomeData> {
  const res = await fetch("/api/employee/home");
  if (!res.ok) throw new Error("Failed to load dashboard data");
  return res.json();
}

export async function fetchOffers(): Promise<OffersData> {
  const res = await fetch("/api/employee/offers");
  if (!res.ok) throw new Error("Failed to load offers");
  return res.json();
}

export async function fetchCashout(): Promise<CashoutData> {
  const res = await fetch("/api/employee/cashout");
  if (!res.ok) throw new Error("Failed to load cash-out data");
  return res.json();
}

export async function requestCashout(): Promise<unknown> {
  const res = await fetch("/api/employee/cashout", { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to submit cash-out request.");
  return body;
}

export async function markRewardNotified(rewardId: string): Promise<void> {
  await fetch("/api/employee/rewards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rewardId }),
  }).catch(() => null);
}

export async function fetchFreeGift(): Promise<FreeGiftSettings | null> {
  const res = await fetch("/api/employee/free-gift");
  if (!res.ok) return null;
  return res.json();
}
