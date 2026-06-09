
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    const { amount, paypal_email } = req.body;

    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
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

    if (!tokenData.access_token) {
      return res.status(400).json(tokenData);
    }

    const payoutRes = await fetch(
      "https://api-m.paypal.com/v1/payments/payouts",
      {
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
          items: [
            {
              recipient_type: "EMAIL",
              receiver: paypal_email,
              amount: {
                value: Number(amount).toFixed(2),
                currency: "USD",
              },
              note: "Withdrawal from hotel platform",
            },
          ],
        }),
      }
    );

    const result = await payoutRes.json();

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
