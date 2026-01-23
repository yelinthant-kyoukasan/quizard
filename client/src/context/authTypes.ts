export type AuthUser = {
    _id?: string;
    name: string;
    username: string;
    email: string;
    xp?: number;
    level?: number;
    streakDays?: number;
    lives?: number;
    examDate?: string | null;
};
