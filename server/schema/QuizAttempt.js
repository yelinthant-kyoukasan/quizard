const mongoose = require("mongoose")

const QuizAttemptSchema = new mongoose.Schema(
    {
        // who attempted
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // what they attempted (keep numeric IDs to match your CSV system)
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

        // what they answered (index of selected option per question)
        // e.g. [2, 0, 1, 3]
        answers: {
            type: [Number],
            required: true,
            default: [],
        },

        // results (server-calculated)
        correctCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalQuestions: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        xpEarned: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        // optional metadata for future analytics
        accuracy: {
            type: Number, // store 0-100
            min: 0,
            max: 100,
            default: 0,
        },
        timeTakenSeconds: { type: Number, default: 0 },
    },
    { timestamps: true } // gives createdAt + updatedAt automatically
)

// Helpful compound index for queries like:
// "get my attempts for this lesson" or "latest attempt"
QuizAttemptSchema.index({ user: 1, lessonId: 1, createdAt: -1 })

module.exports = mongoose.model("QuizAttempt", QuizAttemptSchema)
