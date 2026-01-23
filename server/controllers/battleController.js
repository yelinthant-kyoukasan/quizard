const mongoose = require("mongoose")
const Battle = require("../schema/Battle")
const User = require("../schema/User")
const Question = require("../schema/Question") // adjust path if your Question model is elsewhere
const QuizAttempt = require("../schema/QuizAttempt") // adjust if your QuizAttempt is in schema/

function safeNum(n) {
    const x = Number(n)
    return Number.isFinite(x) ? x : 0
}

function isValidNumberOrNull(v) {
    if (v === null || v === undefined) return true
    const n = Number(v)
    return Number.isFinite(n)
}

function publicBattle(b, meId) {
    const me = String(meId)
    return {
        battleId: String(b._id),
        status: b.status,
        subjectId: b.subjectId,
        lessonId: b.lessonId ?? null,
        questionIds: b.questionIds, // optional to expose; okay for now since both need it to play
        createdBy: b.createdBy ? { userId: String(b.createdBy._id), username: b.createdBy.username } : null,
        opponent: b.opponent ? { userId: String(b.opponent._id), username: b.opponent.username } : null,
        expiresAt: b.expiresAt,
        isCreator: b.createdBy && String(b.createdBy._id) === me,
        winner: b.winner ? String(b.winner) : null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
    }
}

async function pickBattleQuestions({ subjectId, lessonId }) {
    const match = { subjectId: `${subjectId}`, isActive: true }

    console.log(subjectId, lessonId)
    if (lessonId !== null && lessonId !== undefined) {
        match.lessonId = `${lessonId}`
    }

    // Pick 10 random questions from the pool
    const picked = await Question.aggregate([
        { $match: match },
        { $sample: { size: 10 } },
        { $project: { _id: 0, questionId: 1 } },
    ])

    const ids = picked.map((p) => p.questionId).filter((x) => Number.isFinite(Number(x)))

    console.log(picked)
    console.log(ids)

    if (ids.length < 10) {
        return { ok: false, ids: [], reason: "NOT_ENOUGH_QUESTIONS" }
    }

    return { ok: true, ids, reason: null }
}

async function resolveBattleWinner(battle) {
    // Only resolve if both attempts exist
    if (!battle.createdByAttemptId || !battle.opponentAttemptId) return null

    const [a, o] = await Promise.all([
        QuizAttempt.findById(battle.createdByAttemptId).lean(),
        QuizAttempt.findById(battle.opponentAttemptId).lean(),
    ])

    if (!a || !o) return null

    const aCorrect = safeNum(a.correctCount)
    const oCorrect = safeNum(o.correctCount)
    const aTotal = safeNum(a.totalQuestions)
    const oTotal = safeNum(o.totalQuestions)

    const aAcc = aTotal > 0 ? aCorrect / aTotal : 0
    const oAcc = oTotal > 0 ? oCorrect / oTotal : 0

    if (aAcc > oAcc) return String(battle.createdBy)
    if (oAcc > aAcc) return String(battle.opponent)

    // tie-breaker: timeTakenSeconds lower wins
    const aTime = safeNum(a.timeTakenSeconds)
    const oTime = safeNum(o.timeTakenSeconds)

    if (aTime > 0 && oTime > 0) {
        if (aTime < oTime) return String(battle.createdBy)
        if (oTime < aTime) return String(battle.opponent)
    }

    // full tie
    return null
}

/**
 * POST /api/battles
 * body: { opponentUsername, subjectId, lessonId? }
 */
