const Lesson = require("../schema/Lesson");

// GET /api/lessons?subjectId=1
async function getLessonsBySubject(req, res) {
    try {
        const { subjectId } = req.query;

        if (!subjectId) {
            return res.status(400).json({ message: "subjectId is required" });
        }

        const lessons = await Lesson.find({
            subjectId: Number(subjectId),
            isActive: true
        })
            .sort({ orderIndex: 1 })
            .select(
                "-_id lessonId subjectId title description difficulty xpReward questionCount estimatedMinutes"
            );

        res.json(lessons);
    } catch (err) {
        console.error("Get lessons error:", err);
        res.status(500).json({ message: "Failed to fetch lessons" });
    }
}

module.exports = {
    getLessonsBySubject
};
