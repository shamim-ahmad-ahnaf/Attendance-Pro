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

    // Vibrant Orange HTML Email Template
    const htmlTemplate = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #fed7aa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
          <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; display: inline-block; line-height: 60px; margin-bottom: 10px;">
            <span style="font-size: 30px;">📅</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Attendance Pro</h1>
          <p style="color: #ffedd5; margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Smart Attendance Management System</p>
        </div>

        <!-- Content Body -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="background-color: #fff7ed; color: #c2410c; padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; border: 1px solid #ffedd5;">
              New Notification
            </span>
          </div>

          <div style="color: #374151; line-height: 1.8; font-size: 16px; background: #fffaf5; padding: 25px; border-radius: 12px; border: 1px dashed #fdba74;">
            ${text.split('\n').map(line => {
              if (line.includes(':')) {
                const [label, value] = line.split(':');
                return `<p style="margin: 8px 0;"><strong style="color: #ea580c;">${label}:</strong> <span style="color: #111827; font-weight: 500;">${value}</span></p>`;
              }
              return `<p style="margin: 10px 0;">${line}</p>`;
            }).join('')}
          </div>

          <!-- Highlight Box -->
          <div style="margin-top: 30px; padding: 20px; background: linear-gradient(to right, #fff7ed, #ffffff); border-radius: 12px; border-left: 5px solid #f97316;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: top; padding-right: 15px;">
                  <span style="font-size: 24px;">ℹ️</span>
                </td>
                <td>
                  <p style="margin: 0; color: #7c2d12; font-size: 14px; font-weight: 600;">Important Note</p>
                  <p style="margin: 4px 0 0; color: #9a3412; font-size: 13px; line-height: 1.4;">
                    This attendance record has been automatically synchronized with the central database on 
                    <strong>${new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 35px;">
            <a href="${process.env.APP_URL || '#'}" style="background-color: #f97316; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
              View Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #fff7ed; padding: 25px; text-align: center; border-top: 1px solid #ffedd5;">
          <p style="margin: 0; color: #9a3412; font-size: 12px; font-weight: 600;">&copy; ${new Date().getFullYear()} Attendance Pro Team</p>
          <div style="margin-top: 10px;">
            <span style="color: #c2410c; font-size: 11px; text-decoration: none; margin: 0 10px;">Privacy Policy</span>
            <span style="color: #c2410c; font-size: 11px; text-decoration: none; margin: 0 10px;">Support Center</span>
          </div>
          <p style="margin: 15px 0 0; color: #ea580c; font-size: 10px; opacity: 0.7; font-style: italic;">
            This is a system-generated notification. Please do not reply directly to this email.
          </p>
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
