import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/cloudinary";

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return { ok: true, value: await fn() };
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return { ok: false, error: lastError };
}

/**
 * Customer privacy cleanup — runs only when an order is marked DELIVERED.
 * Deletes the house photo(s) captured for that specific order (storage + DB)
 * and clears the customer's GPS location. Leaves customer/order/return/gift
 * history untouched. Safe to call more than once (idempotent).
 */
export async function performDeliveryCleanup(orderId: string, userId: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, customerId: true, status: true },
  });

  // Safety check: only ever run for orders that are actually DELIVERED.
  if (!order || order.status !== "DELIVERED") return;

  const photos = await prisma.customerPhoto.findMany({
    where: { orderId },
    select: { id: true, publicId: true },
  });

  let photosDeleted = 0;
  const errors: string[] = [];

  for (const photo of photos) {
    const storageResult = photo.publicId
      ? await withRetry(() => deleteImage(photo.publicId!))
      : ({ ok: true, value: undefined } as const);

    if (!storageResult.ok) {
      errors.push(`Failed to delete storage image for photo ${photo.id}`);
      console.error(`[delivery-cleanup] storage deletion failed for photo ${photo.id}:`, storageResult.error);
      continue; // don't remove the DB row until storage cleanup also succeeds
    }

    await prisma.customerPhoto.delete({ where: { id: photo.id } });
    photosDeleted++;
  }

  const gpsResult = await withRetry(() =>
    prisma.customerLocation.deleteMany({ where: { customerId: order.customerId } })
  );
  const gpsRemoved = gpsResult.ok && gpsResult.value.count > 0;
  if (!gpsResult.ok) {
    errors.push("Failed to remove GPS location");
    console.error("[delivery-cleanup] GPS deletion failed:", gpsResult.error);
  }

  const cleanupComplete = errors.length === 0;

  await prisma.activityLog.create({
    data: {
      userId: userId ?? undefined,
      customerId: order.customerId,
      type: "DELIVERY_CLEANUP",
      description: cleanupComplete
        ? `Order ${order.orderNumber} delivered — house photo deleted and GPS location removed`
        : `Order ${order.orderNumber} delivered — cleanup incomplete, admin attention needed`,
      metadata: {
        orderId: order.id,
        photosDeleted,
        gpsRemoved,
        complete: cleanupComplete,
        errors: errors.length ? errors : undefined,
      },
    },
  }).catch((e) => console.error("[delivery-cleanup] activityLog create failed:", e));
}
