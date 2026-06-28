import { createSupabaseServerClient } from "@/lib/supabase/server";
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

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify the user profile exists and is active
    const profile = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!profile) {
      await supabase.auth.signOut();
      return Response.json(
        { error: "Account not found. Contact your administrator." },
        { status: 403 }
      );
    }

    if (!profile.isActive) {
      await supabase.auth.signOut();
      return Response.json(
        { error: "Your account has been disabled. Contact your administrator." },
        { status: 403 }
      );
    }

    await prisma.activityLog.create({
      data: {
        userId: profile.id,
        type: "LOGIN",
        description: `User ${profile.name} signed in.`,
        metadata: { email: profile.email, role: profile.role },
      },
    });

    return Response.json({
      success: true,
      user: { name: profile.name, role: profile.role },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
