const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
    {
        lessonId: {
            type: String,
            required: true,
            unique: true
        },

        subjectId: {
            type: String,
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true
        },

        description: {
            type: String
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "easy"
        },

        orderIndex: {
            type: Number,
            default: 0
        },

        xpReward: {
            type: Number,
            default: 50
        },

        estimatedMinutes: {
            type: Number,
            default: 10
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);
