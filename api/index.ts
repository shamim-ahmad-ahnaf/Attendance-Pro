import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Email Status Check
app.get("/api/email-status", (req, res) => {
  res.json({
    configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    user: process.env.SMTP_USER ? `${process.env.SMTP_USER.split('@')[0]}@...` : null
  });
});

// Email API Route
app.post("/api/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ 
      error: "Email service not configured. Please set SMTP_USER and SMTP_PASS in environment variables." 
    });
  }

  let host = process.env.SMTP_HOST || "smtp.gmail.com";
  if (host.includes('@')) {
    host = "smtp.gmail.com";
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Beautiful HTML Email Template
    const htmlTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Attendance Pro</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1f2937; margin-top: 0;">Attendance Notification</h2>
          <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
            ${text.replace(/\n/g, '<br>')}
          </p>
          <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #4f46e5;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
              <strong>Status:</strong> Notification Sent Successfully
            </p>
          </div>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Attendance Pro. All rights reserved.</p>
          <p style="margin: 5px 0 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Attendance Pro" <${process.env.SMTP_USER}>`,
      to,
      subject: `🔔 ${subject}`,
      text, // Fallback plain text
      html: htmlTemplate, // Beautiful HTML version
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

// For Vercel, we don't need to serve static files from Express 
// if we configure Vercel to handle the frontend build.
// But for local dev, we keep it.
if (!process.env.VERCEL) {
  const startApp = async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  };
  
  const PORT = 3000;
  startApp().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
