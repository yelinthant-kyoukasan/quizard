const mongoose = require("mongoose")
const Tournament = require("../schema/Tournament")
const TournamentParticipant = require("../schema/TournamentParticipant")
const Question = require("../schema/Question") // adjust if your Question model path differs
const QuizAttempt = require("../schema/QuizAttempt") // adjust if your QuizAttempt is under schema/
const User = require("../schema/User")

function safeNum(n) {
    const x = Number(n)
    return Number.isFinite(x) ? x : 0
}

function isValidNumberOrNull(v) {
    if (v === null || v === undefined || v === "") return true
    const n = Number(v)
    return Number.isFinite(n)
}

function publicUser(u) {
    return {
        userId: String(u._id),
        username: u.username,
        name: u.name || u.username,
        xp: safeNum(u.xp),
        level: safeNum(u.level),
        streakDays: safeNum(u.streakDays),
    }
}

function makeJoinCode(len = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no confusing 0/O/1/I
    let out = ""
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
    return out
}

async function generateUniqueJoinCode() {
    for (let i = 0; i < 10; i++) {
        const code = makeJoinCode(6)
        const exists = await Tournament.findOne({ joinCode: code }).select("_id").lean()
        if (!exists) return code
    }
    // fallback
    return makeJoinCode(8)
}

async function pickTournamentQuestions({ subjectId, lessonId }) {
    const match = { subjectId: `${subjectId}`, isActive: true }
    if (lessonId !== null && lessonId !== undefined) match.lessonId = `${lessonId}`

    const picked = await Question.aggregate([
        { $match: match },
        { $sample: { size: 15 } },
        { $project: { _id: 0, questionId: 1 } },
    ])

    const ids = picked.map((p) => p.questionId).filter((x) => Number.isFinite(Number(x)))
    if (ids.length < 15) return { ok: false, ids: [] }
    return { ok: true, ids }
}

async function refreshTournamentStatus(tournament) {
    const now = new Date()
    let status = tournament.status

    if (status !== "cancelled") {
        if (now >= new Date(tournament.endsAt)) status = "completed"
        else if (now >= new Date(tournament.joinClosesAt)) status = "running"
        else status = "open"
    }

    if (status !== tournament.status) {
        await Tournament.updateOne({ _id: tournament._id }, { $set: { status } })
        tournament.status = status
    }

    return tournament
}

/**
 * POST /api/tournaments
 * body: { title, subjectId, lessonId?, joinHours?, playHours? }
 *
 * Defaults:
 *  - join window: 24h
 *  - play window: 48h
 */
