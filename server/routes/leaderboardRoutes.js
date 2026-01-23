const express = require("express")
const router = express.Router()

const { requireAuth } = require("../middleware/authMiddleware")
const leaderboardController = require("../controllers/leaderboardController")

router.get("/", requireAuth, leaderboardController.getLeaderboard)

module.exports = router
