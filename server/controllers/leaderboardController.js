const User = require("../schema/User")

function safeNumber(n) {
    const x = Number(n)
    return Number.isFinite(x) ? x : 0
}

function mapRow(u, rank) {
    return {
        rank,
        userId: String(u._id),
        username: u.username || "unknown",
        name: u.name || u.username || "Unknown",
        xp: safeNumber(u.xp),
        level: safeNumber(u.level),
        streakDays: safeNumber(u.streakDays),
    }
}

// GET /api/leaderboard?limit=50
exports.getLeaderboard = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || "50", 10), 100)

        // Top users by total XP
        const topUsers = await User.find({})
            .select("username name xp level streakDays")
            .sort({ xp: -1, streakDays: -1, username: 1 })
            .limit(limit)
            .lean()

        const entries = topUsers.map((u, idx) => mapRow(u, idx + 1))

        // Current user's rank (even if not in top list)
        const meId = req.user?._id
        let me = null

        if (meId) {
            const myDoc = await User.findById(meId)
                .select("username name xp level streakDays")
                .lean()

            if (myDoc) {
                const myXp = safeNumber(myDoc.xp)
                const higherCount = await User.countDocuments({ xp: { $gt: myXp } })
                me = mapRow(myDoc, higherCount + 1)
            }
        }

        return res.json({
            entries,
            me,
        })
    } catch (err) {
        console.error("getLeaderboard error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}
