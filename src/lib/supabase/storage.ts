import { createSupabaseAdmin } from "./server";

export async function uploadRegistrationImage(
  base64DataUrl: string
): Promise<{ url: string; path: string }> {
  const [meta, base64] = base64DataUrl.split(",");
  const mimeType = meta.split(":")[1].split(";")[0];
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(base64, "base64");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createSupabaseAdmin();

  const { error } = await supabase.storage
    .from("registrations")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("registrations").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteRegistrationImage(path: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.storage.from("registrations").remove([path]);
}
