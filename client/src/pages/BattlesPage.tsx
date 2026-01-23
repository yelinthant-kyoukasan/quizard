import { useEffect, useMemo, useState } from "react"
import {
    acceptBattle,
    createBattle,
    declineBattle,
    getMyBattles,
    getMyTournaments,
    joinTournamentByCode,
    createTournament,
    type BattleListItem,
    type TournamentListItem,
} from "../services/battlesApi"
import { getSubjects } from "../services/contentApi"
import { getLessonsBySubject } from "../services/contentApi" // if your contentApi exports different names, adjust
// If you don't have getLessonsBySubject, tell me your contentApi function names and I’ll align.
import { useNavigate } from "react-router-dom"

type Subject = {
    subjectId: number
    name: string
    code?: string
    icon?: string
    color?: string
}

type Lesson = {
    lessonId: number
    subjectId: number
    title: string
    difficulty?: string
    estimatedMinutes?: number
    questionCount?: number
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700">
            {children}
        </span>
    )
}

function PrimaryButton({
    children,
    onClick,
    disabled,
}: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
        >
            {children}
        </button>
    )
}

function GhostButton({
    children,
    onClick,
    disabled,
}: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
        >
            {children}
        </button>
    )
}

function formatTimeLeft(expiresAtISO: string) {
    const expires = new Date(expiresAtISO).getTime()
    const now = Date.now()
    const diff = expires - now
    if (diff <= 0) return "Expired"
    const h = Math.floor(diff / (1000 * 60 * 60))
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

export default function BattlesPage() {
    const [tab, setTab] = useState<"1v1" | "tournaments">("1v1")
    const navigate = useNavigate()

    const [subjects, setSubjects] = useState<Subject[]>([])
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [loadingContent, setLoadingContent] = useState(true)

    const [battles, setBattles] = useState<BattleListItem[]>([])
    const [tournaments, setTournaments] = useState<TournamentListItem[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create 1v1 form
    const [opponentUsername, setOpponentUsername] = useState("")
    const [subjectId, setSubjectId] = useState<number | "">("")
    const [lessonId, setLessonId] = useState<number | "random" | "">("random")
    const [creating1v1, setCreating1v1] = useState(false)

    // Tournament form
    const [tTitle, setTTitle] = useState("")
    const [tSubjectId, setTSubjectId] = useState<number | "">("")
    const [tLessonId, setTLessonId] = useState<number | "random" | "">("random")
    const [joinCode, setJoinCode] = useState("")
    const [creatingT, setCreatingT] = useState(false)
    const [joiningT, setJoiningT] = useState(false)

    const [busyKey, setBusyKey] = useState<string | null>(null)

    const subjectMap = useMemo(() => {
        const m = new Map<number, Subject>()
        subjects.forEach((s) => m.set(s.subjectId, s))
        return m
    }, [subjects])

    async function refreshBattles() {
        try {
            setLoadingData(true)
            setError(null)
            const [b, t] = await Promise.all([getMyBattles(), getMyTournaments()])
            setBattles(b)
            setTournaments(t)
        } catch (e: any) {
            setError(e?.message || "Failed to load battles.")
        } finally {
            setLoadingData(false)
        }
    }

    useEffect(() => {
        ; (async () => {
            try {
                setLoadingContent(true)
                const subs = await getSubjects()
                setSubjects(subs as any)
            } catch (e: any) {
                setError(e?.message || "Failed to load subjects.")
            } finally {
                setLoadingContent(false)
            }
        })()

        refreshBattles()
    }, [])

    // Load lessons when subject changes (for both forms)
    useEffect(() => {
        ; (async () => {
            if (subjectId === "" || subjectId === undefined) {
                setLessons([])
                return
            }
            try {
                const data = await getLessonsBySubject(Number(subjectId))
                setLessons(data as any)
            } catch {
                setLessons([])
            }
        })()
    }, [subjectId])

    useEffect(() => {
        ; (async () => {
            if (tSubjectId === "" || tSubjectId === undefined) return
            try {
                // reuse same lessons state is ok; but keep separate? simplest is ok.
                const data = await getLessonsBySubject(Number(tSubjectId))
                // don’t overwrite lessons for 1v1 if you want — but ok for MVP
                setLessons(data as any)
            } catch {
                // ignore
            }
        })()
    }, [tSubjectId])

    const incoming = battles.filter((b) => !b.isCreator && b.status === "pending")
    const active = battles.filter((b) => b.status === "active" || b.status === "pending")
    const history = battles.filter((b) => ["completed", "declined", "expired"].includes(b.status))

    async function onCreate1v1() {
        if (!opponentUsername.trim()) {
            setError("Enter a friend username.")
            return
        }
        if (subjectId === "") {
            setError("Choose a subject.")
            return
        }

        console.log(lessons)

        try {
            setCreating1v1(true)
            setError(null)

            const body: any = {
                opponentUsername: opponentUsername.trim().toLowerCase(),
                subjectId: Number(subjectId),
            }

            // Scope A (subject only) => omit lessonId
            // Scope C (subject+lesson) => include lessonId
            if (lessonId !== "random" && lessonId !== "") {
                body.lessonId = Number(lessonId)
            }

            await createBattle(body)
            setOpponentUsername("")
            setLessonId("random")
            await refreshBattles()
        } catch (e: any) {
            setError(e?.message || "Failed to create battle.")
        } finally {
            setCreating1v1(false)
        }
    }

    async function onAccept(battleId: string) {
        try {
            setBusyKey(`accept:${battleId}`)
            await acceptBattle(battleId)
            await refreshBattles()
        } catch (e: any) {
            setError(e?.message || "Failed to accept battle.")
        } finally {
            setBusyKey(null)
        }
    }

    async function onDecline(battleId: string) {
        try {
            setBusyKey(`decline:${battleId}`)
            await declineBattle(battleId)
            await refreshBattles()
        } catch (e: any) {
            setError(e?.message || "Failed to decline battle.")
        } finally {
            setBusyKey(null)
        }
    }

    async function onCreateTournament() {
        if (!tTitle.trim()) {
            setError("Enter a tournament title.")
            return
        }
        if (tSubjectId === "") {
            setError("Choose a subject.")
            return
        }

        try {
            setCreatingT(true)
            setError(null)

            const body: any = {
                title: tTitle.trim(),
                subjectId: Number(tSubjectId),
            }

            if (tLessonId !== "random" && tLessonId !== "") {
                body.lessonId = Number(tLessonId)
            }

            await createTournament(body)
            setTTitle("")
            setTLessonId("random")
            await refreshBattles()
            setTab("tournaments")
        } catch (e: any) {
            setError(e?.message || "Failed to create tournament.")
        } finally {
            setCreatingT(false)
        }
    }

    async function onJoinTournament() {
        if (!joinCode.trim()) {
            setError("Enter a join code.")
            return
        }

        try {
            setJoiningT(true)
            setError(null)
            await joinTournamentByCode(joinCode.trim().toUpperCase())
            setJoinCode("")
            await refreshBattles()
            setTab("tournaments")
        } catch (e: any) {
            setError(e?.message || "Failed to join tournament.")
        } finally {
            setJoiningT(false)
        }
    }

    return (
        <div className="min-h-screen px-4 pb-28 pt-6 md:pt-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                {/* Header */}
                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-2xl md:text-3xl font-extrabold text-slate-900">
                                Battles ⚔️
                            </div>
                            <div className="mt-1 text-slate-600">
                                Challenge friends or host a tournament. Async, fast, and fair.
                            </div>
                        </div>

                        <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                            <button
                                onClick={() => setTab("1v1")}
                                className={`px-4 py-2 rounded-2xl text-sm font-extrabold ${tab === "1v1" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"
                                    }`}
                            >
                                1v1
                            </button>
                            <button
                                onClick={() => setTab("tournaments")}
                                className={`px-4 py-2 rounded-2xl text-sm font-extrabold ${tab === "tournaments"
                                    ? "bg-white shadow-sm text-slate-900"
                                    : "text-slate-600"
                                    }`}
                            >
                                Tournament
                            </button>
                        </div>
                    </div>

                    {error && <div className="mt-4 text-sm text-rose-700">{error}</div>}
                </div>

                {/* Subtle background section */}
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5 shadow-sm">
                    {tab === "1v1" ? (
                        <div className="space-y-6">
                            {/* Create 1v1 */}
                            <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                <div className="text-lg font-extrabold text-slate-900">Create a 1v1</div>
                                <div className="text-sm text-slate-600">
                                    5 questions. Same questions for both players.
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600">Friend username</label>
                                        <input
                                            value={opponentUsername}
                                            onChange={(e) => setOpponentUsername(e.target.value)}
                                            placeholder="e.g. alicia"
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-600">Subject</label>
                                        <select
                                            value={subjectId}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setSubjectId(val ? Number(val) : "")
                                                setLessonId("random")
                                            }}
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                            disabled={loadingContent}
                                        >
                                            <option value="">Select subject…</option>
                                            {subjects.map((s) => (
                                                <option key={s.subjectId} value={s.subjectId}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-600">Lesson scope</label>
                                        <select
                                            value={lessonId}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (v === "random") setLessonId("random")
                                                else setLessonId(Number(v))
                                            }}
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                            disabled={subjectId === "" || lessons.length === 0}
                                        >
                                            <option value="random">Subject-wide (Random)</option>
                                            {lessons.map((l) => (
                                                <option key={l.lessonId} value={l.lessonId}>
                                                    {l.title}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Chip>Scope: {lessonId === "random" ? "Subject (A)" : "Lesson (C)"}</Chip>
                                            <Chip>Questions: 10</Chip>
                                            <Chip>Expiry: 24h</Chip>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <PrimaryButton onClick={onCreate1v1} disabled={creating1v1}>
                                        {creating1v1 ? "Creating…" : "Create Battle"}
                                    </PrimaryButton>
                                </div>
                            </div>

                            {/* Incoming requests */}
                            <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                <div className="text-lg font-extrabold text-slate-900">Requests</div>
                                <div className="text-sm text-slate-600">Battle invites sent to you.</div>

                                {loadingData ? (
                                    <div className="mt-4 text-sm text-slate-500">Loading…</div>
                                ) : incoming.length === 0 ? (
                                    <div className="mt-4 text-sm text-slate-500">No requests right now.</div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {incoming.map((b) => {
                                            const s = subjectMap.get(b.subjectId)
                                            return (
                                                <div
                                                    key={b.battleId}
                                                    className="rounded-2xl border border-slate-200 bg-white/80 p-4 flex items-center justify-between gap-3"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-extrabold text-slate-900 truncate">
                                                            @{b.createdBy?.username} challenged you
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <Chip>{s?.name || `Subject ${b.subjectId}`}</Chip>
                                                            <Chip>{b.lessonId ? `Lesson ${b.lessonId}` : "Subject-wide"}</Chip>
                                                            <Chip>10 Qns</Chip>
                                                            <Chip>⏳ {formatTimeLeft(b.expiresAt)}</Chip>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 shrink-0">
                                                        <PrimaryButton
                                                            onClick={() => onAccept(b.battleId)}
                                                            disabled={busyKey === `accept:${b.battleId}`}
                                                        >
                                                            {busyKey === `accept:${b.battleId}` ? "…" : "Accept"}
                                                        </PrimaryButton>
                                                        <GhostButton
                                                            onClick={() => onDecline(b.battleId)}
                                                            disabled={busyKey === `decline:${b.battleId}`}
                                                        >
                                                            {busyKey === `decline:${b.battleId}` ? "…" : "Decline"}
                                                        </GhostButton>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Active + History */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                    <div className="text-lg font-extrabold text-slate-900">Active</div>
                                    <div className="text-sm text-slate-600">Ongoing battles.</div>

                                    {loadingData ? (
                                        <div className="mt-4 text-sm text-slate-500">Loading…</div>
                                    ) : active.length === 0 ? (
                                        <div className="mt-4 text-sm text-slate-500">No active battles.</div>
                                    ) : (
                                        <div className="mt-4 space-y-3">
                                            {active.map((b) => {
                                                const s = subjectMap.get(b.subjectId)
                                                const other = b.isCreator ? b.opponent?.username : b.createdBy?.username
                                                return (
                                                    <div key={b.battleId} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                                        <div className="font-extrabold text-slate-900 truncate">
                                                            vs @{other}
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <Chip>{s?.name || `Subject ${b.subjectId}`}</Chip>
                                                            <Chip>{b.lessonId ? `Lesson ${b.lessonId}` : "Subject-wide"}</Chip>
                                                            <Chip>Status: {b.status}</Chip>
                                                            <Chip>⏳ {formatTimeLeft(b.expiresAt)}</Chip>
                                                        </div>
                                                        <div className="mt-3 flex items-center justify-between gap-3">
                                                            <div className="text-xs text-slate-500">
                                                                Ready when you are. Finish the quiz to submit your score.
                                                            </div>

                                                            <PrimaryButton
                                                                onClick={() => navigate(`/battles/${b.battleId}/play`)}
                                                                disabled={b.status !== "active"}
                                                            >
                                                                {b.status === "active" ? "Play" : "Waiting"}
                                                            </PrimaryButton>
                                                        </div>

                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                    <div className="text-lg font-extrabold text-slate-900">History</div>
                                    <div className="text-sm text-slate-600">Completed or expired battles.</div>

                                    {loadingData ? (
                                        <div className="mt-4 text-sm text-slate-500">Loading…</div>
                                    ) : history.length === 0 ? (
                                        <div className="mt-4 text-sm text-slate-500">No history yet.</div>
                                    ) : (
                                        <div className="mt-4 space-y-3">
                                            {history.slice(0, 8).map((b) => {
                                                const s = subjectMap.get(b.subjectId)
                                                const other = b.isCreator ? b.opponent?.username : b.createdBy?.username
                                                const won =
                                                    b.winner && (b.isCreator ? b.createdBy?.userId : b.opponent?.userId) === b.winner
                                                return (
                                                    <div key={b.battleId} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-extrabold text-slate-900 truncate">vs @{other}</div>
                                                            <span
                                                                className={`text-xs font-extrabold px-3 py-1 rounded-full border ${b.status === "completed"
                                                                    ? won
                                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                                        : "bg-slate-50 border-slate-200 text-slate-700"
                                                                    : "bg-rose-50 border-rose-200 text-rose-700"
                                                                    }`}
                                                            >
                                                                {b.status === "completed" ? (won ? "Won" : "Lost") : b.status}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <Chip>{s?.name || `Subject ${b.subjectId}`}</Chip>
                                                            <Chip>{b.lessonId ? `Lesson ${b.lessonId}` : "Subject-wide"}</Chip>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Tournaments tab
                        <div className="space-y-6">
                            {/* Create + Join */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                    <div className="text-lg font-extrabold text-slate-900">Create tournament</div>
                                    <div className="text-sm text-slate-600">15 questions. Async Kahoot-style.</div>

                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-600">Title</label>
                                            <input
                                                value={tTitle}
                                                onChange={(e) => setTTitle(e.target.value)}
                                                placeholder="e.g. Math Sprint"
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-600">Subject</label>
                                            <select
                                                value={tSubjectId}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setTSubjectId(val ? Number(val) : "")
                                                    setTLessonId("random")
                                                }}
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                                disabled={loadingContent}
                                            >
                                                <option value="">Select subject…</option>
                                                {subjects.map((s) => (
                                                    <option key={s.subjectId} value={s.subjectId}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-600">Lesson scope</label>
                                            <select
                                                value={tLessonId}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    if (v === "random") setTLessonId("random")
                                                    else setTLessonId(Number(v))
                                                }}
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                                disabled={tSubjectId === "" || lessons.length === 0}
                                            >
                                                <option value="random">Subject-wide (Random)</option>
                                                {lessons.map((l) => (
                                                    <option key={l.lessonId} value={l.lessonId}>
                                                        {l.title}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Chip>Scope: {tLessonId === "random" ? "Subject (A)" : "Lesson (C)"}</Chip>
                                                <Chip>Questions: 15</Chip>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <PrimaryButton onClick={onCreateTournament} disabled={creatingT}>
                                                {creatingT ? "Creating…" : "Create"}
                                            </PrimaryButton>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                    <div className="text-lg font-extrabold text-slate-900">Join tournament</div>
                                    <div className="text-sm text-slate-600">Enter the code your friend shared.</div>

                                    <div className="mt-4 flex gap-2">
                                        <input
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            placeholder="Enter join code…"
                                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
                                        />
                                        <PrimaryButton onClick={onJoinTournament} disabled={joiningT}>
                                            {joiningT ? "…" : "Join"}
                                        </PrimaryButton>
                                    </div>

                                    <div className="mt-3 text-xs text-slate-500">
                                        After joining, you’ll see it in your list below.
                                    </div>
                                </div>
                            </div>

                            {/* My tournaments */}
                            <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-5">
                                <div className="text-lg font-extrabold text-slate-900">Your tournaments</div>
                                <div className="text-sm text-slate-600">
                                    Created or joined tournaments (async).
                                </div>

                                {loadingData ? (
                                    <div className="mt-4 text-sm text-slate-500">Loading…</div>
                                ) : tournaments.length === 0 ? (
                                    <div className="mt-4 text-sm text-slate-500">No tournaments yet.</div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {tournaments.map((t) => {
                                            const s = subjectMap.get(t.subjectId)
                                            return (
                                                <div key={t.tournamentId} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="font-extrabold text-slate-900 truncate">
                                                                {t.title}
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                <Chip>{s?.name || `Subject ${t.subjectId}`}</Chip>
                                                                <Chip>{t.lessonId ? `Lesson ${t.lessonId}` : "Subject-wide"}</Chip>
                                                                <Chip>Status: {t.status}</Chip>
                                                                <Chip>Code: {t.joinCode}</Chip>
                                                            </div>
                                                            <div className="mt-2 text-xs text-slate-500">
                                                                Ends: {new Date(t.endsAt).toLocaleString()}
                                                            </div>
                                                        </div>

                                                        <div className="text-xs font-bold text-slate-500">
                                                            {t.host?.username ? `Host: @${t.host.username}` : ""}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <PrimaryButton
                                                            onClick={() => navigate(`/tournaments/${t.tournamentId}/play`)}
                                                            disabled={t.status === "completed" || t.status === "cancelled"}
                                                        >
                                                            Play
                                                        </PrimaryButton>

                                                        <GhostButton
                                                            onClick={() => navigate(`/tournaments/${t.tournamentId}/leaderboard`)}
                                                        >
                                                            Leaderboard
                                                        </GhostButton>
                                                    </div>

                                                    <div className="mt-2 text-xs text-slate-500">
                                                        {t.status === "open" || t.status === "running"
                                                            ? "Finish your attempt to appear on the leaderboard."
                                                            : "This tournament is closed."}
                                                    </div>

                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 text-sm text-violet-800">
                    Tip: Battles feel best with friends. Try “Subject-wide” for random practice, or pick a lesson to target weak topics.
                </div>
            </div>
        </div>
    )
}
