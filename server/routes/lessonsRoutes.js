const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { getLessonsBySubject } = require("../controllers/lessonsController");

// Protected: must be logged in
router.get("/", requireAuth, getLessonsBySubject);

module.exports = router;
