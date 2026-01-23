const mongoose = require("mongoose")

const friendRequestSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
            index: true,
        },
    },
    { timestamps: true }
)

// Prevent duplicate pending requests between same two users
friendRequestSchema.index(
    { from: 1, to: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "pending" } }
)

// Helpful index for listing incoming/outgoing requests fast
friendRequestSchema.index({ to: 1, status: 1, createdAt: -1 })
friendRequestSchema.index({ from: 1, status: 1, createdAt: -1 })

module.exports = mongoose.model("FriendRequest", friendRequestSchema)
