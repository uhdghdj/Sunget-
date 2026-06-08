export default async function handler(req, res) {
try {
const { amount } = req.body;

const auth = Buffer.from(
  `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
).toString("base64");

const tokenRes = await fetch(
  "https://api-m.paypal.com/v1/oauth2/token",
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  }
);

const tokenData = await tokenRes.json();

const orderRes = await fetch(
  "https://api-m.paypal.com/v2/checkout/orders",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: Number(amount).toFixed(2),
          },
        },
      ],
      application_context: {
        return_url:
          "https://sunget.site/success.html",
        cancel_url:
          "https://sunget.site/cancel.html",
      },
    }),
  }
);

const order = await orderRes.json();

const approve = order.links.find(
  (x) => x.rel === "approve"
);

return res.status(200).json({
  payment_url: approve.href,
});

} catch (e) {
console.error(e);

return res.status(500).json({
  error: "Payment creation failed",
});

}
}
