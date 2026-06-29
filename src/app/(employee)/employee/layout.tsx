"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Home, ShoppingCart, Users, User } from "lucide-react";
import { CartProvider } from "@/components/employee/cart-context";

const NAV = [
  { href: "/employee/home",      icon: Home,         label: "Home" },
  { href: "/employee/orders",    icon: ShoppingCart,  label: "Orders" },
  { href: "/employee/customers", icon: Users,         label: "Customers" },
  { href: "/employee/profile",   icon: User,          label: "Profile" },
];

const LOCATION_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

function usePeriodicLocation() {
  const lastSent = useRef<number>(0);

  useEffect(() => {
    if (!navigator.geolocation) return;

    function sendLocation() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastSent.current < 5 * 60 * 1000) return; // debounce 5 min
          lastSent.current = now;
          fetch("/api/employee/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          }).catch(() => {});
        },
        () => {},
        { timeout: 8000, maximumAge: 5 * 60 * 1000 }
      );
    }

    sendLocation();
    const id = setInterval(sendLocation, LOCATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  usePeriodicLocation();

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <main className="flex-1 overflow-y-auto pb-16">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-4 h-16">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                    active ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </CartProvider>
  );
}
