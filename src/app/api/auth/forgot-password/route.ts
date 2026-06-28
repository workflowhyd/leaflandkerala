import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    // Always return success to avoid revealing whether the email exists
    return Response.json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
