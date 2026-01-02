const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        lessonId: {
            type: String,
            required: true,
            index: true
        },

        subjectId: {
            type: String,
            required: true
        },

        totalQuestions: {
            type: Number,
            required: true
        },

        correctCount: {
            type: Number,
            required: true
        },

        accuracy: {
            type: Number,
            required: true
        },

        xpEarned: {
            type: Number,
            required: true
        },

        completedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
