import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiFetch } from "../services/api"
import { useAuth } from "../context/useAuth"

type Question = {
    questionId: number | string
    subjectId: number | string
    lessonId: number | string
    type: "mcq" | "short"
    questionText: string
    options: string[]
    difficulty: "easy" | "medium" | "hard"
    xp: number
    orderIndex: number
}

type TournamentDto = {
    _id: string
    title: string
    joinCode: string
    status: "open" | "running" | "completed" | "cancelled" | string
    subjectId: number
    lessonId?: number | null
    questionIds: number[]
    endsAt: string
    host?: { username?: string; name?: string } | null
}

export default function TournamentPlayPage() {
    const { tournamentId } = useParams<{ tournamentId: string }>()
    const navigate = useNavigate()
    const { refreshMe } = useAuth()

    const [tournament, setTournament] = useState<TournamentDto | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [current, setCurrent] = useState(0)
    const [answers, setAnswers] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [startedAt] = useState(() => Date.now())

    const meta = useMemo(() => {
        if (!tournament) return null
        return {
            title: tournament.title,
            endsAt: new Date(tournament.endsAt).toLocaleString(),
            code: tournament.joinCode,
            host: tournament.host?.username ? `@${tournament.host.username}` : null,
        }
    }, [tournament])

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!tournamentId) return

            try {
                setLoading(true)
                setError(null)

                // 1) Load tournament
                const t = await apiFetch<TournamentDto>(`/api/tournaments/${tournamentId}`)
                if (cancelled) return
                setTournament(t)

                // 2) Load questions by IDs
                const qs = await apiFetch<Question[]>(`/api/questions/by-ids`, {
                    method: "POST",
                    body: JSON.stringify({ questionIds: t.questionIds }),
                })

                if (!cancelled) {
                    setQuestions(qs)
                    setAnswers(new Array(qs.length).fill(-1))
                    setCurrent(0)
                }
            } catch (e) {
                if (!cancelled) setError("Failed to load tournament quiz.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [tournamentId])

    const question = questions[current]

    const selectAnswer = (index: number) => {
        const next = [...answers]
        next[current] = index
        setAnswers(next)
    }

    const nextQuestion = () => {
        if (current < questions.length - 1) {
            setCurrent((c) => c + 1)
        } else {
            submitTournamentQuiz()
        }
    }

    const submitTournamentQuiz = async () => {
        if (!tournamentId || !tournament) return
        if (submitting) return

        try {
            setSubmitting(true)

            const timeTakenSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000))

            // A) Create attempt for fixed question set
            const quizRes = await apiFetch<{
                correct: number
                total: number
                accuracy: number
                xpEarned: number
                newXp: number
                streak: number
                lives: number
                attemptId: string
                timeTakenSeconds?: number
            }>(`/api/quiz/submit-by-ids`, {
                method: "POST",
                body: JSON.stringify({
                    subjectId: Number(tournament.subjectId),
                    lessonId: tournament.lessonId ?? null,
                    questionIds: tournament.questionIds,
                    answers,
                    timeTakenSeconds,
                }),
            })

            await refreshMe()

            // B) Link attempt to tournament participation
            await apiFetch(`/api/tournaments/${tournamentId}/submit`, {
                method: "POST",
                body: JSON.stringify({ attemptId: quizRes.attemptId }),
            })

            // C) Go to a tournament-specific finished page (not QuizResult)
            navigate(`/tournaments/${tournamentId}/finished`, { state: quizRes })
        } catch (e) {
            setError("Failed to submit tournament. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⏳</div>
                <div className="mt-2 font-extrabold text-slate-900">Loading tournament…</div>
                <div className="mt-1 text-slate-600">Preparing your questions.</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⚠️</div>
                <div className="mt-2 font-extrabold text-slate-900">Couldn’t load tournament</div>
                <div className="mt-1 text-slate-600">{error}</div>

                <button
                    onClick={() => navigate("/battles")}
                    className="mt-5 w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                >
                    Back
                </button>
            </div>
        )
    }

    if (!question || !tournament) return null

    const isLast = current === questions.length - 1

    return (
        <div className="space-y-6">
            {/* Tournament header */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-lg md:text-xl font-extrabold text-slate-900 truncate">
                            Tournament 🏁
                        </div>
                        <div className="mt-1 text-sm text-slate-600 truncate">
                            {meta?.title}
                            {meta?.host ? ` • Host ${meta.host}` : ""}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1">
                                Code: {meta?.code}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1">
                                Ends: {meta?.endsAt}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1">
                                {questions.length} Questions
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="text-xs font-bold text-slate-500">Progress</div>
                        <div className="text-sm font-extrabold text-slate-900">
                            {current + 1}/{questions.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Question */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-6">
                <div className="text-lg md:text-xl font-extrabold text-slate-900">
                    {question.questionText}
                </div>

                <div className="mt-4 space-y-3">
                    {question.options.map((opt, idx) => {
                        const selected = answers[current] === idx

                        return (
                            <button
                                key={idx}
                                onClick={() => selectAnswer(idx)}
                                className={`w-full text-left rounded-2xl border px-4 py-3 font-semibold transition
                  ${selected
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                                        : "bg-white border-slate-200 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`mt-0.5 h-7 w-7 rounded-xl grid place-items-center text-xs font-extrabold
                      ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                                    >
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <div className="text-slate-900">{opt}</div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Action */}
            <button
                onClick={nextQuestion}
                disabled={submitting || answers[current] === -1}
                className={`w-full rounded-2xl py-4 font-extrabold shadow-md transition
          ${submitting || answers[current] === -1
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:brightness-110"
                    }`}
            >
                {submitting ? "Submitting…" : isLast ? "Finish Tournament" : "Next"}
            </button>

            <div className="text-center text-xs text-slate-500">
                Your score will be added to the tournament leaderboard after submission.
            </div>
        </div>
    )
}
