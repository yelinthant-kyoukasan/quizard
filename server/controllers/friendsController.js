const mongoose = require("mongoose")
const User = require("../schema/User")
const FriendRequest = require("../schema/FriendRequest") // you said model+schema combined here

// Helper: only return safe public fields
function publicUser(u) {
    return {
        userId: String(u._id),
        username: u.username,
        name: u.name || u.username,
        xp: u.xp || 0,
        level: u.level || 1,
        streakDays: u.streakDays || 0,
    }
}

// GET /api/users/search?username=ali
exports.searchUsers = async (req, res) => {
    try {
        const meId = req.user?._id
        const q = String(req.query.username || "").trim().toLowerCase()

        if (!q || q.length < 2) {
            return res.json([])
        }

        const users = await User.find({
            _id: { $ne: meId },
            username: { $regex: q, $options: "i" },
        })
            .select("username name xp level streakDays")
            .limit(10)
            .lean()

        return res.json(users.map(publicUser))
    } catch (err) {
        console.error("searchUsers error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// POST /api/friends/request  { username: "alice" }
exports.sendFriendRequest = async (req, res) => {
    try {
        const meId = req.user?._id
        const username = String(req.body.username || "").trim().toLowerCase()

        if (!username) return res.status(400).json({ message: "username is required" })

        const target = await User.findOne({ username }).select("_id username name").lean()
        if (!target) return res.status(404).json({ message: "User not found" })
        if (String(target._id) === String(meId)) {
            return res.status(400).json({ message: "You cannot add yourself" })
        }

        // already friends?
        const meDoc = await User.findById(meId).select("friends").lean()
        const alreadyFriends =
            (meDoc?.friends || []).some((id) => String(id) === String(target._id))

        if (alreadyFriends) {
            return res.status(400).json({ message: "Already friends" })
        }

        // if they already sent you a request, don't create a new one — tell frontend to accept instead
        const incoming = await FriendRequest.findOne({
            from: target._id,
            to: meId,
            status: "pending",
        }).lean()

        if (incoming) {
            return res.status(409).json({
                message: "This user already sent you a request. Accept it instead.",
                code: "INCOMING_REQUEST_EXISTS",
                requestId: String(incoming._id),
            })
        }

        // create outgoing request (unique pending index should protect duplicates)
        const reqDoc = await FriendRequest.create({
            from: meId,
            to: target._id,
            status: "pending",
        })

        return res.status(201).json({
            message: "Friend request sent",
            requestId: String(reqDoc._id),
            to: { userId: String(target._id), username: target.username, name: target.name || target.username },
        })
    } catch (err) {
        // duplicate pending request index -> E11000
        if (String(err?.code) === "11000") {
            return res.status(409).json({ message: "Friend request already pending" })
        }
        console.error("sendFriendRequest error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// GET /api/friends/requests/incoming
exports.getIncomingRequests = async (req, res) => {
    try {
        const meId = req.user?._id

        const requests = await FriendRequest.find({ to: meId, status: "pending" })
            .sort({ createdAt: -1 })
            .populate("from", "username name xp level streakDays")
            .lean()

        const mapped = requests.map((r) => ({
            requestId: String(r._id),
            from: publicUser(r.from),
            createdAt: r.createdAt,
        }))

        return res.json(mapped)
    } catch (err) {
        console.error("getIncomingRequests error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// GET /api/friends/requests/outgoing
exports.getOutgoingRequests = async (req, res) => {
    try {
        const meId = req.user?._id

        const requests = await FriendRequest.find({ from: meId, status: "pending" })
            .sort({ createdAt: -1 })
            .populate("to", "username name xp level streakDays")
            .lean()

        const mapped = requests.map((r) => ({
            requestId: String(r._id),
            to: publicUser(r.to),
            createdAt: r.createdAt,
        }))

        return res.json(mapped)
    } catch (err) {
        console.error("getOutgoingRequests error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// POST /api/friends/requests/:requestId/accept
exports.acceptRequest = async (req, res) => {
    const session = await mongoose.startSession()
    try {
        const meId = req.user?._id
        const requestId = req.params.requestId

        session.startTransaction()

        const request = await FriendRequest.findOne({
            _id: requestId,
            to: meId,
            status: "pending",
        }).session(session)

        if (!request) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Request not found" })
        }

        const fromId = request.from

        // add both ways (no duplicates)
        await User.updateOne(
            { _id: meId },
            { $addToSet: { friends: fromId } },
            { session }
        )
        await User.updateOne(
            { _id: fromId },
            { $addToSet: { friends: meId } },
            { session }
        )

        request.status = "accepted"
        await request.save({ session })

        await session.commitTransaction()

        return res.json({ message: "Friend request accepted" })
    } catch (err) {
        await session.abortTransaction()
        console.error("acceptRequest error:", err)
        return res.status(500).json({ message: "Server error" })
    } finally {
        session.endSession()
    }
}

// POST /api/friends/requests/:requestId/reject
exports.rejectRequest = async (req, res) => {
    try {
        const meId = req.user?._id
        const requestId = req.params.requestId

        const request = await FriendRequest.findOneAndUpdate(
            { _id: requestId, to: meId, status: "pending" },
            { $set: { status: "rejected" } },
            { new: true }
        ).lean()

        if (!request) return res.status(404).json({ message: "Request not found" })

        return res.json({ message: "Friend request rejected" })
    } catch (err) {
        console.error("rejectRequest error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// DELETE /api/friends/requests/:requestId (cancel outgoing)
exports.cancelOutgoingRequest = async (req, res) => {
    try {
        const meId = req.user?._id
        const requestId = req.params.requestId

        const deleted = await FriendRequest.findOneAndDelete({
            _id: requestId,
            from: meId,
            status: "pending",
        }).lean()

        if (!deleted) return res.status(404).json({ message: "Request not found" })

        return res.json({ message: "Friend request cancelled" })
    } catch (err) {
        console.error("cancelOutgoingRequest error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// GET /api/friends
exports.getFriends = async (req, res) => {
    try {
        const meId = req.user?._id

        const meDoc = await User.findById(meId)
            .select("friends")
            .populate("friends", "username name xp level streakDays")
            .lean()

        const friends = Array.isArray(meDoc?.friends) ? meDoc.friends : []
        return res.json(friends.map(publicUser))
    } catch (err) {
        console.error("getFriends error:", err)
        return res.status(500).json({ message: "Server error" })
    }
}

// DELETE /api/friends/:friendUserId
exports.unfriend = async (req, res) => {
    const session = await mongoose.startSession()
    try {
        const meId = req.user?._id
        const friendId = req.params.friendUserId

        if (!mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({ message: "Invalid friend user id" })
        }

        session.startTransaction()

        await User.updateOne(
            { _id: meId },
            { $pull: { friends: friendId } },
            { session }
        )

        await User.updateOne(
            { _id: friendId },
            { $pull: { friends: meId } },
            { session }
        )

        // Optional: clean any pending requests both ways
        await FriendRequest.deleteMany({
            $or: [
                { from: meId, to: friendId, status: "pending" },
                { from: friendId, to: meId, status: "pending" },
            ],
        }).session(session)

        await session.commitTransaction()
        return res.json({ message: "Unfriended" })
    } catch (err) {
        await session.abortTransaction()
        console.error("unfriend error:", err)
        return res.status(500).json({ message: "Server error" })
    } finally {
        session.endSession()
    }
}
