export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({
error: "Method Not Allowed",
});
}

try {
const body = req.body || {};

const CONFIG = {
  card: {
    integration_id: 5245183,
    iframe_id: 952326,
  },
};

const integrationType =
  body.integration_type || "card";

const cfg = CONFIG[integrationType];

if (!cfg) {
  return res.status(400).json({
    error: "integration_type غير صحيح",
  });
}

const amount = Number(body.amount || 0);

if (!amount || amount <= 0) {
  return res.status(400).json({
    error: "amount غير صحيح",
  });
}

const amount_cents = Math.round(amount * 100);

const PAYMOB_API_KEY =
  process.env.PAYMOB_API_KEY ||"ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRBM01EYzRPU3dpYm1GdFpTSTZJakUzT0RBNE9EVTBOakV1TnpneE16azJJbjAudDBNQW9PVlZCWFVaVVc4bEctR1BkX0VLdy1nZ21GRVFZSjZrYzN5UHp4WjhKNGMxR29JZHFENml3cW5DX2xyLUZEZTRSOHJHQjJ5bXc4TmZoaEtYU1E=";

// 1. AUTH
const authRes = await fetch(
  "https://accept.paymob.com/api/auth/tokens",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: PAYMOB_API_KEY,
    }),
  }
);

const authData = await authRes.json();

console.log("AUTH STATUS:", authRes.status);
console.log("AUTH DATA:", authData);

if (!authRes.ok || !authData.token) {
  return res.status(500).json({
    error: "Paymob Auth Failed",
    paymob_response: authData,
  });
}

// 2. CREATE ORDER
const orderRes = await fetch(
  "https://accept.paymob.com/api/ecommerce/orders",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

console.log("ORDER STATUS:", orderRes.status);
console.log("ORDER DATA:", orderData);

if (!orderRes.ok || !orderData.id) {
  return res.status(500).json({
    error: "Order Creation Failed",
    paymob_response: orderData,
  });
}

// 3. PAYMENT KEY
const payRes = await fetch(
  "https://accept.paymob.com/api/acceptance/payment_keys",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_token: authData.token,
      amount_cents,
      expiration: 3600,
      order_id: orderData.id,

      billing_data: {
        apartment: "NA",
        email: "test@test.com",
        floor: "NA",
        first_name: "Test",
        street: "NA",
        building: "NA",
        phone_number: "+201000000000",
        shipping_method: "NA",
        postal_code: "NA",
        city: "Cairo",
        country: "EG",
        last_name: "User",
        state: "Cairo",
      },

      currency: "EGP",
      integration_id: cfg.integration_id,
    }),
  }
);

const payData = await payRes.json();

console.log("PAY STATUS:", payRes.status);
console.log("PAY DATA:", payData);

if (!payRes.ok || !payData.token) {
  return res.status(500).json({
    error: "Payment Key Failed",
    paymob_response: payData,
  });
}

const iframeUrl =
  `https://accept.paymob.com/api/acceptance/iframes/${cfg.iframe_id}?payment_token=${payData.token}`;

return res.status(200).json({
  ok: true,
  payment_url: iframeUrl,
});

} catch (err) {
console.error("PAYMOB ERROR:", err);

return res.status(500).json({
  error: err.message || "Unknown Error",
});

}
}
