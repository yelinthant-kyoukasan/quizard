const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
require("dotenv").config();

const Subject = require("../schema/Subject");
const Lesson = require("../schema/Lesson");
const Question = require("../schema/Question");

const dataDir = path.join(__dirname, "..", "..", "data", "examples");

function readCsv(filename) {
    return new Promise((resolve, reject) => {
        const rows = [];
        const fullPath = path.join(dataDir, filename);

        if (!fs.existsSync(fullPath)) {
            return reject(new Error(`CSV file not found: ${fullPath}`));
        }

        fs.createReadStream(fullPath)
            .pipe(csv())
            .on("data", (row) => {
                const cleanedRow = {};
                for (const key in row) {
                    const cleanKey = key.replace(/^\uFEFF/, "").trim();
                    cleanedRow[cleanKey] = row[key];
                }
                rows.push(cleanedRow);
            })

            .on("end", () => resolve(rows))
            .on("error", (err) => reject(err));
    });
}

function toBool(value, defaultVal = true) {
    if (value === undefined || value === null || value === "") return defaultVal;
    return String(value).trim().toLowerCase() === "true";
}

function toNum(value, defaultVal = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : defaultVal;
}

async function seed() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("Missing MONGO_URI in server/.env");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected.");

    console.log("🧹 Clearing existing data (subjects, lessons, questions)...");
    await Promise.all([
        Subject.deleteMany({}),
        Lesson.deleteMany({}),
        Question.deleteMany({})
    ]);

    console.log("📥 Reading CSV files...");
    const subjectsRows = await readCsv("subjects.csv");
    const lessonsRows = await readCsv("lessons.csv");
    const questionsRows = await readCsv("questions.csv");

    console.log("🧩 Seeding Subjects...");
    const subjectsDocs = subjectsRows.map((s) => ({
        subjectId: s.subject_id,
        name: s.name,
        code: s.code,
        icon: s.icon || "",
        color: s.color || "",
        orderIndex: toNum(s.order_index, 0),
        isActive: toBool(s.is_active, true)
    }));
    await Subject.insertMany(subjectsDocs);

    console.log("🧩 Seeding Lessons...");
    const lessonsDocs = lessonsRows
        .filter(l => l.lesson_id && l.subject_id && l.title)
        .map(l => ({
            lessonId: Number(l.lesson_id),
            subjectId: Number(l.subject_id),
            title: l.title,
            description: l.description || "",
            difficulty: l.difficulty || "easy",
            orderIndex: Number(l.order_index) || 0,
            xpReward: Number(l.xp_reward) || 0,
            questionCount: Number(l.question_count) || 0,
            estimatedMinutes: Number(l.estimated_minutes) || 10,
            isActive: l.is_active === "true"
        }));

    await Lesson.insertMany(lessonsDocs);

    console.log("🧩 Seeding Questions...");
    const questionsDocs = questionsRows
        .filter(q =>
            q.question_id &&
            q.lesson_id &&
            q.subject_id &&
            q.question_text &&
            q.correct_answer
        )
        .map(q => ({
            questionId: Number(q.question_id),
            lessonId: Number(q.lesson_id),
            subjectId: Number(q.subject_id),
            type: q.type || "mcq",
            questionText: q.question_text,
            options: [
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d
            ].filter(Boolean),
            correctAnswer: q.correct_answer,
            explanation: q.explanation || "",
            difficulty: q.difficulty || "easy",
            xp: Number(q.xp) || 10,
            orderIndex: Number(q.order_index) || 0,
            isActive: q.is_active === "true"
        }));

    await Question.insertMany(questionsDocs);

    console.log("✅ Seed complete!");
    console.log(`- Subjects: ${subjectsDocs.length}`);
    console.log(`- Lessons: ${lessonsDocs.length}`);
    console.log(`- Questions: ${questionsDocs.length}`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
}

seed().catch(async (err) => {
    console.error("❌ Seed failed:", err.message);
    try {
        await mongoose.disconnect();
    } catch (_) { }
    process.exit(1);
});
