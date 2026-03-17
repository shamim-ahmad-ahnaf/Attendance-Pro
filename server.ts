import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

    // Check if SMTP config exists
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials not found in environment variables.");
      return res.status(500).json({ 
        error: "Email service not configured. Please set SMTP_USER and SMTP_PASS in environment variables." 
      });
    }

    let host = process.env.SMTP_HOST || "smtp.gmail.com";
    
    // Smart Fix: If user accidentally put their email in the host field
    if (host.includes('@')) {
      console.warn(`Detected email address in SMTP_HOST: ${host}. Attempting to use default smtp.gmail.com`);
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

      const info = await transporter.sendMail({
        from: `"Attendance Pro" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
      });

      console.log("Message sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
