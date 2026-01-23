const mongoose = require("mongoose")

const battleSchema = new mongoose.Schema(
    {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        opponent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["pending", "active", "completed", "declined", "expired"],
            default: "pending",
            index: true,
        },

        // Scope
        subjectId: { type: Number, required: true, index: true },
        lessonId: { type: Number, default: null, index: true }, // null => Subject-only scope (A)

        // Fixed question set for fairness
        questionIds: {
            type: [Number],
            required: true,
            validate: {
                validator: function (arr) {
                    return Array.isArray(arr) && arr.length === 10
                },
                message: "questionIds must contain exactly 10 questions for 1v1 battle",
            },
        },

        // Link each player's submitted attempt (from QuizAttempt collection)
        createdByAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuizAttempt",
            default: null,
            index: true,
        },
        opponentAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuizAttempt",
            default: null,
            index: true,
        },

        // Deadline
        expiresAt: { type: Date, required: true, index: true },

        // Winner (set when battle is resolved)
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
    },
    { timestamps: true }
)

// prevent duplicate pending battle invites between the same pair (either direction)
// (keeps spam down)
battleSchema.index(
    { createdBy: 1, opponent: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "pending" } }
)

module.exports = mongoose.model("Battle", battleSchema)
