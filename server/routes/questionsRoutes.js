const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { getQuestionsByLesson, getQuestionsByIds } = require("../controllers/questionsController");

// Protected: must be logged in
router.get("/", requireAuth, getQuestionsByLesson);
router.post("/by-ids", requireAuth, getQuestionsByIds)

module.exports = router;
