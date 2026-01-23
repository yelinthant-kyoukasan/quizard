import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/useAuth"
import { getLeaderboard, type LeaderboardEntryDto } from "../services/leaderboardApi"

type RankUser = {
    rank: number
    name: string
    xp: number
    isYou?: boolean
}

export default function RanksPage() {
    const { user } = useAuth()

    const [leaderboard, setLeaderboard] = useState<RankUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const myUsername = useMemo(
        () => (user?.username ?? "").toLowerCase(),
        [user?.username]
    )

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                setLoading(true)
                setError(null)

                const data = await getLeaderboard(50)

                const mapped: RankUser[] = (data.entries ?? []).map((e: LeaderboardEntryDto) => {
                    const display = e.name || e.username || "Unknown"
                    return {
                        rank: e.rank,
                        name: display,
                        xp: Number(e.xp) || 0,
                        isYou: myUsername
                            ? (e.username ?? "").toLowerCase() === myUsername
                            : false,
                    }
                })

                if (!cancelled) setLeaderboard(mapped)
            } catch (err: any) {
                if (!cancelled) {
                    setLeaderboard([])
                    setError(err?.message || "Failed to load leaderboard.")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [myUsername])

    return (
        <div className="space-y-6">
            {/* Header (same design text) */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6">
                <div className="text-2xl font-extrabold text-slate-900">
                    Leaderboard 🏆
                </div>
                <div className="mt-1 text-slate-600">
                    Weekly rankings based on XP earned.
                </div>
            </div>

            {/* List (same layout, real data) */}
            <div className="space-y-3">
                {loading && (
                    <div className="rounded-2xl bg-white/90 border border-slate-200 p-4 text-slate-600">
                        Loading leaderboard…
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-2xl bg-white/90 border border-rose-200 p-4 text-rose-700">
                        {error}
                    </div>
                )}

                {!loading && !error && leaderboard.length === 0 && (
                    <div className="rounded-2xl bg-white/90 border border-slate-200 p-4 text-slate-600">
                        No leaderboard data yet. Earn XP by completing quizzes!
                    </div>
                )}

                {!loading &&
                    !error &&
                    leaderboard.map((u) => (
                        <div
                            key={u.rank}
                            className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm
                ${u.isYou
                                    ? "bg-indigo-50 border-indigo-200"
                                    : "bg-white/90 border-slate-200"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 text-center font-extrabold text-slate-700">
                                    #{u.rank}
                                </div>

                                <div className="h-10 w-10 rounded-2xl bg-slate-100 grid place-items-center font-bold">
                                    {u.name?.[0] ?? "?"}
                                </div>

                                <div>
                                    <div className="font-extrabold text-slate-900">{u.name}</div>
                                    {u.isYou && (
                                        <div className="text-xs text-indigo-700 font-semibold">
                                            That’s you
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="font-extrabold text-slate-900">{u.xp} XP</div>
                        </div>
                    ))}
            </div>

            {/* Footer note (unchanged) */}
            <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-5 text-indigo-700 text-sm">
                Rankings reset every week. Focus on improving yourself, not just
                beating others.
            </div>
        </div>
    )
}
