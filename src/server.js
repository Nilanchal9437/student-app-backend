require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const errorHandler = require("./middleware/errorHandler");

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow all origins in development (Expo Go, emulator, physical device)
// In production, replace the origin function with your exact domain.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl) or any origin in dev
      if (!origin || process.env.NODE_ENV === "development") {
        return callback(null, true);
      }
      // Production whitelist — add your domain here
      const whitelist = ["https://your-production-domain.com"];
      if (whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit to 20 login/register attempts per window
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Exam App API is running 🚀",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/users", authLimiter, userRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
// Listen on 0.0.0.0 so phones/emulators on the same LAN can reach the API
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `\n🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
  );
  console.log(`   API Base URL : http://localhost:${PORT}/api`);
  console.log(`   Network URL  : http://192.168.31.208:${PORT}/api`);
  console.log(`   Health Check : http://localhost:${PORT}/health\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
