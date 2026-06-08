export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const CONFIG = {
      card: { integration_id: 5245183, iframe_id: 952326 },
    };

    const integrationType = body.integration_type || "card";
    const cfg = CONFIG[integrationType];

    if (!cfg) return res.status(400).json({ error: "integration_type غير صحيح" });

    const amount = Number(body.amount || 0);
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount غير صحيح" });

    const amount_cents = Math.round(amount * 100);

    const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
    if (!PAYMOB_API_KEY) return res.status(500).json({ error: "PAYMOB_API_KEY مش متظبط" });

    // 1️⃣ Auth
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
    });
    const authData = await authRes.json();
    if (!authData.token) throw new Error("Auth failed: " + JSON.stringify(authData));

    // 2️⃣ Order
    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authData.token,
        delivery_needed: false,
        amount_cents,
        currency: "EGP",
        items: [],
      }),
    });
    const orderData = await orderRes.json();
    if (!orderData.id) throw new Error("Order failed: " + JSON.stringify(orderData));

    // 3️⃣ Payment Key
    const payRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authData.token,
        amount_cents,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          first_name: "Test",
          last_name: "User",
          email: "test@test.com",
          phone_number: "+201000000000",
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          shipping_method: "NA",
          postal_code: "NA",
          city: "Cairo",
          country: "EG",
          state: "NA",
        },
        currency: "EGP",
        integration_id: cfg.integration_id,
      }),
    });
    const payData = await payRes.json();
    if (!payData.token) throw new Error("Payment key failed: " + JSON.stringify(payData));

    if (integrationType === "kiosk") {
      const kioskRes = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: { identifier: "AGGREGATOR", subtype: "AGGREGATOR" },
          payment_token: payData.token,
        }),
      });
      const kioskData = await kioskRes.json();
      return res.status(200).json({
        ok: true,
        method: "kiosk",
        bill_reference: kioskData?.data?.bill_reference,
      });
    }

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${cfg.iframe_id}?payment_token=${payData.token}`;
    return res.status(200).json({ ok: true, method: integrationType, payment_url: iframeUrl });

  } catch (err) {
    
console.error(err);

return res.status(500).json({
  error: "حدث خطأ أثناء إنشاء عملية الدفع"
});
