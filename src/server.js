require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const examRoutes = require("./routes/examRoutes");
const termRoutes = require("./routes/termRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const testRoutes = require("./routes/testRoutes");
const resultRoutes = require("./routes/resultRoutes");
const communityRoutes = require("./routes/communityRoutes");
const referenceRoutes = require("./routes/referenceRoutes");
const errorHandler = require("./middleware/errorHandler");
const { registerChatHandlers } = require("./socket/chatHandler");

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow all origins in development (Expo Go, emulator, physical device)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === "development") {
      return callback(null, true);
    }
    // Whitelist production domains
    const whitelist = [
      "https://student-app-backend-cmtu.onrender.com",
      "https://expo.dev",
      "https://expo.io",
    ];
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Please try again after 15 minutes." },
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
app.use("/api/exams", examRoutes);
app.use("/api/terms", termRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/references", referenceRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── HTTP Server (wraps Express so Socket.IO can share it) ───────────────────
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // in production, restrict to your app's domain/IP
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Allow mobile clients where polling is more reliable than websocket upgrades
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Register all chat event handlers
registerChatHandlers(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  
  if (isProduction) {
    console.log(`   API Base URL    : https://student-app-backend-cmtu.onrender.com/api`);
    console.log(`   Health Check    : https://student-app-backend-cmtu.onrender.com/health`);
    console.log(`   WebSocket       : wss://student-app-backend-cmtu.onrender.com`);
  } else {
    console.log(`   API Base URL    : http://localhost:${PORT}/api`);
    console.log(`   Network URL     : http://192.168.31.208:${PORT}/api`);
    console.log(`   Socket.IO       : ws://192.168.31.208:${PORT}`);
    console.log(`   Health Check    : http://localhost:${PORT}/health`);
  }
  console.log("");
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
