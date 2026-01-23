import { useEffect, useMemo, useState } from "react"
import {
    acceptFriendRequest,
    cancelOutgoingRequest,
    getFriendsList,
    getIncomingFriendRequests,
    getOutgoingFriendRequests,
    rejectFriendRequest,
    searchUsersByUsername,
    sendFriendRequest,
    type IncomingRequest,
    type OutgoingRequest,
    type PublicUser,
} from "../services/friendsApi"

function StatPill({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <span className="text-slate-500">{label}</span>
            <span>{value}</span>
        </span>
    )
}

function Avatar({ name }: { name: string }) {
    const letter = (name?.trim()?.[0] || "?").toUpperCase()
    return (
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-100 grid place-items-center text-base font-extrabold text-slate-700">
            {letter}
        </div>
    )
}

function UserRow({
    user,
    right,
}: {
    user: PublicUser
    right?: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
                <Avatar name={user.name || user.username} />
                <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">
                        {user.name || user.username}
                    </div>
                    <div className="text-xs text-slate-500 truncate">@{user.username}</div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        <StatPill label="XP" value={`${user.xp}`} />
                        <StatPill label="Level" value={`${user.level}`} />
                        <StatPill label="Streak" value={`${user.streakDays}d`} />
                    </div>
                </div>
            </div>

            {right ? <div className="shrink-0">{right}</div> : null}
        </div>
    )
}

