const User = require("../schema/User");
const { verifyToken } = require("../utils/jwt");

async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = verifyToken(token);

        // decoded should contain { userId }
        const user = await User.findById(decoded.userId).select("-passwordHash");

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = {
    requireAuth
};
