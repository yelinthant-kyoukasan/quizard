import React, { useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthContextValue } from "./AuthContextValue";
import type { AuthUser } from "./authTypes";
import { getMe } from "../services/authApi";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshMe = async () => {
        try {
            const me = await getMe();
            setUser(me);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshMe();
    }, []);

    const value: AuthContextValue = useMemo(
        () => ({
            user,
            loading,
            setUser,
            refreshMe,
        }),
        [user, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
