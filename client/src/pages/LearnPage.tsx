import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getProgressOverview, type ProgressOverview } from "../services/progressApi"

type Accent = "violet" | "emerald" | "amber" | "sky" | "rose"

type Subject = {
    subjectId: number
    name: string
    totalLessons: number
    completedLessons: number
    accent: Accent
    icon: string
}

function clamp(n: number, min = 0, max = 100) {
    return Math.max(min, Math.min(max, n))
}

function accentClasses(accent: Accent) {
    switch (accent) {
        case "violet":
            return {
                chip: "bg-violet-50 text-violet-700 ring-violet-200",
                progress: "bg-violet-600",
                iconWrap: "bg-violet-100 text-violet-700",
            }
        case "emerald":
            return {
                chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                progress: "bg-emerald-600",
                iconWrap: "bg-emerald-100 text-emerald-700",
            }
        case "amber":
            return {
                chip: "bg-amber-50 text-amber-700 ring-amber-200",
                progress: "bg-amber-600",
                iconWrap: "bg-amber-100 text-amber-700",
            }
        case "sky":
            return {
                chip: "bg-sky-50 text-sky-700 ring-sky-200",
                progress: "bg-sky-600",
                iconWrap: "bg-sky-100 text-sky-700",
            }
        case "rose":
            return {
                chip: "bg-rose-50 text-rose-700 ring-rose-200",
                progress: "bg-rose-600",
                iconWrap: "bg-rose-100 text-rose-700",
            }
    }
}

function subjectDecor(name: string, subjectId: number): { accent: Accent; icon: string } {
    const n = name.toLowerCase()

    // Prefer matching by name; fallback to id ordering
    if (n.includes("math")) return { accent: "violet", icon: "📐" }
    if (n.includes("eng")) return { accent: "sky", icon: "📚" }
    if (n.includes("sci")) return { accent: "emerald", icon: "🧪" }

    // fallback
    const byId: Accent[] = ["violet", "sky", "emerald", "amber", "rose"]
    return { accent: byId[(subjectId - 1) % byId.length] ?? "violet", icon: "✨" }
}

function SubjectCard({
    subject,
    onOpen,
}: {
    subject: Subject
    onOpen: (subjectId: number) => void
}) {
    const a = accentClasses(subject.accent)
    const pct =
        subject.totalLessons <= 0
            ? 0
            : clamp(Math.round((subject.completedLessons / subject.totalLessons) * 100))

    const isCompleted = pct >= 100

    return (
        <button
            onClick={() => onOpen(subject.subjectId)}
            className="w-full text-left rounded-3xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 md:p-6"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className={`h-12 w-12 rounded-2xl grid place-items-center text-xl ring-1 ${a.iconWrap} ${a.chip}`}
                    >
                        {subject.icon}
                    </div>

                    <div className="min-w-0">
                        <div className="text-lg md:text-xl font-extrabold text-slate-900 truncate">
                            {subject.name}
                        </div>
                        <div className="text-sm text-slate-500">
                            {subject.completedLessons} of {subject.totalLessons} lessons completed
                        </div>
                    </div>
                </div>

                <div
                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ring-1 ${a.chip}`}
                >
                    {isCompleted ? "Completed" : `${pct}%`}
                </div>
            </div>

            <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${a.progress}`} style={{ width: `${pct}%` }} />
                </div>
            </div>
        </button>
    )
}

export default function LearnPage() {
    const nav = useNavigate()

    const [overview, setOverview] = useState<ProgressOverview | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    const res = await getProgressOverview()
                    if (mounted) setOverview(res)
                } finally {
                    if (mounted) setLoading(false)
                }
            })()
        return () => {
            mounted = false
        }
    }, [])

    const subjects: Subject[] = useMemo(() => {
        const src = overview?.subjects ?? []
        return src.map((s) => {
            const deco = subjectDecor(s.name, s.subjectId)
            return {
                subjectId: s.subjectId,
                name: s.name,
                totalLessons: s.totalLessons,
                completedLessons: s.completedLessons,
                accent: deco.accent,
                icon: deco.icon,
            }
        })
    }, [overview])

    const overall = useMemo(() => {
        const total = overview?.totalLessons ?? 0
        const completed = overview?.totalCompletedLessons ?? 0
        const pct = overview?.percent ?? (total > 0 ? Math.round((completed / total) * 100) : 0)
        return { total, completed, pct: clamp(pct) }
    }, [overview])

    const onOpenSubject = (subjectId: number) => {
        nav(`/learn/${subjectId}`)
    }

    return (
        <div className="min-h-screen px-4 pb-28 pt-6 md:pt-8">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-4 md:mb-6">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <div className="text-sm text-slate-500">Learning Path</div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                                Choose a subject
                            </h1>
                        </div>

                        <div className="text-sm font-semibold text-slate-600">
                            {loading ? "…" : `${overall.completed} / ${overall.total}`}
                        </div>
                    </div>

                    <div className="mt-3 h-3 rounded-full bg-white/60 border border-slate-200 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-violet-600"
                            style={{ width: `${loading ? 0 : overall.pct}%` }}
                        />
                    </div>
                </div>

                <div className="grid gap-4">
                    {loading ? (
                        <div className="rounded-3xl bg-white/60 border border-slate-200 p-6 text-slate-600">
                            Loading your progress…
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="rounded-3xl bg-white/60 border border-slate-200 p-6 text-slate-600">
                            No subjects found. (Check your subjects/lessons seeding + progress endpoint.)
                        </div>
                    ) : (
                        subjects.map((s) => (
                            <SubjectCard key={s.subjectId} subject={s} onOpen={onOpenSubject} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
