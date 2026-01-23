const Question = require("../schema/Question")
const Lesson = require("../schema/Lesson")
const QuizAttempt = require("../schema/QuizAttempt")
const LessonProgress = require("../schema/LessonProgress")
const User = require("../schema/User")

// Completion rule (tweak anytime)
const COMPLETION_ACCURACY = 60

/**
 * POST /api/quiz/submit
 * Body:
 * {
 *   lessonId: number,
 *   answers: number[]
 * }
 */
exports.submitQuiz = async (req, res) => {
    try {
        const userId = req.user._id
        const { lessonId, answers } = req.body
        const timeTakenSeconds = Number(req.body.timeTakenSeconds || 0)

        if (!lessonId || !Array.isArray(answers)) {
            return res.status(400).json({
                message: "lessonId and answers array are required",
            })
        }

        // 1) Fetch lesson (to get subjectId)
        const lesson = await Lesson.findOne({ lessonId })
        if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" })
        }

        // 2) Fetch questions WITH correct answers (server-side only)
        const questions = await Question.find({
            lessonId,
            isActive: true,
        }).sort({ orderIndex: 1 })

        if (questions.length === 0) {
            return res.status(400).json({
                message: "No questions found for this lesson",
            })
        }

        if (answers.length !== questions.length) {
            return res.status(400).json({
                message: "Answer count does not match question count",
            })
        }

        // 3) Compare answers
        let correctCount = 0
        let xpEarned = 0

        const answerAlphabet = ['A', 'B', 'C', 'D'];

        questions.forEach((q, index) => {
            if (answerAlphabet[answers[index]] === q.correctAnswer) {
                correctCount++
                xpEarned += q.xp || 0
            }
        })

        const totalQuestions = questions.length
        const accuracy = Math.round((correctCount / totalQuestions) * 100)

        // 4) Update user (XP, streak, lives)
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        // XP
        user.xp = (user.xp || 0) + xpEarned

        // Streak logic (forgiving)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (user.lastStudyDate) {
            const last = new Date(user.lastStudyDate)
            last.setHours(0, 0, 0, 0)

            const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24))

            if (diffDays === 1) user.streak += 1
            else if (diffDays > 1) user.streak = 1
            // diffDays === 0 → same day, keep streak
        } else {
            user.streak = 1
        }

        user.lastStudyDate = new Date()

        // Lives logic (gentle)
        if (accuracy < 50) {
            user.lives = Math.max((user.lives || 5) - 1, 0)
        }

        await user.save()

        // 5) Save quiz attempt (history)
        const attempt = await QuizAttempt.create({
            user: userId,
            subjectId: lesson.subjectId,
            lessonId,
            answers,
            correctCount,
            totalQuestions,
            xpEarned,
            accuracy,
            timeTakenSeconds
        })

        // 6) ✅ Update progress (explicit completion)
        // Rule: mark completed only if accuracy >= COMPLETION_ACCURACY
        let isLessonCompleted = false

        if (accuracy >= COMPLETION_ACCURACY) {
            // Upsert: one user + one lesson only
            // - keep best accuracy using $max
            // - completedAt only set on first completion
            await LessonProgress.findOneAndUpdate(
                { user: userId, lessonId },
                {
                    $set: {
                        subjectId: lesson.subjectId,
                        status: "completed",
                    },
                    $max: { accuracy: accuracy },
                    $setOnInsert: { completedAt: new Date() },
                },
                { upsert: true, new: true }
            )

            isLessonCompleted = true
        } else {
            // If they already completed earlier, don't downgrade
            const existing = await LessonProgress.findOne({
                user: userId,
                lessonId,
            }).select("_id")
            isLessonCompleted = !!existing
        }

        // 7) Return safe response (no correct answers)
        return res.json({
            correct: correctCount,
            total: totalQuestions,
            accuracy,
            xpEarned,
            newXp: user.xp,
            streak: user.streak,
            lives: user.lives,
            attemptId: attempt._id,

            // ✅ New: progress info
            completionThreshold: COMPLETION_ACCURACY,
            isLessonCompleted,
        })
    } catch (err) {
        console.error("Quiz submission error:", err)
        return res.status(500).json({
            message: "Failed to submit quiz",
        })
    }
}

