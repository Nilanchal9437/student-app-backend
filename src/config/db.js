const mongoose = require("mongoose");

const DB_NAME = "student-exam-app";

/**
 * Ensures the MongoDB URI always targets the correct database.
 * If the URI has no DB name (e.g. Atlas URIs ending in /?...), we inject it
 * before the query string so data never lands in the default "test" database.
 */
function buildMongoURI(uri) {
  if (!uri) throw new Error("MONGODB_URI is not set in environment variables.");

  // Atlas SRV URIs look like: mongodb+srv://user:pass@cluster.mongodb.net/?options
  // We need:                   mongodb+srv://user:pass@cluster.mongodb.net/student-exam-app?options
  const url = new URL(uri);

  // Only inject DB name if not already set (pathname is "/" or empty)
  if (!url.pathname || url.pathname === "/") {
    url.pathname = `/${DB_NAME}`;
  }

  return url.toString();
}

const connectDB = async () => {
  try {
    const uri = buildMongoURI(process.env.MONGODB_URI);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(
      `✅ MongoDB Connected: ${conn.connection.host} → DB: ${conn.connection.name}`
    );
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
