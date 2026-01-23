import { apiFetch } from "./api"

/** ---------- 1v1 Battles ---------- */

export type BattleListItem = {
    battleId: string
    status: "pending" | "active" | "completed" | "declined" | "expired"
    subjectId: number
    lessonId: number | null
    questionIds?: number[]
    createdBy: { userId: string; username: string } | null
    opponent: { userId: string; username: string } | null
    expiresAt: string
    isCreator: boolean
    winner: string | null
    createdAt: string
    updatedAt: string
}

export type CreateBattleBody = {
    opponentUsername: string
    subjectId: number
    lessonId?: number | null
}

// POST /api/battles
export function createBattle(body: CreateBattleBody) {
    return apiFetch<{ message: string; battleId: string }>(`/api/battles`, {
        method: "POST",
        body: JSON.stringify(body),
    })
}

// GET /api/battles
export function getMyBattles() {
    return apiFetch<BattleListItem[]>(`/api/battles`)
}

// GET /api/battles/:battleId
export function getBattleById(battleId: string) {
    return apiFetch<BattleListItem>(`/api/battles/${battleId}`)
}

// POST /api/battles/:battleId/accept
export function acceptBattle(battleId: string) {
    return apiFetch<{ message: string }>(`/api/battles/${battleId}/accept`, {
        method: "POST",
    })
}

// POST /api/battles/:battleId/decline
export function declineBattle(battleId: string) {
    return apiFetch<{ message: string }>(`/api/battles/${battleId}/decline`, {
        method: "POST",
    })
}

// POST /api/battles/:battleId/submit  { attemptId }
export function submitBattleAttempt(battleId: string, attemptId: string) {
    return apiFetch<{ message: string; status: string; winner: string | null }>(
        `/api/battles/${battleId}/submit`,
        {
            method: "POST",
            body: JSON.stringify({ attemptId }),
        }
    )
}

/** ---------- Tournaments ---------- */

export type TournamentListItem = {
    tournamentId: string
    title: string
    joinCode: string
    status: "open" | "running" | "completed" | "cancelled"
    subjectId: number
    lessonId: number | null
    joinClosesAt: string
    endsAt: string
    host: { username: string; name: string } | null
    createdAt: string
}

export type TournamentDetail = {
    tournamentId: string
    title: string
    joinCode: string
    status: "open" | "running" | "completed" | "cancelled"
    subjectId: number
    lessonId: number | null
    questionIds: number[]
    joinClosesAt: string
    endsAt: string
    host: { username: string; name: string } | null
    me: { joined: boolean; attemptId: string | null; joinedAt: string | null; submittedAt: string | null }
}

export type CreateTournamentBody = {
    title: string
    subjectId: number
    lessonId?: number | null
    joinHours?: number
    playHours?: number
}

// POST /api/tournaments
export function createTournament(body: CreateTournamentBody) {
    return apiFetch<{
        message: string
        tournamentId: string
        joinCode: string
        joinClosesAt: string
        endsAt: string
    }>(`/api/tournaments`, {
        method: "POST",
        body: JSON.stringify(body),
    })
}

// GET /api/tournaments
export function getMyTournaments() {
    return apiFetch<TournamentListItem[]>(`/api/tournaments`)
}

// POST /api/tournaments/join  { joinCode }
export function joinTournamentByCode(joinCode: string) {
    return apiFetch<{ message: string; tournamentId: string }>(`/api/tournaments/join`, {
        method: "POST",
        body: JSON.stringify({ joinCode }),
    })
}

// GET /api/tournaments/:id
export function getTournamentById(tournamentId: string) {
    return apiFetch<TournamentDetail>(`/api/tournaments/${tournamentId}`)
}

// POST /api/tournaments/:id/submit  { attemptId }
export function submitTournamentAttempt(tournamentId: string, attemptId: string) {
    return apiFetch<{ message: string }>(`/api/tournaments/${tournamentId}/submit`, {
        method: "POST",
        body: JSON.stringify({ attemptId }),
    })
}

export type TournamentLeaderboardRow = {
    rank: number
    user: {
        userId: string
        username: string
        name: string
        xp: number
        level: number
        streakDays: number
    }
    correctCount: number
    totalQuestions: number
    accuracy: number
    timeTakenSeconds: number
    xpEarned: number
}

// GET /api/tournaments/:id/leaderboard
export function getTournamentLeaderboard(tournamentId: string) {
    return apiFetch<{
        tournamentId: string
        status: string
        rows: TournamentLeaderboardRow[]
        submittedCount: number
        totalParticipants: number
    }>(`/api/tournaments/${tournamentId}/leaderboard`)
}
