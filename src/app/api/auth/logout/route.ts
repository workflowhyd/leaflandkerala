import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      await prisma.activityLog.create({
        data: {
          userId: session.userId,
          type: "LOGOUT",
          description: `User ${session.name} signed out.`,
          metadata: { email: session.email },
        },
      });
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    return Response.json({ success: true });
  } catch (err) {
    console.error("[auth/logout]", err);
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut().catch(() => null);
    return Response.json({ success: true });
  }
}