exports.createBattle = async (req, res) => {
    try {
        const meId = req.user?._id
        const opponentUsername = String(req.body.opponentUsername || "").trim().toLowerCase()
        const subjectId = Number(req.body.subjectId)
        const lessonIdRaw = req.body.lessonId ?? null
        const lessonId = lessonIdRaw === null || lessonIdRaw === "" ? null : Number(lessonIdRaw)

        if (!opponentUsername) return res.status(400).json({ message: "opponentUsername is required" })
        if (!Number.isFinite(subjectId)) return res.status(400).json({ message: "subjectId must be a number" })
        if (!isValidNumberOrNull(lessonId)) return res.status(400).json({ message: "lessonId must be a number or null" })

        const opponent = await User.findOne({ username: opponentUsername }).select("_id username friends").lean()
        if (!opponent) return res.status(404).json({ message: "Opponent not found" })
        if (String(opponent._id) === String(meId)) return res.status(400).json({ message: "You cannot battle yourself" })

        // Optional: enforce friends-only battles (recommended)
        const meDoc = await User.findById(meId).select("friends").lean()
        const isFriend =
            (meDoc?.friends || []).some((id) => String(id) === String(opponent._id))

        if (!isFriend) {
            return res.status(403).json({ message: "You can only battle friends for now." })
        }

        // Pick question set
        const picked = await pickBattleQuestions({ subjectId, lessonId })
        if (!picked.ok) {
            return res.status(400).json({ message: "Not enough questions in this scope." })
        }

        // Default expiry 24h
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

        const battle = await Battle.create({
            createdBy: meId,
            opponent: opponent._id,
            status: "pending",
            subjectId,
            lessonId,
            questionIds: picked.ids,
            expiresAt,
        })

        return res.status(201).json({
            message: "Battle created",
            battleId: String(battle._id),
        })
    } catch (err) {
        // Duplicate pending invite between same pair
        if (String(err?.code) === "11000") {
            return res.status(409).json({ message: "A pending battle invite already exists." })
        }
        console.error("createBattle error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * GET /api/battles
 * Returns my battles, newest first
 */
exports.getMyBattles = async (req, res) => {
    try {
        const meId = req.user?._id

        // auto-expire pending/active battles if past expiresAt
        await Battle.updateMany(
            { status: { $in: ["pending", "active"] }, expiresAt: { $lt: new Date() } },
            { $set: { status: "expired" } }
        )

        const battles = await Battle.find({
            $or: [{ createdBy: meId }, { opponent: meId }],
        })
            .populate("createdBy", "username")
            .populate("opponent", "username")
            .sort({ createdAt: -1 })
            .lean()

        return res.json(battles.map((b) => publicBattle(b, meId)))
    } catch (err) {
        console.error("getMyBattles error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * POST /api/battles/:battleId/accept
 * Only opponent can accept
 */
exports.acceptBattle = async (req, res) => {
    try {
        const meId = req.user?._id
        const battleId = req.params.battleId

        const battle = await Battle.findOne({ _id: battleId }).lean()
        if (!battle) return res.status(404).json({ message: "Battle not found" })

        if (battle.status !== "pending") {
            return res.status(400).json({ message: "Battle is not pending." })
        }

        if (String(battle.opponent) !== String(meId)) {
            return res.status(403).json({ message: "Only the opponent can accept this battle." })
        }

        if (new Date(battle.expiresAt) < new Date()) {
            await Battle.updateOne({ _id: battleId }, { $set: { status: "expired" } })
            return res.status(400).json({ message: "Battle expired." })
        }

        await Battle.updateOne({ _id: battleId }, { $set: { status: "active" } })

        return res.json({ message: "Battle accepted" })
    } catch (err) {
        console.error("acceptBattle error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * POST /api/battles/:battleId/decline
 * Only opponent can decline
 */
exports.declineBattle = async (req, res) => {
    try {
        const meId = req.user?._id
        const battleId = req.params.battleId

        const battle = await Battle.findOne({ _id: battleId }).lean()
        if (!battle) return res.status(404).json({ message: "Battle not found" })

        if (battle.status !== "pending") {
            return res.status(400).json({ message: "Battle is not pending." })
        }

        if (String(battle.opponent) !== String(meId)) {
            return res.status(403).json({ message: "Only the opponent can decline this battle." })
        }

        await Battle.updateOne({ _id: battleId }, { $set: { status: "declined" } })
        return res.json({ message: "Battle declined" })
    } catch (err) {
        console.error("declineBattle error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * GET /api/battles/:battleId
 * Detail (includes questionIds)
 */
exports.getBattleById = async (req, res) => {
    try {
        const meId = req.user?._id
        const battleId = req.params.battleId

        const battle = await Battle.findOne({
            _id: battleId,
            $or: [{ createdBy: meId }, { opponent: meId }],
        })
            .populate("createdBy", "username")
            .populate("opponent", "username")
            .lean()

        if (!battle) return res.status(404).json({ message: "Battle not found" })

        // auto expire if needed
        if (["pending", "active"].includes(battle.status) && new Date(battle.expiresAt) < new Date()) {
            await Battle.updateOne({ _id: battleId }, { $set: { status: "expired" } })
            battle.status = "expired"
        }

        return res.json(publicBattle(battle, meId))
    } catch (err) {
        console.error("getBattleById error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * POST /api/battles/:battleId/submit
 * body: { attemptId }
 * Each user submits their own QuizAttempt id. When both submitted, resolve winner.
 */
exports.submitBattleAttempt = async (req, res) => {
    const session = await mongoose.startSession()
    try {
        const meId = req.user?._id
        const battleId = req.params.battleId
        const attemptId = String(req.body.attemptId || "").trim()

        if (!mongoose.Types.ObjectId.isValid(attemptId)) {
            return res.status(400).json({ message: "attemptId must be a valid ObjectId" })
        }

        session.startTransaction()

        const battle = await Battle.findOne({
            _id: battleId,
            $or: [{ createdBy: meId }, { opponent: meId }],
        }).session(session)

        if (!battle) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Battle not found" })
        }

        if (!["active", "pending"].includes(battle.status)) {
            await session.abortTransaction()
            return res.status(400).json({ message: "Battle is not active." })
        }

        // If it was still pending but creator submits, allow it (opponent can accept later)
        if (battle.status === "pending" && String(battle.opponent) === String(meId)) {
            await session.abortTransaction()
            return res.status(400).json({ message: "Accept the battle before submitting." })
        }

        if (new Date(battle.expiresAt) < new Date()) {
            battle.status = "expired"
            await battle.save({ session })
            await session.commitTransaction()
            return res.status(400).json({ message: "Battle expired." })
        }

        // Validate attempt belongs to user
        const attempt = await QuizAttempt.findById(attemptId).session(session).lean()
        if (!attempt) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Attempt not found" })
        }

        // IMPORTANT: adjust field name if your QuizAttempt uses a different user field
        if (String(attempt.user) !== String(meId)) {
            await session.abortTransaction()
            return res.status(403).json({ message: "This attempt does not belong to you." })
        }

        // Attach attempt to correct side
        if (String(battle.createdBy) === String(meId)) {
            if (battle.createdByAttemptId) {
                await session.abortTransaction()
                return res.status(409).json({ message: "You already submitted an attempt." })
            }
            battle.createdByAttemptId = attemptId
        } else {
            if (battle.opponentAttemptId) {
                await session.abortTransaction()
                return res.status(409).json({ message: "You already submitted an attempt." })
            }
            battle.opponentAttemptId = attemptId
        }

        // If opponent hadn't accepted yet but now creator submitted, keep status pending; else active
        if (battle.status === "pending" && battle.opponentAttemptId) {
            // won't happen because opponent can't submit while pending
        }

        // Resolve if both submitted
        if (battle.createdByAttemptId && battle.opponentAttemptId) {
            const winnerId = await resolveBattleWinner(battle)
            battle.winner = winnerId ? winnerId : null
            battle.status = "completed"
        } else {
            // Ensure active once accepted
            if (battle.status === "pending") {
                // creator can submit while pending; opponent must accept later -> keep pending
            } else {
                battle.status = "active"
            }
        }

        await battle.save({ session })
        await session.commitTransaction()

        return res.json({
            message: "Attempt submitted",
            status: battle.status,
            winner: battle.winner ? String(battle.winner) : null,
        })
    } catch (err) {
        await session.abortTransaction()
        console.error("submitBattleAttempt error:", err)
        return res.status(500).json({ message: "Server error" })
    } finally {
        session.endSession()
    }
}
