import { apiFetch } from "./api"

export type SubjectDto = {
  subjectId: number
  name: string
  code: string
  orderIndex: number
}

export type LessonDto = {
  lessonId: number
  subjectId: number
  title: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  orderIndex: number
  xpReward: number
  questionCount: number
  estimatedMinutes: number
}

export type QuestionDto = {
  questionId: number
  lessonId: number
  type: "MCQ"
  questionText: string
  options: string[]
  difficulty: "Easy" | "Medium" | "Hard"
  xp: number
  orderIndex: number
}

/* =========================================================
   API CALLS — match existing routes exactly
   ========================================================= */

// GET /api/subjects
export function getSubjects(): Promise<SubjectDto[]> {
  return apiFetch<SubjectDto[]>("/api/subjects")
}

// GET /api/lessons?subjectId=1
export function getLessonsBySubject(
  subjectId: number
): Promise<LessonDto[]> {
  return apiFetch<LessonDto[]>(`/api/lessons?subjectId=${subjectId}`)
}

// GET /api/questions?lessonId=1
export function getQuestionsByLesson(
  lessonId: number
): Promise<QuestionDto[]> {
  return apiFetch<QuestionDto[]>(`/api/questions?lessonId=${lessonId}`)
}

export function getQuestionsByIds(questionIds: number[]) {
  return apiFetch<any[]>(`/api/questions/by-ids`, {
    method: "POST",
    body: JSON.stringify({ questionIds }),
  })
}

export function submitQuizAttemptByIds(payload: {
  subjectId: number
  lessonId?: number | null
  questionIds: number[]
  answers: number[]
  timeTakenSeconds?: number
}) {
  return apiFetch<any>(`/api/quiz/submit-by-ids`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

