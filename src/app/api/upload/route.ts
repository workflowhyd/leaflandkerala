import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { imageData, folder } = body;

  if (!imageData) return NextResponse.json({ error: "Image data required" }, { status: 400 });

  const allowedFolders = ["products", "customers", "employees", "company"];
  if (!allowedFolders.includes(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  const { url, publicId } = await uploadImage(imageData, folder);
  return NextResponse.json({ url, publicId });
}
