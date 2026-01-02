const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { getAllSubjects } = require("../controllers/subjectsController");

// Protected: must be logged in
router.get("/", requireAuth, getAllSubjects);

module.exports = router;
