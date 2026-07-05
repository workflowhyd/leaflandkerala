export interface MeResponse {
  // Full shape from GET /api/auth/me. The login response only provides
  // {name, role} — enough for (employee)/layout.tsx's redirect check, which
  // is the only current consumer of a cache-primed (rather than freshly
  // fetched) value, so the rest are optional.
  user: {
    userId?: string;
    email?: string;
    name: string;
    role: "ADMIN" | "EMPLOYEE";
    employeeId?: string;
  } | null;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/auth/me");
  return res.json();
}
