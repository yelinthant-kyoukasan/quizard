const express = require("express")
const router = express.Router()

const { requireAuth } = require("../middleware/authMiddleware")
const tournamentsController = require("../controllers/tournamentsController")

// all tournament routes require login
router.use(requireAuth)

// Create tournament
// POST /api/tournaments
router.post("/", tournamentsController.createTournament)

// List my tournaments (hosted + joined)
// GET /api/tournaments
router.get("/", tournamentsController.getMyTournaments)

// Join by code
// POST /api/tournaments/join
router.post("/join", tournamentsController.joinTournamentByCode)

// Tournament detail (includes questionIds)
// GET /api/tournaments/:tournamentId
router.get("/:tournamentId", tournamentsController.getTournamentById)

// Submit my attempt
// POST /api/tournaments/:tournamentId/submit
router.post("/:tournamentId/submit", tournamentsController.submitTournamentAttempt)

// Leaderboard
// GET /api/tournaments/:tournamentId/leaderboard
router.get("/:tournamentId/leaderboard", tournamentsController.getTournamentLeaderboard)

module.exports = router
