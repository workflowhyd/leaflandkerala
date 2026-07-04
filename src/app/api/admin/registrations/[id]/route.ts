import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const registrationRequest = await prisma.employeeRegistrationRequest.findUnique({
    where: { id },
  });

  if (!registrationRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ request: registrationRequest });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  const registrationRequest = await prisma.employeeRegistrationRequest.findUnique({
    where: { id },
  });

  if (!registrationRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (registrationRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "This request has already been processed." },
      { status: 409 }
    );
  }

  if (action === "reject") {
    const { adminNotes } = body;
    await prisma.employeeRegistrationRequest.update({
      where: { id },
      data: { status: "REJECTED", adminNotes: adminNotes || null, updatedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "approve") {
    const { email, password, territory } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required for approval." },
        { status: 400 }
      );
    }

    // Check email not already used
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Create Supabase auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: registrationRequest.fullName,
          role: "EMPLOYEE",
        },
      });

    if (authError || !authData.user) {
      console.error("[registrations/approve] Supabase auth error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Failed to create auth account" },
        { status: 500 }
      );
    }

    const supabaseUserId = authData.user.id;

    // Create User profile + Employee record
    const user = await prisma.user.create({
      data: {
        id: supabaseUserId,
        name: registrationRequest.fullName,
        email,
        role: "EMPLOYEE",
        employee: {
          create: {
            name: registrationRequest.fullName,
            email,
            mobile: registrationRequest.mobileNumber,
            territory: territory || null,
            documents: {
              create: {
                documentType: registrationRequest.governmentIdType,
                imageUrl: registrationRequest.governmentIdImageUrl,
                publicId: registrationRequest.governmentIdPublicId || undefined,
              },
            },
          },
        },
      },
      include: { employee: true },
    });

    // Update registration status
    await prisma.employeeRegistrationRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.userId,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        type: "EMPLOYEE_CREATE",
        description: `Approved registration and created employee: ${user.name}`,
      },
    });

    // Non-blocking WhatsApp notification
    try {
      const waSettings = await prisma.whatsAppSetting.findFirst({
        select: { isEnabled: true },
      });
      if (waSettings?.isEnabled) {
        const { sendWhatsAppMessage } = await import("@/lib/whatsapp");
        const mobile = registrationRequest.mobileNumber.replace(/\D/g, "");
        await sendWhatsAppMessage(
          `91${mobile}`,
          `Congratulations ${registrationRequest.fullName}! Your employee account has been approved. You can now log in to the Employee App using your email (${email}) and the temporary password provided by the administrator. Welcome to the team!`
        ).catch(() => {});
      }
    } catch {
      // Non-blocking — ignore errors
    }

    return NextResponse.json({
      success: true,
      employee: { email, name: user.name },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
