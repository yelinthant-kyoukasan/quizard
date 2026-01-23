const express = require("express")
const router = express.Router()

const { requireAuth } = require("../middleware/authMiddleware")
const progressController = require("../controllers/progressController")

// /api/progress/overview
router.get("/overview", requireAuth, progressController.getProgressOverview)

// /api/progress/subject/:subjectId
router.get("/subject/:subjectId", requireAuth, progressController.getSubjectProgress)

module.exports = router
