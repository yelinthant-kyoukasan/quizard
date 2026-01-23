/**
 * Usage:
 * node server/scripts/importQuestions.js path/to/questions.csv
 */

const fs = require("fs")
const path = require("path")
const csv = require("csv-parser")
const mongoose = require("mongoose")
const Question = require("../schema/Question") // adjust if needed

const MONGO_URI =
    process.env.MONGO_URI_TEST; // <- put your real DB name here
const BATCH_SIZE = 500

const clean = (v) => String(v ?? "").trim()

const toBool = (v) => {
    if (typeof v === "boolean") return v
    if (typeof v === "string") return ["true", "1", "yes"].includes(v.toLowerCase())
    return false
}

const toNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
}

async function flush(ops) {
    if (!ops.length) return
    const res = await Question.bulkWrite(ops, { ordered: false })
    console.log("bulkWrite →", {
        inserted: res.insertedCount,
        upserted: res.upsertedCount,
        modified: res.modifiedCount,
        matched: res.matchedCount,
    })
}

async function run() {
    const filePath = process.argv[2]
    if (!filePath) {
        console.error("❌ CSV file path missing")
        process.exit(1)
    }
    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found:", filePath)
        process.exit(1)
    }

    await mongoose.connect(MONGO_URI)
    console.log("✅ Connected to MongoDB")
    console.log("DB:", mongoose.connection.name)
    console.log("Collection:", Question.collection.name)

    let total = 0
    let skipped = 0
    let ops = []

    const stream = fs.createReadStream(path.resolve(filePath)).pipe(csv())

    for await (const row of stream) {
        total++

        // CSV snake_case → schema camelCase
        const questionId = clean(row.question_id)
        const subjectId = clean(row.subject_id)
        const lessonId = clean(row.lesson_id)

        if (!questionId || !subjectId || !lessonId) {
            skipped++
            continue
        }

        const options = [row.option_a, row.option_b, row.option_c, row.option_d]
            .map(clean)
            .filter(Boolean)

        const doc = {
            questionId,
            subjectId,
            lessonId,
            type: clean(row.type || "mcq"),
            questionText: clean(row.question_text),
            options,
            correctAnswer: clean(row.correct_answer),
            explanation: clean(row.explanation),
            difficulty: clean(row.difficulty || "easy"),
            xp: toNum(row.xp) ?? 10,
            orderIndex: toNum(row.order_index) ?? 0,
            isActive: toBool(row.is_active) ?? true,
        }

        ops.push({
            updateOne: {
                // ✅ THIS is the fix: prevents overwriting across lessons/subjects
                filter: { subjectId, lessonId, questionId },
                update: { $set: doc },
                upsert: true,
            },
        })

        if (ops.length >= BATCH_SIZE) {
            await flush(ops)
            ops = []
        }
    }

    if (ops.length) await flush(ops)

    console.log("\n📊 IMPORT SUMMARY")
    console.log("Total rows read:", total)
    console.log("Rows skipped (invalid):", skipped)

    await mongoose.disconnect()
    console.log("✅ Import complete")
}

run().catch((err) => {
    console.error("❌ Import failed:", err)
    process.exit(1)
})
