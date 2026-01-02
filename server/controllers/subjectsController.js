const Subject = require("../schema/Subject");

// GET /api/subjects
async function getAllSubjects(req, res) {
    try {
        const subjects = await Subject.find({ isActive: true })
            .sort({ orderIndex: 1 })
            .select("-_id subjectId name code icon color");

        res.json(subjects);
    } catch (err) {
        console.error("Get subjects error:", err);
        res.status(500).json({ message: "Failed to fetch subjects" });
    }
}

module.exports = {
    getAllSubjects
};
