const mongoose = require("mongoose");
const Exam = require("../src/models/Exam"); // adjust path
const Term = require("../src/models/Term"); // adjust path

const MONGO_URI =
  "mongodb+srv://nilanchal:SeLk9BdctbRTk1gT@cluster0.0xeph0s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Fixed terms
const TERMS = ["Term 1", "Term 2", "Term 3"];

async function connect() {
  const raw = MONGO_URI;
  if (!raw) throw new Error("MONGODB_URI not set");
  const url = new URL(raw);
  if (!url.pathname || url.pathname === "/") url.pathname = "/student-exam-app";
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 8000 });
  console.log("✅ Connected to MongoDB →", mongoose.connection.name);
}

async function seedTerms() {
  try {
    await connect();
    console.log("✅ MongoDB Connected");

    // ⚠️ Optional: clear old terms
    await Term.deleteMany({});
    console.log("🧹 Old terms removed");

    // Get all exams
    const exams = await Exam.find({});

    if (!exams.length) {
      console.log("❌ No exams found. Run exam seed first.");
      process.exit(1);
    }

    // Generate term docs
    const termDocs = [];

    exams.forEach((exam) => {
      TERMS.forEach((termName) => {
        termDocs.push({
          exam: exam._id,
          name: termName,
        });
      });
    });

    // Insert
    const inserted = await Term.insertMany(termDocs);
    console.log(`🎉 ${inserted.length} terms inserted`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding terms failed:", error);
    process.exit(1);
  }
}

seedTerms();
