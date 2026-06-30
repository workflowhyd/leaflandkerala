import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PAGES = ["/login", "/forgot-password", "/register"];
const PUBLIC_API = ["/api/auth"];
const ADMIN_ONLY = [
  "/dashboard/employees",
  "/dashboard/reports",
  "/dashboard/settings",
  "/dashboard/maps",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isPublic =
    PUBLIC_PAGES.some((r) => pathname.startsWith(r)) ||
    PUBLIC_API.some((r) => pathname.startsWith(r));

  // Build a response we can mutate (for cookie refresh)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens back to both request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call refreshes the session if the access token has expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublic) return response;

  // Not authenticated → redirect page requests to login, but return JSON for API calls
  if (!user) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.user_metadata?.role as string | undefined;

  // Employee → only /employee/* allowed; redirect dashboard hits
  if (role === "EMPLOYEE") {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/employee/home", request.url));
    }
    return response;
  }

  // Admin-only route check
  const isAdminOnly = ADMIN_ONLY.some((r) => pathname.startsWith(r));
  if (isAdminOnly && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Admin should not access employee routes
  if (pathname.startsWith("/employee")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
