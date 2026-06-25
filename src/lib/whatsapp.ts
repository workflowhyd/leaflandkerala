export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!apiUrl || !phoneNumberId || !accessToken) {
    console.warn("WhatsApp not configured");
    return false;
  }

  try {
    const res = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
