import { apiFetch } from "./api"

export type PublicUser = {
    userId: string
    username: string
    name: string
    xp: number
    level: number
    streakDays: number
}

export type IncomingRequest = {
    requestId: string
    from: PublicUser
    createdAt: string
}

export type OutgoingRequest = {
    requestId: string
    to: PublicUser
    createdAt: string
}

// GET /api/users/search?username=ali
export function searchUsersByUsername(username: string) {
    const q = encodeURIComponent(username.trim())
    return apiFetch<PublicUser[]>(`/api/friends/users/search?username=${q}`)
}

// POST /api/friends/request  { username }
export function sendFriendRequest(username: string) {
    return apiFetch<{ message: string; requestId?: string }>(`/api/friends/friends/request`, {
        method: "POST",
        body: JSON.stringify({ username }),
    })
}

// GET /api/friends/requests/incoming
export function getIncomingFriendRequests() {
    return apiFetch<IncomingRequest[]>(`/api/friends/friends/requests/incoming`)
}

// GET /api/friends/requests/outgoing
export function getOutgoingFriendRequests() {
    return apiFetch<OutgoingRequest[]>(`/api/friends/friends/requests/outgoing`)
}

// POST /api/friends/requests/:requestId/accept
export function acceptFriendRequest(requestId: string) {
    return apiFetch<{ message: string }>(`/api/friends/friends/requests/${requestId}/accept`, {
        method: "POST",
    })
}

// POST /api/friends/requests/:requestId/reject
export function rejectFriendRequest(requestId: string) {
    return apiFetch<{ message: string }>(`/api/friends/friends/requests/${requestId}/reject`, {
        method: "POST",
    })
}

// DELETE /api/friends/requests/:requestId  (cancel outgoing)
export function cancelOutgoingRequest(requestId: string) {
    return apiFetch<{ message: string }>(`/api/friends/friends/requests/${requestId}`, {
        method: "DELETE",
    })
}

// GET /api/friends
export function getFriendsList() {
    return apiFetch<PublicUser[]>(`/api/friends/friends`)
}

// DELETE /api/friends/:friendUserId
export function unfriend(friendUserId: string) {
    return apiFetch<{ message: string }>(`/api/friends/friends/${friendUserId}`, {
        method: "DELETE",
    })
}
