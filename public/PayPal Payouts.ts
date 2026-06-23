import { createServerFn } from "@tanstack/react-start";

interface PayoutInput {
  hotelEmail: string;
  bookingId: string;
  totalAmount: number;
  commissionPercent: number;
  currency?: string;
  note?: string;
}

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const base = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return { token: json.access_token, base };
}

export const sendHotelPayout = createServerFn({ method: "POST" })
  .inputValidator((d: PayoutInput) => d)
  .handler(async ({ data }) => {
    const currency = data.currency || "USD";
    const hotelShare =
      Math.round(data.totalAmount * (1 - data.commissionPercent / 100) * 100) / 100;

    const { token, base } = await getAccessToken();

    const res = await fetch(`${base}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `booking_${data.bookingId}_${Date.now()}`,
          email_subject: "تم تحويل مستحقاتك من Sunget",
          email_message: data.note || `دفعة حجز رقم ${data.bookingId}`,
        },
        items: [{
          recipient_type: "EMAIL",
          amount: { value: hotelShare.toFixed(2), currency },
          receiver: data.hotelEmail,
          note: `Booking ${data.bookingId}`,
          sender_item_id: data.bookingId,
        }],
      }),
    });

    const text = await res.text();
    if (!res.ok) return { ok: false as const, error: text, hotelShare, batchId: "" };
    const json = JSON.parse(text) as { batch_header?: { payout_batch_id?: string } };
    return {
      ok: true as const,
      hotelShare,
      batchId: json.batch_header?.payout_batch_id ?? "",
      error: "",
    };
  });
