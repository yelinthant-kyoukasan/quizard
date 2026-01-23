const Lesson = require("../schema/Lesson")
const QuizAttempt = require("../schema/QuizAttempt")
const Subject = require("../schema/Subject")
const LessonProgress = require("../schema/LessonProgress")

// GET /api/progress/subject/:subjectId
exports.getSubjectProgress = async (req, res) => {
    try {
        const userId = req.user._id
        const subjectId = Number(req.params.subjectId)

        if (!subjectId) {
            return res.status(400).json({ message: "Invalid subjectId" })
        }

        // total lessons in this subject
        const totalLessons = await Lesson.countDocuments({ subjectId, isActive: true })

        // completed lessons = any attempt >= 60% for a lesson in this subject
        const attempts = await QuizAttempt.aggregate([
            { $match: { user: userId, subjectId } },
            {
                $group: {
                    _id: "$lessonId",
                    bestAccuracy: { $max: "$accuracy" },
                },
            },
            { $match: { bestAccuracy: { $gte: 60 } } },
        ])

        const completedLessonIds = attempts.map((a) => a._id)
        const completedLessons = completedLessonIds.length

        return res.json({
            subjectId,
            totalLessons,
            completedLessons,
            completedLessonIds,
            percent: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
        })
    } catch (err) {
        console.error("getSubjectProgress error:", err)
        return res.status(500).json({ error: "Failed to load subject progress." })
    }
}


// GET /api/progress/overview
exports.getProgressOverview = async (req, res) => {
    try {
        const userId = req.user._id

        const [subjects, lessons] = await Promise.all([
            Subject.find({ isActive: true }).lean(),
            Lesson.find({ isActive: true }).lean(),
        ])

        // total lessons per subject
        const totalLessonsBySubject = new Map()
        for (const l of lessons) {
            totalLessonsBySubject.set(l.subjectId, (totalLessonsBySubject.get(l.subjectId) || 0) + 1)
        }

        // best accuracy per lesson (per subject) for this user
        const completedAgg = await QuizAttempt.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: { subjectId: "$subjectId", lessonId: "$lessonId" },
                    bestAccuracy: { $max: "$accuracy" },
                },
            },
            { $match: { bestAccuracy: { $gte: 60 } } },
        ])


        // completed lessons per subject
        const completedLessonsBySubject = new Map()
        for (const row of completedAgg) {
            const sid = row._id.subjectId;
            const sidValue = (completedLessonsBySubject.get(sid) || 0) + 1;
            completedLessonsBySubject.set(sid, sidValue)
        }

        const perSubject = subjects.map((s) => {
            const totalLessons = totalLessonsBySubject.get(s.subjectId) || 0;
            const completedLessons = completedLessonsBySubject.get(parseInt(s.subjectId));
            return {
                subjectId: s.subjectId,
                name: s.name,
                totalCount: totalLessons,
                completedCount: completedLessons,
                percent: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
            }
        })

        const totalLessons = lessons.length
        const totalCompletedLessons = completedAgg.length

        return res.json({
            totalLessons,
            totalCompletedLessons,
            percent: totalLessons === 0 ? 0 : Math.round((totalCompletedLessons / totalLessons) * 100),
            subjects: perSubject,
        })
    } catch (err) {
        console.error("getProgressOverview error:", err)
        return res.status(500).json({ error: "Failed to load progress overview." })
    }
}
