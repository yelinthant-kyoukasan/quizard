const express = require("express");
const router = express.Router();

const {
    register,
    login,
    logout,
    getMe
} = require("../controllers/authController");

const { requireAuth } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);

module.exports = router;
