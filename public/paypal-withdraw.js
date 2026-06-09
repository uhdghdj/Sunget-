// netlify/functions/paypal-withdraw.js

export async function handler(event) {
  try {
    const { amount, paypal_email } = JSON.parse(event.body);

    // 1) الحصول على Access Token
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
      return {
        statusCode: 400,
        body: JSON.stringify(tokenData),
      };
    }

    // 2) إنشاء عملية السحب
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

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
}
