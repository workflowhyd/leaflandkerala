"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Package, IndianRupee, Clock, Truck, CheckCircle, Circle,
  ShoppingBag,
} from "lucide-react";

interface HomeData {
  name: string;
  weekOrders: number;
  pendingOrders: number;
  totalEarnings: number;
  daysUntilDelivery: number;
  weekDays: { label: string; date: string; done: boolean; isToday: boolean }[];
  weeklySales: number;
  monthlySales: number;
  commissionRate: number;
  commissionAmount: number;
  availableEarnings: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  lastPaymentRef: string | null;
}

interface OfferItem {
  id: string;
  title: string;
  description: string;
  offerType: string;
  bannerImage: string | null;
}

interface NewReward { id: string; offerId: string }

interface OffersData {
  offers: OfferItem[];
  newRewards: NewReward[];
  monthsOfService: number;
  is6MonthEligible: boolean;
}

const OFFER_EMOJI: Record<string, string> = {
  SIX_MONTHS_BONUS: "🏆", BEST_PERFORMER: "🥇", MONTHLY_INCENTIVE: "💰",
  FESTIVAL_BONUS: "🎉", REFERRAL_BONUS: "🤝", CUSTOM: "🎁",
};

function getBadge(months: number): { label: string; className: string } {
  if (months >= 24) return { label: "Gold", className: "text-yellow-600 font-bold" };
  if (months >= 12) return { label: "Silver", className: "text-gray-500 font-bold" };
  return { label: "Bronze", className: "text-amber-700 font-bold" };
}

