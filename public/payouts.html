import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { sendHotelPayout } from "@/lib/paypal-payout.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "تحويلات الفنادق — Sunget" },
      { name: "description", content: "سحب نسبة الفندق أوتوماتيك من PayPal." },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const sendPayout = useServerFn(sendHotelPayout);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [form, setForm] = useState({
    hotelEmail: "", bookingId: "", totalAmount: "",
    commissionPercent: "15", currency: "USD",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setResult("");
    try {
      const res = await sendPayout({
        data: {
          hotelEmail: form.hotelEmail,
          bookingId: form.bookingId,
          totalAmount: Number(form.totalAmount),
          commissionPercent: Number(form.commissionPercent),
          currency: form.currency,
        },
      });
      setResult(res.ok
        ? `✅ تم التحويل — نصيب الفندق: ${res.hotelShare} ${form.currency}`
        : `❌ خطأ: ${res.error}`);
    } catch (err) {
      setResult(`❌ ${(err as Error).message}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4" dir="rtl">
      <Card className="max-w-lg mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">سحب مستحقات الفندق</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div><Label>إيميل PayPal للفندق</Label>
            <Input type="email" required value={form.hotelEmail}
              onChange={(e) => setForm({ ...form, hotelEmail: e.target.value })} /></div>
          <div><Label>رقم الحجز</Label>
            <Input required value={form.bookingId}
              onChange={(e) => setForm({ ...form, bookingId: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>قيمة الحجز</Label>
              <Input type="number" step="0.01" required value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></div>
            <div><Label>العملة</Label>
              <Input value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          </div>
          <div><Label>نسبة عمولة الموقع %</Label>
            <Input type="number" value={form.commissionPercent}
              onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} /></div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "جاري التحويل..." : "حوّل للفندق"}
          </Button>
        </form>
        {result && <div className="text-sm p-3 rounded bg-muted">{result}</div>}
      </Card>
    </div>
  );
}
