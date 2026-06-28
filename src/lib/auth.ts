import { createSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId?: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { employee: { select: { id: true } } },
  });

  if (!profile || !profile.isActive) return null;

  return {
    userId: profile.id,
    email: user.email ?? profile.email,
    name: profile.name,
    role: profile.role as "ADMIN" | "EMPLOYEE",
    employeeId: profile.employee?.id,
  };
}
