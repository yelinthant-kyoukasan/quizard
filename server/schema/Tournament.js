const mongoose = require("mongoose")

const tournamentSchema = new mongoose.Schema(
    {
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: { type: String, required: true, trim: true, maxlength: 60 },

        // Join code like "QZ7K2A"
        joinCode: { type: String, required: true, unique: true, index: true },

        // Scope (A + C)
        subjectId: { type: Number, required: true, index: true },
        lessonId: { type: Number, default: null, index: true }, // null => subject-only

        // Fixed question set for fairness
        questionIds: {
            type: [Number],
            required: true,
            validate: {
                validator: function (arr) {
                    return Array.isArray(arr) && arr.length === 15
                },
                message: "questionIds must contain exactly 15 questions for tournament",
            },
        },

        // Deadlines
        joinClosesAt: { type: Date, required: true, index: true },
        endsAt: { type: Date, required: true, index: true },

        status: {
            type: String,
            enum: ["open", "running", "completed", "cancelled"],
            default: "open",
            index: true,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model("Tournament", tournamentSchema)
