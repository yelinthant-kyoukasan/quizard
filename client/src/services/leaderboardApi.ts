import { apiFetch } from "./api"

export type LeaderboardEntryDto = {
    rank: number
    userId: string
    username: string
    name: string
    xp: number
    level?: number
    streakDays?: number
}

export type LeaderboardDto = {
    entries: LeaderboardEntryDto[]
    me: LeaderboardEntryDto | null
}

export function getLeaderboard(limit = 50): Promise<LeaderboardDto> {
    return apiFetch<LeaderboardDto>(`/api/leaderboard?limit=${limit}`)
}
