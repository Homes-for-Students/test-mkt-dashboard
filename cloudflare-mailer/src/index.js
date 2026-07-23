export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { email, otpCode } = await request.json();

      if (!email || !otpCode) {
        return new Response("Missing email or otpCode", { status: 400 });
      }

      const sendRequest = new Request("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: email, name: "User" }],
            },
          ],
          from: {
            email: "no-reply@wearehomesforstudents.com",
            name: "HFS Dashboard",
          },
          subject: "Your Dashboard Login Code",
          content: [
            {
              type: "text/plain",
              value: `Your One-Time Passcode is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
            },
          ],
        }),
      });

      const response = await fetch(sendRequest);
      const resultText = await response.text();

      if (!response.ok) {
        return new Response(`MailChannels Error: ${resultText}`, { 
          status: response.status,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Email sent" }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (e) {
      return new Response(`Error: ${e.message}`, { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  },
};
