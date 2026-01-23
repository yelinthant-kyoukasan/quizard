import { apiFetch } from "./api"

export type ProgressSubject = {
    subjectId: number
    name: string
    totalLessons: number
    completedLessons: number
    percent: number
}

export type ProgressOverview = {
    totalLessons: number
    totalCompletedLessons: number
    percent: number
    subjects: ProgressSubject[]
}

export type SubjectProgressDto = {
    subjectId: number
    totalLessons: number
    completedLessonIds: number[]
    completedCount: number
    items: { lessonId: number; accuracy: number; completedAt: string }[]
}

function toNumber(v: unknown, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

export async function getProgressOverview(): Promise<ProgressOverview> {
    const data = await apiFetch<any>("/api/progress/overview")

    const totalLessons = toNumber(data?.totalLessons ?? data?.totalCount ?? 0)
    const totalCompletedLessons = toNumber(
        data?.totalCompletedLessons ?? data?.totalCompletedCount ?? 0
    )

    const subjectsRaw: any[] = Array.isArray(data?.subjects) ? data.subjects : []

    const subjects: ProgressSubject[] = subjectsRaw.map((s) => {
        const subjectId = toNumber(s?.subjectId ?? s?.subject_id ?? s?._id ?? 0)
        const name = String(s?.name ?? "")
        const total = toNumber(s?.totalCount ?? s?.totalLessons ?? 0)
        const completed = toNumber(s?.completedCount ?? s?.completedLessons ?? 0)
        const percent =
            toNumber(s?.percent, -1) >= 0
                ? toNumber(s?.percent)
                : total > 0
                    ? Math.round((completed / total) * 100)
                    : 0

        return {
            subjectId,
            name,
            totalLessons: total,
            completedLessons: completed,
            percent,
        }
    })

    const percent =
        toNumber(data?.percent, -1) >= 0
            ? toNumber(data?.percent)
            : totalLessons > 0
                ? Math.round((totalCompletedLessons / totalLessons) * 100)
                : 0

    return {
        totalLessons,
        totalCompletedLessons,
        percent,
        subjects,
    }
}

export function getSubjectProgress(subjectId: number): Promise<SubjectProgressDto> {
    return apiFetch<SubjectProgressDto>(`/api/progress/subject/${subjectId}`)
}
