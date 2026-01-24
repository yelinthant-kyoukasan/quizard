type ApiError = {
    message?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function parseJsonSafe(res: Response) {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {

    const headers: Record<string, string> = {
        ...(options.headers as any),
    };

    // Only set content-type if we actually send JSON body
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
        const msg =
            (data as ApiError)?.message ||
            `Request failed (${res.status})`;
        throw new Error(msg);
    }

    return data as T;
}
