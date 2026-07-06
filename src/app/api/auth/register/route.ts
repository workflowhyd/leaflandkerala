import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    fullName,
    mobileNumber,
    address,
    governmentIdType,
    governmentIdNumber,
    governmentIdFrontUrl,
    governmentIdFrontPublicId,
    governmentIdBackUrl,
    governmentIdBackPublicId,
  } = body;

  if (
    !fullName ||
    !mobileNumber ||
    !address ||
    !governmentIdType ||
    !governmentIdNumber ||
    !governmentIdFrontUrl ||
    !governmentIdBackUrl
  ) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  // Prevent duplicate pending/approved registrations by mobile
  const existing = await prisma.employeeRegistrationRequest.findFirst({
    where: { mobileNumber, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) {
    if (existing.status === "APPROVED") {
      return NextResponse.json(
        { error: "An account with this mobile number already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error:
          "A registration request for this mobile number is already pending.",
      },
      { status: 409 }
    );
  }

  const registrationRequest = await prisma.employeeRegistrationRequest.create({
    data: {
      fullName,
      mobileNumber,
      address,
      governmentIdType,
      governmentIdNumber,
      governmentIdFrontUrl,
      governmentIdFrontPublicId: governmentIdFrontPublicId || null,
      governmentIdBackUrl,
      governmentIdBackPublicId: governmentIdBackPublicId || null,
    },
  });

  return NextResponse.json({ id: registrationRequest.id }, { status: 201 });
}
