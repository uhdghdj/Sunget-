
import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

export const Route = createFileRoute("/api/paypal-withdraw")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        try {
          const { amount, paypal_email, hotel_id } = await request.json();
          const amt = Number(amount);

          if (!amt || amt <= 0 || !paypal_email || !hotel_id) {
            return json({ error: "amount و paypal_email و hotel_id مطلوبين" }, 400);
          }

          const clientId = process.env.PAYPAL_CLIENT_ID;
          const secret = process.env.PAYPAL_SECRET;
          if (!clientId || !secret) {
            return json({ error: "PayPal credentials غير مهيّأة" }, 500);
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1) إجمالي المدفوع أونلاين
          const { data: bookings, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select("total_price")
            .eq("hotel_id", hotel_id)
            .eq("payment_method", "online");
          if (bErr) return json({ error: bErr.message }, 500);

          const totalEarned = (bookings ?? []).reduce(
            (s: number, r: any) => s + Number(r.total_price || 0),
            0,
          );

          // 2) إجمالي السحوبات السابقة (الناجحة والمعلّقة)
          const { data: withdrawn, error: wErr } = await supabaseAdmin
            .from("withdrawals")
            .select("amount")
            .eq("hotel_id", hotel_id)
            .in("status", ["pending", "success"]);
          if (wErr) return json({ error: wErr.message }, 500);

          const totalWithdrawn = (withdrawn ?? []).reduce(
            (s: number, r: any) => s + Number(r.amount || 0),
            0,
          );

          const available = totalEarned - totalWithdrawn;
          if (amt > available) {
            return json({ error: "الرصيد القابل للسحب غير كافٍ", available }, 400);
          }

          // 3) سجّل السحب كـ pending قبل النداء على PayPal (يحجز الرصيد)
          const { data: wRow, error: insErr } = await supabaseAdmin
            .from("withdrawals")
            .insert({ hotel_id, amount: amt, paypal_email, status: "pending" })
            .select()
            .single();
          if (insErr) return json({ error: insErr.message }, 500);

          // 4) PayPal token
          const auth = btoa(`${clientId}:${secret}`);
          const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          const tokenData = await tokenRes.json().catch(() => null) as any;
          if (!tokenRes.ok || !tokenData?.access_token) {
            await supabaseAdmin.from("withdrawals").update({ status: "failed" }).eq("id", wRow.id);
            return json({ error: "PayPal token failed", details: tokenData }, 502);
          }

          // 5) Payout
          const batchId = `wd_${wRow.id}_${Date.now()}`;
          const payoutRes = await fetch("https://api-m.paypal.com/v1/payments/payouts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender_batch_header: { sender_batch_id: batchId, email_subject: "Your withdrawal" },
              items: [{
                recipient_type: "EMAIL",
                receiver: paypal_email,
                amount: { value: amt.toFixed(2), currency: "USD" },
                note: "Withdrawal from hotel platform",
              }],
            }),
          });
          const payoutData = await payoutRes.json().catch(() => null) as any;

          if (!payoutRes.ok) {
            await supabaseAdmin.from("withdrawals").update({ status: "failed" }).eq("id", wRow.id);
            return json({ error: "PayPal payout failed", details: payoutData }, payoutRes.status);
          }

          await supabaseAdmin
            .from("withdrawals")
            .update({
              status: "success",
              paypal_batch_id: payoutData?.batch_header?.payout_batch_id ?? batchId,
            })
            .eq("id", wRow.id);

          return json({ success: true, available: available - amt, payout: payoutData });
        } catch (err: any) {
          return json({ error: err?.message ?? "Unknown error" }, 500);
        }
      },
    },
  },
});
