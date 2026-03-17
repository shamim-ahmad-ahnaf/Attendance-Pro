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

    // Table-based HTML Email Template for Maximum Compatibility
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Attendance Notification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fed7aa; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                
                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#f97316" style="padding: 30px 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">Attendance Pro</h1>
                    <p style="color: #ffedd5; margin: 5px 0 0; font-size: 14px;">Smart Attendance Management System</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Attendance Notification</h2>
                    <p style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">Dear Parent,</p>
                    <p style="color: #374151; line-height: 1.6; font-size: 16px; margin: 0 0 25px 0;">
                      This is to inform you that your child has an attendance update. Please review the details below.
                    </p>

                    <!-- Info Box -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border-radius: 8px; border-left: 5px solid #f97316;">
                      <tr>
                        <td style="padding: 20px;">
                          ${text.split('\n').map(line => {
                            if (line.includes(':')) {
                              const [label, value] = line.split(':');
                              const isStatus = label.trim().toLowerCase() === 'status';
                              const statusColor = value.trim().toLowerCase() === 'absent' ? '#ef4444' : '#10b981';
                              return `
                                <p style="margin: 8px 0; font-size: 15px; color: #4b5563;">
                                  <strong style="color: #4b5563;">${label}:</strong> 
                                  <span style="color: ${isStatus ? statusColor : '#111827'}; font-weight: ${isStatus ? 'bold' : '500'};">
                                    ${value}
                                  </span>
                                </p>`;
                            }
                            return `<p style="margin: 10px 0; color: #4b5563; font-size: 15px;">${line}</p>`;
                          }).join('')}
                        </td>
                      </tr>
                    </table>

                    <p style="color: #4b5563; font-size: 15px; margin: 25px 0; line-height: 1.5;">
                      If there is any valid reason for the absence, please inform the school authority.
                    </p>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #4b5563; font-size: 16px;">
                          Regards,<br>
                          <strong style="color: #111827;">Attendance Pro Team</strong>
                        </td>
                      </tr>
                    </table>

                    <!-- Button -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 35px;">
                      <tr>
                        <td align="center">
                          <a href="${process.env.APP_URL || '#'}" style="background-color: #f97316; color: #ffffff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                            View Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" bgcolor="#fff7ed" style="padding: 25px; border-top: 1px solid #ffedd5;">
                    <p style="margin: 0; color: #9a3412; font-size: 12px; font-weight: bold;">&copy; ${new Date().getFullYear()} Attendance Pro. All rights reserved.</p>
                    <p style="margin: 10px 0 0; color: #ea580c; font-size: 11px; opacity: 0.8;">
                      This is an automated message, please do not reply.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
