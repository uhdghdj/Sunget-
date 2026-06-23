// api/payout.js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { hotelEmail, bookingId, totalAmount, commissionPercent = 15, currency = 'USD' } = req.body;

    if (!hotelEmail || !bookingId || !totalAmount) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    const hotelShare = Math.round(totalAmount * (1 - commissionPercent / 100) * 100) / 100;

    const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;

    // 1) Access Token
    const auth = Buffer.from(`${id}:${secret}`).toString('base64');
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) return res.status(500).json({ error: 'PayPal auth failed', details: tokenJson });

    // 2) Payout
    const payoutRes = await fetch(`${base}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `booking_${bookingId}_${Date.now()}`,
          email_subject: 'تم تحويل مستحقاتك من Sunget',
          email_message: `دفعة حجز رقم ${bookingId}`,
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: { value: hotelShare.toFixed(2), currency },
          receiver: hotelEmail,
          note: `Booking ${bookingId}`,
          sender_item_id: bookingId,
        }],
      }),
    });
    const payoutJson = await payoutRes.json();
    if (!payoutRes.ok) return res.status(500).json({ error: 'Payout failed', details: payoutJson });

    return res.status(200).json({
      ok: true,
      hotelShare,
      batchId: payoutJson.batch_header?.payout_batch_id,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
