import { NextRequest, NextResponse } from "next/server";
import { uploadRegistrationImage } from "@/lib/supabase/storage";

export async function POST(request: NextRequest) {
  let body: { imageData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { imageData } = body;
  if (!imageData || !imageData.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }

  const allowed = ["data:image/jpeg", "data:image/png", "data:image/webp"];
  if (!allowed.some((t) => imageData.startsWith(t))) {
    return NextResponse.json(
      { error: "Unsupported format. Use JPG, PNG, or WEBP." },
      { status: 400 }
    );
  }

  const approxBytes = imageData.length * 0.75;
  if (approxBytes > 550_000) {
    return NextResponse.json(
      { error: "Image too large. Maximum 500KB." },
      { status: 400 }
    );
  }

  try {
    const { url, path } = await uploadRegistrationImage(imageData);
    return NextResponse.json({ url, publicId: path });
  } catch (err) {
    console.error("[register-upload] Storage error:", err);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 }
    );
  }
}
