const jwt = require("jsonwebtoken");

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET missing in server/.env");
    }
    return secret;
}

// Keep this short-ish for security, but not annoying for students.
const DEFAULT_EXPIRES_IN = "7d";

function signToken(payload, expiresIn = DEFAULT_EXPIRES_IN) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

function verifyToken(token) {
    return jwt.verify(token, getJwtSecret());
}

module.exports = {
    signToken,
    verifyToken,
    DEFAULT_EXPIRES_IN
};
