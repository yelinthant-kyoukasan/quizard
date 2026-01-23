import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/useAuth"
import { apiFetch } from "../services/api"

type SubjectProgress = {
    subjectId: number
    name: string
    icon: string
    completed: number
    total: number
}

type ProgressOverviewResponse = {
    totalLessons: number
    totalCompletedLessons: number
    percent: number
    subjects: Array<{
        subjectId: string | number
        name: string
        totalCount: number
        completedCount: number
        percent: number
    }>
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${value}%` }}
            />
        </div>
    )
}

export default function ProfilePage() {
    const { user } = useAuth()

    const username = user?.username ?? "student"
    const xp = user?.xp ?? 0
    const streak = user?.streakDays ?? 0
    const lives = user?.lives ?? 5

    const [subjects, setSubjects] = useState<SubjectProgress[]>([])
    const [loadingProgress, setLoadingProgress] = useState(true)
    const [progressError, setProgressError] = useState<string | null>(null)

    // Simple frontend-only icon mapping (backend does NOT need to send icons)
    const subjectIcon = useMemo(() => {
        return (name: string, subjectId: number) => {
            const n = name.toLowerCase()
            if (n.includes("math")) return "📐"
            if (n.includes("english")) return "📖"
            if (n.includes("science")) return "🧪"
            if (n.includes("human")) return "🌍"
            // fallback by id
            if (subjectId === 1) return "📐"
            if (subjectId === 2) return "📖"
            if (subjectId === 3) return "🧪"
            return "📚"
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadProgress() {
            try {
                setLoadingProgress(true)
                setProgressError(null)

                // IMPORTANT: needs api.ts to include credentials (cookies)
                const data = await apiFetch<ProgressOverviewResponse>("/api/progress/overview")

                const mapped: SubjectProgress[] = (data.subjects ?? []).map((s) => {
                    const sid = typeof s.subjectId === "string" ? Number(s.subjectId) : s.subjectId
                    return {
                        subjectId: Number.isFinite(sid) ? (sid as number) : 0,
                        name: s.name,
                        icon: subjectIcon(s.name, Number.isFinite(sid) ? (sid as number) : 0),
                        completed: s.completedCount ?? 0,
                        total: s.totalCount ?? 0,
                    }
                })

                if (!cancelled) setSubjects(mapped)
            } catch (err: unknown) {
                if (!cancelled) {
                    const msg =
                        err instanceof Error ? err.message : "Failed to load progress overview."
                    setProgressError(msg)
                    setSubjects([])
                }
            } finally {
                if (!cancelled) setLoadingProgress(false)
            }
        }

        loadProgress()
        return () => {
            cancelled = true
        }
    }, [subjectIcon])

    return (
        <div className="space-y-6">
            {/* Profile header */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6 flex items-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-indigo-600 text-white grid place-items-center text-2xl font-black">
                    {username[0]?.toUpperCase()}
                </div>

                <div>
                    <div className="text-xl font-extrabold text-slate-900">{username}</div>
                    <div className="text-sm text-slate-600">Secondary Student</div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="XP" value={xp} icon="🏆" />
                <StatCard label="Streak" value={`${streak}🔥`} icon="🔥" />
                <StatCard label="Lives" value={`${lives}❤️`} icon="❤️" />
            </div>

            {/* Overall progress */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5">
                <div className="text-lg font-extrabold text-slate-900">
                    Learning Progress
                </div>
                <div className="mt-1 text-sm text-slate-600">
                    Track how much you’ve completed so far.
                </div>

                <div className="mt-4 space-y-4">
                    {loadingProgress && (
                        <div className="text-sm text-slate-500">Loading progress...</div>
                    )}

                    {!loadingProgress && progressError && (
                        <div className="text-sm text-rose-600">{progressError}</div>
                    )}

                    {!loadingProgress && !progressError && subjects.length === 0 && (
                        <div className="text-sm text-slate-500">
                            No progress yet — complete a lesson to start tracking 📈
                        </div>
                    )}

                    {!loadingProgress &&
                        !progressError &&
                        subjects.map((s) => {
                            const pct =
                                s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100)

                            return (
                                <div key={s.subjectId}>
                                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                                        <span>
                                            {s.icon} {s.name}
                                        </span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="mt-1">
                                        <ProgressBar value={pct} />
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </div>

            {/* Motivation */}
            <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-5">
                <div className="text-sm font-extrabold text-indigo-800">Keep it up 💪</div>
                <div className="mt-1 text-indigo-700">
                    Studying a little every day builds long-term success. Even one lesson
                    keeps your streak alive.
                </div>
            </div>
        </div>
    )
}

function StatCard({
    label,
    value,
}: {
    label: string
    value: string | number
    icon: string
}) {
    return (
        <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-sm p-4">
            <div className="text-xs font-semibold text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
    )
}
