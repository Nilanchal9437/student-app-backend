const mongoose = require("mongoose");
const Exam = require("../src/models/Exam"); // adjust path if needed

// 🔌 MongoDB connection
const MONGO_URI =
  "mongodb+srv://nilanchal:SeLk9BdctbRTk1gT@cluster0.0xeph0s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // change this

async function connect() {
  const raw = MONGO_URI;
  if (!raw) throw new Error("MONGODB_URI not set");
  const url = new URL(raw);
  if (!url.pathname || url.pathname === "/") url.pathname = "/student-exam-app";
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 8000 });
  console.log("✅ Connected to MongoDB →", mongoose.connection.name);
}

// 📦 Hardcoded exam data
const examData = [
  {
    name: "JSS1",
    level: "BECE",
    isPremium: false,
  },
  {
    name: "JSS2",
    level: "BECE",
    isPremium: true,
  },
  {
    name: "JSS3",
    level: "BECE",
    isPremium: true,
  },
  {
    name: "SSS1",
    level: "JAMB",
    isPremium: true,
  },

  {
    name: "SSS2",
    level: "WAEC",
    isPremium: true,
  },

  {
    name: "SSS3",
    level: "NECO",
    isPremium: true,
  },
];

// 🚀 Seed function
const seedExams = async () => {
  try {
    await connect();
    console.log("✅ MongoDB connected");

    // Optional: clear existing data
    await Exam.deleteMany({});
    console.log("🧹 Existing exams cleared");

    // Insert new data
    const inserted = await Exam.insertMany(examData);
    console.log(`🎉 ${inserted.length} exams inserted`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding exams:", error);
    process.exit(1);
  }
};

// ▶️ Run script
seedExams();
