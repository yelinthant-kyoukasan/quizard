const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
    {
        subjectId: {
            type: String,
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true
        },

        code: {
            type: String,
            required: true
        },

        icon: {
            type: String
        },

        color: {
            type: String
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

module.exports = mongoose.model("Subject", subjectSchema);
