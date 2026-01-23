import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiFetch } from "../services/api"
import { useAuth } from "../context/useAuth"

// Keep compatible with your existing QuestionDto shape used in QuizPage
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

type BattleDto = {
    _id: string
    status: "pending" | "active" | "completed" | string
    subjectId: number
    lessonId?: number | null
    questionIds: number[]
    // optional extra fields (won’t break if missing)
    creator?: { username?: string }
    opponent?: { username?: string }
    createdAt?: string
}

export default function BattlePlayPage() {
    const { battleId } = useParams<{ battleId: string }>()
    const navigate = useNavigate()
    const { refreshMe } = useAuth()

    const [battle, setBattle] = useState<BattleDto | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [current, setCurrent] = useState(0)
    const [answers, setAnswers] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // timer start (Option 1)
    const [startedAt] = useState(() => Date.now())

    const headerTitle = useMemo(() => {
        const you = battle?.creator?.username ? `@${battle.creator.username}` : "You"
        const opp = battle?.opponent?.username ? `@${battle.opponent.username}` : "Opponent"
        return `${you} vs ${opp}`
    }, [battle])

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!battleId) return

            try {
                setLoading(true)
                setError(null)

                // 1) Load battle
                const b = await apiFetch<BattleDto>(`/api/battles/${battleId}`)
                if (cancelled) return
                setBattle(b)

                // 2) Load questions by IDs (battle question set)
                const qs = await apiFetch<Question[]>(`/api/questions/by-ids`, {
                    method: "POST",
                    body: JSON.stringify({ questionIds: b.questionIds }),
                })

                if (!cancelled) {
                    setQuestions(qs)
                    setAnswers(new Array(qs.length).fill(-1))
                    setCurrent(0)
                }
            } catch (e) {
                if (!cancelled) setError("Failed to load battle quiz.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [battleId])

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
            submitBattleQuiz()
        }
    }

    const submitBattleQuiz = async () => {
        if (!battleId || !battle) return
        if (submitting) return

        try {
            setSubmitting(true)

            const timeTakenSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000))

            // A) Create a quiz attempt based on questionIds (returns attemptId + stats)
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
                    subjectId: Number(battle.subjectId),
                    lessonId: battle.lessonId ?? null,
                    questionIds: battle.questionIds,
                    answers,
                    timeTakenSeconds,
                }),
            })

            // keep user state fresh (xp/streak/lives)
            await refreshMe()

            // B) Link the attempt to the battle & compute winner server-side
            await apiFetch(`/api/battles/${battleId}/submit`, {
                method: "POST",
                body: JSON.stringify({ attemptId: quizRes.attemptId }),
            })

            // C) Go to your existing result page (no design changes)
            navigate(`/battles/${battleId}/finished`, { state: quizRes })
        } catch (e) {
            setError("Failed to submit battle. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⏳</div>
                <div className="mt-2 font-extrabold text-slate-900">Loading battle…</div>
                <div className="mt-1 text-slate-600">Preparing your battle questions.</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⚠️</div>
                <div className="mt-2 font-extrabold text-slate-900">Couldn’t load battle</div>
                <div className="mt-1 text-slate-600">{error}</div>

                <button
                    onClick={() => navigate("/battles")}
                    className="mt-5 w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md hover:brightness-110 transition"
                >
                    Back to Battles
                </button>
            </div>
        )
    }

    if (!question || !battle) return null

    const isLast = current === questions.length - 1

    return (
        <div className="space-y-6">
            {/* Battle header (small + logical) */}
            <div className="rounded-3xl bg-white/90 border border-slate-200 shadow-sm p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-lg md:text-xl font-extrabold text-slate-900 truncate">
                            Battle ⚔️
                        </div>
                        <div className="mt-1 text-sm text-slate-600 truncate">{headerTitle}</div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="text-xs font-bold text-slate-500">Questions</div>
                        <div className="text-sm font-extrabold text-slate-900">
                            {current + 1}/{questions.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress */}
            <div className="text-sm font-bold text-slate-500">
                Question {current + 1} of {questions.length}
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
                {submitting ? "Submitting…" : isLast ? "Finish Battle" : "Next"}
            </button>

            {/* Small helper text */}
            <div className="text-center text-xs text-slate-500">
                Answer to continue. Your final score will be used to determine the winner.
            </div>
        </div>
    )
}