/**
 * POST /api/quiz/submit-by-ids
 * Body:
 * {
 *   subjectId: number,
 *   lessonId?: number | null,
 *   questionIds: number[],
 *   answers: number[],
 *   timeTakenSeconds?: number
 * }
 *
 * Used for battles/tournaments (fixed question set).
 */
exports.submitQuizByIds = async (req, res) => {
    try {
        const userId = req.user._id
        const { subjectId, lessonId = null, questionIds, answers, timeTakenSeconds = 0 } = req.body

        if (!subjectId || !Array.isArray(questionIds) || !Array.isArray(answers)) {
            return res.status(400).json({ message: "subjectId, questionIds, answers are required" })
        }

        if (questionIds.length === 0) {
            return res.status(400).json({ message: "questionIds cannot be empty" })
        }

        if (answers.length !== questionIds.length) {
            return res.status(400).json({ message: "Answer count does not match question count" })
        }

        // Fetch questions by questionId
        const questions = await Question.find({
            questionId: { $in: questionIds.map((x) => Number(x)) },
            isActive: true,
        }).lean()

        if (questions.length === 0) {
            return res.status(400).json({ message: "No questions found for these IDs" })
        }

        // Order questions in the same order as questionIds (fairness)
        const qMap = new Map(questions.map((q) => [Number(q.questionId), q]))
        const orderedQuestions = questionIds.map((id) => qMap.get(Number(id))).filter(Boolean)

        if (orderedQuestions.length !== questionIds.length) {
            return res.status(400).json({ message: "Some questions are missing or inactive" })
        }

        // Compare answers
        let correctCount = 0
        let xpEarned = 0
        const answerAlphabet = ["A", "B", "C", "D"]

        orderedQuestions.forEach((q, index) => {
            if (answerAlphabet[answers[index]] === q.correctAnswer) {
                correctCount++
                xpEarned += q.xp || 0
            }
        })

        const totalQuestions = orderedQuestions.length
        const accuracy = Math.round((correctCount / totalQuestions) * 100)

        // Update user XP/streak/lives (same logic as submitQuiz)
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: "User not found" })

        user.xp = (user.xp || 0) + xpEarned

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (user.lastStudyDate) {
            const last = new Date(user.lastStudyDate)
            last.setHours(0, 0, 0, 0)
            const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24))
            if (diffDays === 1) user.streak += 1
            else if (diffDays > 1) user.streak = 1
        } else {
            user.streak = 1
        }

        user.lastStudyDate = new Date()

        if (accuracy < 50) {
            user.lives = Math.max((user.lives || 5) - 1, 0)
        }

        await user.save()

        // Save attempt (include timeTakenSeconds)
        const attempt = await QuizAttempt.create({
            user: userId,
            subjectId: Number(subjectId),
            lessonId: lessonId ? Number(lessonId) : null,
            questionIds: questionIds.map((x) => Number(x)), // add this field if you want (optional)
            answers,
            correctCount,
            totalQuestions,
            xpEarned,
            accuracy,
            timeTakenSeconds: Number(timeTakenSeconds) || 0,
        })

        // Progress update only if lessonId exists (because subject-wide has no single lesson)
        let isLessonCompleted = false

        if (lessonId) {
            if (accuracy >= COMPLETION_ACCURACY) {
                await LessonProgress.findOneAndUpdate(
                    { user: userId, lessonId: Number(lessonId) },
                    {
                        $set: { subjectId: Number(subjectId), status: "completed" },
                        $max: { accuracy },
                        $setOnInsert: { completedAt: new Date() },
                    },
                    { upsert: true, new: true }
                )
                isLessonCompleted = true
            } else {
                const existing = await LessonProgress.findOne({
                    user: userId,
                    lessonId: Number(lessonId),
                }).select("_id")
                isLessonCompleted = !!existing
            }
        }

        return res.json({
            correct: correctCount,
            total: totalQuestions,
            accuracy,
            xpEarned,
            newXp: user.xp,
            streak: user.streak,
            lives: user.lives,
            attemptId: attempt._id,
            timeTakenSeconds: Number(timeTakenSeconds) || 0,

            completionThreshold: COMPLETION_ACCURACY,
            isLessonCompleted,
        })
    } catch (err) {
        console.error("submitQuizByIds error:", err)
        return res.status(500).json({ message: "Failed to submit quiz" })
    }
}

