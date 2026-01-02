const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        questionId: {
            type: String,
            required: true,
            unique: true
        },

        subjectId: {
            type: String,
            required: true,
            index: true
        },

        lessonId: {
            type: String,
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["mcq", "short"],
            default: "mcq"
        },

        questionText: {
            type: String,
            required: true
        },

        options: {
            type: [String],
            default: []
        },

        correctAnswer: {
            type: String,
            required: true
        },

        explanation: {
            type: String
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "easy"
        },

        xp: {
            type: Number,
            default: 10
        },

        orderIndex: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
