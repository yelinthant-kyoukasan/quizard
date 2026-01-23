import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiFetch } from "../services/api"

type LeaderboardUser = {
    userid: string
    username: string
    name?: string
    xp: number
    level: number
    streakDays?: number
}

type LeaderboardRow = {
    rank: number
    user: LeaderboardUser
    correctCount: number
    totalQuestions: number
    accuracy: number // backend gives 0.93..., NOT 93
    timeTakenSeconds: number
    xpEarned: number
}

type LeaderboardResponse = {
    rows: LeaderboardRow[]
    status: "open" | "running" | "completed" | "cancelled" | string
    submittedCount: number
    totalParticipants: number
    tournamentId: string
}

function formatTime(sec: number) {
    const s = Math.max(0, Math.floor(sec || 0))
    const m = Math.floor(s / 60)
    const r = s % 60
    if (m <= 0) return `${r}s`
    return `${m}m ${r}s`
}

function formatAccDecimalToPercent(acc: number) {
    if (acc === undefined || acc === null || Number.isNaN(acc)) return "—"
    const pct = Math.round(acc * 100)
    return `${pct}%`
}

export default function TournamentLeaderboardPage() {
    const { tournamentId } = useParams<{ tournamentId: string }>()
    const navigate = useNavigate()

    const [rows, setRows] = useState<LeaderboardRow[]>([])
    const [status, setStatus] = useState<string>("open")
    const [submittedCount, setSubmittedCount] = useState<number>(0)
    const [totalParticipants, setTotalParticipants] = useState<number>(0)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        if (!tournamentId) return
        try {
            setLoading(true)
            setError(null)

            const data = await apiFetch<LeaderboardResponse>(
                `/api/tournaments/${tournamentId}/leaderboard`
            )

            setRows(data.rows || [])
            setStatus(data.status || "open")
            setSubmittedCount(data.submittedCount ?? 0)
            setTotalParticipants(data.totalParticipants ?? 0)
        } catch (e) {
            setError("Failed to load leaderboard.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId])

    const top3 = useMemo(() => rows.slice(0, 3), [rows])

    if (loading) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⏳</div>
                <div className="mt-2 font-extrabold text-slate-900">Loading leaderboard…</div>
                <div className="mt-1 text-slate-600">Fetching the latest rankings.</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⚠️</div>
                <div className="mt-2 font-extrabold text-slate-900">Couldn’t load leaderboard</div>
                <div className="mt-1 text-slate-600">{error}</div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <button
                        onClick={load}
                        className="w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => navigate("/battles")}
                        className="w-full rounded-2xl bg-slate-100 text-slate-800 font-extrabold py-4 hover:bg-slate-200 transition"
                    >
                        Back to Battles
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-2xl font-extrabold text-slate-900">Leaderboard 🏆</div>
                        <div className="mt-1 text-slate-600">
                            Status: <span className="font-bold text-slate-900">{status}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1">
                                Submitted: {submittedCount}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1">
                                Participants: {totalParticipants}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1">
                                Rows: {rows.length}
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0 flex gap-2">
                        <button
                            onClick={load}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-200"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate("/battles")}
                            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:brightness-110"
                        >
                            Back
                        </button>
                    </div>
                </div>
            </div>

            {/* Top 3 */}
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5 shadow-sm">
                <div className="text-lg font-extrabold text-slate-900">Top 3</div>

                {top3.length === 0 ? (
                    <div className="mt-3 text-sm text-slate-500">No submissions yet.</div>
                ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {top3.map((r) => {
                            const username = r.user?.username || "unknown"
                            const badge = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"

                            return (
                                <div
                                    key={`${r.user.userid}-${r.rank}`}
                                    className="rounded-3xl border border-slate-200 bg-white/80 p-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-extrabold text-slate-900">#{r.rank}</div>
                                        <div className="text-xl">{badge}</div>
                                    </div>

                                    <div className="mt-2 text-lg font-extrabold text-slate-900 truncate">
                                        @{username}
                                    </div>

                                    <div className="mt-1 text-xs text-slate-600 font-bold">
                                        Level {r.user.level} • Total XP {r.user.xp}
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold text-slate-500">Score</div>
                                            <div className="mt-1 text-sm font-extrabold text-slate-900">
                                                {r.correctCount}/{r.totalQuestions}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold text-slate-500">Acc</div>
                                            <div className="mt-1 text-sm font-extrabold text-slate-900">
                                                {formatAccDecimalToPercent(r.accuracy)}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <div className="text-[11px] font-bold text-slate-500">Time</div>
                                            <div className="mt-1 text-sm font-extrabold text-slate-900">
                                                {formatTime(r.timeTakenSeconds)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-sm font-extrabold text-indigo-700">
                                        +{r.xpEarned} XP earned
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Full List */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5">
                <div className="text-lg font-extrabold text-slate-900">All Players</div>
                <div className="text-sm text-slate-600">
                    Sorted by rank returned from server (don’t re-sort in frontend).
                </div>

                {rows.length === 0 ? (
                    <div className="mt-4 text-sm text-slate-500">No one has submitted yet.</div>
                ) : (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-600">
                            <div className="col-span-2">Rank</div>
                            <div className="col-span-4">User</div>
                            <div className="col-span-2 text-right">Score</div>
                            <div className="col-span-2 text-right">Acc</div>
                            <div className="col-span-1 text-right">Time</div>
                            <div className="col-span-1 text-right">XP</div>
                        </div>

                        {rows.map((r) => {
                            const username = r.user?.username || "unknown"

                            return (
                                <div
                                    key={`${r.user.userid}-${r.rank}`}
                                    className="grid grid-cols-12 px-4 py-3 text-sm border-t border-slate-200 bg-white/80"
                                >
                                    <div className="col-span-2 font-extrabold text-slate-900">#{r.rank}</div>

                                    <div className="col-span-4 min-w-0">
                                        <div className="font-extrabold text-slate-900 truncate">@{username}</div>
                                        <div className="text-xs text-slate-500 font-bold">
                                            L{r.user.level} • XP {r.user.xp}
                                        </div>
                                    </div>

                                    <div className="col-span-2 text-right font-extrabold text-slate-900">
                                        {r.correctCount}/{r.totalQuestions}
                                    </div>

                                    <div className="col-span-2 text-right font-extrabold text-slate-900">
                                        {formatAccDecimalToPercent(r.accuracy)}
                                    </div>

                                    <div className="col-span-1 text-right font-extrabold text-slate-900">
                                        {formatTime(r.timeTakenSeconds)}
                                    </div>

                                    <div className="col-span-1 text-right font-extrabold text-indigo-700">
                                        +{r.xpEarned}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="text-center text-xs text-slate-500">
                Tip: Refresh to see updates if others are still playing.
            </div>
        </div>
    )
}
