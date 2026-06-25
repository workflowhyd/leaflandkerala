import { validateCredentials, setSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const sessionPayload = await validateCredentials(email, password);

    if (!sessionPayload) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await setSession(sessionPayload);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: sessionPayload.userId,
        type: "LOGIN",
        description: `User ${sessionPayload.name} signed in.`,
        metadata: { email: sessionPayload.email, role: sessionPayload.role },
      },
    });

    return Response.json({
      success: true,
      user: {
        name: sessionPayload.name,
        role: sessionPayload.role,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
