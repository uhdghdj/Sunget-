
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/paypal-withdraw")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        try {
          const { amount, paypal_email } = await request.json();

          if (!amount || !paypal_email) {
            return new Response(
              JSON.stringify({ error: "amount و paypal_email مطلوبين" }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          const clientId = process.env.PAYPAL_CLIENT_ID;
          const secret = process.env.PAYPAL_SECRET;
          if (!clientId || !secret) {
            return new Response(
              JSON.stringify({ error: "PayPal credentials غير مهيّأة على السيرفر" }),
              { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          const auth = btoa(`${clientId}:${secret}`);

          const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });

          const tokenText = await tokenRes.text();
          let tokenData: any;
          try { tokenData = JSON.parse(tokenText); }
          catch {
            return new Response(
              JSON.stringify({ error: "PayPal token response invalid", details: tokenText }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          if (!tokenRes.ok || !tokenData.access_token) {
            return new Response(JSON.stringify(tokenData), {
              status: tokenRes.status || 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          const payoutRes = await fetch("https://api-m.paypal.com/v1/payments/payouts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender_batch_header: {
                sender_batch_id: Date.now().toString(),
                email_subject: "Your withdrawal",
              },
              items: [{
                recipient_type: "EMAIL",
                receiver: paypal_email,
                amount: { value: Number(amount).toFixed(2), currency: "USD" },
                note: "Withdrawal from hotel platform",
              }],
            }),
          });

          const payoutText = await payoutRes.text();
          let result: any;
          try { result = JSON.parse(payoutText); }
          catch {
            return new Response(
              JSON.stringify({ error: "PayPal payout response invalid", details: payoutText }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          return new Response(JSON.stringify(result), {
            status: payoutRes.ok ? 200 : payoutRes.status,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      },
    },
  },
});
