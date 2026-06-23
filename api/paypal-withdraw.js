// netlify/functions/paypal-withdraw.js
const PAYPAL_BASE = "https://api-m.paypal.com"; // Live
// للاختبار: "https://api-m.sandbox.paypal.com"
const COMMISSION_PERCENT = 15; // نسبة الموقع

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { amount, paypal_email, booking_id } = JSON.parse(event.body || "{}");

    if (!amount || !paypal_email) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: "amount و paypal_email مطلوبين" }),
      };
    }

    // حساب نصيب الفندق بعد خصم العمولة
    const hotelShare =
      Math.round(Number(amount) * (1 - COMMISSION_PERCENT / 100) * 100) / 100;

    // 1) Access Token
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("PayPal auth error:", tokenData);
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: "PayPal auth failed", details: tokenData }),
      };
    }

    // 2) إنشاء عملية السحب
    const batchId = `booking_${booking_id || Date.now()}_${Date.now()}`;
    const payoutRes = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: batchId,
          email_subject: "تم تحويل مستحقاتك من Sunget",
          email_message: `دفعة الحجز رقم ${booking_id || ""}`,
        },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: paypal_email,
            amount: { value: hotelShare.toFixed(2), currency: "USD" },
            note: "Withdrawal from Sunget hotel platform",
            sender_item_id: String(booking_id || Date.now()),
          },
        ],
      }),
    });

    const result = await payoutRes.json();
    if (!payoutRes.ok) {
      console.error("PayPal payout error:", result);
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: "Payout failed", details: result }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        hotelShare,
        currency: "USD",
        batchId: result.batch_header?.payout_batch_id,
        status: result.batch_header?.batch_status,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
