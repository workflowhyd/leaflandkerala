"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";

interface TopNavProps {
  title: string;
  userName: string;
  userRole: "ADMIN" | "EMPLOYEE";
  notificationCount?: number;
  onLogout: () => void;
  onMenuToggle?: () => void;
}

export function TopNav({
  title,
  userName,
  userRole,
  notificationCount = 0,
  onLogout,
  onMenuToggle,
}: TopNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center gap-4 border-b border-[#e2e8f0] bg-white px-6">
      <button
        onClick={onMenuToggle}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1a1a1a] transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold text-[#1a1a1a] mr-auto">{title}</h1>

      <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8f9fa] px-3 py-2 w-64 focus-within:border-[#3B7A57] focus-within:ring-1 focus-within:ring-[#3B7A57] transition-all">
        <Search className="h-4 w-4 text-[#64748b] flex-shrink-0" />
        <input
          type="search"
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#64748b] outline-none"
        />
      </div>

      <button
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1a1a1a] transition-colors"
        aria-label={`${notificationCount} notifications`}
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D32F2F] text-[9px] font-bold text-white leading-none">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
            dropdownOpen
              ? "bg-[#f1f5f9]"
              : "hover:bg-[#f1f5f9]"
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E4D3D] text-xs font-bold text-[#F8F5EE]">
            {initials}
          </div>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium text-[#1a1a1a]">{userName}</span>
            <span className="text-[10px] text-[#64748b] uppercase tracking-wide">
              {userRole}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#64748b] transition-transform duration-150",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg z-50">
            <div className="border-b border-[#e2e8f0] px-4 py-2">
              <p className="text-sm font-medium text-[#1a1a1a] truncate">
                {userName}
              </p>
              <p className="text-xs text-[#64748b]">{userRole}</p>
            </div>
            <Link
              href="/dashboard/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#1a1a1a] hover:bg-[#f1f5f9] transition-colors"
            >
              <User className="h-4 w-4 text-[#64748b]" />
              Profile
            </Link>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#D32F2F] hover:bg-[#D32F2F]/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
