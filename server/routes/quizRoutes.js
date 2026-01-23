const express = require("express")
const router = express.Router()

const { requireAuth } = require("../middleware/authMiddleware")
const quizController = require("../controllers/quizController")

// POST /api/quiz/submit
router.post("/submit", requireAuth, quizController.submitQuiz)
router.post("/submit-by-ids", requireAuth, quizController.submitQuizByIds)

module.exports = router
