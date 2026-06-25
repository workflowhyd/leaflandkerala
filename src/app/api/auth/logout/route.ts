import { clearSession, getSession } from "@/lib/auth";
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

    await clearSession();

    return Response.json({ success: true });
  } catch (err) {
    console.error("[auth/logout]", err);
    // Still clear the session even if logging fails
    await clearSession().catch(() => null);
    return Response.json({ success: true });
  }
}
