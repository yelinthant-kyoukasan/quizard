const bcrypt = require("bcryptjs");
const User = require("../schema/User");
const { signToken } = require("../utils/jwt");

// Helper to send JWT as httpOnly cookie
function sendAuthCookie(res, token) {
    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

// ==========================
// Register
// ==========================
async function register(req, res) {
    try {
        const { name, username, email, password } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({ message: "Email or username already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            username,
            email,
            passwordHash
        });

        const token = signToken({ userId: user._id });

        sendAuthCookie(res, token);

        res.status(201).json({
            message: "Registration successful",
            user
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// ==========================
// Login
// ==========================
async function login(req, res) {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({
            $or: [
                { email: emailOrUsername.toLowerCase() },
                { username: emailOrUsername.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = signToken({ userId: user._id });

        sendAuthCookie(res, token);

        res.json({
            message: "Login successful",
            user
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// ==========================
// Logout
// ==========================
function logout(req, res) {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
}

// ==========================
// Get current user
// ==========================
function getMe(req, res) {
    // req.user is attached by auth middleware
    res.json(req.user);
}

module.exports = {
    register,
    login,
    logout,
    getMe
};
