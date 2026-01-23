import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getQuestionsByLesson } from "../services/contentApi"
import type { QuestionDto } from "../services/contentApi"
import { apiFetch } from "../services/api"
import { useAuth } from "../context/useAuth"

type Question = QuestionDto

export default function QuizPage() {
    const { lessonId } = useParams<{ lessonId: string }>()
    const navigate = useNavigate()
    const { refreshMe } = useAuth()

    const [questions, setQuestions] = useState<Question[]>([])
    const [current, setCurrent] = useState(0)
    const [answers, setAnswers] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [startedAt] = useState(() => Date.now())
    const [error, setError] = useState<string | null>(null)

    const submitQuiz = async () => {
        if (!lessonId) return
        const timeTakenSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000))

        const res = await apiFetch<{
            correct: number
            total: number
            accuracy: number
            xpEarned: number
            newXp: number
            streak: number
            lives: number
        }>("/api/quiz/submit", {
            method: "POST",
            body: JSON.stringify({
                lessonId: Number(lessonId),
                answers,
                timeTakenSeconds
            }),
        })

        await refreshMe();

        navigate("/quiz-result", { state: res })
    }


    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!lessonId) return

            try {
                setLoading(true)
                setError(null)

                const data = await getQuestionsByLesson(Number(lessonId))

                if (!cancelled) {
                    setQuestions(data)
                    setAnswers(new Array(data.length).fill(-1))
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to load quiz.")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [lessonId])

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
            submitQuiz()
        }
    }


    if (loading) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⏳</div>
                <div className="mt-2 font-extrabold text-slate-900">
                    Loading quiz…
                </div>
                <div className="mt-1 text-slate-600">
                    Preparing your questions.
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-3xl bg-white/85 border border-slate-200 shadow-sm p-6 text-center">
                <div className="text-2xl">⚠️</div>
                <div className="mt-2 font-extrabold text-slate-900">
                    Couldn’t load quiz
                </div>
                <div className="mt-1 text-slate-600">{error}</div>
            </div>
        )
    }

    if (!question) return null

    return (
        <div className="space-y-6">
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
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                        : "bg-white border-slate-200 hover:bg-slate-50"
                                    }`}
                            >
                                {opt}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Action */}
            <button
                onClick={nextQuestion}
                disabled={answers[current] === -1}
                className="w-full rounded-2xl bg-indigo-600 text-white font-extrabold py-4 shadow-md disabled:opacity-50"
            >
                {current === questions.length - 1 ? "Finish Quiz" : "Next"}
            </button>
        </div>
    )
}
