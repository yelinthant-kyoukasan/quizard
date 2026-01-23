import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getLessonsBySubject } from "../services/contentApi"
import type { LessonDto } from "../services/contentApi"
import { getSubjectProgress } from "../services/progressApi"

type Lesson = LessonDto

export default function SubjectPage() {
    const { subjectId } = useParams<{ subjectId: string }>()
    const navigate = useNavigate()

    const [lessons, setLessons] = useState<Lesson[]>([])
    const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const subjectIdNum = useMemo(() => Number(subjectId), [subjectId])

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!subjectId || Number.isNaN(subjectIdNum)) return

            try {
                setLoading(true)
                setError(null)

                // Fetch lessons + subject progress in parallel
                const [lessonData, progress] = await Promise.all([
                    getLessonsBySubject(subjectIdNum),
                    getSubjectProgress(subjectIdNum),
                ])

                if (!cancelled) {
                    setLessons(lessonData.slice().sort((a, b) => a.orderIndex - b.orderIndex))
                    setCompletedLessonIds(progress.completedLessonIds || [])
                }
            } catch (err) {
                if (!cancelled) setError("Failed to load lessons.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [subjectId, subjectIdNum])

    const completedSet = useMemo(
        () => new Set(completedLessonIds),
        [completedLessonIds]
    )

    const openLesson = (lessonId: number) => {
        navigate(`/quiz/${lessonId}`)
    }

    if (loading) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⏳</div>
                <div className="mt-2 font-extrabold text-slate-900">Loading lessons…</div>
                <div className="mt-1 text-slate-600">Preparing your learning path.</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⚠️</div>
                <div className="mt-2 font-extrabold text-slate-900">Couldn’t load lessons</div>
                <div className="mt-1 text-slate-600">{error}</div>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {lessons.map((lesson) => {
                const isCompleted = completedSet.has(lesson.lessonId)

                return (
                    <button
                        key={lesson.lessonId}
                        onClick={() => openLesson(lesson.lessonId)}
                        className="w-full text-left rounded-3xl bg-white/90 border border-slate-200 shadow-sm hover:shadow-md transition p-5 md:p-6"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="text-lg md:text-xl font-extrabold text-slate-900 truncate">
                                        {lesson.title}
                                    </div>

                                    {/* ✅ completed badge */}
                                    {isCompleted && (
                                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                                            ✅ Completed
                                        </span>
                                    )}
                                </div>

                                <div className="mt-1 text-sm text-slate-600">
                                    {lesson.description}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
                                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1">
                                        {lesson.difficulty}
                                    </span>

                                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1">
                                        ⏱ {lesson.estimatedMinutes} min
                                    </span>

                                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1">
                                        ❓ {lesson.questionCount} questions
                                    </span>

                                    <span className="rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1">
                                        +{lesson.xpReward} XP
                                    </span>
                                </div>
                            </div>

                            <div className="shrink-0 text-sm font-extrabold text-indigo-700">
                                Start →
                            </div>
                        </div>
                    </button>
                )
            })}

            {lessons.length === 0 && (
                <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                    <div className="text-2xl">📭</div>
                    <div className="mt-2 font-extrabold text-slate-900">No lessons available</div>
                    <div className="mt-1 text-slate-600">This subject will be updated soon.</div>
                </div>
            )}
        </div>
    )
}
