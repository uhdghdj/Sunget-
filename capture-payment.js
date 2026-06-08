export default async function handler(req, res) {
try {
const { orderId } = req.body;

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

const captureRes = await fetch(
  `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
  }
);

const captureData = await captureRes.json();

return res.status(200).json(captureData);

} catch (e) {
console.error(e);

return res.status(500).json({
  error: "Capture failed",
});

}
}
