import { useLocation, useNavigate } from "react-router-dom"

type ResultState = {
    correct: number
    total: number
    accuracy: number
    xpEarned: number
    newXp: number
    streak: number
    lives: number
}

function ScoreRing({ percent }: { percent: number }) {
    const radius = 44
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference

    return (
        <svg width="120" height="120" className="rotate-[-90deg]">
            <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#E5E7EB"
                strokeWidth="10"
                fill="transparent"
            />
            <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#4F46E5"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
            />
        </svg>
    )
}

export default function QuizResultPage() {
    const navigate = useNavigate()
    const { state } = useLocation()
    console.log(state)
    const result = state as ResultState | null

    // If user refreshes this page, location.state will be null.
    // We show a safe fallback instead of crashing.
    if (!result) {
        return (
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">📭</div>
                <div className="mt-2 font-extrabold text-slate-900">
                    No quiz result found
                </div>
                <div className="mt-1 text-slate-600">
                    Please complete a quiz again to see your result.
                </div>

                <button
                    onClick={() => navigate("/learn")}
                    className="mt-5 w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                >
                    Back to Subjects
                </button>
            </div>
        )
    }

    const { correct, total, accuracy, xpEarned, newXp, streak, lives } = result
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100)

    const message =
        percent === 100
            ? "Perfect score! Outstanding work 🎉"
            : percent >= 70
                ? "Great job! You're improving fast 💪"
                : percent >= 40
                    ? "Not bad! Review and try again 🔁"
                    : "Keep going! Practice makes progress 🌱"

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="text-3xl font-extrabold text-slate-900">
                    Quiz Complete 🎯
                </div>
                <div className="mt-2 text-slate-600">{message}</div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <ScoreRing percent={accuracy ?? percent} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-xl font-extrabold text-slate-900">
                                {(accuracy ?? percent)}%
                            </div>
                            <div className="text-xs text-slate-500">score</div>
                        </div>
                    </div>
                </div>

                <div className="text-sm text-slate-600">
                    {correct} / {total} correct
                </div>
            </div>

            {/* Rewards */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-600">
                            XP Earned
                        </div>
                        <div className="mt-1 text-2xl font-extrabold text-slate-900">
                            +{xpEarned} XP
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                            Total XP: <span className="font-extrabold text-slate-900">{newXp}</span>
                        </div>
                    </div>

                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white grid place-items-center text-xl shadow-sm">
                        🏆
                    </div>
                </div>
            </div>

            {/* Streak & Lives */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5">
                    <div className="text-sm font-semibold text-slate-600">Streak</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                        {streak}🔥
                    </div>
                </div>

                <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5">
                    <div className="text-sm font-semibold text-slate-600">Lives</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                        {lives}❤️
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                >
                    Retry Lesson
                </button>

                <button
                    onClick={() => navigate("/learn")}
                    className="w-full rounded-2xl bg-white border border-slate-200 text-slate-900 font-extrabold py-4 shadow-sm hover:shadow-md transition"
                >
                    Back to Subjects
                </button>

                <button
                    onClick={() => navigate("/")}
                    className="w-full text-sm font-bold text-indigo-700 hover:underline"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    )
}
