const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { getQuestionsByLesson } = require("../controllers/questionsController");

// Protected: must be logged in
router.get("/", requireAuth, getQuestionsByLesson);

module.exports = router;
