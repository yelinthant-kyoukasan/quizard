import { useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

type ResultState = {
    correct: number
    total: number
    accuracy: number
    xpEarned: number
    newXp: number
    streak: number
    lives: number
    attemptId: string
    timeTakenSeconds?: number
}

export default function TournamentFinishedPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { tournamentId } = useParams<{ tournamentId: string }>()

    const state = (location.state || null) as ResultState | null

    const summary = useMemo(() => {
        if (!state) return null
        return {
            correct: state.correct,
            total: state.total,
            accuracy: state.accuracy,
            xpEarned: state.xpEarned,
            newXp: state.newXp,
            streak: state.streak,
            lives: state.lives,
            time: state.timeTakenSeconds ?? null,
        }
    }, [state])

    if (!summary) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⚠️</div>
                <div className="mt-2 font-extrabold text-slate-900">No tournament result found</div>
                <div className="mt-1 text-slate-600">
                    Please finish the tournament normally so we can show your results.
                </div>

                <button
                    onClick={() => navigate("/battles")}
                    className="mt-5 w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                >
                    Back to Battles
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-3xl">🏁</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">Tournament submitted!</div>
                <div className="mt-1 text-slate-600">
                    Your score is recorded. Check the leaderboard to see your rank.
                </div>
            </div>

            {/* Stats (same info as QuizResultPage) */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6">
                <div className="text-lg font-extrabold text-slate-900">Your Performance</div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold text-slate-500">Score</div>
                        <div className="mt-1 text-xl font-extrabold text-slate-900">
                            {summary.correct}/{summary.total}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold text-slate-500">Accuracy</div>
                        <div className="mt-1 text-xl font-extrabold text-slate-900">{summary.accuracy}%</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold text-slate-500">XP Earned</div>
                        <div className="mt-1 text-xl font-extrabold text-slate-900">+{summary.xpEarned}</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold text-slate-500">Total XP</div>
                        <div className="mt-1 text-xl font-extrabold text-slate-900">{summary.newXp}</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold text-slate-500">Streak</div>
                        <div className="mt-1 text-xl font-extrabold text-slate-900">{summary.streak}🔥</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold text-slate-500">Lives</div>
                        <div className="mt-1 text-xl font-extrabold text-slate-900">{summary.lives}</div>
                    </div>

                    {summary.time !== null && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 col-span-2 md:col-span-3">
                            <div className="text-xs font-bold text-slate-500">Time Taken</div>
                            <div className="mt-1 text-xl font-extrabold text-slate-900">{summary.time}s</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="grid gap-3 md:grid-cols-2">
                <button
                    onClick={() => {
                        if (!tournamentId) return navigate("/battles")
                        navigate(`/tournaments/${tournamentId}/leaderboard`)
                    }}
                    className="w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                >
                    View Leaderboard
                </button>

                <button
                    onClick={() => navigate("/battles")}
                    className="w-full rounded-2xl bg-slate-100 text-slate-800 font-extrabold py-4 hover:bg-slate-200 transition"
                >
                    Back to Battles
                </button>
            </div>

            <div className="text-center text-xs text-slate-500">
                Tip: If others are still playing, the leaderboard may change.
            </div>
        </div>
    )
}
