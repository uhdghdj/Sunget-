export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const CONFIG = {
      card: { integration_id: 5245183, iframe_id: 952326 },
    };

    const integrationType = body.integration_type || "card";
    const cfg = CONFIG[integrationType];

    if (!cfg) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "integration_type غير صحيح" }),
      };
    }

    const amount = Number(body.amount || 0);

    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "amount غير صحيح" }),
      };
    }

    const amount_cents = Math.round(amount * 100);

    // 🔐 الأفضل تحطه في Environment Variables على Vercel باسم PAYMOB_API_KEY
    const PAYMOB_API_KEY =
      process.env.PAYMOB_API_KEY ||
      "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRBM01EYzRPU3dpYm1GdFpTSTZJakUzTmpBeE9UUXlNamN1TXpBNU1UZ3pJbjAuODdYUkRfenRZSWp6YkhrbWZvLXlpMmh2dDZlZEloMzBwSjctUE9GSkItRzdVMUc1NzhBeVRacGFfVXI3VHVlRnZ4VDYxSklxUDFTQzBSV2N4eHRKcHc";

    // 1️⃣ Auth
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
    });

    const authData = await authRes.json();
    if (!authData.token) throw new Error("Auth failed: " + JSON.stringify(authData));

    // 2️⃣ Order
    const orderRes = await fetch(
      "https://accept.paymob.com/api/ecommerce/orders",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: authData.token,
          delivery_needed: false,
          amount_cents,
          currency: "EGP",
          items: [],
        }),
      }
    );

    const orderData = await orderRes.json();
    if (!orderData.id) throw new Error("Order failed: " + JSON.stringify(orderData));

    // 3️⃣ Payment Key
    const payRes = await fetch(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      {
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
      }
    );

    const payData = await payRes.json();
    if (!payData.token) throw new Error("Payment key failed: " + JSON.stringify(payData));

    // 🏧 كيوسك
    if (integrationType === "kiosk") {
      const kioskRes = await fetch(
        "https://accept.paymob.com/api/acceptance/payments/pay",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: { identifier: "AGGREGATOR", subtype: "AGGREGATOR" },
            payment_token: payData.token,
          }),
        }
      );

      const kioskData = await kioskRes.json();

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          method: "kiosk",
          bill_reference: kioskData?.data?.bill_reference,
        }),
      };
    }

    // 💳 Card / Wallet
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${cfg.iframe_id}?payment_token=${payData.token}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        method: integrationType,
        payment_url: iframeUrl,
      }),
    };
  } catch (err) {
    console.error("FULL ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