export default function FriendsPage() {
    const [query, setQuery] = useState("")
    const [searching, setSearching] = useState(false)
    const [results, setResults] = useState<PublicUser[]>([])
    const [searchError, setSearchError] = useState<string | null>(null)

    const [incoming, setIncoming] = useState<IncomingRequest[]>([])
    const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([])
    const [friends, setFriends] = useState<PublicUser[]>([])
    const [loadingLists, setLoadingLists] = useState(true)
    const [listError, setListError] = useState<string | null>(null)

    const [busyKey, setBusyKey] = useState<string | null>(null) // disables buttons during an action

    const outgoingToUsername = useMemo(() => {
        const m = new Map<string, string>()
        outgoing.forEach((o) => m.set(o.to.username, o.requestId))
        return m
    }, [outgoing])

    const incomingFromUsername = useMemo(() => {
        const m = new Map<string, string>()
        incoming.forEach((i) => m.set(i.from.username, i.requestId))
        return m
    }, [incoming])

    const friendsByUsername = useMemo(() => {
        const s = new Set(friends.map((f) => f.username))
        return s
    }, [friends])

    async function refreshLists() {
        try {
            setLoadingLists(true)
            setListError(null)
            const [inc, out, fr] = await Promise.all([
                getIncomingFriendRequests(),
                getOutgoingFriendRequests(),
                getFriendsList(),
            ])
            setIncoming(inc)
            setOutgoing(out)
            setFriends(fr)
        } catch (e: any) {
            setListError(e?.message || "Failed to load friends data.")
        } finally {
            setLoadingLists(false)
        }
    }

    useEffect(() => {
        refreshLists()
    }, [])

    async function doSearch() {
        const q = query.trim()
        if (q.length < 2) {
            setResults([])
            setSearchError("Type at least 2 characters.")
            return
        }

        try {
            setSearching(true)
            setSearchError(null)
            const res = await searchUsersByUsername(q)
            setResults(res)
        } catch (e: any) {
            setResults([])
            setSearchError(e?.message || "Search failed.")
        } finally {
            setSearching(false)
        }
    }

    async function handleAdd(username: string) {
        try {
            setBusyKey(`add:${username}`)
            await sendFriendRequest(username)
            await refreshLists()
            // keep results shown; user sees button change to Requested/Friends
        } catch (e: any) {
            setSearchError(e?.message || "Failed to send request.")
        } finally {
            setBusyKey(null)
        }
    }

    async function handleAccept(requestId: string) {
        try {
            setBusyKey(`accept:${requestId}`)
            await acceptFriendRequest(requestId)
            await refreshLists()
        } catch (e: any) {
            setListError(e?.message || "Failed to accept request.")
        } finally {
            setBusyKey(null)
        }
    }

    async function handleReject(requestId: string) {
        try {
            setBusyKey(`reject:${requestId}`)
            await rejectFriendRequest(requestId)
            await refreshLists()
        } catch (e: any) {
            setListError(e?.message || "Failed to reject request.")
        } finally {
            setBusyKey(null)
        }
    }

    async function handleCancel(requestId: string) {
        try {
            setBusyKey(`cancel:${requestId}`)
            await cancelOutgoingRequest(requestId)
            await refreshLists()
        } catch (e: any) {
            setListError(e?.message || "Failed to cancel request.")
        } finally {
            setBusyKey(null)
        }
    }

    async function handleUnfriend(friendUserId: string) {
        // NOTE: imported as "unfriend" in api file; we avoid naming conflict
        try {
            setBusyKey(`unfriend:${friendUserId}`)
            // dynamic import to avoid name conflict with local function
            const mod = await import("../services/friendsApi")
            await mod.unfriend(friendUserId)
            await refreshLists()
        } catch (e: any) {
            setListError(e?.message || "Failed to unfriend.")
        } finally {
            setBusyKey(null)
        }
    }

    return (
        <div className="min-h-screen px-4 pb-28 pt-6 md:pt-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                {/* Header */}
                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-6">
                    <div className="text-2xl md:text-3xl font-extrabold text-slate-900">
                        Friends ✨
                    </div>
                    <div className="mt-1 text-slate-600">
                        Add friends by username, see their progress, and stay motivated together.
                    </div>
                </div>

                {/* Search */}
                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-5">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <div className="text-lg font-extrabold text-slate-900">Find students</div>
                            <div className="text-sm text-slate-600">
                                Search by username (e.g. <span className="font-semibold">@alicia</span>)
                            </div>
                        </div>

                        <button
                            onClick={refreshLists}
                            className="text-sm font-bold text-slate-700 hover:text-slate-900"
                            disabled={loadingLists}
                        >
                            {loadingLists ? "Refreshing…" : "Refresh"}
                        </button>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type username…"
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") doSearch()
                            }}
                        />
                        <button
                            onClick={doSearch}
                            disabled={searching}
                            className="rounded-2xl bg-violet-600 px-5 py-3 font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
                        >
                            {searching ? "Searching…" : "Search"}
                        </button>
                    </div>

                    {searchError && (
                        <div className="mt-3 text-sm text-rose-700">{searchError}</div>
                    )}

                    {results.length > 0 && (
                        <div className="mt-4 space-y-3">
                            {results.map((u) => {
                                const isFriend = friendsByUsername.has(u.username)
                                const outgoingReqId = outgoingToUsername.get(u.username)
                                const incomingReqId = incomingFromUsername.get(u.username)

                                let right: React.ReactNode = null

                                if (isFriend) {
                                    right = (
                                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-extrabold">
                                            Friends
                                        </span>
                                    )
                                } else if (incomingReqId) {
                                    right = (
                                        <button
                                            onClick={() => handleAccept(incomingReqId)}
                                            disabled={busyKey === `accept:${incomingReqId}`}
                                            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                                        >
                                            {busyKey === `accept:${incomingReqId}` ? "Accepting…" : "Accept"}
                                        </button>
                                    )
                                } else if (outgoingReqId) {
                                    right = (
                                        <span className="rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1 text-xs font-extrabold">
                                            Requested
                                        </span>
                                    )
                                } else {
                                    right = (
                                        <button
                                            onClick={() => handleAdd(u.username)}
                                            disabled={busyKey === `add:${u.username}`}
                                            className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-violet-700 disabled:opacity-60"
                                        >
                                            {busyKey === `add:${u.username}` ? "Adding…" : "Add"}
                                        </button>
                                    )
                                }

                                return <UserRow key={u.userId} user={u} right={right} />
                            })}
                        </div>
                    )}
                </div>

                {/* Requests */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-5">
                        <div className="text-lg font-extrabold text-slate-900">Incoming</div>
                        <div className="text-sm text-slate-600">People who want to be friends.</div>

                        {loadingLists ? (
                            <div className="mt-4 text-sm text-slate-500">Loading…</div>
                        ) : incoming.length === 0 ? (
                            <div className="mt-4 text-sm text-slate-500">No incoming requests.</div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {incoming.map((r) => (
                                    <UserRow
                                        key={r.requestId}
                                        user={r.from}
                                        right={
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAccept(r.requestId)}
                                                    disabled={busyKey === `accept:${r.requestId}`}
                                                    className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                                                >
                                                    {busyKey === `accept:${r.requestId}` ? "…" : "Accept"}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(r.requestId)}
                                                    disabled={busyKey === `reject:${r.requestId}`}
                                                    className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                                                >
                                                    {busyKey === `reject:${r.requestId}` ? "…" : "Reject"}
                                                </button>
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-5">
                        <div className="text-lg font-extrabold text-slate-900">Outgoing</div>
                        <div className="text-sm text-slate-600">Requests you sent.</div>

                        {loadingLists ? (
                            <div className="mt-4 text-sm text-slate-500">Loading…</div>
                        ) : outgoing.length === 0 ? (
                            <div className="mt-4 text-sm text-slate-500">No outgoing requests.</div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {outgoing.map((r) => (
                                    <UserRow
                                        key={r.requestId}
                                        user={r.to}
                                        right={
                                            <button
                                                onClick={() => handleCancel(r.requestId)}
                                                disabled={busyKey === `cancel:${r.requestId}`}
                                                className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                                            >
                                                {busyKey === `cancel:${r.requestId}` ? "…" : "Cancel"}
                                            </button>
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Friends list */}
                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-5">
                    <div className="text-lg font-extrabold text-slate-900">Your friends</div>
                    <div className="text-sm text-slate-600">
                        See your friends’ XP, level and streak at a glance.
                    </div>

                    {listError && <div className="mt-3 text-sm text-rose-700">{listError}</div>}

                    {loadingLists ? (
                        <div className="mt-4 text-sm text-slate-500">Loading…</div>
                    ) : friends.length === 0 ? (
                        <div className="mt-4 text-sm text-slate-500">
                            No friends yet — search a username above and add someone!
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {friends.map((f) => (
                                <UserRow
                                    key={f.userId}
                                    user={f}
                                    right={
                                        <button
                                            onClick={() => handleUnfriend(f.userId)}
                                            disabled={busyKey === `unfriend:${f.userId}`}
                                            className="rounded-2xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-extrabold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                        >
                                            {busyKey === `unfriend:${f.userId}` ? "…" : "Unfriend"}
                                        </button>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Small note */}
                <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 text-sm text-violet-800">
                    Tip: Add friends who motivate you. A little friendly competition makes
                    studying feel lighter.
                </div>
            </div>
        </div>
    )
}
