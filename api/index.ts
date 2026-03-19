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
    user: process.env.SMTP_USER
      ? `${process.env.SMTP_USER.split("@")[0]}@...`
      : null,
  });
});

// Email API
app.post("/api/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 📅 Dynamic Date
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-US", { month: "short" });

    const htmlTemplate = `
    <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:auto;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1);border:1px solid #fed7aa;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
  
  <div style="background: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 50%; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 10px;">
    
    <span style="font-size: 22px;">📅</span>
    
    <span style="font-size: 11px; color: white; font-weight: 600;">
      ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
    </span>

  </div>

  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">
    Attendance Pro
  </h1>

  <p style="color: #ffedd5; margin-top: 6px; font-size: 14px;">
    Smart Attendance Management System
  </p>

</div>

      <!-- Body -->
      <div style="padding:40px 30px;background:#ffffff;">

        <div style="text-align:center;margin-bottom:30px;">
          <span style="background:#fff7ed;color:#c2410c;padding:8px 16px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid #ffedd5;">
            Attendance Notification
          </span>
        </div>

        <p style="font-size:16px;color:#374151;">Dear Parent,</p>

        <p style="font-size:15px;color:#374151;line-height:1.7;">
          We would like to inform you that there has been an update regarding your child's attendance.
          Please review the details below.
        </p>

        <!-- Info Box -->
       <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
  
  <div style="background: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 50%; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 10px;">
    
    <span style="font-size: 22px;">📅</span>
    
    <span style="font-size: 11px; color: white; font-weight: 600;">
      ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
    </span>

  </div>

  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">
    Attendance Pro
  </h1>

  <p style="color: #ffedd5; margin-top: 6px; font-size: 14px;">
    Smart Attendance Management System
  </p>

</div>

        <!-- Highlight -->
        <div style="margin-top:30px;padding:20px;background:linear-gradient(to right,#fff7ed,#ffffff);border-radius:12px;border-left:5px solid #f97316;">
          <table width="100%">
            <tr>
              <td style="vertical-align:top;padding-right:15px;">
                <span style="font-size:24px;">ℹ️</span>
              </td>
              <td>
                <p style="margin:0;color:#7c2d12;font-size:14px;font-weight:600;">
                  Important Notice
                </p>
                <p style="margin:5px 0 0;color:#9a3412;font-size:13px;">
                  This attendance was recorded on
                  <strong>
                    ${today.toLocaleDateString("en-BD", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>.
                </p>
              </td>
            </tr>
          </table>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:#fff7ed;padding:25px;text-align:center;border-top:1px solid #ffedd5;">
        <p style="margin:0;color:#9a3412;font-size:12px;font-weight:600;">
          © ${today.getFullYear()} Attendance Pro Team
        </p>

        <p style="margin-top:10px;color:#ea580c;font-size:11px;">
          Privacy Policy • Support Center
        </p>

        <p style="margin-top:12px;color:#ea580c;font-size:10px;opacity:0.7;font-style:italic;">
          This is a system-generated notification. Please do not reply.
        </p>
      </div>

    </div>
    `;

    const info = await transporter.sendMail({
      from: `"Attendance Pro" <${process.env.SMTP_USER}>`,
      to,
      subject: `🔔 ${subject}`,
      text,
      html: htmlTemplate,
    });

    res.json({ success: true, messageId: info.messageId });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
