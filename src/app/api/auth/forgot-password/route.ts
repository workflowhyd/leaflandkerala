import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    // Always return the same response to avoid revealing whether the email exists
    const successResponse = Response.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return successResponse;
    }

    // Generate a secure random token
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExp: expiry,
      },
    });

    // In a real application, an email would be sent here with the reset link:
    // await sendPasswordResetEmail(user.email, rawToken)
    console.info(`[forgot-password] Reset token generated for user ${user.id}`);

    return successResponse;
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
