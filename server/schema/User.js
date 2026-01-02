const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // Store only hashed password (bcrypt)
        passwordHash: { type: String, required: true },

        // Quizard profile / gamification
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },

        // streakDays: shown in UI as 🔥 streak
        streakDays: { type: Number, default: 0 },
        lastStudyDate: { type: Date, default: null },

        // hearts / lives UI (optional now, but matches your wireframe)
        lives: { type: Number, default: 5 },

        // O-Level countdown card
        examDate: { type: Date, default: null }
    },
    { timestamps: true }
);

// Never leak passwordHash when sending user object to frontend
userSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.passwordHash;
        return ret;
    }
});

module.exports = mongoose.model("User", userSchema);
