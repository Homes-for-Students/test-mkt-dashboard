import { EmailMessage } from "cloudflare:email";

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

      // Use Cloudflare Workers native Email Sending binding
      const emailText = `Your HFS Dashboard One-Time Passcode is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`;
      
      const message = new EmailMessage(
        "dashboard-auth@wearehomesforstudents.com", // Sender must be on a domain in your Cloudflare account
        email,
        emailText
      );

      await env.SEND_EMAIL.send(message);

      return new Response(JSON.stringify({ success: true, message: "Email sent" }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (e) {
      return new Response(`Email Send Error: ${e.message}`, { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  },
};
