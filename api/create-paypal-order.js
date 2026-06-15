
// src/routes/api/create-paypal-order.ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/create-paypal-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { amountEGP, usdRate } = await request.json();

          const rate = Number(usdRate) > 0 ? Number(usdRate) : 48;
          const amountUSD = (Number(amountEGP) / rate).toFixed(2);

          if (!amountUSD || Number(amountUSD) <= 0) {
            return Response.json({ error: "Invalid amount" }, { status: 400 });
          }

          const clientId = process.env.PAYPAL_CLIENT_ID;
          const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
          if (!clientId || !clientSecret) {
            return Response.json(
              { error: "PayPal credentials missing" },
              { status: 500 }
            );
          }

          const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

          const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          const tokenData = await tokenRes.json();
          if (!tokenData.access_token) {
            return Response.json({ error: "PayPal auth failed" }, { status: 502 });
          }

          const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              intent: "CAPTURE",
              purchase_units: [
                {
                  amount: { currency_code: "USD", value: amountUSD },
                  custom_id: `EGP:${Number(amountEGP).toFixed(2)}|RATE:${rate}`,
                },
              ],
            }),
          });

          const order = await orderRes.json();
          if (!order.id) {
            return Response.json({ error: "Order creation failed", details: order }, { status: 502 });
          }

          return Response.json({ id: order.id, amountUSD, amountEGP, rate });
        } catch (err: any) {
          return Response.json({ error: err.message || "Server error" }, { status: 500 });
        }
      },
    },
  },
});