exports.createTournament = async (req, res) => {
    try {
        const meId = req.user?._id

        const title = String(req.body.title || "").trim()
        const subjectId = Number(req.body.subjectId)
        const lessonIdRaw = req.body.lessonId ?? null
        const lessonId = lessonIdRaw === null || lessonIdRaw === "" ? null : Number(lessonIdRaw)

        const joinHours = Math.min(Math.max(parseInt(req.body.joinHours || "24", 10), 1), 168) // 1h - 7d
        const playHours = Math.min(Math.max(parseInt(req.body.playHours || "48", 10), 1), 168)

        if (!title) return res.status(400).json({ message: "title is required" })
        if (!Number.isFinite(subjectId)) return res.status(400).json({ message: "subjectId must be a number" })
        if (!isValidNumberOrNull(lessonId)) return res.status(400).json({ message: "lessonId must be a number or null" })

        // Pick question set (15)
        const picked = await pickTournamentQuestions({ subjectId, lessonId })
        if (!picked.ok) return res.status(400).json({ message: "Not enough questions in this scope." })

        const joinCode = await generateUniqueJoinCode()

        const now = Date.now()
        const joinClosesAt = new Date(now + joinHours * 60 * 60 * 1000)
        const endsAt = new Date(now + playHours * 60 * 60 * 1000)

        if (endsAt <= joinClosesAt) {
            return res.status(400).json({ message: "playHours must be greater than joinHours." })
        }

        const t = await Tournament.create({
            host: meId,
            title,
            joinCode,
            subjectId,
            lessonId,
            questionIds: picked.ids,
            joinClosesAt,
            endsAt,
            status: "open",
        })

        // Host auto-joins as participant
        await TournamentParticipant.create({
            tournament: t._id,
            user: meId,
        })

        return res.status(201).json({
            message: "Tournament created",
            tournamentId: String(t._id),
            joinCode: t.joinCode,
            joinClosesAt: t.joinClosesAt,
            endsAt: t.endsAt,
        })
    } catch (err) {
        if (String(err?.code) === "11000") {
            return res.status(409).json({ message: "Duplicate joinCode. Try again." })
        }
        console.error("createTournament error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * POST /api/tournaments/join
 * body: { joinCode }
 */
exports.joinTournamentByCode = async (req, res) => {
    try {
        const meId = req.user?._id
        const joinCode = String(req.body.joinCode || "").trim().toUpperCase()
        if (!joinCode) return res.status(400).json({ message: "joinCode is required" })

        const t = await Tournament.findOne({ joinCode }).lean()
        if (!t) return res.status(404).json({ message: "Tournament not found" })

        await refreshTournamentStatus(t)

        if (t.status !== "open") {
            return res.status(400).json({ message: "Tournament is not open for joining." })
        }

        if (new Date() > new Date(t.joinClosesAt)) {
            return res.status(400).json({ message: "Join period has ended." })
        }

        await TournamentParticipant.create({
            tournament: t._id,
            user: meId,
        })

        return res.json({
            message: "Joined tournament",
            tournamentId: String(t._id),
        })
    } catch (err) {
        if (String(err?.code) === "11000") {
            return res.status(409).json({ message: "You already joined this tournament." })
        }
        console.error("joinTournamentByCode error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * GET /api/tournaments
 * simple list: hosted + joined (latest first)
 */
exports.getMyTournaments = async (req, res) => {
    try {
        const meId = req.user?._id

        // Find tournaments I joined
        const joined = await TournamentParticipant.find({ user: meId })
            .select("tournament")
            .lean()

        const joinedIds = joined.map((p) => p.tournament)

        const tournaments = await Tournament.find({
            $or: [{ host: meId }, { _id: { $in: joinedIds } }],
        })
            .populate("host", "username name")
            .sort({ createdAt: -1 })
            .lean()

        // refresh statuses (best effort)
        for (const t of tournaments) {
            // eslint-disable-next-line no-await-in-loop
            await refreshTournamentStatus(t)
        }

        const mapped = tournaments.map((t) => ({
            tournamentId: String(t._id),
            title: t.title,
            joinCode: t.joinCode,
            status: t.status,
            subjectId: t.subjectId,
            lessonId: t.lessonId ?? null,
            joinClosesAt: t.joinClosesAt,
            endsAt: t.endsAt,
            host: t.host ? { username: t.host.username, name: t.host.name || t.host.username } : null,
            createdAt: t.createdAt,
        }))

        return res.json(mapped)
    } catch (err) {
        console.error("getMyTournaments error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * GET /api/tournaments/:tournamentId
 * detail + whether I joined + whether I submitted
 */
exports.getTournamentById = async (req, res) => {
    try {
        const meId = req.user?._id
        const tournamentId = req.params.tournamentId

        const t = await Tournament.findById(tournamentId)
            .populate("host", "username name")
            .lean()

        if (!t) return res.status(404).json({ message: "Tournament not found" })

        await refreshTournamentStatus(t)

        const participant = await TournamentParticipant.findOne({
            tournament: t._id,
            user: meId,
        })
            .select("attemptId joinedAt submittedAt")
            .lean()

        return res.json({
            tournamentId: String(t._id),
            title: t.title,
            joinCode: t.joinCode,
            status: t.status,
            subjectId: t.subjectId,
            lessonId: t.lessonId ?? null,
            questionIds: t.questionIds, // needed for quiz play
            joinClosesAt: t.joinClosesAt,
            endsAt: t.endsAt,
            host: t.host ? { username: t.host.username, name: t.host.name || t.host.username } : null,
            me: {
                joined: !!participant,
                attemptId: participant?.attemptId ? String(participant.attemptId) : null,
                joinedAt: participant?.joinedAt || null,
                submittedAt: participant?.submittedAt || null,
            },
        })
    } catch (err) {
        console.error("getTournamentById error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

/**
 * POST /api/tournaments/:tournamentId/submit
 * body: { attemptId }
 *
 * One attempt per user. Must have joined.
 */
exports.submitTournamentAttempt = async (req, res) => {
    const session = await mongoose.startSession()
    try {
        const meId = req.user?._id
        const tournamentId = req.params.tournamentId
        const attemptId = String(req.body.attemptId || "").trim()

        if (!mongoose.Types.ObjectId.isValid(attemptId)) {
            return res.status(400).json({ message: "attemptId must be a valid ObjectId" })
        }

        session.startTransaction()

        const t = await Tournament.findById(tournamentId).session(session)
        if (!t) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Tournament not found" })
        }

        await refreshTournamentStatus(t)

        if (t.status === "cancelled") {
            await session.abortTransaction()
            return res.status(400).json({ message: "Tournament cancelled." })
        }
        if (t.status === "completed") {
            await session.abortTransaction()
            return res.status(400).json({ message: "Tournament has ended." })
        }

        const p = await TournamentParticipant.findOne({
            tournament: t._id,
            user: meId,
        }).session(session)

        if (!p) {
            await session.abortTransaction()
            return res.status(403).json({ message: "You must join this tournament first." })
        }

        if (p.attemptId) {
            await session.abortTransaction()
            return res.status(409).json({ message: "You already submitted an attempt." })
        }

        const attempt = await QuizAttempt.findById(attemptId).session(session).lean()
        if (!attempt) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Attempt not found" })
        }

        // IMPORTANT: adjust if your QuizAttempt uses different user field
        if (String(attempt.user) !== String(meId)) {
            await session.abortTransaction()
            return res.status(403).json({ message: "This attempt does not belong to you." })
        }

        // Cache stats for leaderboard fast
        p.attemptId = attemptId
        p.correctCount = safeNum(attempt.correctCount)
        p.totalQuestions = safeNum(attempt.totalQuestions)
        p.timeTakenSeconds = safeNum(attempt.timeTakenSeconds)
        p.xpEarned = safeNum(attempt.xpEarned)
        p.submittedAt = new Date()

        await p.save({ session })

        await session.commitTransaction()

        return res.json({ message: "Tournament attempt submitted" })
    } catch (err) {
        await session.abortTransaction()
        console.error("submitTournamentAttempt error:", err)
        return res.status(500).json({ message: "Server error" })
    } finally {
        session.endSession()
    }
}

/**
 * GET /api/tournaments/:tournamentId/leaderboard
 * Ranks by accuracy then time
 */
exports.getTournamentLeaderboard = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId

        const t = await Tournament.findById(tournamentId).lean()
        if (!t) return res.status(404).json({ message: "Tournament not found" })

        await refreshTournamentStatus(t)

        const participants = await TournamentParticipant.find({ tournament: t._id })
            .populate("user", "username name xp level streakDays")
            .lean()

        // Only those who submitted attempt are ranked
        const submitted = participants
            .filter((p) => p.attemptId)
            .map((p) => {
                const correct = safeNum(p.correctCount)
                const total = safeNum(p.totalQuestions)
                const acc = total > 0 ? correct / total : 0

                return {
                    user: publicUser(p.user),
                    correctCount: correct,
                    totalQuestions: total,
                    accuracy: acc,
                    timeTakenSeconds: safeNum(p.timeTakenSeconds),
                    xpEarned: safeNum(p.xpEarned),
                }
            })

        submitted.sort((a, b) => {
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
            // time tie-breaker: lower is better (0 means unknown, push down)
            const at = a.timeTakenSeconds > 0 ? a.timeTakenSeconds : 999999
            const bt = b.timeTakenSeconds > 0 ? b.timeTakenSeconds : 999999
            return at - bt
        })

        const rows = submitted.map((r, idx) => ({
            rank: idx + 1,
            ...r,
        }))

        return res.json({
            tournamentId: String(t._id),
            status: t.status,
            rows,
            submittedCount: rows.length,
            totalParticipants: participants.length,
        })
    } catch (err) {
        console.error("getTournamentLeaderboard error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}
