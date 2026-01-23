const express = require("express")
const router = express.Router()

const { requireAuth } = require("../middleware/authMiddleware")
const battlesController = require("../controllers/battleController")

// all battle routes require login
router.use(requireAuth)

// Create battle invite
// POST /api/battles
router.post("/", battlesController.createBattle)

// List my battles (requests/active/history all together for now)
// GET /api/battles
router.get("/", battlesController.getMyBattles)

// Get one battle detail (includes questionIds)
// GET /api/battles/:battleId
router.get("/:battleId", battlesController.getBattleById)

// Accept / Decline (opponent only)
// POST /api/battles/:battleId/accept
router.post("/:battleId/accept", battlesController.acceptBattle)

// POST /api/battles/:battleId/decline
router.post("/:battleId/decline", battlesController.declineBattle)

// Submit attempt result (link QuizAttempt id)
// POST /api/battles/:battleId/submit
router.post("/:battleId/submit", battlesController.submitBattleAttempt)

module.exports = router
