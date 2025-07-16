const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// Security Middleware
app.use(helmet());
app.use(morgan("combined"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: "Too many requests, try again later.",
});
app.use("/api/", limiter);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many contact requests, try again later.",
});

// CORS & Body Parser
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Basic validation
const validateContactInput = (req, res, next) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (name.length > 100 || message.length > 1000) {
    return res.status(400).json({ success: false, message: "Input too long" });
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  next();
};

// Contact Route (Only Email)
app.post("/api/contact", contactLimiter, validateContactInput, async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.OWNER_EMAIL,
        pass: process.env.OWNER_PASS,
      },
    });

    // Email to Owner (You)
    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.OWNER_EMAIL}>`,
      to: process.env.OWNER_EMAIL,
      subject: "New Contact Form Submission",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    });

    // Email to User
    await transporter.sendMail({
      from: `"Paras Jagdale" <${process.env.OWNER_EMAIL}>`,
      to: email,
      subject: "Thank you for contacting!",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for reaching out to me. I’ve received your message and will get back to you shortly.</p>
        <p><b>Your Message:</b><br/>${message}</p>
        <br/>
        <p>Best regards,<br/>Paras Jagdale</p>
      `,
    });

    console.log(`✅ Email sent to owner and user (${email})`);

    res.status(200).json({
      success: true,
      message: "Message sent successfully. Check your email for confirmation!",
    });
  } catch (error) {
    console.error("❌ Email sending error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
    });
  }
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// Fallback 404
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});
app.get('/api/test-email', async (req, res) => {
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.OWNER_EMAIL,
        pass: process.env.OWNER_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Test" <${process.env.OWNER_EMAIL}>`,
      to: process.env.OWNER_EMAIL,
      subject: "Test Email",
      text: "This is a test email from backend.",
    });

    res.json({ success: true, message: "Test email sent" });
  } catch (err) {
    console.error("Test email failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
