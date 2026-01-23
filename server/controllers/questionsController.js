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

async function getQuestionsByIds(req, res) {
    try {
        const questionIds = Array.isArray(req.body.questionIds) ? req.body.questionIds : []

        if (questionIds.length === 0) {
            return res.status(400).json({ message: "questionIds is required" })
        }

        // cast both ways (works even if schema stores strings)
        const idsAsString = questionIds.map((id) => String(id))
        const idsAsNumber = questionIds
            .map((id) => Number(id))
            .filter((n) => Number.isFinite(n))
            .map((n) => String(n))

        const allIds = Array.from(new Set([...idsAsString, ...idsAsNumber]))

        const questions = await Question.find({
            questionId: { $in: allIds }, // if your field is question_id
            isActive: true,
        }).lean()

        // return in the same order as requested
        const map = new Map(questions.map((q) => [String(q.questionId), q]))
        const ordered = questionIds
            .map((id) => map.get(String(id)))
            .filter(Boolean)

        return res.json(ordered)
    } catch (err) {
        console.error("getQuestionsByIds error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}


module.exports = {
    getQuestionsByLesson,
    getQuestionsByIds
};
