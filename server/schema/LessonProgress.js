const mongoose = require("mongoose")

const LessonProgressSchema = new mongoose.Schema(
    {
        // who
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // what
        subjectId: {
            type: Number,
            required: true,
            index: true,
        },
        lessonId: {
            type: Number,
            required: true,
            index: true,
        },

        // progress state
        status: {
            type: String,
            enum: ["completed"],
            default: "completed",
        },

        // performance snapshot
        accuracy: {
            type: Number, // 0–100
            min: 0,
            max: 100,
            required: true,
        },

        // timestamps
        completedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
)

/**
 * Prevent duplicate progress records:
 * one user + one lesson = one progress record
 */
LessonProgressSchema.index({ user: 1, lessonId: 1 }, { unique: true })

module.exports = mongoose.model("LessonProgress", LessonProgressSchema)
