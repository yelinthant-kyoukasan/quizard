const mongoose = require("mongoose")

const tournamentParticipantSchema = new mongoose.Schema(
    {
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tournament",
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // one attempt per user (MVP)
        attemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuizAttempt",
            default: null,
            index: true,
        },

        // cached stats for faster leaderboard (filled on submit)
        xpEarned: { type: Number, default: 0 },
        correctCount: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 0 },
        timeTakenSeconds: { type: Number, default: 0 },

        joinedAt: { type: Date, default: Date.now },
        submittedAt: { type: Date, default: null },
    },
    { timestamps: true }
)

// prevent duplicate join
tournamentParticipantSchema.index({ tournament: 1, user: 1 }, { unique: true })

module.exports = mongoose.model("TournamentParticipant", tournamentParticipantSchema)
