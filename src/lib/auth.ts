import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string;
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const supabase = await createSupabaseServerClient();
  // getSession() reads the JWT from the cookie locally — no network call.
  // The middleware already validated the token with getUser() before this runs.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { select: { id: true } } },
  });

  if (!profile || !profile.isActive) return null;

  return {
    userId: profile.id,
    email: session.user.email ?? profile.email,
    name: profile.name,
    role: profile.role as "ADMIN" | "EMPLOYEE",
    employeeId: profile.employee?.id,
  };
});
