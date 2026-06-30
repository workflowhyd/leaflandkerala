import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageData } = body;
  if (!imageData || !imageData.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }
  // Only allow jpg, png, webp
  const allowed = ["data:image/jpeg", "data:image/png", "data:image/webp"];
  if (!allowed.some((t) => imageData.startsWith(t))) {
    return NextResponse.json(
      { error: "Unsupported format. Use JPG, PNG, or WEBP." },
      { status: 400 }
    );
  }
  // Check approximate size (base64 * 0.75 = bytes)
  const approxBytes = imageData.length * 0.75;
  if (approxBytes > 550_000) {
    return NextResponse.json(
      { error: "Image too large. Maximum 500KB." },
      { status: 400 }
    );
  }
  const { url, publicId } = await uploadImage(imageData, "registrations");
  return NextResponse.json({ url, publicId });
}