function OffersBanner({
  offers, newRewards, monthsOfService, onDismiss, onMarkNotified,
}: {
  offers: OfferItem[];
  newRewards: NewReward[];
  monthsOfService: number;
  onDismiss: () => void;
  onMarkNotified: (ids: string[]) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (newRewards.length > 0 || offers.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex((i) => (i + 1) % offers.length), 4000);
    return () => clearInterval(timer);
  }, [newRewards.length, offers.length]);

  useEffect(() => {
    if (newRewards.length > 0 && !notified) {
      setNotified(true);
      onMarkNotified(newRewards.map((r) => r.id));
    }
  }, [newRewards, notified, onMarkNotified]);

  if (newRewards.length > 0) {
    const badge = getBadge(monthsOfService);
    return (
      <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">🏆</span>
            <div>
              <p className="font-bold text-amber-900 text-sm">Congratulations!</p>
              <p className="text-amber-800 text-xs mt-0.5">
                You&apos;ve completed <span className="font-semibold">{monthsOfService} months</span> with the company!
              </p>
              <p className="text-amber-700 text-xs mt-1">🎁 Your Loyalty Bonus is unlocked — contact your admin.</p>
              <p className="mt-1.5 text-xs">Badge: <span className={badge.className}>{badge.label}</span></p>
            </div>
          </div>
          <button onClick={onDismiss} className="flex-shrink-0 text-amber-400 hover:text-amber-600 text-lg leading-none" aria-label="Dismiss">×</button>
        </div>
      </div>
    );
  }

  if (offers.length === 0) return null;
  const offer = offers[currentIndex];

  return (
    <div className="mx-4 mt-4 rounded-xl bg-white border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none flex-shrink-0">{OFFER_EMOJI[offer.offerType] ?? "🎁"}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 text-sm leading-tight">{offer.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {offer.description.length > 60 ? offer.description.slice(0, 60) + "…" : offer.description}
          </p>
        </div>
        <button onClick={onDismiss} className="flex-shrink-0 text-gray-300 hover:text-gray-500 text-lg leading-none" aria-label="Dismiss">×</button>
      </div>
      {offers.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {offers.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? "bg-green-500" : "bg-gray-200"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeeHome() {
  const [data, setData] = useState<HomeData | null>(null);
  const [offersData, setOffersData] = useState<OffersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/employee/home").then((r) => r.json()),
      fetch("/api/employee/offers").then((r) => r.json()).catch(() => null),
    ]).then(([homeData, offers]) => {
      setData(homeData);
      if (offers && !offers.error) setOffersData(offers);
    }).finally(() => setLoading(false));
  }, []);

  const handleMarkNotified = useCallback(async (ids: string[]) => {
    for (const rewardId of ids) {
      await fetch("/api/employee/rewards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      }).catch(() => null);
    }
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showBanner = !bannerDismissed && offersData && (offersData.newRewards.length > 0 || offersData.offers.length > 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-12 pb-6">
        <p className="text-green-100 text-sm">{dateStr}</p>
        <h1 className="text-white text-2xl font-bold mt-1">
          {greeting}, {data?.name?.split(" ")[0] ?? ""}!
        </h1>
        <div className="mt-4 bg-green-700/60 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs font-medium flex items-center gap-1">
              <IndianRupee size={13} /> Available Earnings
            </p>
            <p className="text-white text-3xl font-bold mt-0.5">
              ₹{Math.round(data?.availableEarnings ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-green-300 text-xs mt-0.5">
              {data?.lastPaymentDate
                ? `Last paid: ${new Date(data.lastPaymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                : "No payments yet"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-green-300 text-xs">Total Earned</p>
            <p className="text-white text-lg font-bold">₹{Math.round(data?.totalEarnings ?? 0).toLocaleString("en-IN")}</p>
            <p className="text-green-400 text-xs mt-0.5">{data?.commissionRate ?? 0}% current rate</p>
          </div>
        </div>
      </div>

      {/* Offers Banner */}
      {showBanner && offersData && (
        <OffersBanner
          offers={offersData.offers}
          newRewards={offersData.newRewards}
          monthsOfService={offersData.monthsOfService}
          onDismiss={() => setBannerDismissed(true)}
          onMarkNotified={handleMarkNotified}
        />
      )}

      {/* Commission Summary */}
      {data && (
        <div className="mx-4 mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IndianRupee size={16} className="text-green-600" />
              <p className="text-sm font-semibold text-gray-700">Commission Summary</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {data.commissionRate}% rate
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Current Sales</p>
              <p className="text-lg font-bold text-gray-800">₹{Math.round(data.monthlySales).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Commission Earned</p>
              <p className="text-lg font-bold text-green-700">₹{Math.round(data.commissionAmount).toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Weekly Performance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={18} className="text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Weekly Sales</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              ₹{Math.round(data?.weeklySales ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-gray-400 mt-1">{data?.weekOrders ?? 0} orders</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee size={18} className="text-green-600" />
              <span className="text-xs text-gray-500 font-medium">Monthly Sales</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              ₹{Math.round(data?.monthlySales ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-gray-400 mt-1">{data?.commissionRate ?? 0}% commission rate</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Package size={18} className="text-green-600" />
              <span className="text-xs text-gray-500 font-medium">Orders This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{data?.weekOrders ?? 0}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-orange-500" />
              <span className="text-xs text-gray-500 font-medium">Pending Delivery</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{data?.pendingOrders ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">in {data?.daysUntilDelivery ?? 0} days</p>
          </div>
        </div>

        {/* Week Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Week Progress</h2>
            <div className="flex items-center gap-1 text-xs text-blue-500">
              <Truck size={13} />
              <span>Delivery Sunday</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            {data?.weekDays.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className={`text-xs font-medium ${day.isToday ? "text-green-600" : "text-gray-400"}`}>{day.label}</span>
                {day.done ? (
                  <CheckCircle size={22} className="text-green-500" />
                ) : day.isToday ? (
                  <div className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                ) : (
                  <Circle size={22} className="text-gray-200" />
                )}
              </div>
            ))}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-blue-500">Sun</span>
              <Truck size={22} className="text-blue-400" />
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.round(((data?.weekDays.filter((d) => d.done).length ?? 0) / 6) * 100)}%` }}
            />
          </div>
        </div>

        {/* Quick Action */}
        <a
          href="/employee/orders?new=1"
          className="block bg-green-600 text-white text-center font-semibold py-4 rounded-xl shadow-sm active:bg-green-700 transition-colors"
        >
          + New Order
        </a>
      </div>
    </div>
  );
}
