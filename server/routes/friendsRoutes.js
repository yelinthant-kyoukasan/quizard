const express = require("express")
const router = express.Router()

const { requireAuth } = require("../middleware/authMiddleware")
const friendsController = require("../controllers/friendsController")

// All friend features require login
router.use(requireAuth)

/**
 * User search (by username)
 * GET /api/users/search?username=ali
 */
router.get("/users/search", friendsController.searchUsers)

/**
 * Send friend request
 * POST /api/friends/request   { username: "alice" }
 */
router.post("/friends/request", friendsController.sendFriendRequest)

/**
 * Requests inbox/outbox
 */
router.get("/friends/requests/incoming", friendsController.getIncomingRequests)
router.get("/friends/requests/outgoing", friendsController.getOutgoingRequests)

/**
 * Accept / reject / cancel
 */
router.post("/friends/requests/:requestId/accept", friendsController.acceptRequest)
router.post("/friends/requests/:requestId/reject", friendsController.rejectRequest)
router.delete("/friends/requests/:requestId", friendsController.cancelOutgoingRequest)

/**
 * Friends list + unfriend
 */
router.get("/friends", friendsController.getFriends)
router.delete("/friends/:friendUserId", friendsController.unfriend)

module.exports = router
