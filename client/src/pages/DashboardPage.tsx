import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/useAuth"

function StatCard({
    label,
    value,
    icon,
}: {
    label: string
    value: string | number
    icon: string
}) {
    return (
        <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500">{label}</div>
                <div className="text-base">{icon}</div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
    )
}

function Card({
    children,
    className = "",
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={`rounded-3xl bg-white/90 border border-slate-200 shadow-sm ${className}`}
        >
            {children}
        </div>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const username = user?.username ?? "student"
    const xp = (user)?.xp ?? 0
    const streak = (user)?.streakDays ?? 0
    const lives = (user)?.lives ?? 5

    return (
        <div className="space-y-6 md:grid md:grid-cols-12 md:gap-6 md:space-y-0">
            {/* LEFT column (tablet/laptop) */}
            <div className="md:col-span-7 space-y-6">
                {/* Welcome */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-600">
                            Welcome back,
                        </div>
                        <div className="mt-1 text-3xl font-extrabold text-slate-900">
                            {username} <span className="text-2xl">👋</span>
                        </div>
                        <div className="mt-2 text-slate-600">
                            Ready for a quick study session?
                        </div>
                    </div>

                    <button
                        onClick={() => navigate("/profile")}
                        className="shrink-0 rounded-2xl bg-white/90 border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3 hover:shadow-md transition"
                    >
                        <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center font-bold">
                            {(username?.[0] ?? "U").toUpperCase()}
                        </div>
                        <div className="text-left leading-tight">
                            <div className="text-sm font-extrabold text-slate-900">
                                Profile
                            </div>
                            <div className="text-xs text-slate-500">View stats</div>
                        </div>
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                    <StatCard label="XP" value={xp} icon="🏆" />
                    <StatCard label="Streak" value={`${streak}`} icon="🔥" />
                    <StatCard label="Lives" value={`${lives}`} icon="❤️" />
                </div>

                {/* Continue learning */}
                <Card className="p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 text-xs font-bold">
                                ⚡ Quick session
                            </div>

                            <div className="mt-4 text-2xl font-extrabold text-slate-900">
                                Continue learning
                            </div>
                            <div className="mt-1 text-slate-600">
                                Pick a subject and complete one short lesson.
                            </div>
                        </div>

                        <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center text-xl">
                            📘
                        </div>
                    </div>

                    <button
                        onClick={() => navigate("/learn")}
                        className="mt-5 w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 active:scale-[0.99] transition"
                    >
                        Start a lesson
                    </button>
                </Card>
            </div>

            {/* RIGHT column (tablet/laptop) */}
            <div className="md:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="text-lg font-extrabold text-slate-900">
                        Today’s plan
                    </div>
                    <button className="text-sm font-bold text-indigo-700 hover:text-indigo-800">
                        View all
                    </button>
                </div>

                <Card className="p-4 md:p-5">
                    <div className="space-y-3">
                        <button className="w-full text-left rounded-2xl border border-slate-200 bg-white/90 p-4 hover:shadow-sm transition">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 grid place-items-center">
                                    ✅
                                </div>
                                <div>
                                    <div className="font-extrabold text-slate-900">
                                        Do 1 short lesson
                                    </div>
                                    <div className="text-sm text-slate-500">10–15 minutes</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full text-left rounded-2xl border border-slate-200 bg-white/90 p-4 hover:shadow-sm transition">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-fuchsia-50 border border-fuchsia-100 grid place-items-center">
                                    🧠
                                </div>
                                <div>
                                    <div className="font-extrabold text-slate-900">
                                        Review 5 mistakes
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Learn the explanation
                                    </div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full text-left rounded-2xl border border-slate-200 bg-white/90 p-4 hover:shadow-sm transition">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-100 grid place-items-center">
                                    🎯
                                </div>
                                <div>
                                    <div className="font-extrabold text-slate-900">
                                        Get 80 XP today
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Small steps → big streak
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
