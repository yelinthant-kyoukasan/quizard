import { apiFetch } from "./api";
import type { AuthUser } from "../context/authTypes";

export type RegisterPayload = {
    name: string;
    username: string;
    email: string;
    password: string;
};

export type LoginPayload = {
    emailOrUsername: string;
    password: string;
};

type AuthResponse = {
    message: string;
    user: AuthUser;
};

export async function registerUser(payload: RegisterPayload) {
    return apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function loginUser(payload: LoginPayload) {
    return apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function logoutUser() {
    return apiFetch<{ message: string }>("/api/auth/logout", {
        method: "POST"
    });
}

export async function getMe() {
    return apiFetch<AuthUser>("/api/auth/me");
}
