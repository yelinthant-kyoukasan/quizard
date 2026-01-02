const Question = require("../schema/Question");

// GET /api/questions?lessonId=1
async function getQuestionsByLesson(req, res) {
    try {
        const { lessonId } = req.query;

        if (!lessonId) {
            return res.status(400).json({ message: "lessonId is required" });
        }

        const questions = await Question.find({
            lessonId: Number(lessonId),
            isActive: true
        })
            .sort({ orderIndex: 1 })
            .select(
                "-_id questionId lessonId subjectId type questionText options difficulty xp orderIndex"
            );

        res.json(questions);
    } catch (err) {
        console.error("Get questions error:", err);
        res.status(500).json({ message: "Failed to fetch questions" });
    }
}

module.exports = {
    getQuestionsByLesson
};
